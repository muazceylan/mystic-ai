import type { TrackingConsentStatus } from '../../privacy';

export type MobileAdProviderName =
  | 'admob'
  | 'unity'
  | 'applovin'
  | 'levelplay'
  | 'custom'
  | 'none';

export type MobileAdProviderCapabilities = {
  supportsRewardedAds: boolean;
  requiresTrackingAuthorization: boolean;
  supportsNonPersonalizedAds: boolean;
  supportsServerSideVerification: boolean;
};

export type AdsInitializationOptions = {
  trackingConsentStatus: TrackingConsentStatus;
  personalizedAdvertisingAllowed: boolean;
  tagForChildDirectedTreatment?: boolean;
  /**
   * Devices allowed to see test ads and open the Ad Inspector.
   * Sourced from EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS; empty in production.
   */
  testDeviceIds?: string[];
};
