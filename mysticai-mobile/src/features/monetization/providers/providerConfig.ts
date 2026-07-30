import type { MobileAdProviderName } from './mobileAds.types';
import { resolveRewardedUnitId } from './admobUnitIds';
import { getLevelPlayConfig } from '../../ads/levelplay/levelPlay.config';

export function getConfiguredMobileAdProvider(): MobileAdProviderName {
  const value = process.env.EXPO_PUBLIC_MOBILE_AD_PROVIDER?.trim().toLowerCase();

  switch (value) {
    case 'admob':
    case 'unity':
    case 'applovin':
    case 'levelplay':
    case 'custom':
    case 'none':
      return value;
    default:
      if (value) {
        console.warn(`[AdProvider] Unknown provider "${value}"; falling back to AdMob.`);
      }
      return 'admob';
  }
}

export function resolveConfiguredRewardedAd() {
  const provider = getConfiguredMobileAdProvider();
  if (provider === 'levelplay') {
    const config = getLevelPlayConfig();
    return config.rewardedAdUnitId
      ? { provider, unitId: config.rewardedAdUnitId, mode: 'production' as const }
      : null;
  }
  if (provider === 'admob') {
    const resolved = resolveRewardedUnitId();
    return resolved ? { provider, ...resolved } : null;
  }
  return null;
}
