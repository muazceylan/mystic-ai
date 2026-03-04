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
const COSMIC_PLANNER_BASE = '/api/v1/cosmic-planner';

interface CosmicPlannerMonthApiDay {
  date: string;
  score: number;
  band: 'STRONG' | 'BALANCED' | 'CRITICAL';
  categoryDots?: {
    retro?: boolean;
    cycles?: boolean;
    aspectFlow?: boolean;
  };
  topCategory?: string | null;
}

interface CosmicPlannerMonthApiResponse {
  year: number;
  month: number;
  days: CosmicPlannerMonthApiDay[];
  generatedAt?: string;
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 5;
  return Math.max(5, Math.min(100, Math.round(value)));
}

function parseYearMonth(raw?: string): { year: number; month: number } {
  const now = new Date();
  if (!raw) return { year: now.getFullYear(), month: now.getMonth() + 1 };

  const normalized = raw.trim();
  const ym = normalized.match(/^(\d{4})-(\d{1,2})$/);
  if (ym) {
    const year = Number.parseInt(ym[1], 10);
    const month = Number.parseInt(ym[2], 10);
    if (Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12) {
      return { year, month };
    }
  }

  const asDate = new Date(normalized);
  if (!Number.isNaN(asDate.getTime())) {
    return { year: asDate.getFullYear(), month: asDate.getMonth() + 1 };
  }

  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function buildTransitDots(day: CosmicPlannerMonthApiDay): CosmicPlannerSubcategoryDot[] {
  const dots: CosmicPlannerSubcategoryDot[] = [];
  if (day.categoryDots?.retro) {
    dots.push({
      subCategoryKey: 'retrogrades',
      label: 'Retro',
      colorHex: '#FB7185',
      score: clampScore(day.score - 8),
    });
  }
  if (day.categoryDots?.cycles) {
    dots.push({
      subCategoryKey: 'cycles',
      label: 'Döngüler',
      colorHex: '#8B5CF6',
      score: clampScore(day.score),
    });
  }
  if (day.categoryDots?.aspectFlow) {
    dots.push({
      subCategoryKey: 'aspect_flow',
      label: 'Açı Akışı',
      colorHex: '#22D3EE',
      score: clampScore(day.score + 4),
    });
  }
  return dots;
}

function mapMonthApiToLegacy(
  payload: CosmicPlannerMonthApiResponse,
  params: CosmicPlannerParams,
): CosmicPlannerResponse {
  const month = monthKey(payload.year, payload.month);
  const locale = params.locale ?? 'tr';
  const legendsByCategory: Record<string, CosmicLegendItem[]> = {
    transit: [
      { subCategoryKey: 'retrogrades', label: 'Retro', colorHex: '#FB7185' },
      { subCategoryKey: 'cycles', label: 'Döngüler', colorHex: '#8B5CF6' },
      { subCategoryKey: 'aspect_flow', label: 'Açı Akışı', colorHex: '#22D3EE' },
    ],
  };

  const days: CosmicPlannerDay[] = (payload.days ?? []).map((day) => {
    const score = clampScore(day.score);
    return {
      date: day.date,
      overallScore: score,
      categoryScores: {
        transit: score,
        moon: clampScore(score - 4),
        beauty: clampScore(score - 2),
        health: clampScore(score - 1),
        finance: clampScore(score - 3),
      },
      dotsByCategory: {
        transit: buildTransitDots(day),
      },
    };
  });

  return {
    userId: params.userId,
    month,
    locale,
    legendsByCategory,
    days,
    generatedAt: payload.generatedAt ?? new Date().toISOString(),
  };
}

export const fetchCosmicSummary = (params: CosmicSummaryParams) =>
  api.get<CosmicSummaryResponse>(`${COSMIC_BASE}/summary`, { params });

export const fetchCosmicPlanner = (params: CosmicPlannerParams) =>
  api.get<CosmicPlannerResponse>(`${COSMIC_BASE}/planner`, { params, timeout: 120000 });

export const fetchCosmicDayDetail = (params: CosmicDayDetailParams) =>
  api.get<CosmicDayDetailResponse>(`${COSMIC_BASE}/day-detail`, { params, timeout: 120000 });

export const fetchCosmicCategoryDetails = (params: CosmicCategoryDetailsParams) =>
  api.get<CosmicCategoryDetailsResponse>(`${COSMIC_BASE}/details`, { params, timeout: 120000 });

export interface CosmicPlannerRecommendationItem {
  id: string;
  title: string;
  description?: string | null;
  severity: 'INFO' | 'WARN';
  categoryKey?: string | null;
  actionType: 'PLAN' | 'COMMUNICATION' | 'FINANCE' | 'HEALTH' | 'BEAUTY' | 'CUSTOM';
}

export interface CosmicPlannerTimingWindow {
  startTime: string;
  endTime: string;
  type: 'STRONG' | 'CAUTION';
  reason: string;
}

export interface CosmicPlannerCategoryScore {
  key: string;
  score: number;
  summary: string;
  tags?: string[];
}

export interface CosmicPlannerDayOverviewResponse {
  date: string;
  overallScore: number;
  band: 'STRONG' | 'BALANCED' | 'CRITICAL';
  whySummary: string;
  doItems: CosmicPlannerRecommendationItem[];
  avoidItems: CosmicPlannerRecommendationItem[];
  timing: CosmicPlannerTimingWindow[];
  categories: CosmicPlannerCategoryScore[];
  generatedAt?: string;
}

export const fetchCosmicPlannerDayOverview = (params: CosmicDayDetailParams) =>
  api.get<CosmicPlannerDayOverviewResponse>(`${COSMIC_PLANNER_BASE}/day`, {
    params,
    timeout: 120000,
  });
