const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFirebasePodfile(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');
      if (!podfile.includes('use_modular_headers!')) {
        podfile = podfile.replace(
          'use_expo_modules!',
          'use_modular_headers!\nuse_expo_modules!'
        );
        fs.writeFileSync(podfilePath, podfile);
      }
      return config;
    },
  ]);
};
