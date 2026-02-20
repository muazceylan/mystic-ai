import api from './api';

// ─── Saved Person ─────────────────────────────────────────────────────────────

export interface SavedPersonRequest {
  userId: number;
  name: string;
  birthDate: string;       // ISO date: "YYYY-MM-DD"
  birthTime?: string;      // "HH:mm:ss" or null
  birthLocation: string;
  latitude?: number;
  longitude?: number;
  relationshipCategory?: RelationshipType;
}

export interface SavedPersonResponse {
  id: number;
  userId: number;
  name: string;
  birthDate: string;
  birthTime: string | null;
  birthLocation: string;
  latitude: number;
  longitude: number;
  relationshipCategory: RelationshipType | null;
  sunSign: string;
  moonSign: string;
  risingSign: string;
  planets: PlanetPosition[];
  createdAt: string;
}

export interface PlanetPosition {
  planet: string;
  sign: string;
  degree: number;
  minutes: number;
  retrograde: boolean;
  house: number;
}

// ─── Synastry ─────────────────────────────────────────────────────────────────

export type RelationshipType = 'LOVE' | 'BUSINESS' | 'FRIENDSHIP' | 'RIVAL';

export interface SynastryRequest {
  userId: number;
  savedPersonId: number;
  relationshipType: RelationshipType;
  locale?: string;
}

export interface CrossAspect {
  userPlanet: string;
  partnerPlanet: string;
  aspectType: string;
  aspectSymbol: string;
  aspectTurkish: string;
  angle: number;
  orb: number;
  harmonious: boolean;
}

export interface SynastryResponse {
  id: number;
  userId: number;
  savedPersonId: number;
  personName: string;
  relationshipType: RelationshipType;
  harmonyScore: number | null;
  crossAspects: CrossAspect[];
  harmonyInsight: string | null;
  strengths: string[];
  challenges: string[];
  keyWarning: string | null;
  cosmicAdvice: string | null;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  calculatedAt: string;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

const PEOPLE_BASE   = '/api/v1/people';
const SYNASTRY_BASE = '/api/v1/synastry';

// Saved People
export const addSavedPerson = (req: SavedPersonRequest) =>
  api.post<SavedPersonResponse>(PEOPLE_BASE, req);

export const getSavedPeople = (userId: number) =>
  api.get<SavedPersonResponse[]>(`${PEOPLE_BASE}/user/${userId}`);

export const getSavedPerson = (id: number) =>
  api.get<SavedPersonResponse>(`${PEOPLE_BASE}/${id}`);

export const updateSavedPerson = (id: number, req: SavedPersonRequest) =>
  api.put<SavedPersonResponse>(`${PEOPLE_BASE}/${id}`, req);

export const deleteSavedPerson = (id: number, userId: number) =>
  api.delete(`${PEOPLE_BASE}/${id}`, { params: { userId } });

// Synastry
export const analyzeSynastry = (req: SynastryRequest) =>
  api.post<SynastryResponse>(SYNASTRY_BASE, req);

export const getSynastry = (id: number) =>
  api.get<SynastryResponse>(`${SYNASTRY_BASE}/${id}`);

export const getUserSynastries = (userId: number) =>
  api.get<SynastryResponse[]>(`${SYNASTRY_BASE}/user/${userId}`);
