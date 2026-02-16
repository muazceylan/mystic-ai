import api from './api';

export interface PlanetPosition {
  planet: string;
  sign: string;
  degree: number;
  minutes: number;
  seconds: number;
  retrograde: boolean;
  house: number;
}

export interface HousePlacement {
  houseNumber: number;
  sign: string;
  degree: number;
  ruler: string;
}

export type AspectType = 'CONJUNCTION' | 'SQUARE' | 'TRINE' | 'OPPOSITION';

export interface PlanetaryAspect {
  planet1: string;
  planet2: string;
  type: AspectType;
  angle: number;
  orb: number;
}

export interface NatalChartResponse {
  id: number;
  userId: number;
  name: string;
  birthDate: string;
  birthTime: string | null;
  birthLocation: string;
  latitude: number;
  longitude: number;
  sunSign: string;
  moonSign: string;
  risingSign: string;
  planets: PlanetPosition[];
  houses: HousePlacement[];
  aspects: PlanetaryAspect[];
  aiInterpretation: string | null;
  interpretationStatus: string | null;
  calculatedAt: string;
}

export interface NatalChartRequest {
  userId: number;
  name?: string;
  birthDate: string;
  birthTime?: string;
  birthLocation: string;
}

const ASTROLOGY_BASE = '/api/v1/astrology';

export const calculateNatalChart = (request: NatalChartRequest) =>
  api.post<NatalChartResponse>(`${ASTROLOGY_BASE}/calculate`, request);

export const fetchLatestNatalChart = (userId: number) =>
  api.get<NatalChartResponse>(`${ASTROLOGY_BASE}/natal-charts/user/${userId}/latest`);

export const fetchNatalChartById = (chartId: number) =>
  api.get<NatalChartResponse>(`${ASTROLOGY_BASE}/natal-chart/${chartId}`);

export const checkAstrologyHealth = async (): Promise<boolean> => {
  try {
    await api.get(`${ASTROLOGY_BASE}/health`, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
};
