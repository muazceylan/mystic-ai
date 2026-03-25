import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import { useTranslation } from 'react-i18next';
import type {
  HousePlacement,
  NightSkyProjectionResponse,
  NightSkyPosterVariant,
  PlanetPosition,
} from '../../services/astrology.service';

type Props = {
  name: string;
  birthDate: string;
  birthTime: string | null;
  birthLocation: string;
  latitude: number;
  longitude: number;
  shareUrl: string;
  planets: PlanetPosition[];
  houses?: HousePlacement[];
  variant?: NightSkyPosterVariant;
  projection?: NightSkyProjectionResponse | null;
};

type PlanetPlot = {
  planet: string;
  glyph: string;
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  color: string;
};

type SkyStarDot = {
  key?: string;
  x: number;
  y: number;
  r: number;
  opacity: number;
};

type SkyLineSeg = {
  a: number;
  b: number;
  opacity: number;
};

type VariantVisualConfig = {
  gradient: [string, string, string];
  haloA: string;
  haloB: string;
  gridStroke: string;
  horizonStroke: string;
  lineOpacityBoost: number;
  starCount: number;
  lineBudget: number;
  planetRingOpacity: number;
  labelStroke: string;
  zenithColor: string;
  frameTone: string;
};

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

const PLANET_ORDER = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

const PLANET_COLORS: Record<string, string> = {
  Sun: '#F8D57E',
  Moon: '#E2E8F0',
  Mercury: '#B7E3FF',
  Venus: '#F5C2E7',
  Mars: '#FCA5A5',
  Jupiter: '#FDE68A',
  Saturn: '#D1D5DB',
  Uranus: '#93C5FD',
  Neptune: '#A5B4FC',
  Pluto: '#C4B5FD',
  Chiron: '#CBD5E1',
  NorthNode: '#F9A8D4',
};

const VARIANT_CONFIG: Record<NightSkyPosterVariant, VariantVisualConfig> = {
  minimal: {
    gradient: ['#030509', '#05070D', '#0A0D14'],
    haloA: 'rgba(248,213,126,0.06)',
    haloB: 'rgba(255,255,255,0.03)',
    gridStroke: 'rgba(255,255,255,0.08)',
    horizonStroke: 'rgba(248,213,126,0.18)',
    lineOpacityBoost: 0.9,
    starCount: 90,
    lineBudget: 16,
    planetRingOpacity: 0.33,
    labelStroke: 'rgba(255,255,255,0.20)',
    zenithColor: 'rgba(248,213,126,0.92)',
    frameTone: '#030509',
  },
  constellation_heavy: {
    gradient: ['#02040A', '#070B13', '#0D1320'],
    haloA: 'rgba(99,102,241,0.10)',
    haloB: 'rgba(56,189,248,0.06)',
    gridStroke: 'rgba(147,197,253,0.12)',
    horizonStroke: 'rgba(186,230,253,0.24)',
    lineOpacityBoost: 1.6,
    starCount: 132,
    lineBudget: 34,
    planetRingOpacity: 0.45,
    labelStroke: 'rgba(186,230,253,0.28)',
    zenithColor: 'rgba(186,230,253,0.95)',
    frameTone: '#02040A',
  },
  gold_edition: {
    gradient: ['#060403', '#110B07', '#17110C'],
    haloA: 'rgba(245, 201, 112, 0.12)',
    haloB: 'rgba(255, 229, 168, 0.06)',
    gridStroke: 'rgba(245, 209, 126, 0.14)',
    horizonStroke: 'rgba(248,213,126,0.35)',
    lineOpacityBoost: 1.2,
    starCount: 104,
    lineBudget: 24,
    planetRingOpacity: 0.6,
    labelStroke: 'rgba(255,225,178,0.28)',
    zenithColor: 'rgba(248,213,126,0.98)',
    frameTone: '#060403',
  },
};

const PHASE_SET = [
  { key: 'new', label: 'Yeniay', emoji: '🌑', phase: 0 },
  { key: 'crescent', label: 'Hilal', emoji: '🌒', phase: 0.125 },
  { key: 'first_quarter', label: 'İlkdördün', emoji: '🌓', phase: 0.25 },
  { key: 'gibbous', label: 'Şişkin', emoji: '🌔', phase: 0.375 },
  { key: 'full', label: 'Dolunay', emoji: '🌕', phase: 0.5 },
] as const;

