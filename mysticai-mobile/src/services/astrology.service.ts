import api from './api';

export interface PlanetPosition {
  planet: string;
  sign: string;
  degree: number;
  minutes: number;
  seconds: number;
  retrograde: boolean;
  house: number;
  absoluteLongitude?: number;
}

export interface HousePlacement {
  houseNumber: number;
  sign: string;
  degree: number;
  ruler: string;
}

export type AspectType = 'CONJUNCTION' | 'SEXTILE' | 'SQUARE' | 'TRINE' | 'OPPOSITION';

export interface PlanetaryAspect {
  planet1: string;
  planet2: string;
  type: AspectType;
  angle: number;
  orb: number;
}

export interface NatalPlanetComboInsight {
  planet: string;
  sign: string;
  house: number;
  tripleLabel: string;
  summary: string;
  characterLine: string;
  effectLine: string;
  cautionLine: string;
  strengths: string[];
}

export interface NatalHouseComboInsight {
  houseNumber: number;
  sign: string;
  introLine: string;
  characterLine: string;
  effectLine: string;
  cautionLine: string;
  strengths: string[];
  comboSummary: string;
  residentPlanets: string[];
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
  planetComboInsights?: NatalPlanetComboInsight[];
  houseComboInsights?: NatalHouseComboInsight[];
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
  timezone?: string;
  latitude?: number;
  longitude?: number;
}

export interface SkyPulseResponse {
  moonSign: string;
  moonSignTurkish: string;
  moonSignSymbol: string;
  moonPhase: string;
  retrogradePlanets: string[];
  dailyVibe: string;
  date: string;
}

export interface SwotPoint {
  category: string;
  headline: string;
  subtext: string;
  intensity: number;
  quickTip: string;
}

export interface FlashInsight {
  type: 'ALERT' | 'FORTUNE';
  headline: string;
  detail: string;
}

export interface WeeklySwotResponse {
  strength: SwotPoint;
  weakness: SwotPoint;
  opportunity: SwotPoint;
  threat: SwotPoint;
  flashInsight: FlashInsight;
  weekStart: string;
  weekEnd: string;
}

export interface DailyLifeGuideRequest {
  userId: number;
  locale?: string;
  userGender?: string;
  maritalStatus?: string;
  date?: string;
}

export interface DailyLifeGuideGroupSummary {
  groupKey: string;
  groupLabel: string;
  averageScore: number;
  activityCount: number;
}

export interface DailyLifeGuideActivity {
  groupKey: string;
  groupLabel: string;
  activityKey: string;
  activityLabel: string;
  icon: string;
  score: number;
  tone: 'positive' | 'neutral' | 'negative' | string;
  statusLabel: string;
  shortAdvice: string;
  technicalExplanation: string;
  insight: string;
  triggerNotes: string[];
}

export interface DailyLifeGuideResponse {
  userId: number;
  date: string;
  locale: string;
  userGender?: string | null;
  maritalStatus?: string | null;
  overallScore: number;
  source: 'LIVE' | 'CACHE' | string;
  groups: DailyLifeGuideGroupSummary[];
  activities: DailyLifeGuideActivity[];
  generatedAt: string;
}

export type NightSkyPosterVariant = 'minimal' | 'constellation_heavy' | 'gold_edition';

export interface NightSkyProjectionRequest {
  userId?: number;
  chartId?: number;
  name?: string;
  birthDate: string;
  birthTime?: string | null;
  birthLocation: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  elevationMeters?: number;
}

export interface NightSkyProjectionMoonPhase {
  phaseFraction: number;
  illuminationPercent: number;
  ageDays: number;
  phaseLabel: string;
  phaseSetIndex5: number;
}

export interface NightSkyProjectionHorizontalPoint {
  key: string;
  label: string;
  glyph: string;
  azimuthDeg: number;
  altitudeDeg: number;
  apparentAltitudeDeg: number;
  visible: boolean;
  xNorm: number;
  yNorm: number;
  radialNorm: number;
}

export interface NightSkyProjectionStarPoint {
  key: string;
  label: string;
  constellation: string;
  hipId?: number | null;
  bscId?: number | null;
  magnitude: number;
  azimuthDeg: number;
  altitudeDeg: number;
  apparentAltitudeDeg: number;
  visible: boolean;
  xNorm: number;
  yNorm: number;
  radialNorm: number;
}

export interface NightSkyProjectionConstellationLine {
  fromKey: string;
  toKey: string;
}

export interface NightSkyProjectionResponse {
  projectionModel: string;
  timezoneUsed: string;
  starCatalog: string;
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  elevationMeters: number;
  moonPhase: NightSkyProjectionMoonPhase;
  planets: NightSkyProjectionHorizontalPoint[];
  axes: NightSkyProjectionHorizontalPoint[];
  stars: NightSkyProjectionStarPoint[];
  constellationLines: NightSkyProjectionConstellationLine[];
  generatedAtUtc: string;
}

export interface NightSkyPosterShareLinkRequest {
  userId?: number;
  chartId?: number;
  name?: string;
  birthDate: string;
  birthTime?: string | null;
  birthLocation: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  variant?: NightSkyPosterVariant;
  ttlHours?: number;
}

export interface NightSkyPosterShareLinkResponse {
  token: string;
  variant: NightSkyPosterVariant;
  shareUrl: string;
  apiResolveUrl: string;
  expiresAt: string;
}

export interface NightSkyPosterShareTokenResolveResponse {
  token: string;
  posterType: string;
  variant: NightSkyPosterVariant;
  expired: boolean;
  expiresAt: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

const ASTROLOGY_BASE = '/api/v1/astrology';

export const calculateNatalChart = (request: NatalChartRequest) =>
  api.post<NatalChartResponse>(`${ASTROLOGY_BASE}/calculate`, request);

export const fetchLatestNatalChart = (userId: number) =>
  api.get<NatalChartResponse>(`${ASTROLOGY_BASE}/natal-charts/user/${userId}/latest`);

export const fetchNatalChartById = (chartId: number) =>
  api.get<NatalChartResponse>(`${ASTROLOGY_BASE}/natal-chart/${chartId}`);

export const fetchSkyPulse = (locale?: string) =>
  api.get<SkyPulseResponse>(`${ASTROLOGY_BASE}/sky-pulse`, { params: locale ? { locale } : undefined });

export const fetchWeeklySwot = (userId: number, locale?: string) =>
  api.get<WeeklySwotResponse>(`${ASTROLOGY_BASE}/weekly-swot`, {
    params: locale ? { userId, locale } : { userId },
  });

export const fetchDailyLifeGuide = (request: DailyLifeGuideRequest) =>
  api.post<DailyLifeGuideResponse>(`${ASTROLOGY_BASE}/life-guide/daily`, request);

export const fetchNightSkyProjection = (request: NightSkyProjectionRequest) =>
  api.post<NightSkyProjectionResponse>(`${ASTROLOGY_BASE}/posters/night-sky/projection`, request);

export const createNightSkyPosterShareLink = (request: NightSkyPosterShareLinkRequest) =>
  api.post<NightSkyPosterShareLinkResponse>(`${ASTROLOGY_BASE}/posters/night-sky/share-link`, request);

export const resolveNightSkyPosterShareToken = (token: string) =>
  api.get<NightSkyPosterShareTokenResolveResponse>(`${ASTROLOGY_BASE}/posters/night-sky/share/${token}`);

export const checkAstrologyHealth = async (): Promise<boolean> => {
  try {
    await api.get(`${ASTROLOGY_BASE}/health`, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
};
