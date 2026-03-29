// ─── Spiritual Item & Custom Set Types ────────────────────────────────────

export type SpiritualItemType = 'esma' | 'dua' | 'sure';

export interface CustomSetItem {
  itemType: SpiritualItemType;
  itemId: number;
  order: number;
  targetCount?: number;
}

export interface CustomSet {
  id: string;
  name: string;
  items: CustomSetItem[];
  createdAt: string;
  updatedAt: string;
}

export interface BreathingTechnique {
  id: string;
  titleTr: string;
  description: string;
  benefits: string[];
  pattern: { inhale: number; hold1?: number; exhale: number; hold2?: number };
  defaultDurationSec: number;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  icon: string;
}

// ─── Local Content Types ──────────────────────────────────────────────────

export interface ContentSource {
  provider: string;
  ref: string;
  licenseNote: string;
}

export interface EsmaItem {
  id: number;
  order: number;
  nameAr: string;
  nameTr: string;
  transliteration: string;
  meaningTr: string;
  meaningEn?: string;
  shortBenefit: string;
  defaultTargetCount: number;
  tags: string[];
  sources: ContentSource[];
}

export interface DuaItem {
  id: number;
  title: string;
  category: string;
  arabic: string;
  transliteration: string;
  meaningTr: string;
  meaningEn?: string;
  shortBenefit: string;
  defaultTargetCount: number;
  tags: string[];
  relatedAyahRef?: { surah: string; ayah: number } | null;
  sources: ContentSource[];
}

// ─── Journal & Session Types ──────────────────────────────────────────────

export interface JournalEntry {
  id: string;
  dateISO: string;           // YYYY-MM-DD
  itemType: 'esma' | 'dua';
  itemId: number;
  itemName: string;
  target: number;
  completed: number;
  durationSec: number;
  note?: string;
  createdAt: string;         // ISO datetime
}

export interface DhikrSessionLocal {
  id: string;
  startedAt: string;         // ISO datetime
  endedAt: string;           // ISO datetime
  taps: number;
  target: number;
  completed: boolean;
  itemType: 'esma' | 'dua';
  itemId: number;
  itemName: string;
}

// ─── Settings Types ───────────────────────────────────────────────────────

export interface SpiritualSettings {
  hapticEnabled: boolean;
  soundEnabled: boolean;
  autoSaveEnabled: boolean;
  defaultFontScale: number;
  keepScreenAwake: boolean;
  pushNotificationsEnabled: boolean;
}

// ─── Bar Chart Data ────────────────────────────────────────────────────────

export interface BarChartDataPoint {
  label: string;  // e.g. "26 Şub"
  value: number;  // raw integer
  dateISO: string;
}

// ─── Existing API Types (unchanged) ─────────────────────────────────────

export type Mood =
  | 'MUTLU'
  | 'SAKIN'
  | 'GERGIN'
  | 'YORGUN'
  | 'ODAKLI'
  | 'SUKURLU'
  | 'DIGER';

export interface DailyPrayerItem {
  order: number;
  prayerId: number;
  title: string;
  category: string;
  recommendedRepeatCount: number;
  estimatedReadSeconds: number;
  userProgressCount: number;
  isCompletedToday: boolean;
}

export interface DailyPrayerSetResponse {
  date: string;
  scope: 'GLOBAL' | 'PER_USER';
  setId: number;
  variant: '3_DUA' | '5_DUA';
  items: DailyPrayerItem[];
}

export interface PrayerDetail {
  id: number;
  title: string;
  category: string;
  sourceLabel: string;
  sourceNote?: string | null;
  arabicText?: string | null;
  transliterationTr: string;
  meaningTr: string;
  recommendedRepeatCount: number;
  estimatedReadSeconds: number;
  isFavoritable: boolean;
  isFavorite?: boolean;
  disclaimerText?: string | null;
}

export interface DailyAsmaResponse {
  date: string;
  scope: 'GLOBAL' | 'PER_USER';
  asmaId: number;
  orderNo: number;
  arabicName: string;
  transliterationTr: string;
  meaningTr: string;
  reflectionTextTr: string;
  theme?: string | null;
  recommendedDhikrCount?: number | null;
  sourceNote?: string | null;
}

