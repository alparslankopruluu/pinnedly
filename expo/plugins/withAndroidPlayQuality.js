const {
  AndroidConfig,
  withAndroidManifest,
  withAndroidStyles,
  withAppBuildGradle,
  withGradleProperties,
} = require('@expo/config-plugins');

function withLargeScreenSupport(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(modConfig.modResults);
    application.$['android:resizeableActivity'] = 'true';

    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(modConfig.modResults);
    delete activity.$['android:screenOrientation'];

    application.activity = application.activity ?? [];
    const codeScannerActivityName = 'com.google.mlkit.vision.codescanner.internal.GmsBarcodeScanningDelegateActivity';
    let codeScannerActivity = application.activity.find(
      (candidate) => candidate.$?.['android:name'] === codeScannerActivityName
    );
    if (!codeScannerActivity) {
      codeScannerActivity = { $: { 'android:name': codeScannerActivityName } };
      application.activity.push(codeScannerActivity);
    }
    codeScannerActivity.$['tools:remove'] = 'android:screenOrientation';

    modConfig.modResults.manifest = manifest;
    return modConfig;
  });
}

function withModernEdgeToEdgeTheme(config) {
  return withAndroidStyles(config, (modConfig) => {
    const styles = modConfig.modResults.resources.style ?? [];
    const appTheme = styles.find((style) => style.$?.name === 'AppTheme');
    if (appTheme?.item) {
      appTheme.item = appTheme.item.filter(
        (item) => ![
          'android:enforceNavigationBarContrast',
          'android:navigationBarColor',
          'android:statusBarColor',
          'android:windowLightNavigationBar',
          'android:windowLightStatusBar',
        ].includes(item.$?.name)
      );
    }
    return modConfig;
  });
}

function withOptimizedR8(config) {
  config = withAppBuildGradle(config, (modConfig) => {
    modConfig.modResults.contents = modConfig.modResults.contents.replace(
      'getDefaultProguardFile("proguard-android.txt")',
      'getDefaultProguardFile("proguard-android-optimize.txt")'
    );
    return modConfig;
  });

  return withGradleProperties(config, (modConfig) => {
    const properties = modConfig.modResults;
    const key = 'android.r8.optimizedResourceShrinking';
    const existing = properties.find((property) => property.type === 'property' && property.key === key);
    if (existing) {
      existing.value = 'true';
    } else {
      properties.push({ type: 'property', key, value: 'true' });
    }
    return modConfig;
  });
}

module.exports = function withAndroidPlayQuality(config) {
  config = withLargeScreenSupport(config);
  config = withModernEdgeToEdgeTheme(config);
  return withOptimizedR8(config);
};
