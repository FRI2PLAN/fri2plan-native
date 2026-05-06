#!/usr/bin/env bash
# EAS Build Pre-Install Hook
# Patches RCTTurboModule.mm to fix the iOS 26 SIGABRT crash in performVoidMethodInvocation
# See: https://github.com/facebook/react-native/pull/56694
# See: https://github.com/facebook/react-native/issues/54859
#
# Root cause: On iOS 26, when an async void TurboModule method throws an NSException,
# the code calls convertNSExceptionToJSError which accesses jsi::Runtime from the wrong
# thread (not thread-safe), causing heap corruption and SIGABRT.
# Fix: Re-throw the ObjC exception instead of converting to JSError (same as performMethodInvocation).

set -e

echo "🔧 EAS Build Pre-Install Hook: Patching RCTTurboModule.mm for iOS 26 crash fix"

# Path to RCTTurboModule.mm (react-native 0.81.x)
TURBO_MODULE_FILE="node_modules/react-native/ReactCommon/react/nativemodule/core/platform/ios/ReactCommon/RCTTurboModule.mm"

if [ ! -f "$TURBO_MODULE_FILE" ]; then
  echo "⚠️  RCTTurboModule.mm not found at $TURBO_MODULE_FILE"
  echo "   Skipping patch."
  exit 0
fi

echo "📄 Found RCTTurboModule.mm at: $TURBO_MODULE_FILE"

# Check if patch already applied
if grep -q "IOS26_VOID_PATCH_APPLIED" "$TURBO_MODULE_FILE"; then
  echo "ℹ️  Patch already applied. Skipping."
  exit 0
fi

# Apply the patch using Python for reliable multi-line replacement
python3 << 'PYEOF'
import sys, re

turbo_path = "node_modules/react-native/ReactCommon/react/nativemodule/core/platform/ios/ReactCommon/RCTTurboModule.mm"

with open(turbo_path, 'r') as f:
    content = f.read()

if 'IOS26_VOID_PATCH_APPLIED' in content:
    print("ℹ️  Patch already applied.")
    sys.exit(0)

# Pattern 1: react-native 0.81.5 exact signature
old1 = '      throw convertNSExceptionToJSError(runtime, exception, std::string{moduleName}, methodNameStr);'
new1 = '      // IOS26_VOID_PATCH_APPLIED: Re-throw ObjC exception instead of converting to JSError\n      // (jsi::Runtime is not thread-safe; void methods are always async)\n      // Fix: https://github.com/facebook/react-native/pull/56694\n      @throw exception;'

# Pattern 2: without methodNameStr
old2 = '      throw convertNSExceptionToJSError(runtime, exception, std::string{moduleName});'
new2 = '      // IOS26_VOID_PATCH_APPLIED: Re-throw ObjC exception instead of converting to JSError\n      // Fix: https://github.com/facebook/react-native/pull/56694\n      @throw exception;'

patched = False

if old1 in content:
    content = content.replace(old1, new1, 1)
    patched = True
    print("✅ Applied patch (pattern 1 - with methodNameStr)")
elif old2 in content:
    content = content.replace(old2, new2, 1)
    patched = True
    print("✅ Applied patch (pattern 2 - without methodNameStr)")
else:
    # Regex fallback: find throw convertNSExceptionToJSError in @catch block
    pattern = r'(\[inv invokeWithTarget:strongModule\];\s*\} @catch \(NSException \*exception\) \{\s*)throw convertNSExceptionToJSError\([^;]+\);'
    replacement = r'\1// IOS26_VOID_PATCH_APPLIED: Re-throw instead of converting to JSError\n      // Fix: https://github.com/facebook/react-native/pull/56694\n      @throw exception;'
    new_content = re.sub(pattern, replacement, content, count=1, flags=re.DOTALL)
    if new_content != content:
        content = new_content
        patched = True
        print("✅ Applied patch (regex fallback)")
    else:
        print("❌ Could not find pattern to patch!")
        for i, line in enumerate(content.split('\n')):
            if 'convertNSExceptionToJSError' in line:
                print(f"   Line {i+1}: {line.strip()}")
        sys.exit(1)

if patched:
    with open(turbo_path, 'w') as f:
        f.write(content)
    print("✅ RCTTurboModule.mm patched successfully!")
    print("   iOS 26 SIGABRT crash in performVoidMethodInvocation should be fixed.")

PYEOF

echo "🎉 Pre-install hook completed successfully"
