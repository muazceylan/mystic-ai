import api from './api';

export interface DailySecret {
  secret: string;
  numerologyInsight: string | null;
  astrologyInsight: string | null;
  dreamInsight: string | null;
  dailyVibe: string | null;
  generatedAt: string;
  message: string | null;
}

export interface HomeBrief {
  greeting: string;
  dailyEnergy: string;
  transitHeadline: string;
  transitSummary: string;
  transitPoints: string[];
  secret: string;
  actionMessage: string;
  weeklyCards: Array<{
    key: string;
    title: string;
    headline: string;
    subtext: string;
    quickTip: string;
    accent: string;
  }>;
  meta: {
    promptVersion: string;
    promptVariant: string;
    readabilityScore: number | null;
    impactScore: number | null;
  };
  generatedAt: string;
}

const ORACLE_BASE = '/api/v1/oracle';

export const fetchDailySecret = (params?: {
  name?: string;
  birthDate?: string;
  maritalStatus?: string;
  focusPoint?: string;
}) =>
  api.get<DailySecret>(`${ORACLE_BASE}/daily-secret`, { params });

export const fetchHomeBrief = (params?: {
  name?: string;
  birthDate?: string;
  maritalStatus?: string;
  focusPoint?: string;
}) =>
  api.get<HomeBrief>(`${ORACLE_BASE}/home-brief`, { params });

export const checkOracleHealth = async (): Promise<boolean> => {
  try {
    await api.get(`${ORACLE_BASE}/health`, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
};
