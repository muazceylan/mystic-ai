/**
 * Mirrors `AdapterStatus` from react-native-google-mobile-ads. Re-declared here
 * because this module must stay importable without pulling in the native
 * package (see googleMobileAdsRuntime.native.ts).
 */
export type AdapterStatus = {
  name: string;
  description: string;
  /** 0 = NotReady (unlikely to fill), 1 = Ready. */
  state: number;
};

export interface RequestConfiguration {
  maxAdContentRating?: string;
  tagForChildDirectedTreatment?: boolean;
  tagForUnderAgeOfConsent?: boolean;
  testDeviceIdentifiers?: string[];
}

export interface RewardedAdLike {
  addAdEventListener(
    eventType: string,
    listener: (payload?: RewardedAdEventPayload) => void,
  ): () => void;
  load(): void;
  show(): void;
}

export type RewardedAdEventPayload = {
  message?: string;
  type?: string;
  amount?: number;
};

export type RewardedAdRequestOptions = {
  requestNonPersonalizedAdsOnly?: boolean;
};

export interface GoogleMobileAdsModule {
  TestIds: {
    REWARDED: string;
  };
  MaxAdContentRating: {
    PG: string;
  };
  RewardedAdEventType: {
    LOADED: string;
    EARNED_REWARD: string;
  };
  AdEventType: {
    ERROR: string;
    OPENED: string;
    CLOSED: string;
  };
  RewardedAd: {
    createForAdRequest(
      adUnitId: string,
      requestOptions?: RewardedAdRequestOptions,
    ): RewardedAdLike;
  };
  default(): {
    setRequestConfiguration(config: RequestConfiguration): Promise<void>;
    initialize(): Promise<AdapterStatus[]>;
    /**
     * Opens AdMob's in-app Ad Inspector overlay. Only works on devices
     * registered via `RequestConfiguration.testDeviceIdentifiers`.
     * Resolves when the inspector is closed; rejects if it fails to open.
     */
    openAdInspector(): Promise<void>;
  };
}
