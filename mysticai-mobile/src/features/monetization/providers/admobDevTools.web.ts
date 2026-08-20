// Web never loads the native Google Mobile Ads SDK (see
// googleMobileAdsRuntime.ts). This stub keeps the same public contract as
// `admobDevTools.native.ts` so callers work unmodified across platforms;
// every operation is a controlled no-op.

export type AdMobAdapterSummary = {
  name: string;
  description: string;
  ready: boolean;
};

export type AdMobDevToolsStatus = {
  enabled: boolean;
  provider: string;
  sdkAvailable: boolean;
  initialized: boolean;
  rewardedUnitId: string | null;
  rewardedUnitMode: 'test' | 'production' | null;
  testDeviceIdCount: number;
  adapters: AdMobAdapterSummary[];
};

export type AdInspectorResult = { ok: true } | { ok: false; reason: string };

export function getAdMobDevToolsStatus(): AdMobDevToolsStatus {
  return {
    enabled: false,
    provider: 'none',
    sdkAvailable: false,
    initialized: false,
    rewardedUnitId: null,
    rewardedUnitMode: null,
    testDeviceIdCount: 0,
    adapters: [],
  };
}

export async function openAdMobInspector(): Promise<AdInspectorResult> {
  // no-op: Ad Inspector ships with the native SDK, which web never loads
  return { ok: false, reason: 'Ad Inspector is unavailable on web.' };
}
