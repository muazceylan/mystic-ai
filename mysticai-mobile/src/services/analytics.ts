export type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(name: string, params?: AnalyticsParams): void {
  // TODO: Replace with real analytics SDK integration.
  if (__DEV__) {
    console.info(`[analytics][${name}]`, params ?? {});
  }
}
