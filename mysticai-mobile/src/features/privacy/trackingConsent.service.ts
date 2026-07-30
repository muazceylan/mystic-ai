import { Platform } from 'react-native';
import type {
  getTrackingPermissionsAsync as GetTrackingPermissionsAsyncFn,
  isAvailable as IsAvailableFn,
  requestTrackingPermissionsAsync as RequestTrackingPermissionsAsyncFn,
  PermissionResponse,
} from 'expo-tracking-transparency';
import type {
  PrivacyBootstrapResult,
  TrackingConsentStatus,
} from './trackingConsent.types';

// expo-tracking-transparency has no web implementation and throws
// "Cannot find native module" at import time (not call time), so it must
// never be required outside iOS or it crashes the whole app on web bootstrap.
let trackingTransparency: {
  getTrackingPermissionsAsync: typeof GetTrackingPermissionsAsyncFn;
  isAvailable: typeof IsAvailableFn;
  requestTrackingPermissionsAsync: typeof RequestTrackingPermissionsAsyncFn;
} | null = null;

if (Platform.OS === 'ios') {
  try {
    trackingTransparency = require('expo-tracking-transparency');
  } catch (error) {
    if (__DEV__) {
      console.warn('[ATT] Native module unavailable; treating as unavailable.', error);
    }
    trackingTransparency = null;
  }
}

let requestPromise: Promise<TrackingConsentStatus> | null = null;
let finalStatus: TrackingConsentStatus | null = null;

function log(message: string, detail?: unknown): void {
  if (!__DEV__) return;
  if (detail === undefined) {
    console.log(`[ATT] ${message}`);
  } else {
    console.warn(`[ATT] ${message}`, detail);
  }
}

function mapPermissionResponse(response: PermissionResponse): TrackingConsentStatus {
  // Keep the explicit restricted branch for native permission implementations
  // that preserve ATTrackingManager.AuthorizationStatus.restricted.
  const nativeStatus: string = response.status;
  if (nativeStatus === 'granted') return 'granted';
  if (nativeStatus === 'restricted') return 'restricted';
  if (nativeStatus === 'undetermined') return 'undetermined';
  return 'denied';
}

export async function getTrackingConsentStatus(): Promise<TrackingConsentStatus> {
  if (!trackingTransparency || !trackingTransparency.isAvailable()) {
    return 'unavailable';
  }

  try {
    const response = await trackingTransparency.getTrackingPermissionsAsync();
    const status = mapPermissionResponse(response);
    log(`Current status: ${status}`);
    return status;
  } catch (error) {
    log('Unable to read status; using privacy-safe default.', error);
    return 'unavailable';
  }
}

export async function requestTrackingConsent(): Promise<TrackingConsentStatus> {
  if (finalStatus) return finalStatus;
  if (requestPromise) return requestPromise;

  requestPromise = (async () => {
    if (!trackingTransparency || !trackingTransparency.isAvailable()) {
      finalStatus = 'unavailable';
      return finalStatus;
    }

    try {
      const current = await trackingTransparency.getTrackingPermissionsAsync();
      const currentStatus = mapPermissionResponse(current);
      log(`Current status: ${currentStatus}`);

      if (currentStatus !== 'undetermined' || !current.canAskAgain) {
        finalStatus = currentStatus;
        log(`Final status: ${finalStatus}`);
        return finalStatus;
      }

      log('Requesting system authorization');
      const requested = await trackingTransparency.requestTrackingPermissionsAsync();
      finalStatus = mapPermissionResponse(requested);
      log(`Final status: ${finalStatus}`);
      return finalStatus;
    } catch (error) {
      finalStatus = 'unavailable';
      log('Authorization failed; using privacy-safe default.', error);
      return finalStatus;
    } finally {
      requestPromise = null;
    }
  })();

  return requestPromise;
}

export function isPersonalizedAdvertisingAllowed(
  status: TrackingConsentStatus,
): boolean {
  return status === 'granted';
}

export async function bootstrapTrackingConsent(): Promise<PrivacyBootstrapResult> {
  const trackingConsentStatus = await requestTrackingConsent();
  return {
    trackingConsentStatus,
    personalizedAdvertisingAllowed:
      isPersonalizedAdvertisingAllowed(trackingConsentStatus),
  };
}
