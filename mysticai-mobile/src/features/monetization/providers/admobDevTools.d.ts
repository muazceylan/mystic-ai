// Type-only resolution shim for the extensionless `./admobDevTools` import
// — mirrors levelPlayDevTools.d.ts.

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

export declare function getAdMobDevToolsStatus(): AdMobDevToolsStatus;

export declare function openAdMobInspector(): Promise<AdInspectorResult>;

export type LoadProbeResult = { ok: true; message: string } | { ok: false; reason: string };

export declare function loadRewardedAdProbe(): Promise<LoadProbeResult>;
