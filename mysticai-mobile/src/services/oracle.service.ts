import api from './api';

export interface DailySecret {
  secret: string;
  numerologyInsight: string | null;
  astrologyInsight: string | null;
  dreamInsight: string | null;
  generatedAt: string;
  message: string | null;
}

const ORACLE_BASE = '/api/v1/oracle';

export const fetchDailySecret = (params?: {
  name?: string;
  birthDate?: string;
}) =>
  api.get<DailySecret>(`${ORACLE_BASE}/daily-secret`, { params });

export const checkOracleHealth = async (): Promise<boolean> => {
  try {
    await api.get(`${ORACLE_BASE}/health`, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
};
