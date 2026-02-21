import api from './api';

export type GoalCategory = 'MARRIAGE' | 'CAREER' | 'CONTRACT' | 'NEW_BEGINNING';
export type PlannerCategory =
  | 'TRANSIT'
  | 'MOON'
  | 'BEAUTY'
  | 'HEALTH'
  | 'ACTIVITY'
  | 'OFFICIAL'
  | 'SPIRITUAL'
  | 'COLOR'
  | 'RECOMMENDATIONS';

export interface LuckyDateCard {
  date: string;
  successScore: number;
  reason: string;
  supportingAspects: string[];
  mercuryRetrograde: boolean;
  moonPhase: string;
}

export interface LuckyDatesResponse {
  userId: number;
  goalCategory: GoalCategory;
  hookText: string;
  luckyDates: LuckyDateCard[];
  aiInterpretation: string | null;
  status: string;
  correlationId: string;
  generatedAt: string;
}

export interface LuckyDatesRequest {
  userId: number;
  goalCategory: GoalCategory;
  monthsAhead?: number;
}

export interface PlannerFullDistributionRequest {
  userId: number;
  monthsAhead?: number;
  userGender?: string;
}

export interface PlannerCategoryAction {
  category: PlannerCategory;
  categoryLabel: string;
  score: number;
  dos: string[];
  donts: string[];
  reasoning: string;
  supportingAspects: string[];
  mercuryRetrograde: boolean;
  moonPhase: string;
  source: 'RULE_ENGINE' | string;
}

export interface PlannerDayInsight {
  date: string;
  overallScore: number;
  categories: PlannerCategoryAction[];
}

export interface PlannerFullDistributionResponse {
  userId: number;
  monthsAhead: number;
  startDate: string;
  endDate: string;
  days: PlannerDayInsight[];
  generatedAt: string;
}

const ASTROLOGY_BASE = '/api/v1/astrology';

export const calculateLuckyDates = (request: LuckyDatesRequest) =>
  api.post<LuckyDatesResponse>(`${ASTROLOGY_BASE}/lucky-dates`, {
    ...request,
    monthsAhead: request.monthsAhead ?? 3,
  });

export const fetchLuckyDatesByUser = (userId: number) =>
  api.get<LuckyDatesResponse[]>(`${ASTROLOGY_BASE}/lucky-dates/user/${userId}`);

export const fetchLuckyDatesByCorrelationId = (correlationId: string) =>
  api.get<LuckyDatesResponse>(`${ASTROLOGY_BASE}/lucky-dates/${correlationId}`);

export const fetchPlannerFullDistribution = (request: PlannerFullDistributionRequest) =>
  api.post<PlannerFullDistributionResponse>(`${ASTROLOGY_BASE}/planner/full-distribution`, {
    ...request,
    monthsAhead: request.monthsAhead ?? 6,
  });
