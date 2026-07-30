const {
  AndroidConfig,
  withAndroidManifest,
  withAppBuildGradle,
  withInfoPlist,
  withPodfile,
} = require('@expo/config-plugins');

const IOS_UNITY_ADS_ADAPTER_VERSION = '5.5.0';
const ANDROID_UNITY_ADS_ADAPTER_VERSION = '5.5.0';
const ANDROID_UNITY_ADS_SDK_VERSION = '4.16.6';
const SK_AD_NETWORK_IDS = [
  'su67r6k2v3.skadnetwork',
  '4dzt52r2t5.skadnetwork',
];
const ANDROID_DEPENDENCIES = [
  `implementation 'com.unity3d.ads-mediation:unityads-adapter:${ANDROID_UNITY_ADS_ADAPTER_VERSION}'`,
  `implementation 'com.unity3d.ads:unity-ads:${ANDROID_UNITY_ADS_SDK_VERSION}'`,
  "implementation 'com.google.android.gms:play-services-ads-identifier:18.0.1'",
  "implementation 'com.google.android.gms:play-services-basement:18.3.0'",
  "implementation 'com.google.android.gms:play-services-appset:16.0.2'",
];

function withLevelPlayInfoPlist(config) {
  return withInfoPlist(config, (mod) => {
    const currentItems = Array.isArray(mod.modResults.SKAdNetworkItems)
      ? mod.modResults.SKAdNetworkItems
      : [];
    const identifiers = new Set(
      currentItems
        .map((item) => item && typeof item === 'object' ? item.SKAdNetworkIdentifier : undefined)
        .filter((value) => typeof value === 'string'),
    );
    for (const identifier of SK_AD_NETWORK_IDS) {
      if (!identifiers.has(identifier)) currentItems.push({ SKAdNetworkIdentifier: identifier });
    }
    mod.modResults.SKAdNetworkItems = currentItems;
    mod.modResults.NSAdvertisingAttributionReportEndpoint =
      mod.modResults.NSAdvertisingAttributionReportEndpoint ?? 'https://postbacks-is.com';
    mod.modResults.NSAppTransportSecurity = {
      ...(typeof mod.modResults.NSAppTransportSecurity === 'object'
        ? mod.modResults.NSAppTransportSecurity
        : {}),
      NSAllowsArbitraryLoads: true,
    };
    // NSUserTrackingUsageDescription intentionally remains owned by the
    // existing expo-tracking-transparency configuration.
    return mod;
  });
}

function withLevelPlayPod(config) {
  return withPodfile(config, (mod) => {
    const podLine = `  pod 'IronSourceUnityAdsAdapter', '${IOS_UNITY_ADS_ADAPTER_VERSION}'`;
    if (mod.modResults.contents.includes("pod 'IronSourceUnityAdsAdapter'")) {
      mod.modResults.contents = mod.modResults.contents.replace(
        /^\s*pod 'IronSourceUnityAdsAdapter'.*$/m,
        podLine,
      );
    } else {
      mod.modResults.contents = mod.modResults.contents.replace(
        /target ['"][^'"]+['"] do\s*\n/,
        (target) => `${target}${podLine}\n`,
      );
    }
    return mod;
  });
}

function withLevelPlayAndroidManifest(config) {
  return withAndroidManifest(config, (mod) => {
    AndroidConfig.Permissions.ensurePermissions(mod.modResults, [
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
      'com.google.android.gms.permission.AD_ID',
    ]);
    return mod;
  });
}

function withLevelPlayGradle(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') {
      throw new Error('[withLevelPlay] Only Groovy app/build.gradle is supported.');
    }
    let contents = mod.modResults.contents;
    for (const dependency of ANDROID_DEPENDENCIES) {
      const coordinate = dependency.match(/'([^']+)'/)?.[1];
      const artifact = coordinate?.split(':').slice(0, 2).join(':');
      if (artifact && contents.includes(artifact)) {
        const escapedArtifact = artifact.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        contents = contents.replace(
          new RegExp(`^\\s*implementation[ (]'${escapedArtifact}:[^']+'\\)?\\s*$`, 'm'),
          `    ${dependency}`,
        );
      } else {
        contents = contents.replace(
          /dependencies\s*\{\s*\n/,
          (block) => `${block}    ${dependency}\n`,
        );
      }
    }
    mod.modResults.contents = contents;
    return mod;
  });
}

function withLevelPlay(config) {
  config = withLevelPlayInfoPlist(config);
  config = withLevelPlayPod(config);
  config = withLevelPlayAndroidManifest(config);
  config = withLevelPlayGradle(config);
  return config;
}

module.exports = withLevelPlay;
