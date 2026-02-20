import api from './api';

export type GoalCategory = 'MARRIAGE' | 'CAREER' | 'CONTRACT' | 'NEW_BEGINNING';

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