function hashSeed(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizeAngle(angle: number) {
  let v = angle % 360;
  if (v < 0) v += 360;
  return v;
}

function signIndex(sign: string | null | undefined) {
  const keys = [
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
  ];
  return keys.indexOf((sign ?? '').toUpperCase());
}

function absoluteLongitude(p: PlanetPosition) {
  if (typeof p.absoluteLongitude === 'number' && Number.isFinite(p.absoluteLongitude)) {
    return normalizeAngle(p.absoluteLongitude);
  }
  const idx = Math.max(0, signIndex(p.sign));
  const deg = Number(p.degree) || 0;
  const min = Number(p.minutes) || 0;
  const sec = Number(p.seconds) || 0;
  return normalizeAngle(idx * 30 + deg + min / 60 + sec / 3600);
}

function houseCuspLon(h?: HousePlacement | null) {
  if (!h) return null;
  const idx = signIndex(h.sign);
  if (idx < 0) return null;
  return normalizeAngle(idx * 30 + (Number(h.degree) || 0));
}

function polarPoint(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function dateTimeToDate(birthDate: string, birthTime?: string | null) {
  const time = birthTime?.slice(0, 5) ?? '12:00';
  const iso = `${birthDate}T${time}:00Z`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return new Date(`${birthDate}T12:00:00Z`);
  return parsed;
}

function calcMoonPhase(date: Date) {
  const synodicMonth = 29.53058867;
  const refNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
  const days = (date.getTime() - refNewMoon) / (1000 * 60 * 60 * 24);
  const age = ((days % synodicMonth) + synodicMonth) % synodicMonth;
  const phase = age / synodicMonth; // 0..1
  const illumination = 0.5 * (1 - Math.cos(2 * Math.PI * phase));
  return { age, phase, illumination };
}

function nearestMoonPhaseIndex(phaseFraction: number) {
  const mirrored = phaseFraction <= 0.5 ? phaseFraction : 1 - phaseFraction;
  let bestIdx = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  PHASE_SET.forEach((p, idx) => {
    const d = Math.abs(mirrored - p.phase);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = idx;
    }
  });
  return bestIdx;
}

const displaySerif = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: undefined,
});