export interface AsmaListItem {
  id: number;
  orderNo: number;
  arabicName: string;
  transliterationTr: string;
  meaningTr: string;
  theme?: string | null;
  recommendedDhikrCount?: number | null;
}

export interface AsmaDetail {
  id: number;
  orderNo: number;
  arabicName: string;
  transliterationTr: string;
  meaningTr: string;
  reflectionTextTr: string;
  theme?: string | null;
  recommendedDhikrCount?: number | null;
  sourceNote?: string | null;
}

export interface DailyMeditationResponse {
  date: string;
  scope: 'GLOBAL' | 'PER_USER';
  exerciseId: number;
  title: string;
  type: 'BREATHING' | 'MEDITATION' | 'BODY_SCAN' | string;
  focusTheme: string;
  durationSec: number;
  stepsJson: string;
  breathingPatternJson?: string | null;
  animationMode?: string | null;
  backgroundAudioEnabledByDefault?: boolean | null;
  disclaimerText?: string | null;
}

export interface DhikrLogResponse {
  id: number;
  userId: number;
  date: string;
  entryType: 'PRAYER' | 'ASMA';
  prayerId?: number | null;
  asmaId?: number | null;
  totalRepeatCount: number;
  sessionCount: number;
  mood?: Mood | null;
  note?: string | null;
  updatedAt: string;
  queuedOffline?: boolean;
}

export interface MeditationLogResponse {
  id: number;
  userId: number;
  date: string;
  exerciseId: number;
  targetDurationSec: number;
  actualDurationSec: number;
  completedCycles?: number | null;
  moodBefore?: Mood | null;
  moodAfter?: Mood | null;
  status: string;
  createdAt: string;
  queuedOffline?: boolean;
}

export type PendingSpiritualLogKind = 'PRAYER_LOG' | 'ASMA_LOG' | 'MEDITATION_LOG';

export interface PendingSpiritualLogJob {
  id: string;
  kind: PendingSpiritualLogKind;
  endpoint: string;
  payload: Record<string, unknown>;
  createdAt: string;
  retries: number;
  lastError?: string;
}


export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface WeeklyStatsResponse {
  week: string;
  totalPrayerRepeats: number;
  totalAsmaRepeats: number;
  totalMeditationSec: number;
  topPrayer?: {
    prayerId: number;
    title: string;
    repeatCount: number;
  } | null;
  streakDays: number;
  activeDays: number;
}

export interface ShortPrayerItem {
  id: number;
  title: string;
  category: string;
  recommendedRepeatCount: number;
  estimatedReadSeconds: number;
  sourceLabel: string;
}

export interface UserPreferences {
  userId: number;
  contentLanguage: 'tr' | 'en' | 'ar' | string;
  fontScale: number;
  readingModeEnabled: boolean;
  keepScreenAwake: boolean;
  ttsEnabled: boolean;
  ttsDefaultLang?: 'tr' | 'en' | 'ar' | string | null;
  ttsVoiceId?: string | null;
  prayerCounterHaptic: boolean;
  reminderEnabled: boolean;
  reminderScheduleJson?: string | null;
  shortPrayersEnabled: boolean;
  privacyExportEnabled: boolean;
  abOverridesJson?: string | null;
}

export interface UpdateUserPreferencesInput {
  contentLanguage?: 'tr' | 'en' | 'ar';
  fontScale?: number;
  readingModeEnabled?: boolean;
  keepScreenAwake?: boolean;
  ttsEnabled?: boolean;
  ttsDefaultLang?: 'tr' | 'en' | 'ar';
  ttsVoiceId?: string;
  prayerCounterHaptic?: boolean;
  reminderEnabled?: boolean;
  reminderScheduleJson?: string;
  shortPrayersEnabled?: boolean;
  privacyExportEnabled?: boolean;
  abOverridesJson?: string;
}

export interface FavoriteStatusResponse {
  prayerId: number;
  favorite: boolean;
}

export interface CreateContentReportInput {
  contentType: 'PRAYER' | 'ASMA' | 'MEDITATION';
  contentId: number;
  reason: string;
  note?: string;
}

export interface ContentReportResponse {
  id: number;
  userId: number;
  contentType: string;
  contentId: number;
  reason: string;
  note?: string | null;
  status: string;
  createdAt: string;
}
