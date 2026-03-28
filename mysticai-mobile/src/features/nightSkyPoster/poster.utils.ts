import type {
  CelestialBody,
  CelestialLegendItemModel,
  ConstellationPoint,
  ConstellationSegment,
  LunarPhaseItemModel,
  LunarPhaseKey,
  NightSkyPosterModel,
  NightSkyPosterSource,
  PosterTone,
} from './poster.types';
import { posterTokens, toneColorMap } from './poster.tokens';

const PHASE_ORDER: LunarPhaseKey[] = [
  'new_moon',
  'waxing_crescent',
  'first_quarter',
  'waxing_gibbous',
  'full_moon',
  'waning_gibbous',
  'last_quarter',
  'waning_crescent',
];

const PLANET_SYMBOLS: Record<string, string> = {
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

const PLANET_TONES: Record<string, PosterTone> = {
  Sun: 'gold',
  Moon: 'moon',
  Mercury: 'blue',
  Venus: 'rose',
  Mars: 'rose',
  Jupiter: 'gold',
  Saturn: 'silver',
  Uranus: 'blue',
  Neptune: 'violet',
  Pluto: 'violet',
  Chiron: 'moon',
  NorthNode: 'gold',
};

const PLANET_LABELS = {
  tr: {
    Sun: 'Güneş',
    Moon: 'Ay',
    Mercury: 'Merkür',
    Venus: 'Venüs',
    Mars: 'Mars',
    Jupiter: 'Jüpiter',
    Saturn: 'Satürn',
    Uranus: 'Uranüs',
    Neptune: 'Neptün',
    Pluto: 'Plüton',
    Chiron: 'Kiron',
    NorthNode: 'K. Düğümü',
  },
  en: {
    Sun: 'Sun',
    Moon: 'Moon',
    Mercury: 'Mercury',
    Venus: 'Venus',
    Mars: 'Mars',
    Jupiter: 'Jupiter',
    Saturn: 'Saturn',
    Uranus: 'Uranus',
    Neptune: 'Neptune',
    Pluto: 'Pluto',
    Chiron: 'Chiron',
    NorthNode: 'North Node',
  },
} as const;

const CELESTIAL_MEANINGS = {
  tr: {
    Sun: 'Öz benlik, yaşam enerjisi',
    Moon: 'Duygular, iç dünya',
    Mercury: 'Zihin, iletişim',
    Venus: 'Sevgi, estetik',
    Mars: 'Enerji, hareket',
    Jupiter: 'Büyüme, şans',
    Saturn: 'Disiplin, sınırlar',
    Uranus: 'Değişim, özgürleşme',
    Neptune: 'Sezgi, hayal',
    Pluto: 'Dönüşüm, derinlik',
    Chiron: 'Yara ve şifa',
    NorthNode: 'Yön ve gelişim',
  },
  en: {
    Sun: 'Identity, life force',
    Moon: 'Emotions, inner world',
    Mercury: 'Mind, communication',
    Venus: 'Love, aesthetics',
    Mars: 'Energy, action',
    Jupiter: 'Growth, luck',
    Saturn: 'Discipline, boundaries',
    Uranus: 'Change, liberation',
    Neptune: 'Intuition, dreams',
    Pluto: 'Transformation, depth',
    Chiron: 'Wound and healing',
    NorthNode: 'Direction, evolution',
  },
} as const;

const PLANET_PRIORITY: Record<string, 1 | 2 | 3> = {
  Sun: 3,
  Moon: 3,
  Mercury: 2,
  Venus: 2,
  Mars: 2,
  Jupiter: 2,
  Saturn: 2,
  Uranus: 1,
  Neptune: 1,
  Pluto: 1,
  Chiron: 1,
  NorthNode: 1,
};

const VARIANT_TONE_MAP = {
  minimal: 'moon',
  constellation_heavy: 'violet',
  gold_edition: 'gold',
} as const;

const OFFSET_PATTERN: Array<[number, number]> = [
  [0, 0],
  [1.35, -0.32],
  [-1.35, 0.32],
  [2.1, 0.68],
  [-2.1, -0.68],
  [0, 1.4],
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeAngle(angle: number) {
  let value = angle % 360;
  if (value < 0) value += 360;
  return value;
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

function absoluteLongitude(planet: NightSkyPosterSource['planets'][number]) {
  if (typeof planet.absoluteLongitude === 'number' && Number.isFinite(planet.absoluteLongitude)) {
    return normalizeAngle(planet.absoluteLongitude);
  }

  const idx = Math.max(0, signIndex(planet.sign));
  const deg = Number(planet.degree) || 0;
  const minutes = Number(planet.minutes) || 0;
  const seconds = Number(planet.seconds) || 0;
  return normalizeAngle(idx * 30 + deg + minutes / 60 + seconds / 3600);
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
  const phase = age / synodicMonth;
  const illumination = 0.5 * (1 - Math.cos(2 * Math.PI * phase));
  return { phase, illumination };
}

function normalizeIdentity(value?: string | null) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function looksLikeHumanName(value?: string | null) {
  const normalized = normalizeIdentity(value);
  if (!normalized) return false;
  if (looksGuestish(normalized)) return false;
  if (!/\s+/.test(normalized)) return false;
  if (/[0-9_]/.test(normalized)) return false;
  return normalized.length >= 3;
}

function looksGuestish(value?: string | null) {
  const normalized = normalizeIdentity(value);
  if (!normalized) return false;
  return (
    /^guest[_-]/i.test(normalized)
    || /^[a-f0-9]{18,}$/i.test(normalized)
    || /^[a-z0-9_]{20,}$/i.test(normalized)
  );
}

function cleanLocationLabel(value: string) {
  const segments = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (segments.length <= 2) return segments.join(', ');
  return `${segments[0]}, ${segments[1]}`;
}

function coordinateLabel(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

function buildPhaseDescription(phase: LunarPhaseKey, locale: 'tr' | 'en') {
  if (locale === 'en') {
    const map: Record<LunarPhaseKey, { label: string; description: string }> = {
      new_moon: {
        label: 'New Moon',
        description: 'A quiet threshold. Intention-setting, inner reset, and gentle focus feel strongest here.',
      },
      waxing_crescent: {
        label: 'Waxing Crescent',
        description: 'Momentum begins to gather. Small brave moves gain meaning faster than loud action.',
      },
      first_quarter: {
        label: 'First Quarter',
        description: 'Decision energy rises. Clear choices and visible action strengthen the path ahead.',
      },
      waxing_gibbous: {
        label: 'Waxing Gibbous',
        description: 'Refinement phase. What you polish now becomes the visible signature of the journey.',
      },
      full_moon: {
        label: 'Full Moon',
        description: 'Everything glows brighter. Emotion, clarity, and release all sit close to the surface.',
      },
      waning_gibbous: {
        label: 'Waning Gibbous',
        description: 'Integration begins. Reflection, gratitude, and perspective become more valuable than speed.',
      },
      last_quarter: {
        label: 'Last Quarter',
        description: 'Editing season. Letting go of what drains you creates space for cleaner direction.',
      },
      waning_crescent: {
        label: 'Waning Crescent',
        description: 'Restorative energy. Recovery, softness, and listening inward become the real progress.',
      },
    };
    return map[phase];
  }

  return getLunarPhasePresentation(phase);
}

function resolvePhaseKey(phaseFraction: number): LunarPhaseKey {
  const normalized = ((phaseFraction % 1) + 1) % 1;
  const index = Math.round(normalized * 8) % 8;
  return PHASE_ORDER[index] ?? 'new_moon';
}

function buildLunarPhaseItems(activePhase: LunarPhaseKey, locale: 'tr' | 'en'): LunarPhaseItemModel[] {
  return PHASE_ORDER.map((phase) => {
    const presentation = buildPhaseDescription(phase, locale);
    return {
      key: phase,
      label: presentation.label,
      description: presentation.description,
      selected: phase === activePhase,
    };
  });
}

function deriveNormalizedPoint(input: { xNorm?: number; yNorm?: number }) {
  if (!Number.isFinite(input.xNorm) || !Number.isFinite(input.yNorm)) return null;
  return {
    x: clamp(0.5 + (input.xNorm as number) * 0.39, 0.08, 0.92),
    y: clamp(0.5 + (input.yNorm as number) * 0.39, 0.08, 0.92),
  };
}

function buildCelestialBodies(source: NightSkyPosterSource): CelestialBody[] {
  const locale = source.locale === 'en' ? 'en' : 'tr';
  const projectionPlanetByKey = new Map(
    (source.projection?.planets ?? []).map((item) => [item.key.toLowerCase(), item]),
  );

  const filtered = (source.planets ?? []).filter((planet) => PLANET_SYMBOLS[planet.planet]);

  const bodies = filtered.map((planet, index) => {
    const projected =
      projectionPlanetByKey.get(planet.planet.toLowerCase())
      ?? projectionPlanetByKey.get(planet.planet);

    let point = projected ? deriveNormalizedPoint(projected) : null;
    if (!point) {
      const lon = absoluteLongitude(planet);
      const angle = ((lon - 90) * Math.PI) / 180;
      const ring = clamp(0.19 + ((planet.house - 1) / 11) * 0.19 + (index % 2) * 0.02, 0.2, 0.42);
      point = {
        x: clamp(0.5 + Math.cos(angle) * ring, 0.1, 0.9),
        y: clamp(0.5 + Math.sin(angle) * ring, 0.1, 0.9),
      };
    }

    const priority = PLANET_PRIORITY[planet.planet] ?? 1;
    const isHighlighted = priority >= 2 || planet.planet === 'Sun' || planet.planet === 'Moon';

    return {
      id: planet.planet.toLowerCase(),
      symbol: PLANET_SYMBOLS[planet.planet] ?? '•',
      label: PLANET_LABELS[locale][planet.planet as keyof typeof PLANET_LABELS.tr] ?? planet.planet,
      x: point.x,
      y: point.y,
      tone: PLANET_TONES[planet.planet] ?? 'silver',
      markerLevel: priority >= 3 ? 'primary' : 'secondary',
      priority,
      isHighlighted,
    } satisfies CelestialBody;
  });

  const adjusted: CelestialBody[] = [];
  for (const body of bodies) {
    const clusterIndex = adjusted.reduce((count, prev) => {
      const dx = prev.x - body.x;
      const dy = prev.y - body.y;
      return Math.sqrt(dx * dx + dy * dy) < 0.12 ? count + 1 : count;
    }, 0);

    const [tangentFactor, radialFactor] = OFFSET_PATTERN[Math.min(clusterIndex, OFFSET_PATTERN.length - 1)] ?? [0, 0];
    const vx = body.x - 0.5;
    const vy = body.y - 0.5;
    const len = Math.max(0.001, Math.sqrt(vx * vx + vy * vy));
    const radialX = vx / len;
    const radialY = vy / len;
    const tangentX = -radialY;
    const tangentY = radialX;
    const scale = body.markerLevel === 'primary' ? 0.024 : 0.03;

    adjusted.push({
      ...body,
      showLabel: true,
      clusterOffsetX: tangentX * tangentFactor * scale + radialX * radialFactor * scale,
      clusterOffsetY: tangentY * tangentFactor * scale + radialY * radialFactor * scale,
    });
  }

  return adjusted;
}

function buildConstellationSegments(source: NightSkyPosterSource, seed: number) {
  const starMap = new Map<string, ConstellationPoint>();
  const segments: ConstellationSegment[] = [];

  for (const star of source.projection?.stars ?? []) {
    if (!star.visible) continue;
    const point = deriveNormalizedPoint(star);
    if (!point) continue;

    const brightness = clamp((3.2 - (Number(star.magnitude) || 3.2)) / 4.6, 0.1, 1);
    starMap.set(star.key, {
      ...point,
      opacity: clamp(0.35 + brightness * 0.45, 0.35, 0.92),
      size: clamp(0.3 + brightness * 0.75, 0.35, 1.3),
    });
  }

  if (starMap.size > 6) {
    for (const line of source.projection?.constellationLines ?? []) {
      const from = starMap.get(line.fromKey);
      const to = starMap.get(line.toKey);
      if (!from || !to) continue;
      segments.push({
        id: `${line.fromKey}-${line.toKey}`,
        points: [from, to],
        opacity: 0.3,
      });
    }

    return {
      constellationLines: segments.slice(0, 26),
      stars: Array.from(starMap.values())
        .sort((a, b) => (b.opacity ?? 0) - (a.opacity ?? 0))
        .slice(0, 56),
    };
  }

  const rand = mulberry32(seed);
  const fallbackSegments: ConstellationSegment[] = [
    { id: 'c1', points: [{ x: 0.2, y: 0.32 }, { x: 0.27, y: 0.42 }, { x: 0.22, y: 0.56 }] },
    { id: 'c2', points: [{ x: 0.61, y: 0.22 }, { x: 0.72, y: 0.31 }, { x: 0.77, y: 0.45 }] },
    { id: 'c3', points: [{ x: 0.38, y: 0.63 }, { x: 0.49, y: 0.68 }, { x: 0.58, y: 0.61 }] },
    { id: 'c4', points: [{ x: 0.31, y: 0.2 }, { x: 0.41, y: 0.16 }, { x: 0.5, y: 0.22 }] },
  ].map((segment) => ({
    ...segment,
    points: segment.points.map((point) => ({
      x: clamp(point.x + (rand() - 0.5) * 0.025, 0.14, 0.86),
      y: clamp(point.y + (rand() - 0.5) * 0.025, 0.14, 0.86),
      opacity: 0.55,
      size: 0.9,
    })),
    opacity: 0.24,
  }));

  const stars: ConstellationPoint[] = [];
  while (stars.length < 38) {
    const x = 0.12 + rand() * 0.76;
    const y = 0.12 + rand() * 0.76;
    const dx = x - 0.5;
    const dy = y - 0.5;
    if (Math.sqrt(dx * dx + dy * dy) > 0.43) continue;
    stars.push({
      x,
      y,
      opacity: rand() > 0.7 ? 0.88 : rand() > 0.38 ? 0.58 : 0.34,
      size: rand() > 0.8 ? 1.15 : rand() > 0.45 ? 0.8 : 0.45,
    });
  }

  fallbackSegments.forEach((segment) => {
    segment.points.forEach((point) => {
      stars.push({ ...point, opacity: point.opacity ?? 0.6, size: point.size ?? 0.9 });
    });
  });

  return {
    constellationLines: fallbackSegments,
    stars,
  };
}

function tuneConstellationPoint(
  point: ConstellationPoint,
  opacityScale: number,
  sizeScale: number,
  opacityRange: [number, number],
  sizeRange: [number, number],
): ConstellationPoint {
  return {
    ...point,
    opacity:
      typeof point.opacity === 'number'
        ? clamp(point.opacity * opacityScale, opacityRange[0], opacityRange[1])
        : point.opacity,
    size:
      typeof point.size === 'number'
        ? clamp(point.size * sizeScale, sizeRange[0], sizeRange[1])
        : point.size,
  };
}

function applyVariantToConstellationScene(
  scene: ReturnType<typeof buildConstellationSegments>,
  variant: NightSkyPosterSource['variant'],
) {
  const activeVariant = variant ?? 'minimal';

  if (activeVariant === 'constellation_heavy') {
    return {
      constellationLines: scene.constellationLines.map((segment) => ({
        ...segment,
        opacity: clamp((segment.opacity ?? 0.22) * 1.5, 0.18, 0.5),
        points: segment.points.map((point) =>
          tuneConstellationPoint(point, 1.18, 1.12, [0.3, 0.96], [0.45, 1.6]),
        ),
      })),
      stars: scene.stars.map((star) => tuneConstellationPoint(star, 1.18, 1.1, [0.18, 0.98], [0.32, 1.55])),
    };
  }

  if (activeVariant === 'gold_edition') {
    return {
      constellationLines: scene.constellationLines
        .slice(
          0,
          Math.min(scene.constellationLines.length, Math.max(4, Math.ceil(scene.constellationLines.length * 0.75))),
        )
        .map((segment) => ({
          ...segment,
          opacity: clamp((segment.opacity ?? 0.22) * 1.08, 0.12, 0.34),
          points: segment.points.map((point) =>
            tuneConstellationPoint(point, 1.05, 1.04, [0.24, 0.9], [0.36, 1.45]),
          ),
        })),
      stars: scene.stars
        .slice(0, Math.min(scene.stars.length, Math.max(20, Math.ceil(scene.stars.length * 0.82))))
        .map((star) => tuneConstellationPoint(star, 1.04, 1.03, [0.16, 0.94], [0.3, 1.45])),
    };
  }

  return {
    constellationLines: scene.constellationLines
      .slice(0, Math.min(scene.constellationLines.length, Math.max(2, Math.ceil(scene.constellationLines.length * 0.42))))
      .map((segment) => ({
        ...segment,
        opacity: clamp((segment.opacity ?? 0.2) * 0.58, 0.08, 0.18),
        points: segment.points.map((point) =>
          tuneConstellationPoint(point, 0.72, 0.9, [0.18, 0.62], [0.28, 1.12]),
        ),
      })),
    stars: scene.stars
      .slice(0, Math.min(scene.stars.length, Math.max(14, Math.ceil(scene.stars.length * 0.56))))
      .map((star) => tuneConstellationPoint(star, 0.78, 0.88, [0.12, 0.62], [0.24, 1.12])),
  };
}

export function hashSeed(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) || 1;
}

export function mulberry32(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function truncateGuestIdentity(value?: string | null): string {
  const normalized = normalizeIdentity(value);
  if (!normalized) return '';
  if (/^guest[_-]/i.test(normalized)) {
    const clean = normalized.replace(/^guest[_-]*/i, '');
    return `guest_${clean.slice(0, 6)}`;
  }
  return normalized.length > 16 ? `${normalized.slice(0, 12)}…` : normalized;
}

export function resolvePosterDisplayName(input: {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  isGuest?: boolean;
}): string | null {
  if (input.isGuest) return null;

  const fullName = normalizeIdentity(input.fullName);
  if (looksLikeHumanName(fullName)) return fullName;

  const combined = normalizeIdentity(`${input.firstName ?? ''} ${input.lastName ?? ''}`);
  if (looksLikeHumanName(combined)) return combined;

  return null;
}

export function getLunarPhasePresentation(phase: LunarPhaseKey): { label: string; description: string } {
  const map: Record<LunarPhaseKey, { label: string; description: string }> = {
    new_moon: {
      label: 'Yeniay',
      description: 'Sessiz bir başlangıç eşiği. Niyet koymak, içe dönmek ve ritmini tazelemek için en güçlü faz.',
    },
    waxing_crescent: {
      label: 'Hilal',
      description: 'Enerji yavaşça yükselir. Küçük ama kararlı adımlar en çok karşılık veren hareket olur.',
    },
    first_quarter: {
      label: 'İlkdördün',
      description: 'Karar alma gücü artar. Netleşmek ve görünür aksiyon almak bu fazın ana temasını taşır.',
    },
    waxing_gibbous: {
      label: 'Şişkin Ay',
      description: 'İyileştirme ve rafine etme zamanı. İncelik verdiğin her şey daha güçlü bir sonuç üretir.',
    },
    full_moon: {
      label: 'Dolunay',
      description: 'Duygu, görünürlük ve farkındalık zirveye çıkar. Bırakmak ve aydınlanmak aynı anda çalışır.',
    },
    waning_gibbous: {
      label: 'Azalan Şişkin',
      description: 'Anlamı toplama evresi. Şükran, içgörü ve değerlendirme öne geçer.',
    },
    last_quarter: {
      label: 'Sondördün',
      description: 'Sadeleşmek için güçlü bir dönem. Gereksiz yükleri bırakmak yönünü berraklaştırır.',
    },
    waning_crescent: {
      label: 'Balsamik',
      description: 'Dinlenme ve iç sesle temas artar. Yeniden doğacak döngü öncesi yumuşak bir kapanıştır.',
    },
  };

  return map[phase];
}

export function getToneColors(tone: PosterTone) {
  return toneColorMap[tone];
}

export function buildCelestialLegendItems(input: {
  celestialBodies: CelestialBody[];
  locale?: 'tr' | 'en';
}): CelestialLegendItemModel[] {
  const locale = input.locale === 'en' ? 'en' : 'tr';
  const bodiesById = new Map(input.celestialBodies.map((body) => [body.id, body]));

  return Object.keys(PLANET_SYMBOLS)
    .map((key) => {
      const body = bodiesById.get(key.toLowerCase());
      if (!body) return null;

      return {
        id: body.id,
        symbol: body.symbol,
        title: PLANET_LABELS[locale][key as keyof typeof PLANET_LABELS.tr] ?? key,
        meaning: CELESTIAL_MEANINGS[locale][key as keyof typeof CELESTIAL_MEANINGS.tr] ?? '',
        tone: body.tone,
        priority: body.priority,
      } satisfies CelestialLegendItemModel;
    })
    .filter(Boolean) as CelestialLegendItemModel[];
}

export function buildNightSkyPosterModel(source: NightSkyPosterSource): NightSkyPosterModel {
  const locale = source.locale === 'en' ? 'en' : 'tr';
  const variant = source.variant ?? 'minimal';
  const timeLabel = (source.projection?.birthTime || source.birthTime)?.slice(0, 5) ?? (locale === 'en' ? 'Time unknown' : 'Saat bilinmiyor');
  const moonData = source.projection?.moonPhase
    ? {
        phaseFraction: source.projection.moonPhase.phaseFraction,
        illuminationPercent: Math.round(source.projection.moonPhase.illuminationPercent),
      }
    : (() => {
        const phase = calcMoonPhase(dateTimeToDate(source.birthDate, source.birthTime));
        return {
          phaseFraction: phase.phase,
          illuminationPercent: Math.round(phase.illumination * 100),
        };
      })();

  const lunarPhase = resolvePhaseKey(moonData.phaseFraction);
  const seed = hashSeed(
    `${source.birthDate}|${source.birthTime ?? 'unknown'}|${source.latitude.toFixed(4)}|${source.longitude.toFixed(4)}|${variant}`,
  );
  const celestialBodies = buildCelestialBodies(source);
  const constellationScene = applyVariantToConstellationScene(buildConstellationSegments(source, seed), variant);
  const displayName = resolvePosterDisplayName({
    fullName: source.fullName,
    firstName: source.firstName,
    lastName: source.lastName,
    isGuest: source.isGuest ?? looksGuestish(source.username ?? source.displayName ?? source.fullName),
  });
  const locationLabel = cleanLocationLabel(source.birthLocation);
  const posterTone = VARIANT_TONE_MAP[variant] ?? 'moon';
  const highlightedBodyIds = celestialBodies.filter((body) => body.isHighlighted).map((body) => body.id);

  return {
    titleLabel: source.titleLabel,
    displayName,
    isGuest: source.isGuest ?? looksGuestish(source.username ?? source.displayName ?? source.fullName),
    birthDateTimeLabel: `${source.birthDate} • ${timeLabel}`,
    locationLabel,
    coordinatesLabel: coordinateLabel(source.latitude, source.longitude),
    moonIlluminationPercent: moonData.illuminationPercent,
    lunarPhase,
    lunarPhases: buildLunarPhaseItems(lunarPhase, locale),
    celestialBodies,
    constellationLines: constellationScene.constellationLines,
    highlightedBodyIds: variant === 'minimal' ? highlightedBodyIds.slice(0, 1) : highlightedBodyIds,
    variant,
    posterTone,
    stars: constellationScene.stars,
    shareUrl: source.shareUrl,
  };
}

export function getPosterDiscSize(frameWidth = posterTokens.frame.width) {
  return Math.min(frameWidth * 0.9, 560);
}
