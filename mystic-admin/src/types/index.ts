export interface AdminUser {
  id: number;
  email: string;
  role: 'SUPER_ADMIN' | 'PRODUCT_ADMIN' | 'NOTIFICATION_MANAGER';
}

export type AiProviderAdapter = 'gemini' | 'groq' | 'openrouter' | 'ollama';

export interface AiModelProviderConfig {
  key: string;
  displayName: string;
  adapter: AiProviderAdapter;
  enabled: boolean;
  model: string;
  baseUrl: string;
  apiKey?: string | null;
  localProviderType?: string | null;
  chatEndpoint?: string | null;
  timeoutMs: number;
  retryCount: number;
  cooldownSeconds: number;
  temperature?: number | null;
  maxOutputTokens?: number | null;
  headers: Record<string, string>;
}

export interface AiModelConfig {
  allowMock: boolean;
  complexChain: string[];
  simpleChain: string[];
  providers: AiModelProviderConfig[];
}

export interface AppRoute {
  id: number;
  routeKey: string;
  displayName: string;
  path: string;
  description?: string;
  moduleKey?: string;
  requiresAuth: boolean;
  fallbackRouteKey?: string;
  active: boolean;
  deprecated: boolean;
  supportedPlatforms: 'IOS' | 'ANDROID' | 'BOTH';
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
  updatedBy?: number;
}

export interface AdminNotification {
  id: number;
  title: string;
  body: string;
  category: string;
  priority: string;
  deliveryChannel: 'PUSH' | 'IN_APP' | 'BOTH';
  targetAudience: 'ALL_USERS' | 'TEST_USERS' | 'PREMIUM_USERS';
  routeKey?: string;
  fallbackRouteKey?: string;
  status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'CANCELLED' | 'FAILED';
  scheduledAt?: string;
  active: boolean;
  notes?: string;
  createdByAdminId?: number;
  sentCount?: number;
  failedCount?: number;
  sentAt?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: number;
  actorAdminId?: number;
  actorEmail?: string;
  actorRole?: string;
  actionType: string;
  entityType: string;
  entityId?: string;
  entityDisplay?: string;
  oldValueJson?: string;
  newValueJson?: string;
  createdAt: string;
}

