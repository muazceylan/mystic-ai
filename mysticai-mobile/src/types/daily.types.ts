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
}

export interface DailyActionToggleResponse {
  date: string;
  actionId: string;
  isDone: boolean;
  doneAt?: string | null;
}

export interface DailyFeedbackPayload {
  date: string;
  itemType: 'transit' | 'action';
  itemId: string;
  sentiment: 'up' | 'down';
  note?: string;
}
