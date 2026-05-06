/**
 * Expo Config Plugin: Patch react-native-screens RNSTabBarController for iOS 26
 *
 * Instead of adding a post_install hook (which conflicts with Expo's existing hook),
 * this plugin patches the RNSTabBarController.mm source file DIRECTLY in node_modules
 * during the prebuild phase, before CocoaPods runs.
 *
 * See: https://github.com/software-mansion/react-native-screens/issues/3940
 */
const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const withRNSTabBarPatch = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;

      // Path to RNSTabBarController.mm in node_modules
      const tabBarFile = path.join(
        projectRoot,
        'node_modules',
        'react-native-screens',
        'ios',
        'bottom-tabs',
        'host',
        'RNSTabBarController.mm'
      );

      if (!fs.existsSync(tabBarFile)) {
        console.warn('⚠️  withRNSTabBarPatch: RNSTabBarController.mm not found at', tabBarFile);
        return config;
      }

      let content = fs.readFileSync(tabBarFile, 'utf8');

      const patchMarker = '// iOS26_PATCH_APPLIED';

      if (content.includes(patchMarker)) {
        console.log('ℹ️  withRNSTabBarPatch: Patch already applied');
        return config;
      }

      // Patch updateTabBarAppearanceIfNeeded to skip on iOS 26+
      const original = `- (void)updateTabBarAppearanceIfNeeded
{
  if (_needsUpdateOfTabBarAppearance) {
    [self updateTabBarAppearance];
  }
}`;

      const patched = `- (void)updateTabBarAppearanceIfNeeded
{ ${patchMarker}
  if (@available(iOS 26.0, *)) {
    _needsUpdateOfTabBarAppearance = false;
    return; // Skip on iOS 26+ - prevents NSException crash (github.com/software-mansion/react-native-screens/issues/3940)
  }
  if (_needsUpdateOfTabBarAppearance) {
    [self updateTabBarAppearance];
  }
}`;

      if (content.includes(original)) {
        content = content.replace(original, patched);
        fs.writeFileSync(tabBarFile, content, 'utf8');
        console.log('✅ withRNSTabBarPatch: Patched RNSTabBarController.mm for iOS 26 (updateTabBarAppearanceIfNeeded guard)');
      } else {
        // Fallback: patch updateTabBarAppearance directly
        const original2 = `- (void)updateTabBarAppearance
{
  RNSLog(@"TabBarCtrl updateTabBarAppearance");
  _needsUpdateOfTabBarAppearance = false;`;

        const patched2 = `- (void)updateTabBarAppearance
{ ${patchMarker}
  if (@available(iOS 26.0, *)) {
    _needsUpdateOfTabBarAppearance = false;
    return; // Skip on iOS 26+ - prevents NSException crash
  }
  RNSLog(@"TabBarCtrl updateTabBarAppearance");
  _needsUpdateOfTabBarAppearance = false;`;

        if (content.includes(original2)) {
          content = content.replace(original2, patched2);
          fs.writeFileSync(tabBarFile, content, 'utf8');
          console.log('✅ withRNSTabBarPatch: Patched RNSTabBarController.mm for iOS 26 (updateTabBarAppearance guard)');
        } else {
          console.error('❌ withRNSTabBarPatch: Could not find pattern to patch in RNSTabBarController.mm');
          console.error('   File may have changed. Manual patch required.');
        }
      }

      return config;
    },
  ]);
};

module.exports = withRNSTabBarPatch;