export interface AppModule {
  id: number;
  moduleKey: string;
  displayName: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  isPremium: boolean;
  showOnHome: boolean;
  showOnExplore: boolean;
  showInTabBar: boolean;
  sortOrder: number;
  startDate?: string;
  endDate?: string;
  badgeLabel?: string;
  maintenanceMode: boolean;
  hiddenButDeepLinkable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NavigationItem {
  id: number;
  navKey: string;
  label: string;
  icon?: string;
  routeKey: string;
  isVisible: boolean;
  sortOrder: number;
  platform: 'IOS' | 'ANDROID' | 'BOTH';
  minAppVersion?: string;
  isPremium: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserFull {
  id: number;
  email: string;
  fullName?: string;
  role: 'SUPER_ADMIN' | 'PRODUCT_ADMIN' | 'NOTIFICATION_MANAGER';
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RouteManifestEntry {
  routeKey: string;
  path: string;
  displayName?: string;
  moduleKey?: string;
  requiresAuth: boolean;
  platform: 'IOS' | 'ANDROID' | 'BOTH';
  source: string;
}

export interface RouteSyncResult {
  newRoutes: string[];
  updatedRoutes: string[];
  staleRoutes: string[];
  conflicts: string[];
  dryRun: boolean;
}

export type ZodiacSign =
  | 'ARIES' | 'TAURUS' | 'GEMINI' | 'CANCER' | 'LEO' | 'VIRGO'
  | 'LIBRA' | 'SCORPIO' | 'SAGITTARIUS' | 'CAPRICORN' | 'AQUARIUS' | 'PISCES';

export type CmsStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type HoroscopeSourceType = 'EXTERNAL_API' | 'ADMIN_CREATED' | 'ADMIN_OVERRIDDEN';

export interface WeeklyHoroscope {
  id: number;
  zodiacSign: ZodiacSign;
  weekStartDate: string;
  weekEndDate: string;
  locale: string;
  status: CmsStatus;
  sourceType: HoroscopeSourceType;
  title?: string;
  shortSummary?: string;
  fullContent?: string;
  love?: string;
  career?: string;
  money?: string;
  health?: string;
  social?: string;
  luckyDay?: string;
  cautionDay?: string;
  luckyColor?: string;
  luckyNumber?: string;
  isOverrideActive: boolean;
  ingestedAt?: string;
  ingestError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyHoroscope {
  id: number;
  zodiacSign: ZodiacSign;
  date: string;
  locale: string;
  status: CmsStatus;
  sourceType: HoroscopeSourceType;
  title?: string;
  shortSummary?: string;
  fullContent?: string;
  love?: string;
  career?: string;
  money?: string;
  health?: string;
  luckyColor?: string;
  luckyNumber?: string;
  isOverrideActive: boolean;
  ingestedAt?: string;
  ingestError?: string;
  createdAt: string;
  updatedAt: string;
}

export type PrayerContentType = 'DUA' | 'ESMA' | 'SURE';

export type PrayerCategory =
  | 'MORNING' | 'EVENING' | 'GRATITUDE' | 'PROTECTION' | 'HEALING'
  | 'FORGIVENESS' | 'GUIDANCE' | 'ABUNDANCE' | 'GENERAL';

export interface PrayerContent {
  id: number;
  title: string;
  arabicText?: string;
  transliteration?: string;
  meaning?: string;
  meaningEn?: string;
  contentType?: PrayerContentType;
  category: PrayerCategory;
  locale: string;
  status: CmsStatus;
  suggestedCount?: number;
  tags?: string;
  isFeatured: boolean;
  isPremium: boolean;
  isActive: boolean;
  audioUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  todayCreated: number;
  scheduled: number;
  sent: number;
  failed: number;
  activeRoutes: number;
  deprecatedRoutes: number;
  discoveredUnregisteredRoutes: number;
  staleRoutes: number;
  activeModules: number;
  inactiveModules: number;
  maintenanceModeModules: number;
  visibleTabs: number;
  totalAdminUsers: number;
  publishedWeeklyHoroscopes: number;
  missingWeeklyHoroscopesThisWeek: number;
  publishedDailyHoroscopes: number;
  publishedPrayers: number;
  featuredPrayers: number;
  activeTriggers: number;
  disabledTriggers: number;
  triggersRanLast24h: number;
  failedTriggers: number;
  // Content CMS
  publishedHomeSections: number;
  publishedExploreCategories: number;
  publishedExploreCards: number;
  activeBanners: number;
  recentAuditLogs: AuditLog[];
  recentNotifications: AdminNotification[];
}

export interface AppUserSummary {
  id: number;
  email: string;
  name?: string | null;
  userType: 'REGISTERED' | 'GUEST';
  createdAt: string;
  emailVerifiedAt?: string | null;
}

export interface AppUserStats {
  totalUsers: number;
  registeredUsers: number;
  guestUsers: number;
  verifiedUsers: number;
}

export interface ProductAnalyticsTopScreen {
  screenKey: string;
  routePath: string;
  visits: number;
  uniqueUsers: number;
  lastSeenAt?: string | null;
}

export interface ProductAnalyticsOverview {
  windowDays: number;
  activeWithinDays: number;
  trackedScreenViews: number;
  screenViewsToday: number;
  trackedUsers: number;
  activeUsers: number;
  latestTrackedAt?: string | null;
  topScreens: ProductAnalyticsTopScreen[];
}

export interface ProductAnalyticsActiveUser {
  userId: number;
  screenViews: number;
  screenLastSeenAt?: string | null;
  pushLastSeenAt?: string | null;
  lastActiveAt?: string | null;
}

export interface ProductAnalyticsGa4ExportResult {
  enabled: boolean;
  exported: boolean;
  measurementId?: string | null;
  targetUrl?: string | null;
  eventCount: number;
  exportedAt?: string | null;
  eventNames: string[];
  message: string;
}

// ── Guest Funnel ──────────────────────────────────────────

export interface GuestStats {
  totalGuests: number;
  convertedToday: number;
  staleGuests: number;
  conversionRatePct: number;
}

// ── Content CMS — Home / Explore / Banners ────────────────

export type CmsContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type HomeSectionType =
  | 'HERO_BANNER' | 'DAILY_HIGHLIGHT' | 'QUICK_ACTIONS' | 'FEATURED_CARD'
  | 'MODULE_PROMO' | 'WEEKLY_SUMMARY' | 'PRAYER_HIGHLIGHT' | 'CUSTOM_CARD_GROUP';

export interface HomeSection {
  id: number;
  sectionKey: string;
  title: string;
  subtitle?: string;
  type: HomeSectionType;
  status: CmsContentStatus;
  isActive: boolean;
  sortOrder: number;
  routeKey?: string;
  fallbackRouteKey?: string;
  icon?: string;
  imageUrl?: string;
  ctaLabel?: string;
  badgeLabel?: string;
  startDate?: string;
  endDate?: string;
  payloadJson?: string;
  locale: string;
  createdByAdminId?: number;
  updatedByAdminId?: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExploreCategory {
  id: number;
  categoryKey: string;
  title: string;
  subtitle?: string;
  icon?: string;
  status: CmsContentStatus;
  isActive: boolean;
  sortOrder: number;
  startDate?: string;
  endDate?: string;
  locale: string;
  createdByAdminId?: number;
  updatedByAdminId?: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExploreCard {
  id: number;
  cardKey: string;
  categoryKey: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  routeKey?: string;
  fallbackRouteKey?: string;
  ctaLabel?: string;
  status: CmsContentStatus;
  isActive: boolean;
  isFeatured: boolean;
  isPremium: boolean;
  sortOrder: number;
  startDate?: string;
  endDate?: string;
  locale: string;
  payloadJson?: string;
  createdByAdminId?: number;
  updatedByAdminId?: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type BannerPlacementType = 'HOME_HERO' | 'HOME_INLINE' | 'EXPLORE_HERO' | 'EXPLORE_INLINE';

export interface PlacementBanner {
  id: number;
  bannerKey: string;
  placementType: BannerPlacementType;
  title: string;
  subtitle?: string;
  imageUrl: string;
  ctaLabel?: string;
  routeKey?: string;
  fallbackRouteKey?: string;
  status: CmsContentStatus;
  isActive: boolean;
  priority: number;
  startDate?: string;
  endDate?: string;
  locale: string;
  createdByAdminId?: number;
  updatedByAdminId?: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Tutorial Config CMS ──────────────────────────────────

export type TutorialPlatform = 'MOBILE' | 'IOS' | 'ANDROID' | 'WEB' | 'ALL';
export type TutorialConfigStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type TutorialPresentationType = 'SPOTLIGHT_CARD' | 'FULLSCREEN_CAROUSEL' | 'INLINE_HINT';

export interface TutorialConfigStep {
  id?: number;
  stepId: string;
  orderIndex: number;
  title: string;
  body: string;
  targetKey: string;
  iconKey?: string;
  presentationType?: TutorialPresentationType;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TutorialConfigSummary {
  id: number;
  tutorialId: string;
  name: string;
  screenKey: string;
  locale?: string;
  platform: TutorialPlatform;
  version: number;
  status: TutorialConfigStatus;
  isActive: boolean;
  priority: number;
  updatedBy?: string;
  updatedAt: string;
}

export interface TutorialConfig {
  id: number;
  tutorialId: string;
  name: string;
  screenKey: string;
  platform: TutorialPlatform;
  version: number;
  status: TutorialConfigStatus;
  isActive: boolean;
  priority: number;
  presentationType: TutorialPresentationType;
  startAt?: string;
  endAt?: string;
  description?: string;
  audienceRules?: string;
  minAppVersion?: string;
  maxAppVersion?: string;
  locale?: string;
  experimentKey?: string;
  rolloutPercentage?: number;
  createdBy?: string;
  updatedBy?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  steps: TutorialConfigStep[];
}

export interface TutorialConfigUpsertRequest {
  tutorialId: string;
  name: string;
  screenKey: string;
  platform: TutorialPlatform;
  version: number;
  isActive: boolean;
  priority: number;
  presentationType: TutorialPresentationType;
  startAt?: string;
  endAt?: string;
  description?: string;
  audienceRules?: string;
  minAppVersion?: string;
  maxAppVersion?: string;
  locale?: string;
  experimentKey?: string;
  rolloutPercentage?: number;
  status?: Exclude<TutorialConfigStatus, 'PUBLISHED'>;
  steps: Array<{
    stepId: string;
    orderIndex: number;
    title: string;
    body: string;
    targetKey: string;
    iconKey?: string;
    presentationType?: TutorialPresentationType;
    isActive: boolean;
  }>;
}

export interface TutorialContractOptions {
  screenKeys: string[];
  targetKeysByScreen: Record<string, string[]>;
  platformOptions: TutorialPlatform[];
  presentationTypeOptions: TutorialPresentationType[];
  statusOptions: TutorialConfigStatus[];
}

export interface TutorialConfigBootstrapResponse {
  createdCount: number;
  skippedCount: number;
  totalCount: number;
}

// ── Notification Catalog ──────────────────────────────────

export type NotifChannelType = 'PUSH' | 'IN_APP' | 'BOTH';
export type NotifCadenceType = 'HOURLY' | 'DAILY' | 'WEEKLY' | 'EVENT_DRIVEN' | 'MANUAL' | 'SCHEDULED';
export type NotifSourceType = 'STATIC_BACKEND' | 'ADMIN_PANEL' | 'HYBRID';
export type NotifTriggerType = 'CRON' | 'USER_ACTION' | 'SYSTEM_EVENT' | 'MANUAL';

export interface NotificationDefinition {
  id: number;
  definitionKey: string;
  displayName: string;
  description?: string;
  category?: string;
  channelType: NotifChannelType;
  cadenceType: NotifCadenceType;
  sourceType: NotifSourceType;
  triggerType: NotifTriggerType;
  defaultRouteKey?: string;
  defaultFallbackRouteKey?: string;
  isActive: boolean;
  isEditable: boolean;
  isVisibleInAdmin: boolean;
  isSystemCritical: boolean;
  ownerModule?: string;
  codeReference?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Notification Triggers ─────────────────────────────────

export type TriggerSourceType = 'STATIC_BACKEND' | 'ADMIN_SCHEDULED';
export type TriggerCadenceType = 'HOURLY' | 'DAILY' | 'WEEKLY' | 'EVENT_DRIVEN' | 'MANUAL';
export type TriggerRunStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'DISABLED';

export interface NotificationTrigger {
  id: number;
  triggerKey: string;
  definitionKey?: string;
  displayName: string;
  description?: string;
  sourceType: TriggerSourceType;
  cadenceType: TriggerCadenceType;
  cronExpression?: string;
  fixedDelayMs?: number;
  timezone?: string;
  isActive: boolean;
  isPausable: boolean;
  isSystemCritical: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  lastRunStatus?: TriggerRunStatus;
  lastRunMessage?: string;
  lastProducedCount?: number;
  ownerModule?: string;
  codeReference?: string;
  createdAt: string;
  updatedAt: string;
}

export type NameSourceName = 'BEBEKISMI' | 'SFK_ISTANBUL_EDU' | 'ALFABETIK' | 'UFUK';
export type NameReviewStatus = 'PENDING' | 'IN_REVIEW' | 'SKIPPED' | 'APPROVED' | 'REJECTED' | 'MERGED';
export type NameMergeRecommendationStatus = 'AUTO_MERGE_ELIGIBLE' | 'MERGE_SUGGESTED' | 'MANUAL_REVIEW_REQUIRED';

export interface NameReviewCandidate {
  candidateId: number;
  rawEntryId: number;
  sourceName: NameSourceName;
  sourceUrl: string;
  displayName: string;
  normalizedName: string;
  gender: 'MALE' | 'FEMALE' | 'UNISEX' | 'UNKNOWN' | null;
  meaningShort?: string | null;
  meaningLong?: string | null;
  origin?: string | null;
  characterTraitsText?: string | null;
  letterAnalysisText?: string | null;
  quranFlag?: boolean | null;
  sourceConfidence: number;
  mismatchFlag: boolean;
  duplicateContentFlag: boolean;
  contentQuality: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface NameReviewConflictValue {
  candidateId: number;
  sourceName: NameSourceName;
  displayName: string;
  value: string;
}

export interface NameReviewConflictField {
  field: string;
  values: NameReviewConflictValue[];
}

export interface NameReviewGroup {
  queueId: number;
  canonicalName: string;
  reviewStatus: NameReviewStatus;
  chosenSource?: NameSourceName | null;
  reviewNote?: string | null;
  hasConflict: boolean;
  conflictingFields: string[];
  conflictDetails: NameReviewConflictField[];
  candidates: NameReviewCandidate[];
  mergeRecommendationStatus: NameMergeRecommendationStatus;
  recommendedCanonicalNameId?: number | null;
  recommendedCanonicalName?: string | null;
  recommendedFieldSources?: Record<string, NameSourceName> | null;
  autoMergeEligible: boolean;
  autoMergeReasonSummary?: string | null;
  mergeConfidence?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface NameReviewActionResponse {
  queueId: number;
  canonicalName: string;
  reviewStatus: NameReviewStatus;
  nameId?: number | null;
  auditId: number;
  selectedCandidateId?: number | null;
  selectedSource?: NameSourceName | null;
  selectedFieldSources?: Record<string, NameSourceName>;
  reviewNote?: string | null;
}

export interface NameReviewBatchActionResult {
  queueId: number;
  success: boolean;
  reviewStatus?: NameReviewStatus | null;
  nameId?: number | null;
  error?: string | null;
}

export interface NameReviewBatchActionResponse {
  processed: number;
  succeeded: number;
  failed: number;
  results: NameReviewBatchActionResult[];
}

export type NameStatus = 'PENDING_REVIEW' | 'ACTIVE' | 'HIDDEN' | 'REJECTED';
export type NameGender = 'MALE' | 'FEMALE' | 'UNISEX' | 'UNKNOWN';

export interface AdminNameListItem {
  id: number;
  name: string;
  normalizedName: string;
  gender: NameGender | null;
  origin?: string | null;
  meaningShort?: string | null;
  status: NameStatus;
  quranFlag?: boolean | null;
  dataQualityScore?: number | null;
  tagSummary?: string[] | null;
  hasAliases: boolean;
  aliasCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminNameCanonicalInfo {
  id: number;
  name: string;
  normalizedName: string;
}

export interface AdminNameTag {
  id: number;
  nameId: number;
  tagGroup: 'STYLE' | 'VIBE' | 'THEME' | 'CULTURE' | 'RELIGION' | 'USAGE' | null;
  tagValue: string;
  normalizedTag: string;
  source: 'MANUAL' | 'RULE' | 'AI' | 'AUTO';
  confidence: number;
  evidence?: string | null;
  enrichmentVersion?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminNameAlias {
  id: number;
  canonicalNameId: number;
  canonicalName: string;
  canonicalNormalizedName: string;
  aliasName: string;
  normalizedAliasName: string;
  aliasType: string;
  confidence: number;
  isManual: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NameTagTaxonomyGroup {
  group: 'STYLE' | 'VIBE' | 'THEME' | 'CULTURE' | 'RELIGION' | 'USAGE';
  values: string[];
}

export interface NameTagTaxonomy {
  groups: NameTagTaxonomyGroup[];
}

export interface AdminNameDetail {
  id: number;
  name: string;
  normalizedName: string;
  gender: NameGender | null;
  origin?: string | null;
  meaningShort?: string | null;
  meaningLong?: string | null;
  characterTraitsText?: string | null;
  letterAnalysisText?: string | null;
  quranFlag?: boolean | null;
  status: NameStatus;
  dataQualityScore?: number | null;
  tagSummary?: string[] | null;
  canonicalInfo: AdminNameCanonicalInfo;
  aliases: AdminNameAlias[];
  tags: AdminNameTag[];
  createdAt: string;
  updatedAt: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface IngestStatus {
  apiSource: string;
  schedule: string;
  nextScheduledAt: string;
  lastIngestDate: string | null;
  lastIngestAt: string | null;
  successCount: number;
  failureCount: number;
}

// ── Monetization ──────────────────────────────────────────

export type MonetizationSettingsStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface MonetizationSettings {
  id: number;
  settingsKey: string;
  isEnabled: boolean;
  isAdsEnabled: boolean;
  isGuruEnabled: boolean;
  isGuruPurchaseEnabled: boolean;
  defaultAdProvider: string;
  defaultCurrency: string;
  globalDailyAdCap: number;
  globalWeeklyAdCap: number;
  globalMinHoursBetweenOffers: number;
  globalMinSessionsBetweenOffers: number;
  environmentRulesJson?: string;
  rolloutRulesJson?: string;
  status: MonetizationSettingsStatus;
  configVersion: number;
  publishedByAdminId?: number;
  publishedAt?: string;
  createdByAdminId?: number;
  updatedByAdminId?: number;
  createdAt: string;
  updatedAt: string;
}

export type AdStrategy = 'ON_ENTRY' | 'ON_DETAIL_CLICK' | 'ON_CTA_CLICK' | 'USER_TRIGGERED_ONLY' | 'MIXED';
export type AdOfferFrequencyMode = 'EVERY_N_ENTRIES' | 'TIME_BASED' | 'SESSION_BASED' | 'COMBINED';
export type PreviewDepthMode = 'NONE' | 'SUMMARY_ONLY' | 'PARTIAL_CONTENT' | 'FULL_WITH_BLUR';
export type ModuleRolloutStatus = 'DISABLED' | 'INTERNAL_ONLY' | 'PERCENTAGE_ROLLOUT' | 'ENABLED';

export interface ModuleMonetizationRule {
  id: number;
  moduleKey: string;
  isEnabled: boolean;
  isAdsEnabled: boolean;
  isGuruEnabled: boolean;
  isGuruPurchaseEnabled: boolean;
  adStrategy: AdStrategy;
  adProvider: string;
  adFormats: string;
  firstNEntriesWithoutAd: number;
  adOfferStartEntry: number;
  adOfferFrequencyMode: AdOfferFrequencyMode;
  minimumSessionsBetweenOffers: number;
  minimumHoursBetweenOffers: number;
  dailyOfferCap: number;
  weeklyOfferCap: number;
  isOnlyUserTriggeredOffer: boolean;
  isShowOfferOnDetailClick: boolean;
  isShowOfferOnSecondEntry: boolean;
  guruRewardAmountPerCompletedAd: number;
  guruCostsByActionJson?: string;
  isAllowFreePreview: boolean;
  previewDepthMode: PreviewDepthMode;
  rolloutStatus: ModuleRolloutStatus;
  platformOverridesJson?: string;
  localeOverridesJson?: string;
  configVersion: number;
  createdByAdminId?: number;
  updatedByAdminId?: number;
  createdAt: string;
  updatedAt: string;
}

export type UnlockType = 'FREE' | 'AD_WATCH' | 'GURU_SPEND' | 'AD_OR_GURU' | 'PURCHASE_ONLY';

export interface MonetizationAction {
  id: number;
  actionKey: string;
  moduleKey: string;
  displayName?: string;
  description?: string;
  unlockType: UnlockType;
  guruCost: number;
  rewardAmount: number;
  isAdRequired: boolean;
  isPurchaseRequired: boolean;
  isPreviewAllowed: boolean;
  isEnabled: boolean;
  displayPriority: number;
  createdByAdminId?: number;
  updatedByAdminId?: number;
  createdAt: string;
  updatedAt: string;
}

export type GuruProductType = 'CONSUMABLE' | 'BUNDLE' | 'SUBSCRIPTION_BONUS' | 'PROMOTIONAL';
export type GuruProductRolloutStatus = 'DISABLED' | 'INTERNAL_ONLY' | 'ENABLED';

export interface GuruProductCatalog {
  id: number;
  productKey: string;
  productType: GuruProductType;
  title: string;
  description?: string;
  guruAmount: number;
  bonusGuruAmount: number;
  price?: string;
  currency: string;
  iosProductId?: string;
  androidProductId?: string;
  isEnabled: boolean;
  sortOrder: number;
  badge?: string;
  campaignLabel?: string;
  rolloutStatus: GuruProductRolloutStatus;
  localeTargetingJson?: string;
  regionTargetingJson?: string;
  startDate?: string;
  endDate?: string;
  createdByAdminId?: number;
  updatedByAdminId?: number;
  createdAt: string;
  updatedAt: string;
}

export type WalletStatus = 'ACTIVE' | 'SUSPENDED' | 'FROZEN';

export interface GuruWallet {
  id: number;
  userId: number;
  currentBalance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  lifetimePurchased: number;
  lastEarnedAt?: string;
  lastSpentAt?: string;
  status: WalletStatus;
  createdAt: string;
  updatedAt: string;
}

export type GuruTransactionType = 'REWARD_EARNED' | 'GURU_SPENT' | 'PURCHASE_COMPLETED' | 'ADMIN_GRANT' | 'ADMIN_REVOKE' | 'REFUND_ADJUSTMENT' | 'MIGRATION_ADJUSTMENT' | 'WELCOME_BONUS';
export type GuruSourceType = 'REWARDED_AD' | 'ACTION_UNLOCK' | 'GURU_PURCHASE' | 'ADMIN' | 'SYSTEM' | 'PROMOTIONAL';

export interface GuruLedger {
  id: string;
  userId: number;
  transactionType: GuruTransactionType;
  sourceType: GuruSourceType;
  sourceKey?: string;
  moduleKey?: string;
  actionKey?: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  platform?: string;
  locale?: string;
  metadataJson?: string;
  idempotencyKey?: string;
  createdAt: string;
}

export interface SimulationRequest {
  moduleKey: string;
  actionKey?: string;
  entryCount: number;
  dailyAdCount: number;
  weeklyAdCount: number;
  hoursSinceLastOffer: number;
  walletBalance: number;
  platform?: string;
  locale?: string;
}

export interface SimulationResult {
  monetizationActive: boolean;
  adOfferEligible: boolean;
  guruUnlockAvailable: boolean;
  purchaseFallbackAvailable: boolean;
  decisions: string[];
  warnings: string[];
}
