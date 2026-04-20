/**
 * Minimal Google Publisher Tags (GPT) type declarations.
 * Covers only the rewarded-ad API surface used in this project.
 * See: https://developers.google.com/publisher-tag/reference
 */

interface GoogleTag {
  cmd: Array<() => void>;
  defineOutOfPageSlot(adUnitPath: string, format: string): Slot | null;
  defineSlot(adUnitPath: string, size: googletag.GeneralSize, divId: string): Slot | null;
  display(divOrSlot: string | Element | Slot): void;
  destroySlots(slots?: Slot[]): boolean;
  pubads(): PubAdsService;
  enableServices(): void;
  openConsole(): void;
}

interface Slot {
  addService(service: PubAdsService): Slot;
  setTargeting(key: string, value: string | string[]): Slot;
  getAdUnitPath(): string;
  getSlotId(): SlotId;
}

interface SlotId {
  getDomId(): string;
}

interface PubAdsService {
  addEventListener<K extends keyof SlotEventMap>(
    eventType: K,
    listener: (event: SlotEventMap[K]) => void
  ): PubAdsService;
  enableSingleRequest(): PubAdsService;
  collapseEmptyDivs(collapseBeforeAdFetch?: boolean): PubAdsService;
  refresh(slots?: Slot[], options?: { changeCorrelator: boolean }): void;
}

interface SlotEventMap {
  rewardedSlotReady: RewardedSlotReadyEvent;
  rewardedSlotGranted: RewardedSlotGrantedEvent;
  rewardedSlotClosed: RewardedSlotClosedEvent;
  rewardedSlotVideoCompleted: RewardedSlotVideoCompletedEvent;
  slotRenderEnded: SlotRenderEndedEvent;
  impressionViewable: SlotEventData;
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
  size: number[] | string;
  sourceAgnosticCreativeId: number | null;
  sourceAgnosticLineItemId: number | null;
  advertiserId: number | null;
  creativeId: number | null;
  lineItemId: number | null;
}

declare namespace googletag {
  type GeneralSize =
    | SingleSize
    | MultiSize
    | string
    | null;
  type SingleSize = [number, number] | 'fluid';
  type MultiSize = SingleSize[];

  const OutOfPageFormat: {
    REWARDED: string;
    ANCHOR: string;
    BOTTOM_ANCHOR: string;
    INTERSTITIAL: string;
    LEFT_SIDE_RAIL: string;
    RIGHT_SIDE_RAIL: string;
    TOP_ANCHOR: string;
  };
}

declare let googletag: GoogleTag;
