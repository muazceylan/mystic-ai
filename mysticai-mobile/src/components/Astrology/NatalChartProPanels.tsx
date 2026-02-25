import React, { useMemo } from 'react';
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
  Text as SvgText,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import type {
  HousePlacement,
  PlanetPosition,
  PlanetaryAspect,
  AspectType,
} from '../../services/astrology.service';
import { getZodiacInfo, PLANET_TURKISH } from '../../constants/zodiac';
import { labelPlanet } from '../../constants/astroLabelMap';
import { useTheme } from '../../context/ThemeContext';

type NatalChartProPanelsProps = {
  planets: PlanetPosition[];
  houses: HousePlacement[];
  aspects: PlanetaryAspect[];
  planetNames?: Record<string, string>;
  risingSign?: string | null;
  onAspectPress?: (aspect: PlanetaryAspect) => void;
  mode?: 'full' | 'hero';
  panels?: Array<'wheel' | 'matrix' | 'balance' | 'positions'>;
};

type AspectCell = PlanetaryAspect | null;

type BalanceKey = 'Ateş' | 'Toprak' | 'Hava' | 'Su';
type ModalityKey = 'Öncü' | 'Sabit' | 'Değişken';

type ScoredSlice<T extends string> = {
  key: T;
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
  { symbol: string; exact: number; maxOrb: number; colorLight: string; colorDark: string; label: string }
> = {
  CONJUNCTION: {
    symbol: '☌',
    exact: 0,
    maxOrb: 8,
    colorLight: '#7C3AED',
    colorDark: '#C4B5FD',
    label: 'Kavuşum',
  },
  SEXTILE: {
    symbol: '⚹',
    exact: 60,
    maxOrb: 6,
    colorLight: '#2563EB',
    colorDark: '#93C5FD',
    label: 'Altıgen',
  },
  SQUARE: {
    symbol: '□',
    exact: 90,
    maxOrb: 8,
    colorLight: '#D97706',
    colorDark: '#FCD34D',
    label: 'Kare',
  },
  TRINE: {
    symbol: '△',
    exact: 120,
    maxOrb: 8,
    colorLight: '#059669',
    colorDark: '#6EE7B7',
    label: 'Üçgen',
  },
  OPPOSITION: {
    symbol: '☍',
    exact: 180,
    maxOrb: 8,
    colorLight: '#DC2626',
    colorDark: '#FCA5A5',
    label: 'Karşıt',
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

const SIGN_MODALITY: Record<string, ModalityKey> = {
  ARIES: 'Öncü',
  CANCER: 'Öncü',
  LIBRA: 'Öncü',
  CAPRICORN: 'Öncü',
  TAURUS: 'Sabit',
  LEO: 'Sabit',
  SCORPIO: 'Sabit',
  AQUARIUS: 'Sabit',
  GEMINI: 'Değişken',
  VIRGO: 'Değişken',
  SAGITTARIUS: 'Değişken',
  PISCES: 'Değişken',
};

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
  const label = shortPlanetLabel(planetKey, labels);
  const map: Record<string, string> = {
    'Kuzey Düğümü': 'KD',
    'Merkür': 'Mrk',
    'Jüpiter': 'Jüp',
    'Satürn': 'Sat',
    'Uranüs': 'Ura',
    'Neptün': 'Nep',
    'Plüton': 'Plü',
    'Venüs': 'Ven',
    'Güneş': 'Gün',
    'Ay': 'Ay',
    'Mars': 'Mars',
  };
  if (map[label]) return map[label];
  return label.length > 4 ? label.slice(0, 3) : label;
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
): ScoredSlice<T>[] {
  const total = (Object.values(scores) as number[]).reduce((sum, n) => sum + n, 0);
  const denominator = total > 0 ? total : 1;
  return (Object.keys(scores) as T[]).map((key) => ({
    key,
    score: scores[key],
    pct: Math.round((scores[key] / denominator) * 1000) / 10,
    color: colors[key],
  }));
}

function analyzeBalance(planets: PlanetPosition[], risingSign?: string | null) {
  const elementScores: Record<BalanceKey, number> = {
    Ateş: 0,
    Toprak: 0,
    Hava: 0,
    Su: 0,
  };
  const modalityScores: Record<ModalityKey, number> = {
    Öncü: 0,
    Sabit: 0,
    Değişken: 0,
  };

  for (const planet of planets) {
    const weight = PLANET_WEIGHTS[planet.planet] ?? 1;
    const info = getZodiacInfo(planet.sign);
    const element = (info.element as BalanceKey);
    const modality = SIGN_MODALITY[planet.sign?.toUpperCase?.() ?? ''];

    if (elementScores[element] != null) {
      elementScores[element] += weight;
    }
    if (modality) {
      modalityScores[modality] += weight;
    }
  }

  if (risingSign) {
    const risingInfo = getZodiacInfo(risingSign);
    const risingElement = risingInfo.element as BalanceKey;
    const risingModality = SIGN_MODALITY[risingSign.toUpperCase()];
    if (elementScores[risingElement] != null) elementScores[risingElement] += 2.8;
    if (risingModality) modalityScores[risingModality] += 2.2;
  }

  return { elementScores, modalityScores };
}

function buildBalanceSummary(
  elements: ScoredSlice<BalanceKey>[],
  modalities: ScoredSlice<ModalityKey>[],
) {
  const dominantElement = [...elements].sort((a, b) => b.score - a.score)[0];
  const lowestElement = [...elements].sort((a, b) => a.score - b.score)[0];
  const dominantModality = [...modalities].sort((a, b) => b.score - a.score)[0];

  const elementText: Record<BalanceKey, string> = {
    Ateş: 'Ateş baskın; iç motivasyonun hızlı tutuşuyor ve harekete geçmekte gecikmiyorsun.',
    Toprak: 'Toprak baskın; güven, somut sonuç ve düzen duygusu kararlarını güçlü biçimde yönlendiriyor.',
    Hava: 'Hava baskın; zihnin bağlantı kurmaya, konuşmaya ve anlam üretmeye doğal olarak açık.',
    Su: 'Su baskın; sezgilerin çoğu zaman mantıksal analizden önce sinyal veriyor.',
  };

  const modalityText: Record<ModalityKey, string> = {
    Öncü: 'Öncü vurgu yüksek; başlatma enerjin güçlü, fakat sürdürülebilir ritim kurmak önemli.',
    Sabit: 'Sabit vurgu yüksek; sadakat ve direnç büyük artın, esneklik çalışıldığında çok güçlenirsin.',
    Değişken: 'Değişken vurgu yüksek; adapte olman kolay, dağılmamak için öncelik listesi kritik.',
  };

  const balanceHint: Record<BalanceKey, string> = {
    Ateş: 'Ateş düşük kaldığında cesaret gerektiren konularda küçük ama net aksiyonlar sana iyi gelir.',
    Toprak: 'Toprak düşük kaldığında rutin, uyku ve finans gibi somut alanlarda plan yapmak denge sağlar.',
    Hava: 'Hava düşük kaldığında duygunu konuşarak netleştirmek ve zihinsel boşluk açmak rahatlatır.',
    Su: 'Su düşük kaldığında beden sinyallerini dinlemek ve duygulara alan açmak iç dengeyi güçlendirir.',
  };

  return `${elementText[dominantElement.key]} ${modalityText[dominantModality.key]} ${balanceHint[lowestElement.key]}`;
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
              <Text style={[stylesLocal.legendLabel, { color: colors.textSoft }]}>{String(slice.key)}</Text>
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
}: {
  planets: PlanetPosition[];
  houses: HousePlacement[];
  aspects: PlanetaryAspect[];
  planetNames?: Record<string, string>;
  mode?: 'full' | 'hero';
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  const size = mode === 'hero' ? clamp(width - 28, 220, 270) : clamp(width - 56, 280, 360);
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.46;
  const signR = size * 0.405;
  const houseR = size * 0.335;
  const planetR = size * 0.275;
  const aspectR = size * 0.2;

  const aspectList = useMemo(
    () => (aspects.length ? effectiveAspects(aspects) : calculateFallbackAspects(planets)),
    [aspects, planets],
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

    return sorted.map((planet, index) => {
      const prev = index > 0 ? sorted[index - 1] : null;
      const delta = prev ? Math.abs(planet.absLon - prev.absLon) : 99;
      const clusterOffset = delta < 4 ? 10 : 0;
      return {
        ...planet,
        radialOffset: clusterOffset,
      };
    });
  }, [orderedPlanets]);

  return (
    <View style={stylesLocal.wheelWrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <SvgLinearGradient id="wheelRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.violet} stopOpacity={0.22} />
            <Stop offset="100%" stopColor={colors.blue} stopOpacity={0.08} />
          </SvgLinearGradient>
        </Defs>

        <Circle cx={cx} cy={cy} r={outerR} fill="url(#wheelRing)" stroke={colors.border} strokeWidth={1.2} />
        <Circle cx={cx} cy={cy} r={signR} fill="transparent" stroke={colors.borderLight} strokeWidth={1} />
        <Circle cx={cx} cy={cy} r={houseR} fill="transparent" stroke={colors.borderLight} strokeWidth={1} />
        <Circle cx={cx} cy={cy} r={planetR + 12} fill="transparent" stroke={colors.borderLight} strokeWidth={0.8} />
        <Circle cx={cx} cy={cy} r={aspectR + 16} fill="rgba(255,255,255,0.55)" stroke={colors.borderLight} strokeWidth={1} />

        {Array.from({ length: 12 }, (_, i) => {
          const absoluteLon = i * 30;
          const angle = toWheelAngle(absoluteLon);
          const outer = polarPoint(cx, cy, outerR, angle);
          const inner = polarPoint(cx, cy, signR, angle);
          const mid = polarPoint(cx, cy, (outerR + signR) / 2, angle + 15);
          const signInfo = getZodiacInfo(SIGN_KEYS_IN_ORDER[i]);
          return (
            <G key={`sign-${i}`}>
              <Line x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} stroke={colors.border} strokeWidth={1} />
              <SvgText
                x={mid.x}
                y={mid.y + 5}
                fontSize={16}
                fontWeight="700"
                fill={colors.text}
                textAnchor="middle"
              >
                {signInfo.symbol}
              </SvgText>
              <SvgText
                x={mid.x}
                y={mid.y + 14}
                fontSize={6.8}
                fill={colors.textMuted}
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
                stroke={cusp.house === 1 || cusp.house === 10 ? colors.violet : colors.borderMuted}
                strokeWidth={cusp.house === 1 || cusp.house === 10 ? 1.8 : 1}
              />
              <SvgText
                x={labelPt.x}
                y={labelPt.y + 4}
                fontSize={10}
                fontWeight="700"
                fill={colors.textMuted}
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
          const lineColor = meta ? (colors.statusBar === 'dark' ? meta.colorDark : meta.colorLight) : colors.violet;
          return (
            <Line
              key={`aspect-line-${idx}`}
              x1={p1Pt.x}
              y1={p1Pt.y}
              x2={p2Pt.x}
              y2={p2Pt.y}
              stroke={lineColor}
              strokeOpacity={0.78}
              strokeWidth={aspect.orb <= 2 ? 1.8 : 1.2}
            />
          );
        })}

        {displayedPlanets.map((planet) => {
          const angle = toWheelAngle(planet.absLon);
          const point = polarPoint(cx, cy, planetR + planet.radialOffset, angle);
          const degreePoint = polarPoint(cx, cy, planetR + 20 + planet.radialOffset, angle);
          const namePoint = polarPoint(cx, cy, planetR + 31 + planet.radialOffset, angle);
          const glyph = PLANET_GLYPHS[planet.planet] ?? '•';
          return (
            <G key={`planet-${planet.planet}`}>
              <Circle cx={point.x} cy={point.y} r={11} fill={colors.card} stroke={colors.border} strokeWidth={1} />
              <SvgText
                x={point.x}
                y={point.y + 4}
                fontSize={13}
                fontWeight="700"
                fill={colors.text}
                textAnchor="middle"
              >
                {glyph}
              </SvgText>
              <SvgText
                x={degreePoint.x}
                y={degreePoint.y + 3}
                fontSize={8.5}
                fill={colors.textMuted}
                textAnchor="middle"
              >
                {`${Math.floor(planet.degree)}°`}
              </SvgText>
              <SvgText
                x={namePoint.x}
                y={namePoint.y + 3}
                fontSize={6.8}
                fill={colors.textMuted}
                textAnchor="middle"
              >
                {compactPlanetLabel(planet.planet, planetNames)}
              </SvgText>
            </G>
          );
        })}
      </Svg>

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

  const ordered = useMemo(() => {
    const byKey = new Map(planets.map((p) => [p.planet, p] as const));
    return PLANET_ORDER.map((key) => byKey.get(key)).filter((p): p is PlanetPosition => Boolean(p));
  }, [planets]);

  return (
    <View style={stylesLocal.positionList}>
      <View style={[stylesLocal.positionHeaderRow, { backgroundColor: colors.surfaceAlt, borderBottomColor: colors.borderLight }]}>
        <Text style={[stylesLocal.positionHeaderCellLeft, { color: colors.textMuted }]}>Gezegen</Text>
        <Text style={[stylesLocal.positionHeaderCellMid, { color: colors.textMuted }]}>Burç</Text>
        <Text style={[stylesLocal.positionHeaderCellDeg, { color: colors.textMuted }]}>Derece</Text>
        <Text style={[stylesLocal.positionHeaderCellRight, { color: colors.textMuted }]}>Ev Konumu</Text>
      </View>
      {ordered.map((planet) => {
        const zodiac = getZodiacInfo(planet.sign);
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
            <Text style={[stylesLocal.positionCellRight, { color: colors.textMuted }]}>{planet.house}. Ev</Text>
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
                const accent = meta ? (colors.statusBar === 'dark' ? meta.colorDark : meta.colorLight) : colors.muted;
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
                      accessibilityLabel={`${labelPlanet(rowPlanet)} ${meta?.label ?? ''} ${labelPlanet(colPlanet)} orb ${aspect.orb.toFixed(1)}`}
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
          const color = colors.statusBar === 'dark' ? meta.colorDark : meta.colorLight;
          return (
            <View key={`legend-${type}`} style={stylesLocal.aspectLegendItem}>
              <Text style={[stylesLocal.aspectLegendSymbol, { color }]}>{meta.symbol}</Text>
              <Text style={[stylesLocal.aspectLegendLabel, { color: colors.textMuted }]}>
                {meta.label} · {meta.exact}° · orb≤{meta.maxOrb}°
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

  const elementColors: Record<BalanceKey, string> = {
    Ateş: '#F97316',
    Toprak: '#84CC16',
    Hava: '#38BDF8',
    Su: '#6366F1',
  };
  const modalityColors: Record<ModalityKey, string> = {
    Öncü: '#F59E0B',
    Sabit: '#10B981',
    Değişken: '#8B5CF6',
  };

  const { elementSlices, modalitySlices, summary } = useMemo(() => {
    const { elementScores, modalityScores } = analyzeBalance(planets, risingSign);
    const elementSlices = toPercentSlices(elementScores, elementColors);
    const modalitySlices = toPercentSlices(modalityScores, modalityColors);
    const summary = buildBalanceSummary(elementSlices, modalitySlices);
    return { elementSlices, modalitySlices, summary };
  }, [planets, risingSign]);

  return (
    <View style={stylesLocal.balanceWrap}>
      <View style={stylesLocal.balanceDonutsRow}>
        <MiniDonut title="Element" subtitle="Kozmik Denge" slices={elementSlices} />
        <MiniDonut title="Nitelik" subtitle="Mod Analizi" slices={modalitySlices} />
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
        <Text style={[stylesLocal.balanceSummaryTitle, { color: colors.violet }]}>Kısa Yorum</Text>
        <Text style={[stylesLocal.balanceSummaryText, { color: colors.body }]}>{summary}</Text>
      </View>
    </View>
  );
}

export default function NatalChartProPanels({
  planets,
  houses,
  aspects,
  planetNames,
  risingSign,
  onAspectPress,
  mode = 'full',
  panels,
}: NatalChartProPanelsProps) {
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

  if (mode === 'hero') {
    return (
      <SectionCard
        compact
        title="Kozmik Harita"
        subtitle="Dairesel harita önizlemesi · detay yorumlar aşağıda"
      >
        <NatalWheel
          planets={chartPlanets}
          houses={houses}
          aspects={chartAspects}
          planetNames={planetNames}
          mode="hero"
        />
      </SectionCard>
    );
  }

  return (
    <View style={stylesLocal.sectionGroup}>
      {enabledPanels.has('wheel') ? (
        <SectionCard
          title="Doğum Haritası"
          subtitle="Placidus ev çizgileri ve dairesel harita görünümü"
        >
          <NatalWheel
            planets={chartPlanets}
            houses={houses}
            aspects={chartAspects}
            planetNames={planetNames}
            mode="full"
          />
        </SectionCard>
      ) : null}

      {enabledPanels.has('matrix') ? (
        <SectionCard
          title="Gezegen Etkileşim Tablosu"
          subtitle="Üçgen açı matrisi • orb içinde kalan etkili etkileşimler"
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
          title="Kozmik Konum Detayları"
          subtitle="Gezegen, burç, derece/dakika ve ev konumu teknik listesi"
        >
          <CosmicPositionDetails
            planets={chartPlanets}
            planetNames={planetNames}
          />
        </SectionCard>
      ) : null}

      {enabledPanels.has('balance') ? (
        <SectionCard
          title="Kozmik Denge"
          subtitle="Element ve nitelik ağırlıkları (kişisel gezegenler daha yüksek puanlı)"
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
