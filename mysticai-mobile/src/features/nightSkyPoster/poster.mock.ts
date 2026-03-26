import type { NightSkyPosterModel } from './poster.types';
import { getLunarPhasePresentation } from './poster.utils';

const phaseKeys = [
  'new_moon',
  'waxing_crescent',
  'first_quarter',
  'waxing_gibbous',
  'full_moon',
  'waning_gibbous',
  'last_quarter',
  'waning_crescent',
] as const;

export const nightSkyPosterMock: NightSkyPosterModel = {
  titleLabel: 'DOĞDUĞUN GECE GÖKYÜZÜ',
  displayName: null,
  isGuest: true,
  birthDateTimeLabel: '1994-10-03 • 15:00',
  locationLabel: 'Türkiye, Afyonkarahisar',
  coordinatesLabel: '38.7507, 30.5567',
  moonIlluminationPercent: 4,
  lunarPhase: 'new_moon',
  lunarPhases: phaseKeys.map((key) => ({
    key,
    ...getLunarPhasePresentation(key),
    selected: key === 'new_moon',
  })),
  celestialBodies: [
    { id: 'sun', symbol: '☉', label: 'Güneş', showLabel: true, markerLevel: 'primary', x: 0.34, y: 0.63, tone: 'gold', priority: 3, isHighlighted: true },
    { id: 'moon', symbol: '☽', label: 'Ay', showLabel: true, markerLevel: 'primary', x: 0.41, y: 0.58, tone: 'moon', priority: 3, isHighlighted: true },
    { id: 'mercury', symbol: '☿', label: 'Merkür', showLabel: true, markerLevel: 'secondary', x: 0.28, y: 0.69, tone: 'blue', priority: 2 },
    { id: 'venus', symbol: '♀', label: 'Venüs', showLabel: true, markerLevel: 'secondary', x: 0.46, y: 0.56, tone: 'rose', priority: 2 },
    { id: 'mars', symbol: '♂', label: 'Mars', showLabel: true, markerLevel: 'secondary', x: 0.73, y: 0.76, tone: 'rose', priority: 2, isHighlighted: true },
    { id: 'saturn', symbol: '♄', label: 'Satürn', showLabel: true, markerLevel: 'secondary', x: 0.66, y: 0.26, tone: 'silver', priority: 2 },
    { id: 'uranus', symbol: '♅', label: 'Uranüs', showLabel: true, markerLevel: 'secondary', x: 0.36, y: 0.3, tone: 'blue', priority: 1 },
  ],
  constellationLines: [
    { id: 'seg-1', points: [{ x: 0.18, y: 0.3 }, { x: 0.26, y: 0.42 }, { x: 0.22, y: 0.58 }], opacity: 0.22 },
    { id: 'seg-2', points: [{ x: 0.58, y: 0.19 }, { x: 0.72, y: 0.28 }, { x: 0.79, y: 0.45 }], opacity: 0.2 },
    { id: 'seg-3', points: [{ x: 0.32, y: 0.68 }, { x: 0.45, y: 0.74 }, { x: 0.59, y: 0.66 }], opacity: 0.22 },
  ],
  highlightedBodyIds: ['sun', 'moon', 'mars'],
  posterTone: 'gold',
  stars: [
    { x: 0.22, y: 0.24, opacity: 0.78, size: 0.95 },
    { x: 0.3, y: 0.34, opacity: 0.55, size: 0.65 },
    { x: 0.55, y: 0.21, opacity: 0.64, size: 0.85 },
    { x: 0.67, y: 0.37, opacity: 0.88, size: 1.1 },
    { x: 0.48, y: 0.52, opacity: 0.6, size: 0.78 },
    { x: 0.24, y: 0.72, opacity: 0.52, size: 0.7 },
    { x: 0.74, y: 0.64, opacity: 0.74, size: 0.95 },
  ],
  shareUrl: '',
};
