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
    initialize(): Promise<unknown>;
  };
}
