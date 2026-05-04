const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFirebasePodfile(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      // Already patched
      if (podfile.includes("pod 'GoogleUtilities', :modular_headers => true")) {
        return config;
      }

      // Add modular_headers for GoogleUtilities after the target block opens
      // This is the most reliable approach for Firebase + Expo SDK 54+
      const targetLine = "target 'FRI2PLAN' do";
      if (podfile.includes(targetLine)) {
        podfile = podfile.replace(
          targetLine,
          `${targetLine}\n  pod 'GoogleUtilities', :modular_headers => true`
        );
      } else {
        // Fallback: add use_modular_headers! globally before use_expo_modules!
        const patterns = [
          'use_expo_modules!',
          'prepare_react_native_project!',
          'use_react_native!',
        ];
        for (const pattern of patterns) {
          if (podfile.includes(pattern)) {
            podfile = podfile.replace(
              pattern,
              `use_modular_headers!\n${pattern}`
            );
            break;
          }
        }
      }

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};
