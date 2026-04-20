interface GoogleTag {
  cmd: Array<() => void>;
  enums: {
    OutOfPageFormat: {
      REWARDED: string;
    };
  };
  defineOutOfPageSlot(adUnitPath: string, format: string): Slot | null;
  display(divOrSlot: string | Element | Slot): void;
  destroySlots(slots?: Slot[]): boolean;
  pubads(): PubAdsService;
  enableServices(): void;
}

interface Slot {
  addService(service: PubAdsService): Slot;
}

interface PubAdsService {
  addEventListener<K extends keyof SlotEventMap>(
    eventType: K,
    listener: (event: SlotEventMap[K]) => void
  ): PubAdsService;
}

interface SlotEventMap {
  rewardedSlotReady: RewardedSlotReadyEvent;
  rewardedSlotGranted: RewardedSlotGrantedEvent;
  rewardedSlotClosed: RewardedSlotClosedEvent;
  rewardedSlotVideoCompleted: RewardedSlotVideoCompletedEvent;
  slotRenderEnded: SlotRenderEndedEvent;
}

interface SlotEventData {
  slot: Slot;
}

interface RewardedSlotReadyEvent extends SlotEventData {
  makeRewardedVisible: () => void;
}

interface RewardedSlotGrantedEvent extends SlotEventData {
  payload: RewardedSlotGrantedPayload | null;
}

interface RewardedSlotGrantedPayload {
  type: string;
  amount: number;
}

interface RewardedSlotClosedEvent extends SlotEventData {}
interface RewardedSlotVideoCompletedEvent extends SlotEventData {}

interface SlotRenderEndedEvent extends SlotEventData {
  isEmpty: boolean;
}

interface Window {
  googletag?: GoogleTag;
}
