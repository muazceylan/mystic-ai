import type { PlannerCategoryId } from '../features/planner/plannerEngine';

export const PLANNER_LOCAL_TO_COSMIC_CATEGORY: Partial<Record<PlannerCategoryId, string>> = {
  transit: 'transit',
  moon: 'moon',
  beauty: 'beauty',
  health: 'health',
  jointFinance: 'finance',
  activity: 'activity',
  official: 'official',
  spiritual: 'spiritual',
  family: 'home',
  partnerHarmony: 'social',
  date: 'social',
  marriage: 'social',
  color: 'color',
  recommendations: 'recommendations',
};

export const COSMIC_DOCK_LABEL_OVERRIDE_KEYS: Partial<Record<PlannerCategoryId, string>> = {
  activity: 'calendar.cosmicCoreLabels.career',
  partnerHarmony: 'calendar.cosmicCoreLabels.social',
  jointFinance: 'calendar.cosmicCoreLabels.finance',
  family: 'calendar.cosmicCoreLabels.home',
  spiritual: 'calendar.cosmicCoreLabels.spirituality',
};

export const COSMIC_GROUP_ACCENT_COLORS: Record<string, string> = {
  beauty: '#DB2777',
  finance: '#0EA5E9',
  career: '#6366F1',
  social: '#EC4899',
  home: '#10B981',
  spiritual: '#8B5CF6',
  activity: '#0EA5E9',
  official: '#F59E0B',
};
