import api from './api';
import type { NatalChartContext } from '../features/natal/types';

/**
 * Client for the structured natal interpretation ("Haritam" redesign).
 *
 * The astrology engine remains the source of truth for every placement; this endpoint returns only
 * the interpretation layer on top of it, with each claim carrying the chart evidence it was drawn
 * from. Nothing here computes astrology — that is deliberate and must stay that way.
 */

/** The astrological receipt behind an interpretation, shown under "Bu yorumu neden yaptık?". */
export interface NatalEvidence {
  type: 'PLACEMENT' | 'ASPECT' | 'HOUSE' | 'RULER' | 'ELEMENT';
  /** Already localized by the backend, e.g. "Ay Başak · 1. Ev". */
  label: string;
  planet?: string | null;
  sign?: string | null;
  house?: number | null;
  aspectType?: string | null;
  planet2?: string | null;
}

export interface NatalPortraitHero {
  headline: string;
  summary: string;
  traits: string[];
  evidence: NatalEvidence[];
}

export interface NatalBigThreeEntry {
  title: string;
  roleLabel: string;
  meaning: string;
  howItWorksInYou: string;
  strengths: string[];
  challenges: string[];
  /** Absent when the birth time is unknown — houses are not trustworthy without it. */
  houseInfluence?: string | null;
  /** The aspects that most shape this placement, phrased as lived experience. */
  keyAspects: string[];
  evidence: NatalEvidence[];
}

export interface NatalBigThree {
  sun: NatalBigThreeEntry | null;
  moon: NatalBigThreeEntry | null;
  ascendant: NatalBigThreeEntry | null;
}

/** One thematic card. The same shape backs both "Beni Anlat" and "Hayatım". */
export interface NatalTopic {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  dailyLife: string;
  strengths: string[];
  challenges: string[];
  evidence: NatalEvidence[];
}

export interface NatalAspectTheme {
  title: string;
  description: string;
  evidence: NatalEvidence[];
}

export interface NatalAspectStory {
  supportive: NatalAspectTheme[];
  tension: NatalAspectTheme[];
}

/**
 * One planet, read as planet + sign + house fused into a single portrait.
 * Field order is the reading order — the sheet renders them top to bottom as-is.
 */
export interface NatalPlacementReading {
  /** English planet name, used for lookup against the calculated chart. Not displayed. */
  planet: string;
  title: string;
  subtitle: string;
  whatItMeans: string;
  howTheSignShapesIt: string;
  /** Absent when the birth time is unknown. */
  whereTheHouseTakesIt?: string | null;
  /** The synthesis the three fields above build up to. */
  howItShowsUpInYou: string;
  whenItWorksWell: string[];
  whenItStrains: string[];
  /** Aspects to other planets, written as lived experience rather than aspect names. */
  connections: string[];
  evidence: NatalEvidence[];
}

/** One house, read through its cusp sign, its ruler's placement, and whoever lives in it. */
export interface NatalHouseReading {
  houseNumber: number;
  title: string;
  whatItMeans: string;
  yourSignHere: string;
  rulerStory?: string | null;
  /** Absent when no planet is placed in this house. */
  residentsStory?: string | null;
  /** Cusp + residents + ruler read as one picture. */
  synthesis: string;
  strengths: string[];
  cautions: string[];
  evidence: NatalEvidence[];
}

export interface NatalPortrait {
  version: string;
  locale: string;
  /** FALLBACK means the interpretation was composed without the model. */
  source: 'AI' | 'FALLBACK';
  portrait: NatalPortraitHero;
  bigThree: NatalBigThree;
  aboutMe: NatalTopic[];
  lifeAreas: NatalTopic[];
  /** One per planet in the chart. */
  planetReadings: NatalPlacementReading[];
  /** One per house. Empty when the birth time is unknown — houses are meaningless without it. */
  houseReadings: NatalHouseReading[];
  aspectStory: NatalAspectStory;
}

export interface NatalPortraitResponse {
  portrait: NatalPortrait;
  cached: boolean;
}

/**
 * Factual chart context, used by "Haritamı Öğren" to teach with the reader's own placements.
 * Declared in the feature's types module so pure logic can use it without importing this client.
 */
export type {
  NatalChartContext,
  NatalChartEmphasis,
  NormalizedAspect,
  NormalizedHouse,
  NormalizedPlanet,
} from '../features/natal/types';

export interface NatalAskResponse {
  answer: string;
  /** False when the chart genuinely cannot speak to the question. */
  answerable: boolean;
  evidence: NatalEvidence[];
}

const BASE = '/api/v1/astrology/natal-portrait';

/**
 * Thrown when the user has no calculated chart yet. The screen routes to birth-data entry
 * rather than showing an error — a missing chart is a setup state, not a failure.
 */
export class NatalChartMissingError extends Error {
  constructor() {
    super('natal_chart_missing');
    this.name = 'NatalChartMissingError';
  }
}

export const natalPortraitService = {
  async getPortrait(locale: string): Promise<NatalPortraitResponse> {
    try {
      const { data } = await api.get<NatalPortraitResponse>(BASE, { params: { locale } });
      return data;
    } catch (error: any) {
      if (error?.response?.status === 404) throw new NatalChartMissingError();
      throw error;
    }
  },

  async regenerate(locale: string): Promise<NatalPortraitResponse> {
    const { data } = await api.post<NatalPortraitResponse>(
      `${BASE}/regenerate`,
      null,
      { params: { locale } },
    );
    return data;
  },

  async getContext(locale: string): Promise<NatalChartContext> {
    try {
      const { data } = await api.get<NatalChartContext>(`${BASE}/context`, { params: { locale } });
      return data;
    } catch (error: any) {
      if (error?.response?.status === 404) throw new NatalChartMissingError();
      throw error;
    }
  },

  async ask(question: string, locale: string): Promise<NatalAskResponse> {
    const { data } = await api.post<NatalAskResponse>(`${BASE}/ask`, { question, locale });
    return data;
  },
};

export default natalPortraitService;
