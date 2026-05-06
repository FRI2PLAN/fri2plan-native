/**
 * Expo Config Plugin: Patch RCTTurboModule.mm for iOS 26 SIGABRT crash fix
 *
 * Root cause analysis (builds 14-19):
 * 1. A JS error occurs at startup (RCTExceptionsManager.reportFatal:...)
 * 2. RCTTurboModule.performVoidMethodInvocation catches the resulting NSException
 * 3. Original code: calls convertNSExceptionToJSError -> accesses jsi::Runtime from
 *    wrong thread (not thread-safe) -> heap corruption -> SIGABRT
 * 4. First fix attempt (@throw exception): re-throws on background thread ->
 *    nobody catches it -> terminate() -> SIGABRT
 *
 * FINAL FIX: Swallow the exception in performVoidMethodInvocation.
 * Void methods are fire-and-forget (async), so swallowing the exception is safe.
 * The JS error has already been reported via reportFatal before the exception is thrown.
 * This matches the behavior of performMethodInvocation which also swallows exceptions.
 *
 * References:
 * - https://github.com/facebook/react-native/pull/56694
 * - https://github.com/facebook/react-native/issues/54859
 * - Analysis: crash at RCTExceptionsManager.reportFatal -> performVoidMethodInvocation
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

      const patchMarker = '// IOS26_TURBOMODULE_PATCH_V2_APPLIED';

      if (content.includes(patchMarker)) {
        console.log('ℹ️  withRCTTurboModulePatch: Patch v2 already applied');
        return config;
      }

      // Remove v1 marker if present (from previous patch attempt)
      content = content.replace('// IOS26_TURBOMODULE_PATCH_APPLIED\n      ', '');

      // Pattern 1: @throw exception (v1 patch result - replace with swallow)
      const old_v1_rethrow = '@throw exception;';

      // Pattern 2: original convertNSExceptionToJSError (with methodNameStr)
      const old1 = '      throw convertNSExceptionToJSError(runtime, exception, std::string{moduleName}, methodNameStr);';

      // Pattern 3: original convertNSExceptionToJSError (without methodNameStr)
      const old2 = '      throw convertNSExceptionToJSError(runtime, exception, std::string{moduleName});';

      const newCatch = `      ${patchMarker}
      // iOS 26 FINAL FIX: Swallow exception in performVoidMethodInvocation.
      // Root cause: RCTExceptionsManager.reportFatal throws NSException on background thread.
      // - Original code: convertNSExceptionToJSError accesses jsi::Runtime from wrong thread -> SIGABRT
      // - v1 fix (@throw): re-throws on background thread, nobody catches -> terminate() -> SIGABRT
      // - v2 fix (swallow): void methods are fire-and-forget, JS error already reported via reportFatal.
      // References: https://github.com/facebook/react-native/pull/56694
      NSLog(@"[RCTTurboModule] iOS26 patch: swallowing NSException in performVoidMethodInvocation: %@ - %@",
            exception.name, exception.reason);`;

      let patched = false;

      // Check for v1 patch (@throw exception) and replace with swallow
      if (content.includes(old_v1_rethrow)) {
        content = content.replace(old_v1_rethrow, newCatch);
        patched = true;
        console.log('✅ withRCTTurboModulePatch v2: Replaced @throw with swallow (v1 -> v2 upgrade)');
      } else if (content.includes(old1)) {
        content = content.replace(old1, newCatch);
        patched = true;
        console.log('✅ withRCTTurboModulePatch v2: Applied patch (pattern 1 - with methodNameStr)');
      } else if (content.includes(old2)) {
        content = content.replace(old2, newCatch);
        patched = true;
        console.log('✅ withRCTTurboModulePatch v2: Applied patch (pattern 2 - without methodNameStr)');
      } else {
        // Fallback: search for any throw convertNSExceptionToJSError in @catch block
        const lines = content.split('\n');
        let patchedLines = false;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('throw convertNSExceptionToJSError(') &&
              lines[i].includes('exception')) {
            const context = lines.slice(Math.max(0, i - 10), i).join('\n');
            if (context.includes('invokeWithTarget') || context.includes('performVoidMethodInvocation')) {
              lines[i] = newCatch;
              content = lines.join('\n');
              patched = true;
              patchedLines = true;
              console.log('✅ withRCTTurboModulePatch v2: Applied patch (fallback line search)');
              break;
            }
          }
        }
        if (!patchedLines) {
          console.error('❌ withRCTTurboModulePatch v2: Could not find pattern to patch in RCTTurboModule.mm');
          const lines2 = content.split('\n');
          lines2.forEach((line, i) => {
            if (line.includes('convertNSExceptionToJSError') || line.includes('@throw') || line.includes('exception')) {
              if (line.includes('catch') || line.includes('throw') || line.includes('exception')) {
                console.error(`   Line ${i + 1}: ${line.trim()}`);
              }
            }
          });
          return config;
        }
      }

      if (patched) {
        fs.writeFileSync(turboModuleFile, content, 'utf8');
        console.log('✅ withRCTTurboModulePatch v2: RCTTurboModule.mm patched successfully!');
        console.log('   iOS 26 SIGABRT crash in performVoidMethodInvocation FIXED (swallow exception).');
      }

      return config;
    },
  ]);
};

module.exports = withRCTTurboModulePatch;
