export type MoodTag =
  | 'Sosyal'
  | 'Odak'
  | 'Duygusal'
  | 'Cesur'
  | 'Sakin'
  | 'Social'
  | 'Focus'
  | 'Emotional'
  | 'Bold'
  | 'Calm';

export type HeroIconKey =
  | 'saturn'
  | 'moon'
  | 'venus'
  | 'mars'
  | 'mercury'
  | 'jupiter'
  | 'sun';

export type GradientKey = 'purpleMist' | 'nightSky' | 'sunrise';

export interface DailyTransitsDTO {
  date: string;
  title: string;
  hero: {
    headline: string;
    supporting: string;
    moodTag: MoodTag;
    intensity: number;
    icon: HeroIconKey;
    gradientKey: GradientKey;
  };
  quickFacts: Array<{
    id: string;
    label: string;
    value: string;
    icon: string;
  }>;
  todayCanDo: {
    headline: string;
    body: string;
    ctaText: string;
    ctaRoute: 'TodayActions' | string;
  };
  focusPoints: Array<{
    id: string;
    text: string;
    priority: 1 | 2 | 3;
  }>;
  retrogrades: Array<{
    planet: string;
    meaningPlain: string;
    riskLevel: 'Low' | 'Med' | 'High';
  }>;
  transits: Array<{
    id: string;
    titlePlain: string;
    impactPlain: string;
    label: 'Destekleyici' | 'Dikkat' | 'Supportive' | 'Caution';
    theme:
      | 'İletişim'
      | 'Aşk'
      | 'İş'
      | 'Ruh Hali'
      | 'Enerji'
      | 'Communication'
      | 'Love'
      | 'Work'
      | 'Mood'
      | 'Energy';
    timeWindow?: string;
    confidence: number;
    technical?: {
      transitPlanet: string;
      natalPoint: string;
      aspect: string;
      orb: number;
      exactAt?: string;
      house?: string;
    };
  }>;
}

/** How much real user data backed the plan; drives the "prepared from your chart" badge. */
export type PersonalizationLevel = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Life areas a plan item can address. Mirrors the backend `LifeArea` enum; used for icons and
 * localized category labels.
 */
export type PlanLifeArea =
  | 'relationship'
  | 'family'
  | 'social'
  | 'money'
  | 'work'
  | 'boundaries'
  | 'emotional_balance'
  | 'communication'
  | 'decision'
  | 'rest'
  | 'creativity';

export interface PlanTimeWindow {
  label: string;
  /** Local "HH:mm"; null when no real intraday signal produced one. */
  start?: string | null;
  end?: string | null;
}

/**
 * Machine-readable astrological justification. Never render this directly — show `why` instead.
 */
export interface PlanAstroBasis {
  type: string;
  planet?: string | null;
  target?: string | null;
  aspect?: string | null;
}

export interface PlanMainTheme {
  title: string;
  description: string;
  why?: string | null;
  astrologicalBasis?: PlanAstroBasis[];
}

export interface PlanPrimaryAction {
  id: string;
  category: PlanLifeArea | string;
  categoryLabel: string;
  title: string;
  description: string;
  timeWindow?: PlanTimeWindow | null;
  why?: string | null;
  isDone: boolean;
  doneAt?: string | null;
  relatedTransitIds?: string[];
}

export interface PlanTimeSlot {
  id: string;
  label: string;
  startTime?: string | null;
  endTime?: string | null;
  title: string;
  description: string;
}

export interface PlanLifeAreaCard {
  id: string;
  category: PlanLifeArea | string;
  categoryLabel: string;
  title: string;
  description: string;
  why?: string | null;
  isDone: boolean;
  doneAt?: string | null;
}

export interface PlanCaution {
  title: string;
  description: string;
  timeWindow?: PlanTimeWindow | null;
  why?: string | null;
}

export interface PlanMeta {
  planVersion: string;
  generatedAt?: string | null;
  regenerationCount: number;
  canRegenerate: boolean;
  source: 'rule_based' | 'minimal_fallback' | string;
}

export interface DailyActionsDTO {
  date: string;
  header: {
    title: string;
    subtitle: string;
  };
  actions: Array<{
    id: string;
    title: string;
    detail: string;
    icon: string;
    tag?: 'Kolay' | 'Orta' | 'Cesur' | 'Easy' | 'Moderate' | 'Bold';
    etaMin?: number;
    isDone: boolean;
    doneAt?: string | null;
    relatedTransitIds?: string[];
  }>;
  miniPlan: {
    title: string;
    steps: string[];
  };

  // ── premium personal plan (v2); absent on older backends ──────────────────
  personalizationLevel?: PersonalizationLevel;
  profileSignalsUsed?: string[];
  mainTheme?: PlanMainTheme;
  primaryAction?: PlanPrimaryAction;
  timeline?: PlanTimeSlot[];
  lifeAreaCards?: PlanLifeAreaCard[];
  caution?: PlanCaution;
  eveningReflection?: { question: string };
  meta?: PlanMeta;
}

export interface DailyActionToggleResponse {
  date: string;
  actionId: string;
  isDone: boolean;
  doneAt?: string | null;
}

/**
 * Structured reason behind a rating. TOO_GENERIC and REPETITIVE let the backend regenerate the
 * day's plan; the others are recorded to steer future variant selection.
 */
export type PlanFeedbackReason =
  | 'HELPFUL'
  | 'TOO_GENERIC'
  | 'REPETITIVE'
  | 'NOT_RELEVANT'
  | 'NOT_USEFUL';

export interface DailyFeedbackPayload {
  date: string;
  itemType: 'transit' | 'action';
  itemId: string;
  sentiment: 'up' | 'down';
  reason?: PlanFeedbackReason;
  note?: string;
}
