/**
 * Expo Config Plugin: Patch RCTTurboModule.mm for iOS 26 SIGABRT crash fix
 *
 * Root cause: On iOS 26, performVoidMethodInvocation catches NSExceptions and calls
 * convertNSExceptionToJSError, which accesses jsi::Runtime from the wrong thread
 * (not thread-safe), causing heap corruption and SIGABRT.
 *
 * Fix: Replace `throw convertNSExceptionToJSError(...)` with `@throw exception;`
 * This matches the fix in performMethodInvocation (PR #50193) and the backport PR #56694.
 *
 * References:
 * - https://github.com/facebook/react-native/pull/56694
 * - https://github.com/facebook/react-native/issues/54859
 */
const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const withRCTTurboModulePatch = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;

      // Path to RCTTurboModule.mm in react-native 0.81.x
      const turboModuleFile = path.join(
        projectRoot,
        'node_modules',
        'react-native',
        'ReactCommon',
        'react',
        'nativemodule',
        'core',
        'platform',
        'ios',
        'ReactCommon',
        'RCTTurboModule.mm'
      );

      if (!fs.existsSync(turboModuleFile)) {
        console.warn('⚠️  withRCTTurboModulePatch: RCTTurboModule.mm not found at', turboModuleFile);
        return config;
      }

      let content = fs.readFileSync(turboModuleFile, 'utf8');

      const patchMarker = '// IOS26_TURBOMODULE_PATCH_APPLIED';

      if (content.includes(patchMarker)) {
        console.log('ℹ️  withRCTTurboModulePatch: Patch already applied');
        return config;
      }

      // Pattern 1: react-native 0.81.5 exact signature (with methodNameStr)
      const old1 = '      throw convertNSExceptionToJSError(runtime, exception, std::string{moduleName}, methodNameStr);';
      const new1 = `      ${patchMarker}\n      // Void methods are always async: re-throw ObjC exception instead of converting to JSError.\n      // convertNSExceptionToJSError accesses jsi::Runtime from the wrong thread (not thread-safe),\n      // causing heap corruption and SIGABRT on iOS 26.\n      // Fix: https://github.com/facebook/react-native/pull/56694\n      @throw exception;`;

      // Pattern 2: without methodNameStr
      const old2 = '      throw convertNSExceptionToJSError(runtime, exception, std::string{moduleName});';
      const new2 = `      ${patchMarker}\n      // Re-throw ObjC exception instead of converting to JSError (iOS 26 fix)\n      // Fix: https://github.com/facebook/react-native/pull/56694\n      @throw exception;`;

      let patched = false;

      if (content.includes(old1)) {
        content = content.replace(old1, new1);
        patched = true;
        console.log('✅ withRCTTurboModulePatch: Applied patch (pattern 1 - with methodNameStr)');
      } else if (content.includes(old2)) {
        content = content.replace(old2, new2);
        patched = true;
        console.log('✅ withRCTTurboModulePatch: Applied patch (pattern 2 - without methodNameStr)');
      } else {
        // Fallback: search for any throw convertNSExceptionToJSError in @catch block
        // near [inv invokeWithTarget:strongModule]
        const lines = content.split('\n');
        let patchedLines = false;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('throw convertNSExceptionToJSError(') &&
              lines[i].includes('exception')) {
            // Check context: look for invokeWithTarget nearby (within 10 lines before)
            const context = lines.slice(Math.max(0, i - 10), i).join('\n');
            if (context.includes('invokeWithTarget') || context.includes('performVoidMethodInvocation')) {
              lines[i] = `      ${patchMarker}\n      // Re-throw ObjC exception instead of converting to JSError (iOS 26 fix)\n      // Fix: https://github.com/facebook/react-native/pull/56694\n      @throw exception;`;
              content = lines.join('\n');
              patched = true;
              patchedLines = true;
              console.log('✅ withRCTTurboModulePatch: Applied patch (fallback line search)');
              break;
            }
          }
        }
        if (!patchedLines) {
          console.error('❌ withRCTTurboModulePatch: Could not find pattern to patch in RCTTurboModule.mm');
          console.error('   Searching for convertNSExceptionToJSError occurrences:');
          lines.forEach((line, i) => {
            if (line.includes('convertNSExceptionToJSError')) {
              console.error(`   Line ${i + 1}: ${line.trim()}`);
            }
          });
          return config;
        }
      }

      if (patched) {
        fs.writeFileSync(turboModuleFile, content, 'utf8');
        console.log('✅ withRCTTurboModulePatch: RCTTurboModule.mm patched successfully!');
        console.log('   iOS 26 SIGABRT crash in performVoidMethodInvocation should be fixed.');
      }

      return config;
    },
  ]);
};

module.exports = withRCTTurboModulePatch;