export default function BirthNightSkyPoster(props: Props) {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language?.startsWith('en');
  const variant = props.variant ?? 'minimal';
  const variantVisual = VARIANT_CONFIG[variant];
  const timestamp = useMemo(() => dateTimeToDate(props.birthDate, props.birthTime), [props.birthDate, props.birthTime]);
  const fallbackMoonPhase = useMemo(() => calcMoonPhase(timestamp), [timestamp]);
  const projectionMoonPhase = props.projection?.moonPhase;
  const phaseFraction =
    typeof projectionMoonPhase?.phaseFraction === 'number'
      ? projectionMoonPhase.phaseFraction
      : fallbackMoonPhase.phase;
  const illuminationPercent =
    typeof projectionMoonPhase?.illuminationPercent === 'number'
      ? Math.round(projectionMoonPhase.illuminationPercent)
      : Math.round(fallbackMoonPhase.illumination * 100);
  const activeMoonPhaseIdx = nearestMoonPhaseIndex(phaseFraction);

  const seed = useMemo(
    () =>
      hashSeed(
        `${variant}|${props.birthDate}|${props.birthTime ?? 'unknown'}|${props.latitude.toFixed(4)}|${props.longitude.toFixed(4)}`,
      ),
    [variant, props.birthDate, props.birthTime, props.latitude, props.longitude],
  );

  const sky = useMemo(() => {
    const rand = mulberry32(seed);
    const center = { x: 170, y: 208 };
    const radius = 152;

    const proceduralStars: SkyStarDot[] = [];
    while (proceduralStars.length < variantVisual.starCount) {
      const x = 30 + rand() * 300;
      const y = 100 + rand() * 310;
      const dx = x - center.x;
      const dy = y - center.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius * 1.02) continue;
      proceduralStars.push({
        x,
        y,
        r: rand() > 0.86 ? 1.9 : rand() > 0.55 ? 1.15 : 0.7,
        opacity: rand() > 0.75 ? 0.95 : rand() > 0.35 ? 0.65 : 0.35,
      });
    }

    const proceduralLines: SkyLineSeg[] = [];
    for (let i = 0; i < variantVisual.lineBudget; i += 1) {
      const a = Math.floor(rand() * proceduralStars.length);
      const b = Math.floor(rand() * proceduralStars.length);
      if (a === b) continue;
      const dx = proceduralStars[a].x - proceduralStars[b].x;
      const dy = proceduralStars[a].y - proceduralStars[b].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 20 || dist > 68) continue;
      proceduralLines.push({
        a,
        b,
        opacity: Math.min(0.9, (0.12 + rand() * 0.18) * variantVisual.lineOpacityBoost),
      });
    }

    const house10 = props.houses?.find((h) => h.houseNumber === 10);
    const house1 = props.houses?.find((h) => h.houseNumber === 1);
    const mcLon = houseCuspLon(house10) ?? 270;
    const ascLon = houseCuspLon(house1) ?? normalizeAngle(mcLon - 90);
    const projectionPlanetByKey = new Map((props.projection?.planets ?? []).map((p) => [p.key, p]));
    const axisByKey = new Map((props.projection?.axes ?? []).map((p) => [p.key, p]));

    const catalogStars: SkyStarDot[] = [];
    const catalogStarIndexByKey = new Map<string, number>();
    for (const star of props.projection?.stars ?? []) {
      if (!star?.visible) continue;
      if (!Number.isFinite(star.xNorm) || !Number.isFinite(star.yNorm)) continue;
      const xNorm = Math.max(-1, Math.min(1, star.xNorm));
      const yNorm = Math.max(-1, Math.min(1, star.yNorm));
      const brightness = Math.max(0, Math.min(1, (3.2 - (Number(star.magnitude) || 3.2)) / 4.6));
      const sizeBoost = variant === 'gold_edition' ? 0.35 : variant === 'constellation_heavy' ? 0.2 : 0;
      const r = 0.65 + brightness * (1.75 + sizeBoost);
      const opacityBase = variant === 'constellation_heavy' ? 0.45 : 0.35;
      const opacity = Math.max(opacityBase, Math.min(0.98, opacityBase + brightness * 0.5));
      catalogStarIndexByKey.set(star.key, catalogStars.length);
      catalogStars.push({
        key: star.key,
        x: center.x + xNorm * radius,
        y: center.y + yNorm * radius,
        r,
        opacity,
      });
    }

    const catalogLines: SkyLineSeg[] = [];
    for (const line of props.projection?.constellationLines ?? []) {
      const a = catalogStarIndexByKey.get(line.fromKey);
      const b = catalogStarIndexByKey.get(line.toKey);
      if (a == null || b == null) continue;
      catalogLines.push({
        a,
        b,
        opacity: Math.min(0.55, 0.14 * variantVisual.lineOpacityBoost),
      });
    }

    const useCatalogSky = catalogStars.length >= 8;
    const stars: SkyStarDot[] = useCatalogSky ? [...catalogStars] : [...proceduralStars];
    const lines: SkyLineSeg[] = useCatalogSky ? [...catalogLines] : [...proceduralLines];

    if (useCatalogSky && variant !== 'minimal') {
      const fillerCount = Math.min(variant === 'constellation_heavy' ? 36 : 22, proceduralStars.length);
      for (let i = 0; i < fillerCount; i += 1) {
        const s = proceduralStars[i];
        stars.push({
          ...s,
          r: Math.max(0.55, s.r - 0.1),
          opacity: Math.min(0.35, s.opacity * 0.45),
        });
      }
    }

    const visiblePlanets = props.planets
      .filter((p) => PLANET_ORDER.includes(p.planet))
      .sort((a, b) => PLANET_ORDER.indexOf(a.planet) - PLANET_ORDER.indexOf(b.planet))
      .slice(0, 9);

    const plotted: PlanetPlot[] = visiblePlanets.map((planet, idx) => {
      const projected = projectionPlanetByKey.get(planet.planet);
      let point: { x: number; y: number };
      let label: { x: number; y: number };

      if (
        projected &&
        Number.isFinite(projected.xNorm) &&
        Number.isFinite(projected.yNorm)
      ) {
        const xNorm = Math.max(-1, Math.min(1, projected.xNorm));
        const yNorm = Math.max(-1, Math.min(1, projected.yNorm));
        point = {
          x: center.x + xNorm * radius,
          y: center.y + yNorm * radius,
        };
        const vx = point.x - center.x;
        const vy = point.y - center.y;
        const len = Math.max(0.0001, Math.sqrt(vx * vx + vy * vy));
        const labelRadius = Math.min(radius + 18, len + 24 + (idx % 2) * 4);
        label = {
          x: center.x + (vx / len) * labelRadius,
          y: center.y + (vy / len) * labelRadius,
        };
      } else {
        const lon = absoluteLongitude(planet);
        const angle = normalizeAngle(-90 + (lon - mcLon)); // MC approximated at top

        let sep = Math.abs(normalizeAngle(lon - mcLon));
        if (sep > 180) sep = 360 - sep;
        const radiusFactor = 0.22 + (sep / 180) * 0.7; // zenith-ish center weighting
        const planetRadius = radius * radiusFactor;
        const offset = ((idx % 3) - 1) * 6;
        point = polarPoint(center.x, center.y, planetRadius + offset, angle);
        label = polarPoint(center.x, center.y, Math.min(radius + 18, planetRadius + 26), angle);
      }

      return {
        planet: planet.planet,
        glyph: PLANET_GLYPHS[planet.planet] ?? '•',
        x: point.x,
        y: point.y,
        labelX: label.x,
        labelY: label.y,
        color: PLANET_COLORS[planet.planet] ?? '#F8FAFC',
      };
    });

    let plottedFinal = plotted;
    if (!plottedFinal.length && projectionPlanetByKey.size > 0) {
      plottedFinal = PLANET_ORDER.map((planetKey, idx) => {
        const projected = projectionPlanetByKey.get(planetKey);
        if (!projected || !Number.isFinite(projected.xNorm) || !Number.isFinite(projected.yNorm)) return null;
        const xNorm = Math.max(-1, Math.min(1, projected.xNorm));
        const yNorm = Math.max(-1, Math.min(1, projected.yNorm));
        const point = {
          x: center.x + xNorm * radius,
          y: center.y + yNorm * radius,
        };
        const vx = point.x - center.x;
        const vy = point.y - center.y;
        const len = Math.max(0.0001, Math.sqrt(vx * vx + vy * vy));
        const labelRadius = Math.min(radius + 18, len + 24 + (idx % 2) * 4);
        const label = {
          x: center.x + (vx / len) * labelRadius,
          y: center.y + (vy / len) * labelRadius,
        };
        return {
          planet: planetKey,
          glyph: PLANET_GLYPHS[planetKey] ?? '•',
          x: point.x,
          y: point.y,
          labelX: label.x,
          labelY: label.y,
          color: PLANET_COLORS[planetKey] ?? '#F8FAFC',
        } as PlanetPlot;
      }).filter(Boolean) as PlanetPlot[];
    }

    const ascAxis = axisByKey.get('asc');
    const dscAxis = axisByKey.get('dsc');
    const horizonLeft =
      ascAxis && Number.isFinite(ascAxis.xNorm) && Number.isFinite(ascAxis.yNorm)
        ? {
            x: center.x + Math.max(-1, Math.min(1, ascAxis.xNorm)) * radius,
            y: center.y + Math.max(-1, Math.min(1, ascAxis.yNorm)) * radius,
          }
        : polarPoint(center.x, center.y, radius, normalizeAngle(-90 + (ascLon - mcLon) - 90));
    const horizonRight =
      dscAxis && Number.isFinite(dscAxis.xNorm) && Number.isFinite(dscAxis.yNorm)
        ? {
            x: center.x + Math.max(-1, Math.min(1, dscAxis.xNorm)) * radius,
            y: center.y + Math.max(-1, Math.min(1, dscAxis.yNorm)) * radius,
          }
        : polarPoint(center.x, center.y, radius, normalizeAngle(-90 + (ascLon - mcLon) + 90));

    return { center, radius, stars, lines, planets: plottedFinal, horizonLeft, horizonRight };
  }, [seed, props.houses, props.planets, props.projection, variantVisual.lineBudget, variantVisual.lineOpacityBoost, variantVisual.starCount]);

  const headerName = props.name?.trim() || 'Astro Soul';
  const timeLabel = (props.projection?.birthTime || props.birthTime)?.slice(0, 5) ?? (isEnglish ? 'Time unknown' : 'Saat bilinmiyor');

  return (
    <View style={[styles.frame, { backgroundColor: variantVisual.frameTone }]} collapsable={false}>
      <LinearGradient
        colors={variantVisual.gradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={[styles.goldHaloA, { backgroundColor: variantVisual.haloA }]} />
        <View style={[styles.goldHaloB, { backgroundColor: variantVisual.haloB }]} />

        <View style={styles.topMeta}>
          <Text style={styles.eyebrow}>
            {isEnglish ? 'THE NIGHT YOU WERE BORN' : 'DOĞDUĞUN GECE GÖKYÜZÜ'}
          </Text>
          <Text style={styles.name}>{headerName}</Text>
          <Text style={styles.metaLine}>
            {props.birthDate} • {timeLabel}
          </Text>
          <Text style={styles.metaLineSmall}>{props.birthLocation}</Text>
          <Text style={styles.metaLineSmall}>
            {props.latitude.toFixed(4)}, {props.longitude.toFixed(4)}
          </Text>
        </View>

        <View style={styles.skyStage}>
          <View
            pointerEvents="none"
            style={[
              styles.skyStageGlow,
              {
                backgroundColor: variant === 'gold_edition' ? 'rgba(248,213,126,0.04)' : 'rgba(255,255,255,0.02)',
                borderColor: variantVisual.gridStroke,
              },
            ]}
          />
          <Svg width={352} height={388} viewBox="0 0 340 380">
            <Circle cx={sky.center.x} cy={sky.center.y} r={sky.radius + 18} fill="rgba(255,255,255,0.015)" />
            <Circle cx={sky.center.x} cy={sky.center.y} r={sky.radius} fill="rgba(255,255,255,0.01)" stroke={variantVisual.gridStroke} strokeWidth={1} />
            <Circle cx={sky.center.x} cy={sky.center.y} r={sky.radius * 0.66} fill="transparent" stroke={variantVisual.gridStroke} strokeWidth={1} opacity={0.65} />
            <Circle cx={sky.center.x} cy={sky.center.y} r={sky.radius * 0.33} fill="transparent" stroke={variantVisual.gridStroke} strokeWidth={1} opacity={0.5} />
            {variant === 'constellation_heavy' ? (
              <>
                <Circle cx={sky.center.x} cy={sky.center.y} r={sky.radius * 0.82} fill="transparent" stroke="rgba(186,230,253,0.08)" strokeWidth={0.9} />
                <Circle cx={sky.center.x} cy={sky.center.y} r={sky.radius * 0.48} fill="transparent" stroke="rgba(186,230,253,0.07)" strokeWidth={0.8} />
              </>
            ) : null}
            {variant === 'gold_edition' ? (
              <Circle cx={sky.center.x} cy={sky.center.y} r={sky.radius + 7} fill="transparent" stroke="rgba(248,213,126,0.16)" strokeWidth={1} />
            ) : null}

            <Line
              x1={sky.horizonLeft.x}
              y1={sky.horizonLeft.y}
              x2={sky.horizonRight.x}
              y2={sky.horizonRight.y}
              stroke={variantVisual.horizonStroke}
              strokeWidth={1}
            />

            {sky.lines.map((line, idx) => (
              <Line
                key={`line-${idx}`}
                x1={sky.stars[line.a].x}
                y1={sky.stars[line.a].y}
                x2={sky.stars[line.b].x}
                y2={sky.stars[line.b].y}
                stroke={`rgba(255,255,255,${line.opacity})`}
                strokeWidth={0.8}
              />
            ))}

            {sky.stars.map((star, idx) => (
              <Circle
                key={`star-${idx}`}
                cx={star.x}
                cy={star.y}
                r={star.r}
                fill={`rgba(255,255,255,${star.opacity})`}
              />
            ))}

            {sky.planets.map((planet) => (
              <G key={`planet-${planet.planet}`}>
                <Line
                  x1={planet.x}
                  y1={planet.y}
                  x2={planet.labelX}
                  y2={planet.labelY}
                  stroke={variantVisual.labelStroke}
                  strokeWidth={0.8}
                />
                <Circle cx={planet.x} cy={planet.y} r={12.5} fill={planet.color} fillOpacity={0.16} />
                <Circle cx={planet.x} cy={planet.y} r={5.4} fill={planet.color} />
                <Circle
                  cx={planet.x}
                  cy={planet.y}
                  r={11.5}
                  fill="transparent"
                  stroke={planet.color}
                  strokeOpacity={Math.min(0.82, variantVisual.planetRingOpacity + 0.18)}
                  strokeWidth={1.15}
                />
                <Circle
                  cx={planet.labelX}
                  cy={planet.labelY}
                  r={11.25}
                  fill="rgba(3,5,9,0.9)"
                  stroke={planet.color}
                  strokeOpacity={0.22}
                  strokeWidth={0.9}
                />
                <SvgText
                  x={planet.labelX}
                  y={planet.labelY + 5}
                  fill={planet.color}
                  fontSize={14}
                  fontWeight="800"
                  textAnchor="middle"
                >
                  {planet.glyph}
                </SvgText>
              </G>
            ))}
          </Svg>
        </View>

        <View style={styles.phaseCard}>
          <View style={styles.phaseHeader}>
            <Text style={styles.phaseTitle}>{isEnglish ? 'Moon Phase' : 'Ay Evresi'}</Text>
            <Text style={styles.phaseValue}>
              {isEnglish ? `${illuminationPercent}% illuminated` : `%${illuminationPercent} aydınlık`}
            </Text>
          </View>
          <View style={styles.phaseRow}>
            {PHASE_SET.map((phase, idx) => {
              const active = idx === activeMoonPhaseIdx;
              return (
                <View key={phase.key} style={styles.phaseItem}>
                  <View style={[styles.phaseEmojiWrap, active && styles.phaseEmojiWrapActive]}>
                    <Text style={styles.phaseEmoji}>{phase.emoji}</Text>
                  </View>
                  <Text style={[styles.phaseLabel, active && styles.phaseLabelActive]} numberOfLines={1}>
                    {phase.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <View style={styles.footerContent}>
            <View style={styles.footerLeft}>
              <Text style={styles.slogan}>
                {isEnglish ? 'Your personal sky map.' : 'Senin gökyüzü haritan.'}
              </Text>
              <Text style={styles.footerBrand}>ASTRO GURU</Text>
            </View>
            {props.shareUrl ? (
              <View style={styles.qrShell}>
                <QRCode
                  value={props.shareUrl}
                  size={52}
                  color="#0A0D14"
                  backgroundColor="#F8FAFC"
                  quietZone={3}
                />
              </View>
            ) : null}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: 360,
    height: 640,
    backgroundColor: '#030509',
  },
  card: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 18,
    paddingBottom: 18,
    overflow: 'hidden',
  },
  goldHaloA: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(248,213,126,0.06)',
    top: -70,
    right: -40,
  },
  goldHaloB: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.03)',
    top: 256,
    left: -56,
  },
  topMeta: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  eyebrow: {
    color: 'rgba(248,213,126,0.92)',
    letterSpacing: 3.2,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  name: {
    color: '#F8FAFC',
    fontSize: 30,
    lineHeight: 37,
    fontWeight: Platform.OS === 'ios' ? '700' : '600',
    fontFamily: displaySerif,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 304,
  },
  metaLine: {
    color: 'rgba(226,232,240,0.9)',
    fontSize: 11.5,
    letterSpacing: 0.35,
    marginTop: 2,
  },
  metaLineSmall: {
    color: 'rgba(226,232,240,0.65)',
    fontSize: 10,
    textAlign: 'center',
  },
  skyStage: {
    marginTop: -8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  skyStageGlow: {
    position: 'absolute',
    width: 312,
    height: 312,
    borderRadius: 999,
    top: 26,
    borderWidth: 1,
    opacity: 0.9,
  },
  phaseCard: {
    marginTop: -8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(248,213,126,0.2)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 5,
  },
  phaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phaseTitle: {
    color: '#F8FAFC',
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  phaseValue: {
    color: 'rgba(248,213,126,0.9)',
    fontSize: 10.5,
    fontWeight: '600',
  },
  phaseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  phaseItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  phaseEmojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F8D57E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  phaseEmojiWrapActive: {
    borderColor: 'rgba(248,213,126,0.72)',
    backgroundColor: 'rgba(248,213,126,0.14)',
  },
  phaseEmoji: {
    fontSize: 23,
  },
  phaseLabel: {
    color: 'rgba(226,232,240,0.75)',
    fontSize: 9,
    textAlign: 'center',
  },
  phaseLabelActive: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  footer: {
    marginTop: 'auto',
    gap: 11,
  },
  footerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(248,213,126,0.15)',
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerLeft: {
    flex: 1,
    gap: 4,
  },
  slogan: {
    color: 'rgba(226,232,240,0.85)',
    fontSize: 11.2,
    letterSpacing: 0.35,
  },
  footerBrand: {
    color: 'rgba(248,213,126,0.92)',
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 3.1,
  },
  qrShell: {
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
});
