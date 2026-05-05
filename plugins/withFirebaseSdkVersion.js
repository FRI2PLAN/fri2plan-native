const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const FIREBASE_SDK_VERSION = '12.12.0';
const FIREBASE_LINE = `$FirebaseSDKVersion = '${FIREBASE_SDK_VERSION}'`;

const withFirebaseSdkVersion = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      const podfile = fs.readFileSync(podfilePath, 'utf8');

      const next = podfile.includes('$FirebaseSDKVersion')
        ? podfile.replace(/\$FirebaseSDKVersion\s*=\s*['"][^'"]+['"]/g, FIREBASE_LINE)
        : `${FIREBASE_LINE}\n${podfile}`;

      if (next !== podfile) {
        fs.writeFileSync(podfilePath, next);
        console.log(`[withFirebaseSdkVersion] Set $FirebaseSDKVersion = '${FIREBASE_SDK_VERSION}' in Podfile`);
      }

      return cfg;
    },
  ]);
};

module.exports = withFirebaseSdkVersion;
