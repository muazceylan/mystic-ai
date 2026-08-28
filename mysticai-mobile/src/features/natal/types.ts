/**
 * Shared types for the Haritam feature.
 *
 * Kept free of React and React Native imports so the pure logic modules (chart levels, placement
 * lessons, topic ordering) can be compiled and tested on their own, without dragging the whole
 * component graph in behind them.
 */

export type LevelTier = 'veryStrong' | 'strong' | 'balanced' | 'sensitive';

/** One qualitative emphasis reading, with the chart fact it was derived from. */
export interface QualitativeLevel {
  key: string;
  label: string;
  tier: LevelTier;
  /** Plain-language derivation, e.g. "Haritanda bu elementte 4 gezegen var." */
  reason: string;
}

/** The three-part lesson used to teach how a placement is read. */
export interface PlacementLesson {
  /** The planet. Answers "NE?" */
  planetName: string;
  planetMeaning: string;
  /** The sign. Answers "NASIL?" */
  signName: string;
  signMeaning: string;
  /** The house. Answers "HANGİ HAYAT ALANINDA?". Null when the birth time is unknown. */
  houseName: string | null;
  houseMeaning: string | null;
  /** The three parts read as one statement — the point of the whole exercise. */
  synthesis: string;
}

// ── Factual chart context ───────────────────────────────────────────────────
// Mirrors the calculated chart the backend hands to the interpreter. It lives here rather than in
// the service module so pure logic can depend on the shape without pulling the HTTP client — and
// its transitive native imports — in behind it.

export interface NormalizedPlanet {
  planet: string;
  sign: string;
  degree: number;
  absoluteLongitude: number;
  /** Null when the birth time is unknown: houses are not trustworthy without it. */
  house: number | null;
  retrograde: boolean;
  /** True at 29 degrees — the anaretic degree. */
  anaretic: boolean;
  /** True in houses 1, 4, 7, 10 — the placements other people actually notice. */
  angular: boolean;
}

export interface NormalizedHouse {
  houseNumber: number;
  sign: string;
  degree: number;
  ruler: string | null;
  /** Where the cusp ruler itself sits — the link that carries a house's story elsewhere. */
  rulerSign: string | null;
  rulerHouse: number | null;
  residentPlanets: string[];
}

export interface NormalizedAspect {
  planet1: string;
  planet2: string;
  type: string;
  angle: number;
  orb: number;
  strength: 'TIGHT' | 'CLOSE' | 'WIDE';
  tone: 'SUPPORTIVE' | 'TENSE' | 'FUSED';
}

export interface NatalChartEmphasis {
  dominantElement: string | null;
  dominantModality: string | null;
  dominantPlanets: string[];
  stelliumHouses: number[];
  stelliumSigns: string[];
  tenseAspectCount: number;
  supportiveAspectCount: number;
  missingElements: string[];
}

export interface NatalChartContext {
  chartId: number;
  locale: string;
  birthTimeKnown: boolean;
  sun: NormalizedPlanet | null;
  moon: NormalizedPlanet | null;
  ascendant: { sign: string; degree: number } | null;
  chartRuler: { planet: string; sign: string | null; house: number | null } | null;
  planets: NormalizedPlanet[];
  houses: NormalizedHouse[];
  aspects: NormalizedAspect[];
  /** Planet count per element: Fire, Earth, Air, Water. */
  elements: Record<string, number>;
  /** Planet count per modality: Cardinal, Fixed, Mutable. */
  modalities: Record<string, number>;
  emphasis: NatalChartEmphasis | null;
}
