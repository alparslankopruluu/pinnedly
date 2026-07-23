const { withAppBuildGradle } = require('@expo/config-plugins');

const MARKER = '// @pinnedly-release-signing';

const RELEASE_SIGNING_BLOCK = `        release {
            def credentialsFile = rootProject.file("../credentials.json")
            if (credentialsFile.exists()) {
                def credentials = new groovy.json.JsonSlurper().parse(credentialsFile)
                def keystorePath = credentials.android.keystore.keystorePath
                def storeFilePath = keystorePath.startsWith("/")
                    ? file(keystorePath)
                    : rootProject.file("../" + keystorePath)

                storeFile storeFilePath
                storePassword credentials.android.keystore.keystorePassword
                keyAlias credentials.android.keystore.keyAlias
                keyPassword credentials.android.keystore.containsKey("keyPassword")
                    ? credentials.android.keystore.keyPassword
                    : credentials.android.keystore.keystorePassword
            }
        }`;

function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (contents.includes(MARKER)) {
      return config;
    }

    const signingClose = contents.indexOf('    }\n    buildTypes {');
    if (signingClose === -1) {
      throw new Error('Could not locate signingConfigs block in android/app/build.gradle');
    }

    // Must run before inserting RELEASE_SIGNING_BLOCK below: that block also starts
    // with "release {", and once both exist this regex's lazy match would anchor on
    // the wrong one and flip the debug build type's signing config instead.
    contents = contents.replace(
      /release\s*\{[\s\S]*?signingConfig signingConfigs\.debug/,
      (match) => match.replace('signingConfig signingConfigs.debug', 'signingConfig signingConfigs.release')
    );

    contents =
      contents.slice(0, signingClose) +
      `\n${RELEASE_SIGNING_BLOCK}\n${MARKER}\n` +
      contents.slice(signingClose);

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withAndroidReleaseSigning;