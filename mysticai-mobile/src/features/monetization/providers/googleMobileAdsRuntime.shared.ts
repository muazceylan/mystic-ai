export interface RequestConfiguration {
  maxAdContentRating?: string;
  tagForChildDirectedTreatment?: boolean;
  tagForUnderAgeOfConsent?: boolean;
  testDeviceIdentifiers?: string[];
}

export interface RewardedAdLike {
  addAdEventListener(
    eventType: string,
    listener: (payload?: any) => void,
  ): () => void;
  load(): void;
  show(): void;
}

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
    createForAdRequest(adUnitId: string): RewardedAdLike;
  };
  default(): {
    setRequestConfiguration(config: RequestConfiguration): Promise<void>;
    initialize(): Promise<unknown>;
  };
}
