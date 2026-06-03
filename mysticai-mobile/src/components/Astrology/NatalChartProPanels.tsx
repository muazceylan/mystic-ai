import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type {
  HousePlacement,
  NatalPlanetComboInsight,
  PlanetPosition,
  PlanetaryAspect,
  AspectType,
} from '../../services/astrology.service';
import { getPlanetDescription, getZodiacInfo, PLANET_TURKISH, SIGN_MODALITY_KEY, type ElementKey, type ModalityKey } from '../../constants/zodiac';
import { labelPlanet } from '../../constants/astroLabelMap';
import { useTheme } from '../../context/ThemeContext';

type BirthChartMode = 'simple' | 'detailed';

type NatalChartProPanelsProps = {
  planets: PlanetPosition[];
  houses: HousePlacement[];
  aspects: PlanetaryAspect[];
  planetComboInsights?: NatalPlanetComboInsight[];
  planetNames?: Record<string, string>;
  risingSign?: string | null;
  onAspectPress?: (aspect: PlanetaryAspect) => void;
  onOpenFull?: () => void;
  onDownload?: () => void;
  onViewAllInterpretation?: () => void;
  mode?: 'full' | 'hero';
  panels?: Array<'wheel' | 'matrix' | 'balance' | 'positions'>;
  renderWidthOverride?: number;
  presentation?: 'default' | 'poster' | 'premium';
  showPremiumActions?: boolean;
};

type AspectCell = PlanetaryAspect | null;
type BirthChartTheme = ReturnType<typeof useTheme>['colors']['birthChart'];

type PremiumPlacement =
  | {
      id: string;
      kind: 'planet';
      planet: PlanetPosition;
      label: string;
      sign: string;
      house?: number;
      glyph: string;
    }
  | {
      id: string;
      kind: 'ascendant';
      label: string;
      sign: string | null;
      house?: number;
      glyph: string;
    };

// ElementKey and ModalityKey imported from zodiac.ts ('fire'|'water'|'earth'|'air' and 'cardinal'|'fixed'|'mutable')

type ScoredSlice<T extends string> = {
  key: T;
  displayName: string;
  score: number;
  pct: number;
  color: string;
};

const PLANET_ORDER = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
  'Chiron',
  'NorthNode',
] as const;

const PLANET_GLYPHS: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
  Chiron: '⚷',
  NorthNode: '☊',
};

const ASPECT_META: Record<
  AspectType,
  { symbol: string; exact: number; maxOrb: number; category: 'harmonious' | 'neutral' | 'challenging'; label: string }
> = {
  CONJUNCTION: {
    symbol: '☌',
    exact: 0,
    maxOrb: 8,
    category: 'neutral',
    label: 'natalChart.panels.aspectConjunction',
  },
  SEXTILE: {
    symbol: '⚹',
    exact: 60,
    maxOrb: 6,
    category: 'harmonious',
    label: 'natalChart.panels.aspectSextile',
  },
  SQUARE: {
    symbol: '□',
    exact: 90,
    maxOrb: 8,
    category: 'challenging',
    label: 'natalChart.panels.aspectSquare',
  },
  TRINE: {
    symbol: '△',
    exact: 120,
    maxOrb: 8,
    category: 'harmonious',
    label: 'natalChart.panels.aspectTrine',
  },
  QUINCUNX: {
    symbol: '⚻',
    exact: 150,
    maxOrb: 3,
    category: 'neutral',
    label: 'natalChart.panels.aspectQuincunx',
  },
  OPPOSITION: {
    symbol: '☍',
    exact: 180,
    maxOrb: 8,
    category: 'challenging',
    label: 'natalChart.panels.aspectOpposition',
  },
};

const SIGN_INDEX: Record<string, number> = {
  ARIES: 0,
  TAURUS: 1,
  GEMINI: 2,
  CANCER: 3,
  LEO: 4,
  VIRGO: 5,
  LIBRA: 6,
  SCORPIO: 7,
  SAGITTARIUS: 8,
  CAPRICORN: 9,
  AQUARIUS: 10,
  PISCES: 11,
};

const SIGN_KEYS_IN_ORDER = [
  'ARIES',
  'TAURUS',
  'GEMINI',
  'CANCER',
  'LEO',
  'VIRGO',
  'LIBRA',
  'SCORPIO',
  'SAGITTARIUS',
  'CAPRICORN',
  'AQUARIUS',
  'PISCES',
] as const;

// SIGN_MODALITY_KEY imported from zodiac.ts (ASCII keys: cardinal/fixed/mutable)

