import { create } from 'zustand';
import type { TraitAxis } from '../services/match.api';
import type { RelationshipType, SynastryDisplayMetric, SynastryScoreBreakdown } from '../services/synastry.service';

export interface MatchCardDraft {
  user1Name: string;
  user2Name: string;
  user1Sign: string;
  user2Sign: string;
  compatibilityScore: number;
  relationshipType?: RelationshipType;
  aiSummary: string;
  cardSummary?: string | null;
  aspectsCount: number;
  relationLabel: string;
  traitAxes?: TraitAxis[];
  scoreBreakdown?: Pick<SynastryScoreBreakdown, 'overall' | 'love' | 'communication' | 'spiritualBond'> | null;
  displayMetrics?: SynastryDisplayMetric[] | null;
  createdAt: number;
}

interface MatchCardState {
  draft: MatchCardDraft | null;
  setDraft: (draft: MatchCardDraft) => void;
  clearDraft: () => void;
}

export const useMatchCardStore = create<MatchCardState>()((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: null }),
}));
