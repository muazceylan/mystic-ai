import api from './api';

export type GoalCategory = 'MARRIAGE' | 'CAREER' | 'CONTRACT' | 'NEW_BEGINNING';
export type PlannerCategory =
  | 'TRANSIT'
  | 'MOON'
  | 'DATE'
  | 'MARRIAGE'
  | 'RELATIONSHIP_HARMONY'
  | 'FAMILY'
  | 'FINANCE'
  | 'BEAUTY'
  | 'HEALTH'
  | 'ACTIVITY'
  | 'OFFICIAL'
  | 'SPIRITUAL'
  | 'COLOR'
  | 'RECOMMENDATIONS';
export type PlannerResponseMode = 'FULL' | 'GRID_ONLY';

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
  maritalStatus?: string;
  locale?: string;
  responseMode?: PlannerResponseMode;
  categories?: PlannerCategory[];
  startDate?: string;
  endDate?: string;
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
const plannerResponseCache = new Map<string, PlannerFullDistributionResponse>();
const plannerInFlight = new Map<string, Promise<any>>();

export const clearPlannerFullDistributionCache = () => {
  plannerResponseCache.clear();
  plannerInFlight.clear();
};

function buildPlannerRequestCacheKey(request: PlannerFullDistributionRequest): string {
  const categories = (request.categories ?? []).slice().sort().join(',');
  return [
    request.userId,
    request.locale ?? 'tr',
    request.userGender ?? '',
    request.maritalStatus ?? '',
    request.responseMode ?? 'FULL',
    categories,
    request.startDate ?? '',
    request.endDate ?? '',
    String(request.monthsAhead ?? ''),
  ].join('|');
}

export const calculateLuckyDates = (request: LuckyDatesRequest) =>
  api.post<LuckyDatesResponse>(`${ASTROLOGY_BASE}/lucky-dates`, {
    ...request,
    monthsAhead: request.monthsAhead ?? 3,
  });

export const fetchLuckyDatesByUser = (userId: number) =>
  api.get<LuckyDatesResponse[]>(`${ASTROLOGY_BASE}/lucky-dates/user/${userId}`);

export const fetchLuckyDatesByCorrelationId = (correlationId: string) =>
  api.get<LuckyDatesResponse>(`${ASTROLOGY_BASE}/lucky-dates/${correlationId}`);

export const fetchPlannerFullDistribution = (
  request: PlannerFullDistributionRequest,
  options?: { preferCache?: boolean; forceRefresh?: boolean },
): Promise<{ data: PlannerFullDistributionResponse }> => {
  const preferCache = options?.preferCache ?? true;
  const forceRefresh = options?.forceRefresh ?? false;
  const normalizedRequest = {
    ...request,
    responseMode: request.responseMode ?? 'FULL',
    monthsAhead: (request.startDate && request.endDate)
      ? (request.monthsAhead ?? 1)
      : (request.monthsAhead ?? 6),
  } satisfies PlannerFullDistributionRequest;
  const cacheKey = buildPlannerRequestCacheKey(normalizedRequest);

  if (!forceRefresh && preferCache) {
    const cached = plannerResponseCache.get(cacheKey);
    if (cached) {
      return Promise.resolve({ data: cached });
    }
  }

  if (!forceRefresh) {
    const inflight = plannerInFlight.get(cacheKey);
    if (inflight) return inflight;
  }

  const requestPromise = api.post<PlannerFullDistributionResponse>(
    `${ASTROLOGY_BASE}/planner/full-distribution`,
    normalizedRequest,
    { timeout: 180000 },
  ).then((response) => {
    plannerResponseCache.set(cacheKey, response.data);
    plannerInFlight.delete(cacheKey);
    return response;
  }).catch((error) => {
    plannerInFlight.delete(cacheKey);
    throw error;
  });

  plannerInFlight.set(cacheKey, requestPromise);
  return requestPromise;
};

export const prefetchPlannerFullDistribution = async (request: PlannerFullDistributionRequest) => {
  try {
    await fetchPlannerFullDistribution(request, { preferCache: true });
  } catch {
    // Silent prefetch failure: screen-level fetch will handle user-facing errors.
  }
};
