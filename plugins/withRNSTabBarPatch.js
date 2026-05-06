/**
 * Expo Config Plugin: Patch react-native-screens RNSTabBarController for iOS 26
 * 
 * The crash on iOS 26 is caused by RNSTabBarController.updateTabBarAppearance
 * calling UIKit tab-bar/focus APIs that throw NSException on iOS 26.
 * 
 * This plugin adds a post_install hook in the Podfile that patches the
 * RNSTabBarController.mm source file to wrap the problematic call in
 * an iOS version check.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const withRNSTabBarPatch = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      const patch = `
  # Patch react-native-screens RNSTabBarController for iOS 26 crash
  # See: https://github.com/software-mansion/react-native-screens/issues/3940
  post_install do |installer|
    installer.pods_project.targets.each do |target|
      if target.name == 'RNScreens'
        target.build_configurations.each do |config|
          config.build_settings['OTHER_CPLUSPLUSFLAGS'] ||= ['$(inherited)']
          config.build_settings['OTHER_CPLUSPLUSFLAGS'] << '-DRNS_DISABLE_TAB_BAR_APPEARANCE_ON_IOS26=1'
        end
      end
    end
    
    # Patch RNSTabBarController.mm to guard updateTabBarAppearance on iOS 26
    rns_path = installer.sandbox.pod_dir('RNScreens')
    tab_bar_file = File.join(rns_path, 'ios', 'RNSTabBarController.mm')
    if File.exist?(tab_bar_file)
      content = File.read(tab_bar_file)
      # Guard the updateTabBarAppearance method body with iOS version check
      patched = content.gsub(
        /- \\(void\\)updateTabBarAppearance\\s*\\{/,
        "- (void)updateTabBarAppearance {\\n  if (@available(iOS 26.0, *)) { return; } // Patch: skip on iOS 26 to prevent crash"
      )
      if patched != content
        File.write(tab_bar_file, patched)
        puts "✅ Patched RNSTabBarController.mm for iOS 26 compatibility"
      else
        puts "⚠️  Could not patch RNSTabBarController.mm - pattern not found"
      end
    end
  end
`;

      // Only add if not already present
      if (!podfile.includes('RNS_DISABLE_TAB_BAR_APPEARANCE_ON_IOS26')) {
        // Insert before the last 'end' of the file
        podfile = podfile.replace(/\nend\s*$/, '\n' + patch + '\nend\n');
        fs.writeFileSync(podfilePath, podfile);
        console.log('✅ withRNSTabBarPatch: Added iOS 26 patch to Podfile');
      } else {
        console.log('ℹ️  withRNSTabBarPatch: Patch already present');
      }

      return config;
    },
  ]);
};

module.exports = withRNSTabBarPatch;
