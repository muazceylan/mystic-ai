export type MatchResultKind = 'UYUMLU' | 'GELISIM_ALANI' | 'DIKKAT';
export type AspectTone = 'DESTEKLEYICI' | 'ZORLAYICI';

export interface MatchPersonDTO {
  name: string;
  signIcon: string;
  signLabel: string;
}

export interface CategoryScoreDTO {
  id: 'love' | 'communication' | 'trust' | 'passion';
  label: string;
  value: number;
}

export interface SummaryPlainDTO {
  headline: string;
  body: string;
}

export interface AxisDTO {
  id: string;
  title: string;
  leftLabel: string;
  rightLabel: string;
  leftScore: number;
  rightScore: number;
  impactPlain: string;
  tipPlain: string;
  result: MatchResultKind;
}

export interface GrowthAreaDTO {
  id: string;
  title: string;
  trigger: string;
  pattern: string;
  protocol: [string, string, string];
  habitLabel: string;
}

export interface AspectDTO {
  id: string;
  name: string;
  theme: string;
  orb: number;
  tone: AspectTone;
  house?: string;
  aspectType?: string;
}

export interface MatchDTO {
  matchId: number;
  overallScore: number;
  people: {
    left: MatchPersonDTO;
    right: MatchPersonDTO;
  };
  categories: CategoryScoreDTO[];
  summaryPlain: SummaryPlainDTO;
  axes: AxisDTO[];
  growthAreas: GrowthAreaDTO[];
  dailySuggestions: [string, string];
  aspectsEvaluated: number;
  aspects: AspectDTO[];
  source: 'api' | 'mock';
}

export interface MatchSeedDTO {
  matchId: number;
  personAName?: string;
  personBName?: string;
  personASignLabel?: string;
  personBSignLabel?: string;
  overallScore?: number | null;
  summary?: string | null;
}
