export type HomeV2QuickActionId = 'dream' | 'compatibility' | 'planner' | 'chart';

export type HomeV2StatusTone = 'high' | 'medium' | 'risk';

export interface HomeV2HeroModel {
  title: string;
  subtitle: string;
  description: string;
}

export interface HomeV2QuickActionModel {
  id: HomeV2QuickActionId;
  label: string;
}

export interface HomeV2SummaryChip {
  label: string;
  value: string;
  tone: 'focus' | 'emotion' | 'risk';
}

export interface HomeV2DailySummaryModel {
  scoreLabel: string;
  scoreValue: number | null;
  themeText: string;
  suggestionText: string;
  chips: HomeV2SummaryChip[];
}

export interface HomeV2DecisionCompassItem {
  id: string;
  label: string;
  score: number;
  icon: 'career' | 'beauty' | 'finance' | 'heart' | 'social' | 'health' | 'default';
  categoryKey?: string;
  activityLabel?: string;
  date?: string;
  itemCount?: number;
  shortAdvice?: string;
  kind?: 'opportunity' | 'warning';
  subItems?: Array<{
    id: string;
    label: string;
    score: number;
  }>;
}

export interface HomeV2TransitMetaChip {
  id: 'moon_phase' | 'moon_sign' | 'retro';
  label: string;
  value: string;
}

export interface HomeV2TransitModel {
  headline: string;
  summary: string;
  points: string[];
  metaChips: HomeV2TransitMetaChip[];
}

export interface HomeV2WeeklyItem {
  id: 'strength' | 'opportunity' | 'threat' | 'weakness';
  title: string;
  badge: string;
  tone: HomeV2StatusTone;
  preview: string;
}

export interface HomeV2OracleStatus {
  label: string;
  active: boolean;
}

export interface HomeV2Model {
  userName: string;
  infoLine: string;
  hero: HomeV2HeroModel;
  quickActions: HomeV2QuickActionModel[];
  dailySummary: HomeV2DailySummaryModel;
  transitToday: HomeV2TransitModel;
  decisionCompass: HomeV2DecisionCompassItem[];
  weekRangeLabel: string;
  weeklyItems: HomeV2WeeklyItem[];
  oracleStatus: HomeV2OracleStatus;
}
