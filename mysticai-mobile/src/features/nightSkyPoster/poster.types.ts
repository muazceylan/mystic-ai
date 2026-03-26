import type {
  HousePlacement,
  NightSkyPosterVariant,
  NightSkyProjectionResponse,
  PlanetPosition,
} from '../../services/astrology.service';

export type PosterTone =
  | 'gold'
  | 'moon'
  | 'violet'
  | 'blue'
  | 'silver'
  | 'rose';

export type LunarPhaseKey =
  | 'new_moon'
  | 'waxing_crescent'
  | 'first_quarter'
  | 'waxing_gibbous'
  | 'full_moon'
  | 'waning_gibbous'
  | 'last_quarter'
  | 'waning_crescent';

export type CelestialBody = {
  id: string;
  symbol: string;
  x: number;
  y: number;
  tone: PosterTone;
  label?: string;
  showLabel?: boolean;
  markerLevel?: 'primary' | 'secondary';
  priority?: 1 | 2 | 3;
  isHighlighted?: boolean;
  clusterOffsetX?: number;
  clusterOffsetY?: number;
};

export type ConstellationPoint = {
  x: number;
  y: number;
  opacity?: number;
  size?: number;
};

export type ConstellationSegment = {
  id: string;
  points: ConstellationPoint[];
  opacity?: number;
};

export type LunarPhaseItemModel = {
  key: LunarPhaseKey;
  label: string;
  icon?: string;
  selected?: boolean;
  description?: string;
};

export type CelestialLegendItemModel = {
  id: string;
  symbol: string;
  title: string;
  meaning: string;
  tone: PosterTone;
  priority?: 1 | 2 | 3;
};

export type NightSkyPosterModel = {
  titleLabel: string;
  displayName?: string | null;
  isGuest?: boolean;
  birthDateTimeLabel: string;
  locationLabel: string;
  coordinatesLabel?: string;
  moonIlluminationPercent: number;
  lunarPhase: LunarPhaseKey;
  lunarPhases: LunarPhaseItemModel[];
  celestialBodies: CelestialBody[];
  constellationLines: ConstellationSegment[];
  highlightedBodyIds?: string[];
  posterTone?: PosterTone;
  stars?: ConstellationPoint[];
  shareUrl?: string;
};

export type NightSkyPosterSource = {
  titleLabel: string;
  displayName?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  isGuest?: boolean;
  birthDate: string;
  birthTime?: string | null;
  birthLocation: string;
  latitude: number;
  longitude: number;
  planets: PlanetPosition[];
  houses?: HousePlacement[];
  variant?: NightSkyPosterVariant;
  projection?: NightSkyProjectionResponse | null;
  shareUrl?: string;
  locale?: 'tr' | 'en';
};
