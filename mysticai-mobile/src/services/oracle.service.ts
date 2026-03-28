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
// Oracle synthesis: backend cache miss'te AI orchestration ~15-20sn sürebilir.
// Backend toplam timeout 18sn + gateway buffer = mobil 22sn.
// Timeout sonrası dashboard skyPulse fallback içeriğiyle render edilir.
const ORACLE_SYNTHESIS_TIMEOUT_MS = 22000;

export const fetchDailySecret = (params?: {
  name?: string;
  birthDate?: string;
  maritalStatus?: string;
  locale?: string;
}) =>
  // Oracle synthesis can hit AI orchestration on cache misses, so it needs a longer timeout
  // than the default shared API client.
  api.get<DailySecret>(`${ORACLE_BASE}/daily-secret`, {
    params,
    timeout: ORACLE_SYNTHESIS_TIMEOUT_MS,
  });

export const fetchHomeBrief = (params?: {
  name?: string;
  birthDate?: string;
  maritalStatus?: string;
  locale?: string;
}) =>
  api.get<HomeBrief>(`${ORACLE_BASE}/home-brief`, {
    params,
    timeout: ORACLE_SYNTHESIS_TIMEOUT_MS,
  });

export const checkOracleHealth = async (): Promise<boolean> => {
  try {
    await api.get(`${ORACLE_BASE}/health`, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
};
