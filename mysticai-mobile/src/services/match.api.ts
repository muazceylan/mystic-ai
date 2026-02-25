import api from './api';

export interface TraitAxis {
  id: string;
  leftLabel: string;
  rightLabel: string;
  score0to100: number;
  note?: string | null;
}

export interface CategoryGroup {
  id: string;
  title: string;
  items: TraitAxis[];
}

export interface MatchTraitsResponse {
  matchId: number;
  compatibilityScore: number | null;
  categories: CategoryGroup[];
  cardAxes: TraitAxis[];
  cardSummary?: string | null;
}

const MATCH_BASE = '/api/v1/match';

export const getMatchTraits = (matchId: number) =>
  api.get<MatchTraitsResponse>(`${MATCH_BASE}/${matchId}/traits`);
