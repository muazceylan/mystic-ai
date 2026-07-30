export type TrackingConsentStatus =
  | 'granted'
  | 'denied'
  | 'restricted'
  | 'undetermined'
  | 'unavailable';

export type PrivacyBootstrapResult = {
  trackingConsentStatus: TrackingConsentStatus;
  personalizedAdvertisingAllowed: boolean;
};