const PLANET_WEIGHTS: Record<string, number> = {
  Sun: 3.4,
  Moon: 3.4,
  Mercury: 2.6,
  Venus: 2.6,
  Mars: 2.6,
  Jupiter: 1.8,
  Saturn: 1.8,
  Uranus: 1.1,
  Neptune: 1.1,
  Pluto: 1.1,
  Chiron: 0.9,
  NorthNode: 1.3,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeAngle(angle: number) {
  let result = angle % 360;
  if (result < 0) result += 360;
  return result;
}

function signToIndex(sign: string | null | undefined) {
  if (!sign) return 0;
  return SIGN_INDEX[sign.toUpperCase()] ?? 0;
}

function planetAbsoluteLongitude(planet: PlanetPosition): number {
  if (typeof planet.absoluteLongitude === 'number' && Number.isFinite(planet.absoluteLongitude) && planet.absoluteLongitude >= 0) {
    return normalizeAngle(planet.absoluteLongitude);
  }

  const signIndex = signToIndex(planet.sign);
  const deg = Number(planet.degree) || 0;
  const minutes = Number(planet.minutes) || 0;
  const seconds = Number(planet.seconds) || 0;
  return normalizeAngle(signIndex * 30 + deg + minutes / 60 + seconds / 3600);
}

function houseAbsoluteLongitude(house: HousePlacement): number {
  return normalizeAngle(signToIndex(house.sign) * 30 + (Number(house.degree) || 0));
}

function shortPlanetLabel(planetKey: string, labels?: Record<string, string>) {
  return labels?.[planetKey] ?? PLANET_TURKISH[planetKey] ?? planetKey;
}

function compactPlanetLabel(planetKey: string, labels?: Record<string, string>) {
  if (planetKey === 'NorthNode') return 'NN';
  const label = shortPlanetLabel(planetKey, labels);
  return label.length > 4 ? label.slice(0, 3) : label;
}

function aspectColor(type: AspectType, birthChart: BirthChartTheme) {
  const category = ASPECT_META[type]?.category;
  if (category === 'harmonious') return birthChart.aspectHarmonious;
  if (category === 'challenging') return birthChart.aspectChallenging;
  return birthChart.aspectNeutral;
}

function withAlpha(color: string, alpha: number) {
  const opacity = clamp(alpha, 0, 1);
  if (color.startsWith('#') && (color.length === 7 || color.length === 4)) {
    const full = color.length === 4
      ? color
        .slice(1)
        .split('')
        .map((part) => part + part)
        .join('')
      : color.slice(1);
    const value = Number.parseInt(full, 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  if (color.startsWith('rgba(')) {
    return color.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, `rgba($1,$2,$3,${opacity})`);
  }
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
  }
  return color;
}

function formatPlanetDegreeMinute(planet: PlanetPosition) {
  const deg = Number.isFinite(Number(planet.degree)) ? Math.floor(Number(planet.degree)) : 0;
  const min = Number.isFinite(Number(planet.minutes)) ? Math.abs(Number(planet.minutes)) : 0;
  return `${deg}°${String(min).padStart(2, '0')}'`;
}

function makeAspectKey(a: string, b: string) {
  return [a, b].sort().join('|');
}

function effectiveAspects(aspects: PlanetaryAspect[]) {
  return aspects
    .filter((aspect) => {
      const meta = ASPECT_META[aspect.type];
      return meta ? aspect.orb <= meta.maxOrb : false;
    })
    .sort((a, b) => a.orb - b.orb);
}

function calculateFallbackAspects(planets: PlanetPosition[]): PlanetaryAspect[] {
  const result: PlanetaryAspect[] = [];
  const relevant = planets.filter((p) => PLANET_ORDER.includes(p.planet as (typeof PLANET_ORDER)[number]));

  for (let i = 0; i < relevant.length; i += 1) {
    for (let j = i + 1; j < relevant.length; j += 1) {
      const p1 = relevant[i];
      const p2 = relevant[j];
      let angle = Math.abs(planetAbsoluteLongitude(p1) - planetAbsoluteLongitude(p2));
      if (angle > 180) angle = 360 - angle;

      (Object.keys(ASPECT_META) as AspectType[]).some((type) => {
        const meta = ASPECT_META[type];
        const orb = Math.abs(angle - meta.exact);
        if (orb <= meta.maxOrb) {
          result.push({
            planet1: p1.planet,
            planet2: p2.planet,
            type,
            angle: Math.round(angle * 100) / 100,
            orb: Math.round(orb * 100) / 100,
          });
          return true;
        }
        return false;
      });
    }
  }

  return result.sort((a, b) => a.orb - b.orb);
}

function buildAspectLookup(aspects: PlanetaryAspect[]) {
  const map = new Map<string, PlanetaryAspect>();
  for (const aspect of aspects) {
    const key = makeAspectKey(aspect.planet1, aspect.planet2);
    const prev = map.get(key);
    if (!prev || aspect.orb < prev.orb) {
      map.set(key, aspect);
    }
  }
  return map;
}

function polarPoint(cx: number, cy: number, radius: number, degrees: number) {
  const rad = ((degrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function circularDistance(a: number, b: number) {
  const delta = Math.abs(normalizeAngle(a) - normalizeAngle(b));
  return delta > 180 ? 360 - delta : delta;
}

function nudgePointTangential(point: { x: number; y: number }, degrees: number, offset: number) {
  if (!offset) return point;
  const rad = ((degrees - 90) * Math.PI) / 180;
  return {
    x: point.x - Math.sin(rad) * offset,
    y: point.y + Math.cos(rad) * offset,
  };
}

type LabelDistributionPlanet = PlanetPosition & {
  absLon: number;
  markerRadialOffset: number;
  labelRadialOffset: number;
  labelTangentialOffset: number;
  connector: boolean;
};

function distributePlanetLabels(
  sortedPlanets: Array<PlanetPosition & { absLon: number }>,
  options: { compact: boolean; poster: boolean; simple: boolean },
): LabelDistributionPlanet[] {
  if (!sortedPlanets.length) return [];

  const threshold = options.compact ? 5.5 : options.simple ? 8 : 9.5;
  const groups: Array<typeof sortedPlanets> = [];
  let currentGroup: typeof sortedPlanets = [];

  sortedPlanets.forEach((planet) => {
    const last = currentGroup[currentGroup.length - 1];
    if (!last || circularDistance(last.absLon, planet.absLon) <= threshold) {
      currentGroup.push(planet);
      return;
    }

    groups.push(currentGroup);
    currentGroup = [planet];
  });

  if (currentGroup.length) groups.push(currentGroup);

  if (
    groups.length > 1
    && circularDistance(groups[0][0].absLon, groups[groups.length - 1][groups[groups.length - 1].length - 1].absLon) <= threshold
  ) {
    groups[0] = [...groups[groups.length - 1], ...groups[0]];
    groups.pop();
  }

  return groups.flatMap((group) => {
    const center = (group.length - 1) / 2;
    const radialUnit = options.compact ? 5 : options.poster ? 8 : 7;
    const labelRadialUnit = options.compact ? 8 : options.poster ? 16 : 12;
    const labelTangentialUnit = options.compact ? 10 : options.poster ? 21 : 16;

    return group.map((planet, index) => {
      const relativeIndex = index - center;
      const layer = Math.max(0, Math.ceil(Math.abs(relativeIndex)));

      return {
        ...planet,
        markerRadialOffset: relativeIndex === 0 ? 0 : Math.sign(relativeIndex) * radialUnit * layer,
        labelRadialOffset: layer * labelRadialUnit,
        labelTangentialOffset: relativeIndex * labelTangentialUnit,
        connector: group.length > 1,
      };
    });
  });
}

function donutSegmentPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startDeg: number,
  endDeg: number,
) {
  const startOuter = polarPoint(cx, cy, rOuter, startDeg);
  const endOuter = polarPoint(cx, cy, rOuter, endDeg);
  const startInner = polarPoint(cx, cy, rInner, endDeg);
  const endInner = polarPoint(cx, cy, rInner, startDeg);
  const delta = ((endDeg - startDeg + 360) % 360) || 360;
  const largeArc = delta > 180 ? 1 : 0;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ');
}

function toPercentSlices<T extends string>(
  scores: Record<T, number>,
  colors: Record<T, string>,
  displayNames: Record<T, string>,
): ScoredSlice<T>[] {
  const total = (Object.values(scores) as number[]).reduce((sum, n) => sum + n, 0);
  const denominator = total > 0 ? total : 1;
  return (Object.keys(scores) as T[]).map((key) => ({
    key,
    displayName: displayNames[key],
    score: scores[key],
    pct: Math.round((scores[key] / denominator) * 1000) / 10,
    color: colors[key],
  }));
}

function analyzeBalance(planets: PlanetPosition[], risingSign?: string | null) {
  const elementScores: Record<ElementKey, number> = { fire: 0, earth: 0, air: 0, water: 0 };
  const modalityScores: Record<ModalityKey, number> = { cardinal: 0, fixed: 0, mutable: 0 };

  for (const planet of planets) {
    const weight = PLANET_WEIGHTS[planet.planet] ?? 1;
    const info = getZodiacInfo(planet.sign);
    const modality = SIGN_MODALITY_KEY[planet.sign?.toUpperCase?.() ?? ''];
    elementScores[info.elementKey] += weight;
    if (modality) modalityScores[modality] += weight;
  }

  if (risingSign) {
    const risingInfo = getZodiacInfo(risingSign);
    const risingModality = SIGN_MODALITY_KEY[risingSign.toUpperCase()];
    elementScores[risingInfo.elementKey] += 2.8;
    if (risingModality) modalityScores[risingModality] += 2.2;
  }

  return { elementScores, modalityScores };
}

function buildBalanceSummary(
  elements: ScoredSlice<ElementKey>[],
  modalities: ScoredSlice<ModalityKey>[],
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  const sorted = [...elements].sort((a, b) => b.score - a.score);
  const dominantElement = sorted[0];
  const secondElement = sorted[1];
  const lowestElement = sorted[sorted.length - 1];
  const dominantModality = [...modalities].sort((a, b) => b.score - a.score)[0];

  const dominantPct = dominantElement.pct;
  const secondPct = secondElement.pct;
  const lowestPct = lowestElement.pct;

  const elementIntroKey: Record<ElementKey, string> = {
    fire:  'natalChart.panels.elementIntroFire',
    earth: 'natalChart.panels.elementIntroEarth',
    air:   'natalChart.panels.elementIntroAir',
    water: 'natalChart.panels.elementIntroWater',
  };

  const modalityDepthKey: Record<ModalityKey, string> = {
    cardinal: 'natalChart.panels.modalityDepthCardinal',
    fixed:    'natalChart.panels.modalityDepthFixed',
    mutable:  'natalChart.panels.modalityDepthMutable',
  };

  const balanceAdviceKey: Record<ElementKey, string> = {
    fire:  'natalChart.panels.balanceAdviceFire',
    earth: 'natalChart.panels.balanceAdviceEarth',
    air:   'natalChart.panels.balanceAdviceAir',
    water: 'natalChart.panels.balanceAdviceWater',
  };

  const elementDisplayKey: Record<ElementKey, string> = {
    fire:  'natalChart.panels.elementFire',
    earth: 'natalChart.panels.elementEarth',
    air:   'natalChart.panels.elementAir',
    water: 'natalChart.panels.elementWater',
  };

  const parts: string[] = [];

  parts.push(t(elementIntroKey[dominantElement.key]));

  if (dominantPct - secondPct < 8) {
    parts.push(t('natalChart.panels.elementSecondaryBalance', { element: t(elementDisplayKey[secondElement.key]) }));
  }

  parts.push(t(modalityDepthKey[dominantModality.key]));

  if (lowestPct < 15) {
    parts.push(t(balanceAdviceKey[lowestElement.key]));
  }

  return parts.join('\n\n');
}

function MiniDonut<T extends string>({
  title,
  subtitle,
  slices,
}: {
  title: string;
  subtitle: string;
  slices: ScoredSlice<T>[];
}) {
  const size = 148;
  const { colors } = useTheme();
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 62;
  const rInner = 42;

  let cursor = -90;

  return (
    <View style={stylesLocal.donutCard}>
      <View style={stylesLocal.donutWrap}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={cx} cy={cy} r={rOuter} fill="rgba(0,0,0,0.02)" />
          {slices.map((slice) => {
            const sweep = (slice.pct / 100) * 360;
            const start = cursor;
            const end = cursor + sweep;
            cursor = end;
            return (
              <Path
                key={String(slice.key)}
                d={donutSegmentPath(cx, cy, rOuter, rInner, start, end)}
                fill={slice.color}
                opacity={0.95}
              />
            );
          })}
          <Circle cx={cx} cy={cy} r={rInner - 4} fill={colors.card} />
        </Svg>
        <View style={stylesLocal.donutCenterLabel}>
          <Text style={[stylesLocal.donutCenterTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[stylesLocal.donutCenterSub, { color: colors.muted }]}>{subtitle}</Text>
        </View>
      </View>

      <View style={stylesLocal.legendList}>
        {slices
          .slice()
          .sort((a, b) => b.score - a.score)
          .map((slice) => (
            <View key={`legend-${String(slice.key)}`} style={stylesLocal.legendRow}>
              <View style={[stylesLocal.legendDot, { backgroundColor: slice.color }]} />
              <Text style={[stylesLocal.legendLabel, { color: colors.textSoft }]}>{slice.displayName}</Text>
              <Text style={[stylesLocal.legendValue, { color: colors.text }]}>%{slice.pct.toFixed(1)}</Text>
            </View>
          ))}
      </View>
    </View>
  );
}

function SectionCard({
  title,
  subtitle,
  compact,
  children,
}: {
  title: string;
  subtitle?: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        stylesLocal.card,
        compact && stylesLocal.cardCompact,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={stylesLocal.cardHeader}>
        <Text style={[stylesLocal.cardTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[stylesLocal.cardSubtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function NatalWheel({
  planets,
  houses,
  aspects,
  planetNames,
  mode = 'full',
  chartMode = 'detailed',
  selectedPlanetId,
  onPlanetPress,
  renderWidthOverride,
  showMetaRow = false,
  showAuras = true,
}: {
  planets: PlanetPosition[];
  houses: HousePlacement[];
  aspects: PlanetaryAspect[];
  planetNames?: Record<string, string>;
  mode?: 'full' | 'hero';
  chartMode?: BirthChartMode;
  selectedPlanetId?: string | null;
  onPlanetPress?: (planet: PlanetPosition) => void;
  renderWidthOverride?: number;
  showMetaRow?: boolean;
  showAuras?: boolean;
}) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'tr';
  const { width } = useWindowDimensions();
  const isHero = mode === 'hero';
  const isPoster = !isHero && !showMetaRow && !showAuras;
  const isSimple = chartMode === 'simple';
  const birthChart = colors.birthChart;
  const layoutWidth = renderWidthOverride ?? width;
  const size = isHero
    ? clamp(layoutWidth - 34, 232, 282)
    : isPoster
      ? clamp(layoutWidth - 4, 560, 760)
      : renderWidthOverride
      ? clamp(layoutWidth - 8, 520, 720)
      : clamp(layoutWidth - 36, 324, 404);
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * (isPoster ? 0.446 : 0.468);
  const signR = size * (isPoster ? 0.386 : 0.402);
  const houseR = size * (isPoster ? 0.334 : 0.322);
  const planetR = size * (isPoster ? 0.372 : 0.252);
  const aspectR = size * (isPoster ? 0.205 : 0.162);
  const signGlyphSize = isHero ? 15 : isPoster ? 25 : 18;
  const signNameSize = isHero ? 6.4 : 7.5;
  const houseLabelSize = isHero ? 9 : isPoster ? 15 : 10.5;
  const planetGlyphSize = isHero ? 12 : isPoster ? 18 : 14;
  const planetGlyphRadius = isHero ? 10.5 : isPoster ? 14 : 12.5;
  const degreeLabelSize = isHero ? 8 : isPoster ? 10.5 : 9.5;
  const planetNameSize = isHero ? 6.4 : 7.4;
  const posterLine = birthChart.chartText;
  const posterMinor = birthChart.chartMutedLine;
  const posterMuted = birthChart.chartTextMuted;
  const posterSurface = birthChart.chartBackground;

  const aspectList = useMemo(
    () => {
      const nextAspects = aspects.length ? effectiveAspects(aspects) : calculateFallbackAspects(planets);
      if (!isSimple) return nextAspects;
      const majorTypes = new Set<AspectType>(['CONJUNCTION', 'SEXTILE', 'SQUARE', 'TRINE', 'OPPOSITION']);
      return nextAspects
        .filter((aspect) => majorTypes.has(aspect.type))
        .slice(0, 9);
    },
    [aspects, isSimple, planets],
  );

  const orderedPlanets = useMemo(() => {
    const byKey = new Map(planets.map((p) => [p.planet, p] as const));
    return PLANET_ORDER.map((key) => byKey.get(key)).filter((p): p is PlanetPosition => Boolean(p));
  }, [planets]);

  const houseCusps = useMemo(() => {
    if (houses.length >= 12) {
      return [...houses]
        .sort((a, b) => a.houseNumber - b.houseNumber)
        .map((h) => ({ house: h.houseNumber, lon: houseAbsoluteLongitude(h), sign: h.sign }));
    }
    return [];
  }, [houses]);

  const ascLon = houseCusps.find((h) => h.house === 1)?.lon ?? 0;

  const toWheelAngle = (absoluteLon: number) => normalizeAngle(180 - (absoluteLon - ascLon));

  const displayedPlanets = useMemo(() => {
    const sorted = orderedPlanets
      .map((p) => ({ ...p, absLon: planetAbsoluteLongitude(p) }))
      .sort((a, b) => a.absLon - b.absLon);

    return distributePlanetLabels(sorted, { compact: isHero, poster: isPoster, simple: isSimple });
  }, [isHero, isPoster, isSimple, orderedPlanets]);

  const showPlanetLabel = useCallback((planet: PlanetPosition) => {
    if (isPoster || !isSimple) return true;
    return planet.planet === 'Sun' || planet.planet === 'Moon' || planet.planet === 'Mercury' || planet.planet === 'Venus' || planet.planet === 'Mars';
  }, [isPoster, isSimple]);

  const planetA11yLabel = useCallback((planet: PlanetPosition) => {
    const planetLabel = shortPlanetLabel(planet.planet, planetNames);
    const zodiac = getZodiacInfo(planet.sign, locale);
    const houseLabel = planet.house ? t('natalChart.panels.housePosition', { number: planet.house }) : '';
    return [planetLabel, zodiac.name, houseLabel].filter(Boolean).join(', ');
  }, [locale, planetNames, t]);

  const planetMarkerPoint = useCallback((planet: LabelDistributionPlanet) => {
    const angle = toWheelAngle(planet.absLon);
    return polarPoint(cx, cy, planetR + planet.markerRadialOffset, angle);
  }, [cx, cy, planetR, toWheelAngle]);

  const planetLabelPoint = useCallback((planet: LabelDistributionPlanet) => {
    const angle = toWheelAngle(planet.absLon);
    return nudgePointTangential(
      polarPoint(cx, cy, planetR + (isPoster ? -24 : 34) + planet.labelRadialOffset, angle),
      angle,
      planet.labelTangentialOffset,
    );
  }, [cx, cy, isPoster, planetR, toWheelAngle]);

  return (
    <View style={stylesLocal.wheelWrap}>
      <View
        style={[
          stylesLocal.wheelStage,
          isHero ? stylesLocal.wheelStageHero : isPoster ? stylesLocal.wheelStagePoster : stylesLocal.wheelStageFull,
          {
            width: size,
            height: size,
            backgroundColor: isPoster ? posterSurface : birthChart.chartBackground,
            borderColor: birthChart.cardBorder,
            shadowColor: birthChart.shadow,
          },
        ]}
      >
        {showAuras ? <View style={[stylesLocal.wheelAuraPrimary, { backgroundColor: birthChart.glow }]} /> : null}
        {showAuras ? <View style={[stylesLocal.wheelAuraSecondary, { backgroundColor: withAlpha(birthChart.infoAccent, 0.14) }]} /> : null}

        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <SvgLinearGradient id="wheelRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={birthChart.primaryAccent} stopOpacity={isSimple ? 0.16 : 0.22} />
              <Stop offset="48%" stopColor={birthChart.goldAccent} stopOpacity={isSimple ? 0.09 : 0.13} />
              <Stop offset="100%" stopColor={birthChart.infoAccent} stopOpacity={isSimple ? 0.07 : 0.11} />
            </SvgLinearGradient>
          </Defs>

          <Circle
            cx={cx}
            cy={cy}
            r={outerR}
            fill={isPoster ? posterSurface : 'url(#wheelRing)'}
            stroke={isPoster ? posterLine : birthChart.chartLine}
            strokeWidth={isPoster ? 1.35 : 1.2}
          />
          <Circle
            cx={cx}
            cy={cy}
            r={signR}
            fill="transparent"
            stroke={isPoster ? posterMinor : birthChart.chartMutedLine}
            strokeWidth={1}
          />
          <Circle
            cx={cx}
            cy={cy}
            r={houseR}
            fill="transparent"
            stroke={isPoster ? posterMinor : birthChart.chartMutedLine}
            strokeWidth={1}
          />
          <Circle
            cx={cx}
            cy={cy}
            r={planetR + (isPoster ? 10 : 14)}
            fill="transparent"
            stroke={isPoster ? posterMinor : birthChart.chartMutedLine}
            strokeWidth={0.85}
          />
          <Circle
            cx={cx}
            cy={cy}
            r={aspectR + 18}
            fill={isPoster ? posterSurface : birthChart.chartBackground}
            stroke={isPoster ? posterLine : birthChart.chartMutedLine}
            strokeWidth={1}
          />

          {isPoster ? Array.from({ length: 72 }, (_, index) => {
            const absoluteLon = index * 5;
            const angle = toWheelAngle(absoluteLon);
            const outer = polarPoint(cx, cy, outerR - 1, angle);
            const isBoundary = absoluteLon % 30 === 0;
            const isTenStep = absoluteLon % 10 === 0;
            const tickDepth = isBoundary ? 18 : isTenStep ? 13 : 8;
            const inner = polarPoint(cx, cy, outerR - tickDepth, angle);
            return (
              <Line
                key={`tick-${absoluteLon}`}
                x1={outer.x}
                y1={outer.y}
                x2={inner.x}
                y2={inner.y}
                stroke={posterLine}
                strokeWidth={isBoundary ? 1.1 : isTenStep ? 0.8 : 0.55}
                strokeOpacity={isBoundary ? 0.92 : 0.74}
              />
            );
          }) : null}

          {isPoster ? Array.from({ length: 12 }, (_, signIndex) => [5, 10, 15, 20, 25].map((degree) => {
            const angle = toWheelAngle(signIndex * 30 + degree);
            const point = polarPoint(cx, cy, outerR - 22, angle);
            return (
              <SvgText
                key={`degree-marker-${signIndex}-${degree}`}
                x={point.x}
                y={point.y + 3}
                fontSize={7.5}
                fill={posterMuted}
                textAnchor="middle"
              >
                {degree}
              </SvgText>
            );
          })) : null}

          {Array.from({ length: 12 }, (_, i) => {
            const absoluteLon = i * 30;
            const angle = toWheelAngle(absoluteLon);
            const outer = polarPoint(cx, cy, outerR, angle);
            const inner = polarPoint(cx, cy, signR, angle);
            const glyphPoint = polarPoint(
              cx,
              cy,
              isPoster ? outerR + 10 : (outerR + signR) / 2,
              angle + 15,
            );
            const posterNamePoint = polarPoint(cx, cy, outerR + 25, angle + 15);
            const mid = polarPoint(cx, cy, (outerR + signR) / 2, angle + 15);
            const signInfo = getZodiacInfo(SIGN_KEYS_IN_ORDER[i], locale);
            return (
              <G key={`sign-${i}`}>
                <Line
                  x1={outer.x}
                  y1={outer.y}
                  x2={inner.x}
                  y2={inner.y}
                  stroke={isPoster ? posterLine : birthChart.chartLine}
                  strokeWidth={1}
                />
                <SvgText
                  x={isPoster ? glyphPoint.x : mid.x}
                  y={(isPoster ? glyphPoint.y : mid.y) + (isPoster ? 8 : 5)}
                  fontSize={signGlyphSize}
                  fontWeight="700"
                  fill={isPoster ? birthChart.primaryAccent : birthChart.chartText}
                  textAnchor="middle"
                >
                  {signInfo.symbol}
                </SvgText>
                <SvgText
                  x={isPoster ? posterNamePoint.x : mid.x}
                  y={isPoster ? posterNamePoint.y + 3 : mid.y + (isHero ? 12 : 15)}
                  fontSize={isPoster ? 8.4 : signNameSize}
                  fill={isPoster ? posterMuted : birthChart.chartTextMuted}
                  textAnchor="middle"
                >
                  {signInfo.name}
                </SvgText>
              </G>
            );
          })}

          {houseCusps.map((cusp) => {
            const angle = toWheelAngle(cusp.lon);
            const outer = polarPoint(cx, cy, signR, angle);
            const inner = polarPoint(cx, cy, aspectR + 18, angle);
            const labelPt = polarPoint(cx, cy, (signR + houseR) / 2, angle + 10);
            return (
              <G key={`house-${cusp.house}`}>
                <Line
                  x1={outer.x}
                  y1={outer.y}
                  x2={inner.x}
                  y2={inner.y}
                  stroke={
                    isPoster
                      ? posterLine
                      : cusp.house === 1 || cusp.house === 10
                        ? birthChart.primaryAccent
                        : birthChart.chartHouseLine
                  }
                  strokeWidth={cusp.house === 1 || cusp.house === 10 ? 1.8 : 1}
                />
                <SvgText
                  x={labelPt.x}
                  y={labelPt.y + 4}
                  fontSize={houseLabelSize}
                  fontWeight="700"
                  fill={isPoster ? posterLine : birthChart.chartTextMuted}
                  textAnchor="middle"
                >
                  {String(cusp.house)}
                </SvgText>
              </G>
            );
          })}

          {aspectList.map((aspect, idx) => {
            const p1 = displayedPlanets.find((p) => p.planet === aspect.planet1);
            const p2 = displayedPlanets.find((p) => p.planet === aspect.planet2);
            if (!p1 || !p2) return null;
            const a1 = toWheelAngle(p1.absLon);
            const a2 = toWheelAngle(p2.absLon);
            const p1Pt = polarPoint(cx, cy, aspectR, a1);
            const p2Pt = polarPoint(cx, cy, aspectR, a2);
            const meta = ASPECT_META[aspect.type];
            const isSelectedAspect = Boolean(
              selectedPlanetId && (aspect.planet1 === selectedPlanetId || aspect.planet2 === selectedPlanetId),
            );
            const lineColor = isSelectedAspect
              ? birthChart.aspectSelected
              : meta ? aspectColor(aspect.type, birthChart) : birthChart.aspectNeutral;
            return (
              <Line
                key={`aspect-line-${idx}`}
                x1={p1Pt.x}
                y1={p1Pt.y}
                x2={p2Pt.x}
                y2={p2Pt.y}
                stroke={lineColor}
                strokeOpacity={selectedPlanetId ? (isSelectedAspect ? 0.92 : 0.18) : isSimple ? 0.48 : 0.72}
                strokeWidth={isSelectedAspect ? 2.15 : aspect.orb <= 2 ? 1.65 : 1.05}
              />
            );
          })}

          {displayedPlanets.map((planet) => {
            const markerPoint = planetMarkerPoint(planet);
            const labelPoint = planetLabelPoint(planet);
            const glyph = PLANET_GLYPHS[planet.planet] ?? '•';
            const selected = selectedPlanetId === planet.planet;
            const label = compactPlanetLabel(planet.planet, planetNames);
            const chipWidth = clamp(label.length * (isPoster ? 8 : 7) + (isPoster ? 36 : 30), isPoster ? 48 : 42, isPoster ? 86 : 72);
            const chipHeight = isPoster ? 26 : isSimple ? 22 : 30;
            const shouldShowLabel = showPlanetLabel(planet) || selected;
            return (
              <G key={`planet-${planet.planet}`}>
                {planet.connector && shouldShowLabel ? (
                  <Line
                    x1={markerPoint.x}
                    y1={markerPoint.y}
                    x2={labelPoint.x}
                    y2={labelPoint.y}
                    stroke={isPoster ? posterMinor : birthChart.chartMutedLine}
                    strokeOpacity={selected ? 0.78 : 0.52}
                    strokeWidth={selected ? 1.15 : 0.75}
                  />
                ) : null}
                <Circle
                  cx={markerPoint.x}
                  cy={markerPoint.y}
                  r={selected ? planetGlyphRadius + 3 : planetGlyphRadius}
                  fill={isPoster ? posterSurface : selected ? birthChart.selectedPlanetBackground : birthChart.planetMarkerBackground}
                  stroke={isPoster ? posterLine : selected ? birthChart.selectedPlanetBorder : birthChart.planetMarkerBorder}
                  strokeWidth={selected ? 1.8 : 1}
                />
                <SvgText
                  x={markerPoint.x}
                  y={markerPoint.y + 4}
                  fontSize={planetGlyphSize}
                  fontWeight="700"
                  fill={isPoster ? posterLine : selected ? birthChart.selectedPlanetBorder : birthChart.chartText}
                  textAnchor="middle"
                >
                  {glyph}
                </SvgText>
                {shouldShowLabel ? (
                  <G>
                    {!isPoster ? (
                      <Rect
                        x={labelPoint.x - chipWidth / 2}
                        y={labelPoint.y - chipHeight / 2}
                        width={chipWidth}
                        height={chipHeight}
                        rx={chipHeight / 2}
                        fill={selected ? birthChart.selectedPlanetBackground : birthChart.planetMarkerBackground}
                        stroke={selected ? birthChart.selectedPlanetBorder : birthChart.planetMarkerBorder}
                        strokeWidth={selected ? 1.2 : 0.8}
                      />
                    ) : null}
                    <SvgText
                      x={labelPoint.x}
                      y={labelPoint.y + (isPoster ? -1 : 3)}
                      fontSize={isPoster ? degreeLabelSize : planetNameSize}
                      fontWeight={selected ? '800' : '700'}
                      fill={isPoster ? birthChart.primaryAccent : selected ? birthChart.selectedPlanetBorder : birthChart.chartTextMuted}
                      textAnchor="middle"
                    >
                      {isPoster ? formatPlanetDegreeMinute(planet) : label}
                    </SvgText>
                    {!isPoster && !isSimple ? (
                      <SvgText
                        x={labelPoint.x}
                        y={labelPoint.y + 14}
                        fontSize={degreeLabelSize - 1}
                        fill={birthChart.chartTextMuted}
                        textAnchor="middle"
                      >
                        {`${Math.floor(planet.degree)}°`}
                      </SvgText>
                    ) : null}
                  </G>
                ) : null}
              </G>
            );
          })}
        </Svg>
        {onPlanetPress ? displayedPlanets.map((planet) => {
          const markerPoint = planetMarkerPoint(planet);
          return (
            <Pressable
              key={`planet-hit-${planet.planet}`}
              style={[
                stylesLocal.planetHitTarget,
                {
                  left: markerPoint.x - 22,
                  top: markerPoint.y - 22,
                },
              ]}
              onPress={() => onPlanetPress(planet)}
              accessibilityLabel={planetA11yLabel(planet)}
              accessibilityRole="button"
            />
          );
        }) : null}
      </View>

      {!isHero && showMetaRow ? (
        <View style={stylesLocal.wheelMetaRow}>
          <View style={[stylesLocal.wheelMetaPill, { backgroundColor: birthChart.cardSoft, borderColor: birthChart.cardBorder }]}>
            <Text style={[stylesLocal.wheelMetaLabel, { color: birthChart.primaryAccent }]}>{t('natalChart.panels.premiumWheelLabel')}</Text>
          </View>
          <View style={[stylesLocal.wheelMetaPill, { backgroundColor: birthChart.cardSoft, borderColor: birthChart.cardBorder }]}>
            <Text style={[stylesLocal.wheelMetaText, { color: birthChart.textMuted }]}>{t('natalChart.panels.tropicalLabel')}</Text>
          </View>
          <View style={[stylesLocal.wheelMetaPill, { backgroundColor: birthChart.cardSoft, borderColor: birthChart.cardBorder }]}>
            <Text style={[stylesLocal.wheelMetaText, { color: birthChart.textMuted }]}>{t('natalChart.panels.placidusLabel')}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function CosmicPositionDetails({
  planets,
  planetNames,
}: {
  planets: PlanetPosition[];
  planetNames?: Record<string, string>;
}) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();

  const ordered = useMemo(() => {
    const byKey = new Map(planets.map((p) => [p.planet, p] as const));
    return PLANET_ORDER.map((key) => byKey.get(key)).filter((p): p is PlanetPosition => Boolean(p));
  }, [planets]);

  return (
    <View style={stylesLocal.positionList}>
      <View style={[stylesLocal.positionHeaderRow, { backgroundColor: colors.surfaceAlt, borderBottomColor: colors.borderLight }]}>
        <Text style={[stylesLocal.positionHeaderCellLeft, { color: colors.textMuted }]}>{t('natalChart.panels.colHeaderPlanet')}</Text>
        <Text style={[stylesLocal.positionHeaderCellMid, { color: colors.textMuted }]}>{t('natalChart.panels.colHeaderSign')}</Text>
        <Text style={[stylesLocal.positionHeaderCellDeg, { color: colors.textMuted }]}>{t('natalChart.panels.colHeaderDegree')}</Text>
        <Text style={[stylesLocal.positionHeaderCellRight, { color: colors.textMuted }]}>{t('natalChart.panels.colHeaderHouse')}</Text>
      </View>
      {ordered.map((planet) => {
        const zodiac = getZodiacInfo(planet.sign, i18n.language);
        return (
          <View
            key={`position-detail-${planet.planet}`}
            style={[
              stylesLocal.positionRow,
              {
                backgroundColor: colors.surface,
                borderBottomColor: colors.borderLight,
              },
            ]}
          >
            <Text style={[stylesLocal.positionCellLeft, { color: colors.text }]}>
              {PLANET_GLYPHS[planet.planet] ?? '•'} {shortPlanetLabel(planet.planet, planetNames)}
            </Text>
            <Text style={[stylesLocal.positionCellMid, { color: colors.textSoft }]}>
              {zodiac.symbol} {zodiac.name}
            </Text>
            <Text style={[stylesLocal.positionCellDeg, { color: colors.textSoft }]}>
              {formatPlanetDegreeMinute(planet)}
            </Text>
            <Text style={[stylesLocal.positionCellRight, { color: colors.textMuted }]}>{t('natalChart.panels.housePosition', { number: planet.house })}</Text>
          </View>
        );
      })}
    </View>
  );
}

function AspectMatrix({
  planets,
  aspects,
  planetNames,
  onAspectPress,
}: {
  planets: PlanetPosition[];
  aspects: PlanetaryAspect[];
  planetNames?: Record<string, string>;
  onAspectPress?: (aspect: PlanetaryAspect) => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const aspectList = useMemo(
    () => (aspects.length ? effectiveAspects(aspects) : calculateFallbackAspects(planets)),
    [aspects, planets],
  );
  const lookup = useMemo(() => buildAspectLookup(aspectList), [aspectList]);

  const ordered = useMemo(() => {
    const byKey = new Map(planets.map((p) => [p.planet, p] as const));
    return PLANET_ORDER.filter((k) => byKey.has(k));
  }, [planets]);

  const cellSize = 44;
  const labelSize = 56;
  const gridWidth = labelSize + ordered.length * cellSize;

  const renderCell = (rowPlanet: string, colPlanet: string, rowIndex: number, colIndex: number): AspectCell => {
    if (colIndex <= rowIndex) return null;
    return lookup.get(makeAspectKey(rowPlanet, colPlanet)) ?? null;
  };

  return (
    <View style={stylesLocal.matrixWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ minWidth: gridWidth }}>
          <View style={stylesLocal.matrixRow}>
            <View style={[stylesLocal.matrixCorner, { width: labelSize, height: labelSize }]} />
            {ordered.map((planet) => (
              <View
                key={`top-${planet}`}
                style={[
                  stylesLocal.matrixHeaderCell,
                  {
                    width: cellSize,
                    height: labelSize,
                    borderColor: colors.borderLight,
                    backgroundColor: colors.surfaceAlt,
                  },
                ]}
              >
                <Text style={[stylesLocal.matrixGlyph, { color: colors.text }]}>
                  {PLANET_GLYPHS[planet] ?? '•'}
                </Text>
                <Text style={[stylesLocal.matrixHeaderLabel, { color: colors.textMuted }]}>
                  {compactPlanetLabel(planet, planetNames)}
                </Text>
              </View>
            ))}
          </View>

          {ordered.map((rowPlanet, rowIndex) => (
            <View key={`row-${rowPlanet}`} style={stylesLocal.matrixRow}>
              <View
                style={[
                  stylesLocal.matrixHeaderCell,
                  {
                    width: labelSize,
                    height: cellSize,
                    borderColor: colors.borderLight,
                    backgroundColor: colors.surfaceAlt,
                  },
                ]}
              >
                <Text style={[stylesLocal.matrixGlyph, { color: colors.text }]}>
                  {PLANET_GLYPHS[rowPlanet] ?? '•'}
                </Text>
                <Text style={[stylesLocal.matrixHeaderLabel, { color: colors.textMuted }]}>
                  {compactPlanetLabel(rowPlanet, planetNames)}
                </Text>
              </View>

              {ordered.map((colPlanet, colIndex) => {
                const aspect = renderCell(rowPlanet, colPlanet, rowIndex, colIndex);
                const isTriangleHidden = colIndex < rowIndex;
                const isDiagonal = colIndex === rowIndex;

                if (isTriangleHidden) {
                  return (
                    <View
                      key={`${rowPlanet}-${colPlanet}`}
                      style={[
                        stylesLocal.matrixCell,
                        {
                          width: cellSize,
                          height: cellSize,
                          borderColor: colors.borderLight,
                          backgroundColor: 'transparent',
                          borderWidth: 0,
                        },
                      ]}
                    />
                  );
                }

                if (isDiagonal) {
                  return (
                    <View
                      key={`${rowPlanet}-${colPlanet}`}
                      style={[
                        stylesLocal.matrixCell,
                        {
                          width: cellSize,
                          height: cellSize,
                          borderColor: colors.borderLight,
                          backgroundColor: colors.violetBg,
                        },
                      ]}
                    >
                      <Text style={[stylesLocal.matrixDiagonal, { color: colors.violet }]}>
                        {PLANET_GLYPHS[rowPlanet] ?? '•'}
                      </Text>
                    </View>
                  );
                }

                const meta = aspect ? ASPECT_META[aspect.type] : null;
                const accent = aspect ? aspectColor(aspect.type, colors.birthChart) : colors.muted;
                const bg = aspect ? `${accent}18` : colors.surface;

                const content = (
                  <View
                    style={[
                      stylesLocal.matrixCell,
                      {
                        width: cellSize,
                        height: cellSize,
                        borderColor: colors.borderLight,
                        backgroundColor: bg,
                      },
                    ]}
                  >
                    {aspect ? (
                      <>
                        <Text style={[stylesLocal.matrixAspectSymbol, { color: accent }]}>
                          {meta?.symbol}
                        </Text>
                        <Text style={[stylesLocal.matrixOrb, { color: colors.textMuted }]}>
                          {aspect.orb.toFixed(1)}
                        </Text>
                      </>
                    ) : (
                      <Text style={[stylesLocal.matrixEmpty, { color: colors.borderMuted }]}>·</Text>
                    )}
                  </View>
                );

                if (aspect && onAspectPress) {
                  return (
                    <Pressable
                      key={`${rowPlanet}-${colPlanet}`}
                      onPress={() => onAspectPress(aspect)}
                      accessibilityRole="button"
                      accessibilityLabel={`${labelPlanet(rowPlanet)} ${meta ? t(meta.label) : ''} ${labelPlanet(colPlanet)} orb ${aspect.orb.toFixed(1)}`}
                    >
                      {content}
                    </Pressable>
                  );
                }

                return <View key={`${rowPlanet}-${colPlanet}`}>{content}</View>;
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={stylesLocal.aspectLegendWrap}>
        {(Object.keys(ASPECT_META) as AspectType[]).map((type) => {
          const meta = ASPECT_META[type];
          const color = aspectColor(type, colors.birthChart);
          return (
            <View key={`legend-${type}`} style={stylesLocal.aspectLegendItem}>
              <Text style={[stylesLocal.aspectLegendSymbol, { color }]}>{meta.symbol}</Text>
              <Text style={[stylesLocal.aspectLegendLabel, { color: colors.textMuted }]}>
                {t(meta.label)} · {meta.exact}° · orb≤{meta.maxOrb}°
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function CosmicBalance({
  planets,
  risingSign,
}: {
  planets: PlanetPosition[];
  risingSign?: string | null;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const elementColors: Record<ElementKey, string> = {
    fire: '#F97316',
    earth: '#84CC16',
    air: '#38BDF8',
    water: '#6366F1',
  };
  const modalityColors: Record<ModalityKey, string> = {
    cardinal: '#F59E0B',
    fixed: '#10B981',
    mutable: '#8B5CF6',
  };

  const { elementSlices, modalitySlices, summary } = useMemo(() => {
    const elementDisplayNames: Record<ElementKey, string> = {
      fire: t('natalChart.panels.elementFire'),
      earth: t('natalChart.panels.elementEarth'),
      air: t('natalChart.panels.elementAir'),
      water: t('natalChart.panels.elementWater'),
    };
    const modalityDisplayNames: Record<ModalityKey, string> = {
      cardinal: t('natalChart.panels.modalityCardinal'),
      fixed: t('natalChart.panels.modalityFixed'),
      mutable: t('natalChart.panels.modalityMutable'),
    };
    const { elementScores, modalityScores } = analyzeBalance(planets, risingSign);
    const elementSlices = toPercentSlices(elementScores, elementColors, elementDisplayNames);
    const modalitySlices = toPercentSlices(modalityScores, modalityColors, modalityDisplayNames);
    const summary = buildBalanceSummary(elementSlices, modalitySlices, t);
    return { elementSlices, modalitySlices, summary };
  }, [planets, risingSign, t]);

  return (
    <View style={stylesLocal.balanceWrap}>
      <View style={stylesLocal.balanceDonutsRow}>
        <MiniDonut title={t('natalChart.panels.elementDonutTitle')} subtitle={t('natalChart.panels.elementDonutSubtitle')} slices={elementSlices} />
        <MiniDonut title={t('natalChart.panels.modalityDonutTitle')} subtitle={t('natalChart.panels.modalityDonutSubtitle')} slices={modalitySlices} />
      </View>

      <View
        style={[
          stylesLocal.balanceSummaryBox,
          {
            backgroundColor: colors.primaryTint,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[stylesLocal.balanceSummaryTitle, { color: colors.violet }]}>{t('natalChart.panels.energyDistributionTitle')}</Text>
        <Text style={[stylesLocal.balanceSummaryText, { color: colors.body }]}>{summary}</Text>
      </View>
    </View>
  );
}

function makePlanetPlacement(
  planet: PlanetPosition | undefined,
  planetNames: Record<string, string> | undefined,
): PremiumPlacement | null {
  if (!planet) return null;
  return {
    id: `planet:${planet.planet}`,
    kind: 'planet',
    planet,
    label: shortPlanetLabel(planet.planet, planetNames),
    sign: planet.sign,
    house: planet.house,
    glyph: PLANET_GLYPHS[planet.planet] ?? '•',
  };
}

function makeAscendantPlacement(risingSign?: string | null): PremiumPlacement {
  return {
    id: 'axis:ascendant',
    kind: 'ascendant',
    label: 'ASC',
    sign: risingSign ?? null,
    house: risingSign ? 1 : undefined,
    glyph: '↗',
  };
}

function ModeToggle({
  value,
  onChange,
}: {
  value: BirthChartMode;
  onChange: (next: BirthChartMode) => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const bc = colors.birthChart;
  const modes: BirthChartMode[] = ['simple', 'detailed'];

  return (
    <View style={[stylesLocal.modeToggle, { backgroundColor: bc.cardSoft, borderColor: bc.cardBorder }]}>
      {modes.map((mode) => {
        const selected = mode === value;
        return (
          <Pressable
            key={mode}
            style={[
              stylesLocal.modeToggleItem,
              {
                borderColor: selected ? bc.cardBorderStrong : bc.cardBorder,
              },
              selected && {
                backgroundColor: value === 'simple' ? bc.cardBackground : bc.selectedPlanetBackground,
              },
            ]}
            onPress={() => onChange(mode)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={mode === 'simple' ? t('natalChart.panels.simpleMode', 'Basit') : t('natalChart.panels.detailedMode', 'Detaylı')}
          >
            <Text
              style={[
                stylesLocal.modeToggleText,
                { color: selected ? (value === 'simple' ? bc.primaryAccent : bc.textPrimary) : bc.textSecondary },
              ]}
            >
              {mode === 'simple' ? t('natalChart.panels.simpleMode', 'Basit') : t('natalChart.panels.detailedMode', 'Detaylı')}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PlacementPill({ placement }: { placement: PremiumPlacement }) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const bc = colors.birthChart;
  const signInfo = getZodiacInfo(placement.sign, i18n.resolvedLanguage ?? i18n.language);
  const houseLabel = placement.house
    ? t('natalChart.panels.housePosition', { number: placement.house })
    : null;

  return (
    <View style={stylesLocal.placementPillStack}>
      <Text style={[stylesLocal.placementPillSign, { color: bc.textPrimary }]}>
        {placement.sign ? `${signInfo.name} ${signInfo.symbol}` : t('natalChart.panels.ascUnavailable', 'Hesaplanamadı')}
      </Text>
      {houseLabel ? (
        <View style={[stylesLocal.placementHouseBadge, { backgroundColor: bc.cardSoft, borderColor: bc.cardBorder }]}>
          <Text style={[stylesLocal.placementHouseBadgeText, { color: bc.primaryAccent }]}>{houseLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

function BigThreeSummaryCards({
  sun,
  moon,
  ascendant,
  selectedId,
  onSelect,
}: {
  sun: PremiumPlacement | null;
  moon: PremiumPlacement | null;
  ascendant: PremiumPlacement;
  selectedId: string | null;
  onSelect: (placement: PremiumPlacement) => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const bc = colors.birthChart;
  const cards = [
    { key: 'sun', placement: sun, title: t('natalChart.sun'), icon: 'sunny-outline' as const, accent: bc.goldAccent },
    { key: 'moon', placement: moon, title: t('natalChart.moon'), icon: 'moon-outline' as const, accent: bc.primaryAccent },
    { key: 'asc', placement: ascendant, title: t('natalChart.panels.ascTitle', 'ASC Yükselen'), icon: 'navigate-outline' as const, accent: bc.successAccent },
  ];

  return (
    <View style={stylesLocal.bigThreeGrid}>
      {cards.map(({ key, placement, title, icon, accent }) => {
        const isSelected = placement ? placement.id === selectedId : false;
        return (
          <Pressable
            key={key}
            disabled={!placement}
            style={[
              stylesLocal.bigThreeCard,
              {
                backgroundColor: isSelected ? bc.cardElevated : bc.cardBackground,
                borderColor: isSelected ? accent : bc.cardBorder,
                shadowColor: bc.shadow,
              },
            ]}
            onPress={() => placement && onSelect(placement)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected, disabled: !placement }}
            accessibilityLabel={title}
          >
            <View style={[stylesLocal.bigThreeIconBadge, { backgroundColor: bc.iconBadgeBackground, borderColor: bc.iconBadgeBorder }]}>
              <Ionicons name={icon} size={24} color={accent} />
            </View>
            <View style={stylesLocal.bigThreeTextCol}>
              <Text style={[stylesLocal.bigThreeTitle, { color: bc.textPrimary }]} numberOfLines={1}>{title}</Text>
              {placement ? <PlacementPill placement={placement} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function getPlacementInsight(
  placement: PremiumPlacement | null,
  insights: NatalPlanetComboInsight[] | undefined,
  locale: string,
  t: (key: string, options?: any) => string,
) {
  if (!placement) return null;
  if (placement.kind === 'planet') {
    const insight = insights?.find(
      (item) =>
        item.planet === placement.planet.planet &&
        item.sign === placement.planet.sign &&
        item.house === placement.planet.house,
    );
    const planetDescription = getPlanetDescription(placement.planet.planet, locale);
    const signInfo = getZodiacInfo(placement.planet.sign, locale);

    return {
      body: insight?.summary
        ?? insight?.effectLine
        ?? planetDescription?.meaning
        ?? t('natalChart.panels.genericPlacementBody', {
          planet: placement.label,
          sign: signInfo.name,
          defaultValue: '{{planet}} yerleşimin, {{sign}} teması üzerinden karakterinde belirgin bir odak oluşturur.',
        }),
      strengths: insight?.strengths?.length
        ? insight.strengths.slice(0, 2)
        : [
          t('natalChart.panels.genericStrengthOne', 'Özgün bakış açısı'),
          t('natalChart.panels.genericStrengthTwo', 'Potansiyelini bilinçli kullanma'),
        ],
      cautions: [
        insight?.cautionLine ?? t('natalChart.panels.genericCautionOne', 'Bu enerjiyi aşırı zorladığında iç dengen yorulabilir.'),
        t('natalChart.panels.genericCautionTwo', 'Esneklik ve geri bildirim denge sağlar.'),
      ].filter(Boolean),
    };
  }

  const signInfo = getZodiacInfo(placement.sign, locale);
  return {
    body: placement.sign
      ? t('natalChart.panels.ascInsightBody', {
        sign: signInfo.name,
        defaultValue: '{{sign}} yükselen, dünyaya verdiğin ilk izlenimde sezgisel duruşunu ve başlangıç enerjini belirginleştirir.',
      })
      : t('natalChart.panels.ascMissingInsight', 'Yükselen için doğum saati bilgisi gerekir; saat olmadığında bu alan hesaplanamaz.'),
    strengths: [
      t('natalChart.panels.ascStrengthOne', 'İlk izlenimini bilinçli yönetme'),
      t('natalChart.panels.ascStrengthTwo', 'Yaşam yönünü daha net okuma'),
    ],
    cautions: [
      t('natalChart.panels.ascCautionOne', 'Doğum saati netliği yükselen yorumunu değiştirir.'),
    ],
  };
}

function SelectedPlacementInsightCard({
  placement,
  insights,
}: {
  placement: PremiumPlacement | null;
  insights?: NatalPlanetComboInsight[];
}) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const bc = colors.birthChart;
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'tr';
  const insight = getPlacementInsight(placement, insights, locale, t);

  if (!placement || !insight) {
    return (
      <View style={[stylesLocal.insightCard, { backgroundColor: bc.cardElevated, borderColor: bc.cardBorder }]}>
        <Text style={[stylesLocal.insightTitle, { color: bc.textPrimary }]}>{t('natalChart.panels.emptyChartTitle', 'Doğum haritası verisi hazırlanıyor')}</Text>
        <Text style={[stylesLocal.insightBody, { color: bc.textSecondary }]}>{t('natalChart.panels.emptyChartSub', 'Gezegen yerleşimleri geldiğinde bu alan otomatik güncellenir.')}</Text>
      </View>
    );
  }

  return (
    <View style={[stylesLocal.insightCard, { backgroundColor: bc.cardElevated, borderColor: bc.cardBorderStrong, shadowColor: bc.shadow }]}>
      <View style={stylesLocal.insightHeader}>
        <View style={[stylesLocal.insightIconBadge, { backgroundColor: bc.iconBadgeBackground, borderColor: bc.iconBadgeBorder }]}>
          <Text style={[stylesLocal.insightGlyph, { color: bc.goldAccent }]}>{placement.glyph}</Text>
        </View>
        <View style={stylesLocal.insightTitleCol}>
          <Text style={[stylesLocal.insightTitle, { color: bc.textPrimary }]}>{placement.label}</Text>
          <PlacementPill placement={placement} />
        </View>
        <Ionicons name="star-outline" size={24} color={bc.goldAccent} />
      </View>

      <Text style={[stylesLocal.insightBody, { color: bc.textPrimary }]}>{insight.body}</Text>

      <View style={[stylesLocal.insightMiniBox, { backgroundColor: withAlpha(bc.primaryAccent, 0.10), borderColor: withAlpha(bc.primaryAccent, 0.28) }]}>
        <View style={stylesLocal.insightMiniTitleRow}>
          <Ionicons name="diamond-outline" size={16} color={bc.primaryAccent} />
          <Text style={[stylesLocal.insightMiniTitle, { color: bc.primaryAccent }]}>{t('natalChart.panels.strengthsTitle', 'Güçlü Yönlerin')}</Text>
        </View>
        {insight.strengths.map((item) => (
          <Text key={`strength-${item}`} style={[stylesLocal.insightBullet, { color: bc.textPrimary }]}>• {item}</Text>
        ))}
      </View>

      <View style={[stylesLocal.insightMiniBox, { backgroundColor: withAlpha(bc.dangerAccent, 0.10), borderColor: withAlpha(bc.dangerAccent, 0.28) }]}>
        <View style={stylesLocal.insightMiniTitleRow}>
          <Ionicons name="alert-circle-outline" size={16} color={bc.dangerAccent} />
          <Text style={[stylesLocal.insightMiniTitle, { color: bc.dangerAccent }]}>{t('natalChart.panels.cautionsTitle', 'Dikkat Edilmesi Gereken')}</Text>
        </View>
        {insight.cautions.slice(0, 2).map((item) => (
          <Text key={`caution-${item}`} style={[stylesLocal.insightBullet, { color: bc.textPrimary }]}>• {item}</Text>
        ))}
      </View>
    </View>
  );
}

function AspectLegendBar({ selected }: { selected: boolean }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const bc = colors.birthChart;
  const items = [
    { key: 'harmonious', label: t('natalChart.panels.legendHarmonious', 'Uyumlu'), color: bc.aspectHarmonious },
    { key: 'neutral', label: t('natalChart.panels.legendNeutral', 'Nötr'), color: bc.aspectNeutral },
    { key: 'challenging', label: t('natalChart.panels.legendChallenging', 'Zorlayıcı'), color: bc.aspectChallenging },
    { key: 'selected', label: t('natalChart.panels.legendSelected', 'Seçili'), color: bc.aspectSelected, muted: !selected },
  ];

  return (
    <View style={[stylesLocal.premiumLegendBar, { backgroundColor: bc.cardSoft, borderColor: bc.cardBorder }]}>
      {items.map((item) => (
        <View key={item.key} style={[stylesLocal.premiumLegendItem, item.muted && stylesLocal.premiumLegendItemMuted]}>
          <View style={[stylesLocal.premiumLegendDot, { backgroundColor: item.color }]} />
          <Text style={[stylesLocal.premiumLegendText, { color: bc.textSecondary }]}>{item.label}</Text>
        </View>
      ))}
      <Ionicons name="information-circle-outline" size={16} color={bc.textMuted} />
    </View>
  );
}

function buildHighlightedThemes(
  planets: PlanetPosition[],
  planetNames: Record<string, string> | undefined,
  locale: string,
  t: (key: string, options?: any) => string,
) {
  const counts = planets.reduce<Record<string, number>>((acc, planet) => {
    if (!planet.sign) return acc;
    acc[planet.sign] = (acc[planet.sign] ?? 0) + 1;
    return acc;
  }, {});
  const dominantSign = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? planets[0]?.sign;
  const dominantInfo = getZodiacInfo(dominantSign, locale);
  const twelfthHouseCount = planets.filter((planet) => planet.house === 12).length;
  const venus = planets.find((planet) => planet.planet === 'Venus');
  const careerPlanet = planets.find((planet) => planet.planet === 'Saturn') ?? planets.find((planet) => planet.planet === 'Mars') ?? planets[0];
  const venusSign = getZodiacInfo(venus?.sign, locale);
  const careerLabel = careerPlanet ? shortPlanetLabel(careerPlanet.planet, planetNames) : t('natalChart.panels.careerThemeFallbackPlanet', 'Satürn');

  return [
    {
      key: 'dominant',
      icon: 'sparkles-outline' as const,
      accent: 'primary',
      title: t('natalChart.panels.themeDominantTitle', {
        sign: dominantInfo.name,
        defaultValue: '{{sign}} Vurgusu',
      }),
      body: t('natalChart.panels.themeDominantBody', {
        sign: dominantInfo.name,
        defaultValue: '{{sign}} teması haritada daha görünür; kararlarında bu burcun dili öne çıkıyor.',
      }),
    },
    {
      key: 'inner',
      icon: 'moon-outline' as const,
      accent: 'success',
      title: t('natalChart.panels.themeInnerTitle', 'İç Dünya'),
      body: twelfthHouseCount > 0
        ? t('natalChart.panels.themeInnerTwelfthBody', '12. ev etkisi sezgileri artırır, yalnız kalma ihtiyacını güçlendirir.')
        : t('natalChart.panels.themeInnerBody', 'Ay yerleşimin duygusal ritmini ve güven ihtiyacını görünür kılar.'),
    },
    {
      key: 'relationships',
      icon: 'heart-outline' as const,
      accent: 'danger',
      title: t('natalChart.panels.themeRelationshipsTitle', 'İlişkiler'),
      body: venus
        ? t('natalChart.panels.themeRelationshipsBody', {
          sign: venusSign.name,
          defaultValue: 'Venüs yerleşimin, {{sign}} temasıyla yakınlık ve değer ihtiyacını gösterir.',
        })
        : t('natalChart.panels.themeRelationshipsFallbackBody', 'Venüs yerleşimin yakınlık, güven ve estetik ihtiyaçlarını gösterir.'),
    },
    {
      key: 'career',
      icon: 'briefcase-outline' as const,
      accent: 'gold',
      title: t('natalChart.panels.themeCareerTitle', 'Kariyer'),
      body: t('natalChart.panels.themeCareerBody', {
        planet: careerLabel,
        defaultValue: '{{planet}} vurgusu üretken ve sorumlu yönünü iş hayatında belirginleştirir.',
      }),
    },
  ];
}

function HighlightedThemesSection({
  planets,
  planetNames,
  onPressViewAll,
}: {
  planets: PlanetPosition[];
  planetNames?: Record<string, string>;
  onPressViewAll?: () => void;
}) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const bc = colors.birthChart;
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'tr';
  const themes = useMemo(() => buildHighlightedThemes(planets, planetNames, locale, t), [locale, planetNames, planets, t]);

  const accentFor = (accent: string) => {
    if (accent === 'success') return bc.successAccent;
    if (accent === 'danger') return bc.dangerAccent;
    if (accent === 'gold') return bc.goldAccent;
    return bc.primaryAccent;
  };

  return (
    <View style={[stylesLocal.highlightSection, { backgroundColor: bc.cardBackground, borderColor: bc.cardBorder }]}>
      <View style={stylesLocal.highlightHeader}>
        <View style={stylesLocal.highlightTitleRow}>
          <Ionicons name="sparkles-outline" size={20} color={bc.goldAccent} />
          <Text style={[stylesLocal.highlightTitle, { color: bc.textPrimary }]}>{t('natalChart.panels.highlightedThemesTitle', 'Öne Çıkan Temalar')}</Text>
        </View>
        {onPressViewAll ? (
          <Pressable style={stylesLocal.highlightViewAll} onPress={onPressViewAll} accessibilityRole="button">
            <Text style={[stylesLocal.highlightViewAllText, { color: bc.primaryAccent }]}>{t('natalChart.panels.viewAllInterpretation', 'Tüm Yorumu Gör')}</Text>
            <Ionicons name="chevron-forward" size={16} color={bc.primaryAccent} />
          </Pressable>
        ) : null}
      </View>
      <View style={stylesLocal.highlightGrid}>
        {themes.map((theme) => {
          const accent = accentFor(theme.accent);
          return (
            <View key={theme.key} style={[stylesLocal.themeCard, { backgroundColor: bc.cardElevated, borderColor: withAlpha(accent, 0.32) }]}>
              <View style={[stylesLocal.themeIconBadge, { backgroundColor: withAlpha(accent, 0.12), borderColor: withAlpha(accent, 0.26) }]}>
                <Ionicons name={theme.icon} size={20} color={accent} />
              </View>
              <View style={stylesLocal.themeTextCol}>
                <Text style={[stylesLocal.themeCardTitle, { color: accent }]}>{theme.title}</Text>
                <Text style={[stylesLocal.themeCardBody, { color: bc.textSecondary }]}>{theme.body}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function BirthChartActionBar({
  onOpenFull,
  onDownload,
}: {
  onOpenFull?: () => void;
  onDownload?: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const bc = colors.birthChart;

  return (
    <View style={[stylesLocal.actionBar, { backgroundColor: bc.ctaBackground, borderColor: bc.ctaBorder, shadowColor: bc.shadow }]}>
      <Pressable
        style={stylesLocal.actionBarButton}
        onPress={onOpenFull}
        accessibilityRole="button"
        accessibilityLabel={t('natalChart.panels.fullScreenAction', 'Tam Ekran Gör')}
      >
        <Ionicons name="scan-outline" size={22} color={bc.ctaText} />
        <Text style={[stylesLocal.actionBarText, { color: bc.ctaText }]}>{t('natalChart.panels.fullScreenAction', 'Tam Ekran Gör')}</Text>
      </Pressable>
      <View style={[stylesLocal.actionBarDivider, { backgroundColor: withAlpha(bc.ctaBorder, 0.48) }]} />
      <Pressable
        style={stylesLocal.actionBarButton}
        onPress={onDownload}
        accessibilityRole="button"
        accessibilityLabel={t('natalChart.panels.downloadAction', 'İndir')}
      >
        <Ionicons name="download-outline" size={22} color={bc.ctaText} />
        <Text style={[stylesLocal.actionBarText, { color: bc.ctaText }]}>{t('natalChart.panels.downloadAction', 'İndir')}</Text>
      </Pressable>
    </View>
  );
}

function PremiumBirthChartPanel({
  planets,
  houses,
  aspects,
  planetComboInsights,
  planetNames,
  risingSign,
  renderWidthOverride,
  onOpenFull,
  onDownload,
  onViewAllInterpretation,
  showActions = true,
}: {
  planets: PlanetPosition[];
  houses: HousePlacement[];
  aspects: PlanetaryAspect[];
  planetComboInsights?: NatalPlanetComboInsight[];
  planetNames?: Record<string, string>;
  risingSign?: string | null;
  renderWidthOverride?: number;
  onOpenFull?: () => void;
  onDownload?: () => void;
  onViewAllInterpretation?: () => void;
  showActions?: boolean;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const bc = colors.birthChart;
  const { width } = useWindowDimensions();
  const [chartMode, setChartMode] = useState<BirthChartMode>('simple');
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);

  const chartPlanets = useMemo(() => {
    const byKey = new Map(planets.map((p) => [p.planet, p] as const));
    return PLANET_ORDER.map((key) => byKey.get(key)).filter((p): p is PlanetPosition => Boolean(p));
  }, [planets]);

  const sunPlacement = useMemo(() => makePlanetPlacement(chartPlanets.find((planet) => planet.planet === 'Sun'), planetNames), [chartPlanets, planetNames]);
  const moonPlacement = useMemo(() => makePlanetPlacement(chartPlanets.find((planet) => planet.planet === 'Moon'), planetNames), [chartPlanets, planetNames]);
  const ascendantPlacement = useMemo(() => makeAscendantPlacement(risingSign), [risingSign]);
  const placements = useMemo(
    () => [
      ...chartPlanets.map((planet) => makePlanetPlacement(planet, planetNames)).filter((item): item is PremiumPlacement => Boolean(item)),
      ascendantPlacement,
    ],
    [ascendantPlacement, chartPlanets, planetNames],
  );
  const defaultSelectedId = sunPlacement?.id ?? placements[0]?.id ?? null;

  useEffect(() => {
    if (!placements.length) {
      setSelectedPlacementId(null);
      return;
    }
    setSelectedPlacementId((current) => (current && placements.some((placement) => placement.id === current) ? current : defaultSelectedId));
  }, [defaultSelectedId, placements]);

  const selectedPlacement = placements.find((placement) => placement.id === selectedPlacementId) ?? null;
  const selectedPlanetId = selectedPlacement?.kind === 'planet' ? selectedPlacement.planet.planet : null;
  const isWide = (renderWidthOverride ?? width) >= 720;

  const handleSelectPlacement = useCallback((placement: PremiumPlacement) => {
    setSelectedPlacementId(placement.id);
  }, []);

  const handleWheelPlanetPress = useCallback((planet: PlanetPosition) => {
    const placement = makePlanetPlacement(planet, planetNames);
    if (placement) setSelectedPlacementId(placement.id);
  }, [planetNames]);

  if (!chartPlanets.length) {
    return (
      <View style={[stylesLocal.premiumCard, { backgroundColor: bc.cardBackground, borderColor: bc.cardBorder }]}>
        <Text style={[stylesLocal.emptyPremiumTitle, { color: bc.textPrimary }]}>{t('natalChart.panels.emptyChartTitle', 'Doğum haritası hazırlanamadı')}</Text>
        <Text style={[stylesLocal.emptyPremiumSub, { color: bc.textSecondary }]}>
          {t('natalChart.panels.emptyChartDetail', 'Doğum saati, doğum yeri veya tarih bilgilerini kontrol ederek tekrar deneyebilirsin.')}
        </Text>
      </View>
    );
  }

  return (
    <View style={stylesLocal.premiumStack}>
      <View style={[stylesLocal.premiumCard, { backgroundColor: bc.cardBackground, borderColor: bc.cardBorder, shadowColor: bc.shadow }]}>
        <View style={stylesLocal.premiumDecorLayer} pointerEvents="none">
          <View style={[stylesLocal.premiumGlowOne, { backgroundColor: bc.glow }]} />
          <View style={[stylesLocal.premiumGlowTwo, { backgroundColor: withAlpha(bc.goldAccent, 0.12) }]} />
        </View>

        <View style={stylesLocal.premiumCardHeader}>
          <View style={stylesLocal.premiumHeaderTextCol}>
            <Text style={[stylesLocal.premiumCardTitle, { color: bc.textPrimary }]}>{t('natalChart.panels.birthChartTitle')}</Text>
            <Text style={[stylesLocal.premiumCardSubtitle, { color: bc.textSecondary }]}>{t('natalChart.panels.birthChartSubtitle')}</Text>
          </View>
          <ModeToggle value={chartMode} onChange={setChartMode} />
        </View>

        <BigThreeSummaryCards
          sun={sunPlacement}
          moon={moonPlacement}
          ascendant={ascendantPlacement}
          selectedId={selectedPlacementId}
          onSelect={handleSelectPlacement}
        />

        <View style={[stylesLocal.premiumContentLayout, isWide && stylesLocal.premiumContentLayoutWide]}>
          <View style={stylesLocal.premiumChartColumn}>
            <NatalWheel
              planets={chartPlanets}
              houses={houses}
              aspects={aspects}
              planetNames={planetNames}
              mode="full"
              chartMode={chartMode}
              selectedPlanetId={selectedPlanetId}
              onPlanetPress={handleWheelPlanetPress}
              renderWidthOverride={isWide ? Math.min((renderWidthOverride ?? width) * 0.58, 560) : renderWidthOverride}
              showMetaRow={false}
              showAuras
            />
            <AspectLegendBar selected={Boolean(selectedPlanetId)} />
          </View>

          {isWide ? (
            <View style={stylesLocal.premiumInsightColumn}>
              <SelectedPlacementInsightCard placement={selectedPlacement} insights={planetComboInsights} />
            </View>
          ) : null}
        </View>

        {!isWide ? (
          <SelectedPlacementInsightCard placement={selectedPlacement} insights={planetComboInsights} />
        ) : null}
      </View>

      <HighlightedThemesSection
        planets={chartPlanets}
        planetNames={planetNames}
        onPressViewAll={onViewAllInterpretation}
      />

      {showActions ? (
        <BirthChartActionBar
          onOpenFull={onOpenFull}
          onDownload={onDownload ?? onOpenFull}
        />
      ) : null}
    </View>
  );
}

export default function NatalChartProPanels({
  planets,
  houses,
  aspects,
  planetComboInsights,
  planetNames,
  risingSign,
  onAspectPress,
  onOpenFull,
  onDownload,
  onViewAllInterpretation,
  mode = 'full',
  panels,
  renderWidthOverride,
  presentation = 'default',
  showPremiumActions = true,
}: NatalChartProPanelsProps) {
  const { t } = useTranslation();
  const chartPlanets = useMemo(
    () => planets.filter((p) => PLANET_ORDER.includes(p.planet as (typeof PLANET_ORDER)[number])),
    [planets],
  );

  const chartAspects = useMemo(
    () => (aspects.length ? effectiveAspects(aspects) : calculateFallbackAspects(chartPlanets)),
    [aspects, chartPlanets],
  );

  if (!chartPlanets.length) return null;

  const enabledPanels = new Set(panels ?? ['wheel', 'matrix', 'balance']);

  if (presentation === 'premium') {
    return (
      <PremiumBirthChartPanel
        planets={chartPlanets}
        houses={houses}
        aspects={chartAspects}
        planetComboInsights={planetComboInsights}
        planetNames={planetNames}
        risingSign={risingSign}
        renderWidthOverride={renderWidthOverride}
        onOpenFull={onOpenFull}
        onDownload={onDownload}
        onViewAllInterpretation={onViewAllInterpretation}
        showActions={showPremiumActions}
      />
    );
  }

  if (mode === 'hero') {
    return (
      <SectionCard
        compact
        title={t('natalChart.panels.heroTitle')}
        subtitle={t('natalChart.panels.heroSubtitle')}
      >
        <NatalWheel
          planets={chartPlanets}
          houses={houses}
          aspects={chartAspects}
          planetNames={planetNames}
          mode="hero"
          renderWidthOverride={renderWidthOverride}
          showMetaRow={false}
          showAuras
        />
      </SectionCard>
    );
  }

  if (
    presentation === 'poster'
    && enabledPanels.size === 1
    && enabledPanels.has('wheel')
  ) {
    return (
      <NatalWheel
        planets={chartPlanets}
        houses={houses}
        aspects={chartAspects}
        planetNames={planetNames}
        mode="full"
        renderWidthOverride={renderWidthOverride}
        showMetaRow={false}
        showAuras={false}
      />
    );
  }

  return (
    <View style={stylesLocal.sectionGroup}>
      {enabledPanels.has('wheel') ? (
        <SectionCard
          title={t('natalChart.panels.wheelTitle')}
          subtitle={t('natalChart.panels.wheelSubtitle')}
        >
          <NatalWheel
            planets={chartPlanets}
            houses={houses}
            aspects={chartAspects}
            planetNames={planetNames}
            mode="full"
            renderWidthOverride={renderWidthOverride}
          />
        </SectionCard>
      ) : null}

      {enabledPanels.has('matrix') ? (
        <SectionCard
          title={t('natalChart.panels.matrixTitle')}
          subtitle={t('natalChart.panels.matrixSubtitle')}
        >
          <AspectMatrix
            planets={chartPlanets}
            aspects={chartAspects}
            planetNames={planetNames}
            onAspectPress={onAspectPress}
          />
        </SectionCard>
      ) : null}

      {enabledPanels.has('positions') ? (
        <SectionCard
          title={t('natalChart.panels.positionsTitle')}
          subtitle={t('natalChart.panels.positionsSubtitle')}
        >
          <CosmicPositionDetails
            planets={chartPlanets}
            planetNames={planetNames}
          />
        </SectionCard>
      ) : null}

      {enabledPanels.has('balance') ? (
        <SectionCard
          title={t('natalChart.panels.balanceTitle')}
          subtitle={t('natalChart.panels.balanceSubtitle')}
        >
          <CosmicBalance planets={chartPlanets} risingSign={risingSign} />
        </SectionCard>
      ) : null}
    </View>
  );
}

const stylesLocal = StyleSheet.create({
  sectionGroup: {
    gap: 16,
  },
  premiumStack: {
    gap: 18,
  },
  premiumCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
    gap: 18,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 3,
  },
  premiumDecorLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  premiumGlowOne: {
    position: 'absolute',
    top: -34,
    right: -30,
    width: 148,
    height: 148,
    borderRadius: 999,
    opacity: 0.72,
  },
  premiumGlowTwo: {
    position: 'absolute',
    bottom: 24,
    left: -44,
    width: 132,
    height: 132,
    borderRadius: 999,
    opacity: 0.8,
  },
  premiumCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    flexWrap: 'wrap',
  },
  premiumHeaderTextCol: {
    flex: 1,
    minWidth: 210,
    gap: 4,
  },
  premiumCardTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  premiumCardSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  modeToggle: {
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  modeToggleItem: {
    minWidth: 92,
    minHeight: 38,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  modeToggleText: {
    fontSize: 14,
    fontWeight: '800',
  },
  bigThreeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  bigThreeCard: {
    flex: 1,
    minWidth: 172,
    minHeight: 104,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  },
  bigThreeIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigThreeTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  bigThreeTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },
  placementPillStack: {
    gap: 6,
    alignItems: 'flex-start',
  },
  placementPillSign: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  placementHouseBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  placementHouseBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  premiumContentLayout: {
    gap: 16,
  },
  premiumContentLayoutWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  premiumChartColumn: {
    flex: 1.6,
    minWidth: 0,
    gap: 12,
    alignItems: 'center',
  },
  premiumInsightColumn: {
    flex: 0.92,
    minWidth: 246,
  },
  premiumLegendBar: {
    width: '100%',
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  premiumLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  premiumLegendItemMuted: {
    opacity: 0.72,
  },
  premiumLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  premiumLegendText: {
    fontSize: 13,
    fontWeight: '600',
  },
  insightCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 3,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  insightIconBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightGlyph: {
    fontSize: 28,
    fontWeight: '800',
  },
  insightTitleCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  insightTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  insightBody: {
    fontSize: 14,
    lineHeight: 23,
    fontWeight: '500',
  },
  insightMiniBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 7,
  },
  insightMiniTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  insightMiniTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  insightBullet: {
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '500',
  },
  highlightSection: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  highlightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  highlightTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  highlightViewAll: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
  },
  highlightViewAllText: {
    fontSize: 13,
    fontWeight: '800',
  },
  highlightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  themeCard: {
    flex: 1,
    minWidth: 152,
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
    gap: 10,
  },
  themeIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeTextCol: {
    gap: 5,
  },
  themeCardTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
  },
  themeCardBody: {
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: '500',
  },
  actionBar: {
    minHeight: 64,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 3,
  },
  actionBarButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 8,
  },
  actionBarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  actionBarDivider: {
    width: 1,
    height: 32,
  },
  emptyPremiumTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyPremiumSub: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
    gap: 12,
  },
  cardCompact: {
    padding: 12,
    borderRadius: 18,
  },
  cardHeader: {
    gap: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  wheelWrap: {
    alignItems: 'center',
    gap: 12,
  },
  wheelStage: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: 4,
  },
  wheelStageFull: {
    marginHorizontal: -10,
  },
  wheelStagePoster: {
    marginHorizontal: 0,
  },
  wheelStageHero: {
    borderRadius: 22,
  },
  planetHitTarget: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  wheelAuraPrimary: {
    position: 'absolute',
    top: 22,
    right: 18,
    width: 120,
    height: 120,
    borderRadius: 999,
    opacity: 0.9,
  },
  wheelAuraSecondary: {
    position: 'absolute',
    bottom: 30,
    left: 22,
    width: 92,
    height: 92,
    borderRadius: 999,
    opacity: 0.72,
  },
  wheelMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: -2,
  },
  wheelMetaPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  wheelMetaLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  wheelMetaText: {
    fontSize: 11,
    fontWeight: '700',
  },
  wheelLegend: {
    width: '100%',
    gap: 4,
  },
  wheelLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wheelLegendSymbol: {
    width: 26,
    fontSize: 11,
    fontWeight: '800',
    color: '#6D28D9',
  },
  wheelLegendText: {
    flex: 1,
    fontSize: 11,
    color: '#64748B',
  },
  positionList: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
  },
  positionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  positionHeaderCellLeft: {
    flex: 1.5,
    fontSize: 11,
    fontWeight: '700',
  },
  positionHeaderCellMid: {
    flex: 1.15,
    fontSize: 11,
    fontWeight: '700',
  },
  positionHeaderCellDeg: {
    width: 58,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  positionHeaderCellRight: {
    width: 62,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },
  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148,163,184,0.2)',
    gap: 8,
  },
  positionCellLeft: {
    flex: 1.35,
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  positionCellMid: {
    flex: 1.15,
    fontSize: 12,
    color: '#334155',
  },
  positionCellDeg: {
    width: 58,
    fontSize: 12,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  positionCellRight: {
    width: 62,
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    textAlign: 'right',
  },
  matrixWrap: {
    gap: 12,
  },
  matrixRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matrixCorner: {},
  matrixHeaderCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 1,
  },
  matrixGlyph: {
    fontSize: 12,
    fontWeight: '700',
  },
  matrixHeaderLabel: {
    fontSize: 7,
    lineHeight: 8,
    fontWeight: '700',
  },
  matrixCell: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  matrixDiagonal: {
    fontSize: 11,
    fontWeight: '700',
  },
  matrixAspectSymbol: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 13,
  },
  matrixOrb: {
    fontSize: 8,
    lineHeight: 8,
    marginTop: 1,
  },
  matrixEmpty: {
    fontSize: 12,
  },
  aspectLegendWrap: {
    gap: 6,
  },
  aspectLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aspectLegendSymbol: {
    width: 16,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  aspectLegendLabel: {
    fontSize: 11,
    flex: 1,
  },
  balanceWrap: {
    gap: 12,
  },
  balanceDonutsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  donutCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    padding: 10,
    gap: 10,
  },
  donutWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  donutCenterTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  donutCenterSub: {
    fontSize: 9,
    color: '#64748B',
  },
  legendList: {
    gap: 4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  legendLabel: {
    flex: 1,
    fontSize: 11,
    color: '#334155',
  },
  legendValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  balanceSummaryBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  balanceSummaryTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  balanceSummaryText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
});
