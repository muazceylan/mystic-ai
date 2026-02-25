import api from './api';
import type { DailyLifeGuideResponse } from './astrology.service';

export interface CosmicSummaryCard {
  categoryKey: string;
  subCategoryKey: string;
  categoryLabel: string;
  activityKey: string;
  activityLabel: string;
  score: number;
  type: 'OPPORTUNITY' | 'WARNING' | string;
  shortAdvice: string;
  colorHex: string;
}

export interface CosmicSummaryResponse {
  userId: number;
  date: string;
  locale: string;
  dailyGuide: DailyLifeGuideResponse;
  categoryScores: Record<string, number>;
  focusCards: CosmicSummaryCard[];
  generatedAt: string;
}

export interface CosmicLegendItem {
  subCategoryKey: string;
  label: string;
  colorHex: string;
}

export interface CosmicPlannerSubcategoryDot {
  subCategoryKey: string;
  label: string;
  colorHex: string;
  score: number;
}

export interface CosmicPlannerDay {
  date: string;
  overallScore: number;
  categoryScores: Record<string, number>;
  dotsByCategory: Record<string, CosmicPlannerSubcategoryDot[]>;
}

export interface CosmicPlannerResponse {
  userId: number;
  month: string;
  locale: string;
  legendsByCategory: Record<string, CosmicLegendItem[]>;
  days: CosmicPlannerDay[];
  generatedAt: string;
}

export interface CosmicDetailSubcategory {
  subCategoryKey: string;
  label: string;
  colorHex: string;
  score: number;
  shortAdvice: string;
  technicalExplanation: string;
  insight: string;
  triggerNotes: string[];
}

export interface CosmicCategoryDetail {
  categoryKey: string;
  categoryLabel: string;
  score: number;
  dos: string[];
  donts: string[];
  reasoning: string;
  supportingAspects: string[];
  subcategories: CosmicDetailSubcategory[];
}

export interface CosmicDayDetailResponse {
  userId: number;
  date: string;
  locale: string;
  moonPhase: string;
  mercuryRetrograde: boolean;
  categories: Record<string, CosmicCategoryDetail>;
  generatedAt: string;
}

export interface CosmicCategoryDetailsResponse {
  userId: number;
  date: string;
  locale: string;
  categoryKey: string;
  moonPhase: string;
  mercuryRetrograde: boolean;
  category: CosmicCategoryDetail;
  generatedAt: string;
}

export interface CosmicSummaryParams {
  userId: number;
  date?: string;
  locale?: string;
  gender?: string;
  maritalStatus?: string;
}

export interface CosmicPlannerParams {
  userId: number;
  month?: string; // yyyy-MM preferred (MM also accepted by backend fallback)
  locale?: string;
  gender?: string;
  maritalStatus?: string;
}

export interface CosmicDayDetailParams {
  userId: number;
  date?: string;
  locale?: string;
  gender?: string;
  maritalStatus?: string;
}

export interface CosmicCategoryDetailsParams extends CosmicDayDetailParams {
  categoryKey: string;
}

const COSMIC_BASE = '/api/v1/cosmic';

export const fetchCosmicSummary = (params: CosmicSummaryParams) =>
  api.get<CosmicSummaryResponse>(`${COSMIC_BASE}/summary`, { params });

export const fetchCosmicPlanner = (params: CosmicPlannerParams) =>
  api.get<CosmicPlannerResponse>(`${COSMIC_BASE}/planner`, { params, timeout: 120000 });

export const fetchCosmicDayDetail = (params: CosmicDayDetailParams) =>
  api.get<CosmicDayDetailResponse>(`${COSMIC_BASE}/day-detail`, { params, timeout: 120000 });

export const fetchCosmicCategoryDetails = (params: CosmicCategoryDetailsParams) =>
  api.get<CosmicCategoryDetailsResponse>(`${COSMIC_BASE}/details`, { params, timeout: 120000 });
