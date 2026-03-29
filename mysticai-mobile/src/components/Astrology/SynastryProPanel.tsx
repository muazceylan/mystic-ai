import React, { memo, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import type { NatalChartResponse, HousePlacement, PlanetPosition as NatalPlanetPosition } from '../../services/astrology.service';
import type {
  CrossAspect,
  RelationshipType,
  SynastryAnalysisSection,
  SynastryDisplayMetric,
  SynastryResponse,
  SynastryScoreBreakdown,
} from '../../services/synastry.service';
import { labelPlanet, translateAstroTermsForUi } from '../../constants/astroLabelMap';
import { AccordionSection } from '../ui';

type MinimalChart = Pick<NatalChartResponse, 'planets' | 'houses' | 'sunSign' | 'moonSign' | 'risingSign'>;

type Props = {
  personAName: string;
  personBName: string;
  personAChart: MinimalChart | null;
  personBChart: MinimalChart | null;
  relationLabel: string;
  relationshipType: RelationshipType;
  result: SynastryResponse;
};

type Point = { x: number; y: number };

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

const ZODIAC_ORDER = [
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

function clampScore(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function signOffset(sign: string | null | undefined) {
  if (!sign) return 0;
  const idx = ZODIAC_ORDER.indexOf(String(sign).toUpperCase());
  return idx >= 0 ? idx * 30 : 0;
}

function toAbsoluteLongitude(planet: NatalPlanetPosition) {
  if (typeof planet.absoluteLongitude === 'number' && Number.isFinite(planet.absoluteLongitude)) {
    return ((planet.absoluteLongitude % 360) + 360) % 360;
  }
  const deg = Number(planet.degree ?? 0);
  const min = Number((planet as any).minutes ?? 0);
  const sec = Number((planet as any).seconds ?? 0);
  return (signOffset(planet.sign) + deg + (min / 60) + (sec / 3600)) % 360;
}

function houseToAbsoluteLongitude(house: HousePlacement) {
  return (signOffset(house.sign) + Number(house.degree ?? 0)) % 360;
}

function polar(center: number, radius: number, angleDeg: number): Point {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: center + Math.cos(rad) * radius,
    y: center + Math.sin(rad) * radius,
  };
}

function scoreChipColor(score: number | null, colors: ReturnType<typeof useTheme>['colors']) {
  if (score == null) return { bg: colors.surfaceAlt, fg: colors.textMuted, border: colors.border };
  if (score >= 75) return { bg: '#E8FFF4', fg: '#0D8B56', border: '#A7F3D0' };
  if (score >= 55) return { bg: '#FFF9E8', fg: '#A16207', border: '#FDE68A' };
  return { bg: '#FFF0F0', fg: '#B42318', border: '#FECACA' };
}

function toneMeta(tone: string | null | undefined, colors: ReturnType<typeof useTheme>['colors']) {
  switch (tone) {
    case 'DESTEKLEYICI':
      return { label: 'Destekleyici', bg: '#E8FFF4', fg: '#0D8B56', border: '#A7F3D0' };
    case 'ZORLAYICI':
      return { label: 'Dönüştürücü', bg: '#FFF0F0', fg: '#B42318', border: '#FECACA' };
    case 'DENGELI':
      return { label: 'Dengeli', bg: '#FFF9E8', fg: '#A16207', border: '#FDE68A' };
    default:
      return { label: 'Nötr', bg: colors.surfaceAlt, fg: colors.textMuted, border: colors.border };
  }
}

function orbStrengthLabel(orb: number) {
  if (!Number.isFinite(orb)) return 'Belirsiz orb';
  if (orb <= 1.2) return 'Çok güçlü (yakın orb)';
  if (orb <= 3) return 'Güçlü etki';
  if (orb <= 5) return 'Orta güçte etki';
  return 'Daha geniş ama hissedilir etki';
}

function orbStrengthLabelCompact(orb: number) {
  if (!Number.isFinite(orb)) return 'Etki belirsiz';
  if (orb <= 1.2) return 'Çok güçlü';
  if (orb <= 3) return 'Güçlü';
  if (orb <= 5) return 'Orta';
  return 'Daha yumuşak';
}

type PlanetBehaviorProfile = {
  tendency: string;
  pressure: string;
  support: string;
};

const PLANET_BEHAVIOR_MAP: Record<string, PlanetBehaviorProfile> = {
  Sun: {
    tendency: 'kendini net ifade edip yön vermek ister',
    pressure: 'fazla görünürlük baskısı hissettiğinde sertleşebilir',
    support: 'takdir ve net rol paylaşımı',
  },
  Moon: {
    tendency: 'duygusal güveni önceleyip hassas sinyalleri hızlı alır',
    pressure: 'belirsizlikte içine çekilebilir',
    support: 'yumuşak ton ve duyguyu isimlendirme',
  },
  Mercury: {
    tendency: 'konuşarak netleşmek ister',
    pressure: 'anlaşılmadığını düşündüğünde tekrar tekrar açıklayabilir',
    support: 'kısa ve net soru-cevap akışı',
  },
  Venus: {
    tendency: 'yakınlık ve nezaket diliyle bağ kurar',
    pressure: 'mesafe artınca değersiz hissedebilir',
    support: 'küçük ama düzenli sıcak temas',
  },
  Mars: {
    tendency: 'hızlı aksiyon ve netlik arar',
    pressure: 'beklemede kaldığında sabırsızlaşabilir',
    support: 'zaman kutusu ve net adım planı',
  },
  Jupiter: {
    tendency: 'büyük resme bakar ve umut üretir',
    pressure: 'detay yükünde dağılabilir',
    support: 'öncelik sıralaması ve kısa yol haritası',
  },
  Saturn: {
    tendency: 'düzen, sınır ve sorumluluk üzerinden ilerler',
    pressure: 'ani değişimde kapanabilir',
    support: 'öngörülebilir tempo ve tutarlılık',
  },
  Pluto: {
    tendency: 'derinlik ve sahicilik arar',
    pressure: 'kontrol kaybında sertleşebilir',
    support: 'şeffaflık ve güç savaşından kaçınma',
  },
};

function behaviorLineForPlanet(
  planet: string,
  personName: string,
  harmonious: boolean,
) {
  const profile = PLANET_BEHAVIOR_MAP[planet] ?? {
    tendency: 'ilişkide dengeyi arar',
    pressure: 'baskı altında savunmaya geçebilir',
    support: 'net iletişim ve kısa check-in',
  };

  if (harmonious) {
    return `${personName} genelde ${profile.tendency}. En iyi ${profile.support} ile açılır.`;
  }

  return `${personName} genelde ${profile.tendency}. Ritim zorlanınca ${profile.pressure}; bunu dengelemek için ${profile.support} iyi çalışır.`;
}

function aspectLifeTheme(aspect: CrossAspect) {
  const planets = [aspect.userPlanet, aspect.partnerPlanet];
  if (planets.includes('Venus') || planets.includes('Mars')) {
    return {
      tag: 'Çekim ve yakınlık',
      compare: 'Aranızdaki çekim dili, tempo ve yaklaşma biçimini belirliyor.',
      guidance: 'Çekim yüksek olduğunda sınır ve tempo konuşması ilişkiyi korur.',
    };
  }
  if (planets.includes('Mercury') || planets.includes('Jupiter')) {
    return {
      tag: 'Zihinsel akış',
      compare: 'Konuşma tarzınız ve olaylara verdiğiniz anlam bu bağın yönünü etkiliyor.',
      guidance: 'Önce niyetinizi, sonra çözüm önerinizi söylemek yanlış anlamayı azaltır.',
    };
  }
  if (planets.includes('Moon') || planets.includes('Saturn') || planets.includes('Pluto')) {
    return {
      tag: 'Duygusal güven ve derinlik',
      compare: 'Bir tarafın hassasiyeti diğer tarafın sınır ve yoğunluk ihtiyacıyla temas ediyor.',
      guidance: 'Savunmaya geçmeden ihtiyaç cümlesi kurmak ilişkiyi rahatlatır.',
    };
  }
  if (planets.includes('Sun')) {
    return {
      tag: 'Kimlik ve yön',
      compare: 'Birlikteyken kendinizi ifade etme ve ilişkiye yön verme şekliniz öne çıkıyor.',
      guidance: 'Rolleri netleştirmek rekabet yerine iş birliğini büyütür.',
    };
  }
  return {
    tag: 'Genel dinamik',
    compare: 'Bu etkileşim ilişkinin tonunu ince ayarda etkileyen bir arka plan akışı oluşturuyor.',
    guidance: 'Bu başlıktaki küçük alışkanlık değişimleri bile ilişki kalitesini yükseltebilir.',
  };
}

function comparativeAspectNarrative(aspect: CrossAspect, personAName: string, personBName: string) {
  const aPlanet = labelPlanet(aspect.userPlanet);
  const bPlanet = labelPlanet(aspect.partnerPlanet);
  const aspectLabel = translateAstroTermsForUi(aspect.aspectTurkish);
  const theme = aspectLifeTheme(aspect);
  const intersection = aspect.harmonious
    ? 'Kesişimde birbirinizin niyetini daha hızlı okuyup ortak tempoyu kolay buluyorsunuz.'
    : 'Kesişimde tempo farkı oluşuyor: biri hızlanırken diğeri güven için yavaşlamak isteyebiliyor.';

  return {
    title: theme.tag,
    pairLine: aspect.harmonious
      ? `${personAName} ve ${personBName} bu konuda birbirini destekliyor.`
      : `${personAName} ve ${personBName} bu konuda farklı hızlarda ilerliyor.`,
    leftCompare: behaviorLineForPlanet(aspect.userPlanet, personAName, aspect.harmonious),
    rightCompare: behaviorLineForPlanet(aspect.partnerPlanet, personBName, aspect.harmonious),
    tag: theme.tag,
    intersection,
    compare: theme.compare,
    guidance: aspect.harmonious
      ? 'Bu hafta bir kez “ne iyi çalıştı?” konuşması yapıp aynı davranışı tekrarlayın.'
      : 'Gerilim yükseldiğinde 10 dakika mola verin, sonra tek konuya dönüp kısa ve net konuşun.',
    technicalLine: `${aPlanet} ${aspectLabel} ${bPlanet}`,
  };
}

function pickDominantPlanets(aspects: CrossAspect[], side: 'user' | 'partner') {
  const counts = new Map<string, number>();
  for (const aspect of aspects) {
    const key = side === 'user' ? aspect.userPlanet : aspect.partnerPlanet;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([planet]) => labelPlanet(planet));
}

function buildComparativeSectionPanel(
  section: SynastryAnalysisSection,
  personAName: string,
  personBName: string,
) {
  const aspects = section.aspects ?? [];
  const userDominants = pickDominantPlanets(aspects, 'user');
  const partnerDominants = pickDominantPlanets(aspects, 'partner');
  const harmonious = aspects.filter((a) => a.harmonious).length;
  const challenging = Math.max(0, aspects.length - harmonious);

  const aLine = userDominants.length
    ? `${personAName} tarafında özellikle ${userDominants.join(' ve ')} temaları bu başlıkta daha görünür çalışıyor.`
    : `${personAName} tarafında bu başlıkta belirgin tek bir gezegen baskınlığı görünmüyor; etki daha dengeli dağılıyor.`;

  const bLine = partnerDominants.length
    ? `${personBName} tarafında özellikle ${partnerDominants.join(' ve ')} temaları ilişkiyi bu başlıkta şekillendiriyor.`
    : `${personBName} tarafında bu başlıkta etki birden fazla gezegene dağıldığı için ritim duruma göre değişiyor.`;

  const jointLine =
    harmonious > challenging
      ? 'Aranızdaki ortak dinamikte destekleyici açıların payı daha fazla. Birlikte hareket etmek bu başlığı hızla güçlendirir.'
      : harmonious < challenging
        ? 'Bu başlıkta tetikleyici açılar daha yoğun. Niyet, tempo ve sınır konuşmaları ilişki kalitesini belirler.'
        : 'Bu başlık dengeli çalışıyor; küçük iletişim tercihleri sonucu hızlıca olumluya çevirebilir.';

  return { aLine, bLine, jointLine };
}

function buildFallbackSections(aspects: CrossAspect[] | undefined | null): SynastryAnalysisSection[] {
  if (!aspects?.length) return [];
  const groups: Array<{
    id: string;
    title: string;
    subtitle: string;
    planets: string[];
  }> = [
    {
      id: 'kader_bagi',
      title: 'Kader Bağı (Satürn / Karma)',
      subtitle: 'Sınırlar, sabır ve ilişki dersi',
      planets: ['Saturn', 'NorthNode', 'Pluto', 'Moon'],
    },
    {
      id: 'tutku_enerji',
      title: 'Tutku ve Enerji (Mars / Plüton)',
      subtitle: 'Çekim, tempo ve güç dengesi',
      planets: ['Mars', 'Pluto', 'Venus', 'Sun'],
    },
    {
      id: 'zihinsel_uyum',
      title: 'Zihinsel Uyum (Merkür)',
      subtitle: 'Konuşma ritmi ve ortak perspektif',
      planets: ['Mercury', 'Jupiter', 'Moon', 'Sun'],
    },
  ];

  return groups.map((group) => {
    const groupAspects = aspects
      .filter((a) => group.planets.includes(a.userPlanet) || group.planets.includes(a.partnerPlanet))
      .sort((a, b) => a.orb - b.orb)
      .slice(0, 6);
    const harmoniousCount = groupAspects.filter((a) => a.harmonious).length;
    const challengingCount = Math.max(0, groupAspects.length - harmoniousCount);
    const score = clampScore(
      groupAspects.length
        ? 50 + (harmoniousCount - challengingCount) * 10 + Math.round(groupAspects.reduce((sum, a) => sum + Math.max(0, 5 - a.orb), 0))
        : null,
    );
    const tone =
      groupAspects.length === 0
        ? 'NÖTR'
        : harmoniousCount > challengingCount
          ? 'DESTEKLEYICI'
          : harmoniousCount === challengingCount
            ? 'DENGELI'
            : 'ZORLAYICI';

    const summary = groupAspects.length
      ? `${groupAspects.length} ana açı öne çıkıyor. ${harmoniousCount} destekleyici, ${challengingCount} zorlayıcı etki bu başlıkta birlikte çalışıyor.`
      : 'Bu başlıkta belirgin açı yoğunluğu görünmüyor; etki genel uyum dinamiğinden geliyor.';

    return {
      id: group.id,
      title: group.title,
      subtitle: group.subtitle,
      score,
      summary,
      tone,
      aspects: groupAspects,
    };
  });
}

function ScoreTile({
  label,
  value,
  colors,
  subLabel,
}: {
  label: string;
  value: number | null;
  colors: ReturnType<typeof useTheme>['colors'];
  subLabel?: string;
}) {
  const chip = scoreChipColor(value, colors);
  return (
    <View style={[styles.scoreTile, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <Text style={[styles.scoreTileLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={[styles.scorePill, { backgroundColor: chip.bg, borderColor: chip.border }]}>
        <Text style={[styles.scorePillText, { color: chip.fg }]}>
          {value == null ? '—' : `%${value}`}
        </Text>
      </View>
      {subLabel ? <Text style={[styles.scoreTileSub, { color: colors.subtext }]}>{subLabel}</Text> : null}
    </View>
  );
}

function OfficialMetricRow({
  metrics,
  colors,
}: {
  metrics: SynastryDisplayMetric[];
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  if (!metrics.length) return null;
  return (
    <View style={styles.officialMetricWrap}>
      {metrics.slice(0, 4).map((metric) => (
        <View
          key={`official-metric-${metric.id}`}
          style={[styles.officialMetricCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
        >
          <Text style={[styles.officialMetricLabel, { color: colors.subtext }]} numberOfLines={1}>
            {metric.label}
          </Text>
          <Text style={[styles.officialMetricValue, { color: colors.text }]}>
            %{clampScore(metric.score)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function DualChartSvg({
  chartA,
  chartB,
  colors,
}: {
  chartA: MinimalChart | null;
  chartB: MinimalChart | null;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const size = 300;
  const center = size / 2;
  const outerR = 136;
  const midOuterR = 116;
  const midInnerR = 92;
  const innerR = 46;

  const houseAngles = useMemo(() => {
    const houses = chartA?.houses ?? [];
    if (houses.length === 12) {
      return houses
        .map((h) => houseToAbsoluteLongitude(h))
        .sort((a, b) => a - b);
    }
    return Array.from({ length: 12 }, (_, i) => i * 30);
  }, [chartA?.houses]);

  const innerPlanets = useMemo(() => (chartA?.planets ?? []).slice(0, 12), [chartA?.planets]);
  const outerPlanets = useMemo(() => (chartB?.planets ?? []).slice(0, 12), [chartB?.planets]);

  return (
    <View style={[styles.dualChartCanvasWrap, { backgroundColor: '#05070D', borderColor: colors.border }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={center} cy={center} r={outerR} fill="#05070D" stroke="#3A3E55" strokeWidth={1.5} />
        <Circle cx={center} cy={center} r={midOuterR} fill="none" stroke="#7C5C1A" strokeOpacity={0.65} strokeWidth={1.2} />
        <Circle cx={center} cy={center} r={midInnerR} fill="none" stroke="#394355" strokeOpacity={0.9} strokeWidth={1.2} />
        <Circle cx={center} cy={center} r={innerR} fill="none" stroke="#2A3240" strokeWidth={1.0} />

        {houseAngles.map((angle, idx) => {
          const p1 = polar(center, innerR, angle);
          const p2 = polar(center, outerR, angle);
          return (
            <Line
              key={`house-line-${idx}`}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={idx % 3 === 0 ? '#7C5C1A' : '#30384A'}
              strokeWidth={idx % 3 === 0 ? 1.2 : 0.9}
              strokeOpacity={0.95}
            />
          );
        })}
      </Svg>

      {innerPlanets.map((planet, idx) => {
        const angle = toAbsoluteLongitude(planet);
        const p = polar(center, 78 + (idx % 2) * 8, angle);
        return (
          <View key={`inner-${planet.planet}-${idx}`} style={[styles.planetDotWrap, { left: p.x - 12, top: p.y - 12 }]}>
            <View style={[styles.planetDot, styles.planetDotInner]}>
              <Text style={styles.planetGlyph}>{PLANET_GLYPHS[planet.planet] ?? '•'}</Text>
            </View>
          </View>
        );
      })}

      {outerPlanets.map((planet, idx) => {
        const angle = toAbsoluteLongitude(planet);
        const p = polar(center, 126 - (idx % 2) * 8, angle);
        return (
          <View key={`outer-${planet.planet}-${idx}`} style={[styles.planetDotWrap, { left: p.x - 13, top: p.y - 13 }]}>
            <View style={[styles.planetDot, styles.planetDotOuter]}>
              <Text style={[styles.planetGlyph, styles.planetGlyphOuter]}>{PLANET_GLYPHS[planet.planet] ?? '•'}</Text>
            </View>
          </View>
        );
      })}

      <View style={styles.dualChartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: '#EDE7D1', borderColor: '#C7A758' }]} />
          <Text style={styles.legendText}>İç Halka: Kişi 1 + Evler</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: '#D8E6FF', borderColor: '#7AA2FF' }]} />
          <Text style={styles.legendText}>Dış Halka: Kişi 2 Gezegenleri</Text>
        </View>
      </View>
    </View>
  );
}

function SectionAspectList({
  aspects,
  colors,
}: {
  aspects: CrossAspect[];
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  if (!aspects.length) {
    return (
      <View style={[styles.emptyAspectBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <Text style={[styles.emptyAspectText, { color: colors.textMuted }]}>
          Bu başlıkta öne çıkan güçlü bir açı bulunmuyor.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.aspectListCol}>
      {aspects.map((aspect, idx) => (
        <View
          key={`${aspect.userPlanet}-${aspect.aspectType}-${aspect.partnerPlanet}-${idx}`}
          style={[
            styles.aspectRow,
            {
              backgroundColor: aspect.harmonious ? '#EEFFF6' : '#FFF2F2',
              borderColor: aspect.harmonious ? '#BBF7D0' : '#FECACA',
            },
          ]}
        >
          <Text style={[styles.aspectRowTitle, { color: colors.text }]}>
            {labelPlanet(aspect.userPlanet)} {translateAstroTermsForUi(aspect.aspectTurkish)} {labelPlanet(aspect.partnerPlanet)}
          </Text>
          <Text style={[styles.aspectRowMeta, { color: colors.textMuted }]}>
            {aspect.aspectSymbol} {orbStrengthLabel(aspect.orb)} • orb {aspect.orb.toFixed(1)}° • {aspect.harmonious ? 'destekleyen akış' : 'tetikleyici alan'}
          </Text>
        </View>
      ))}
    </View>
  );
}

function TopAspectInsightCards({
  aspects,
  colors,
  personAName,
  personBName,
}: {
  aspects: CrossAspect[];
  colors: ReturnType<typeof useTheme>['colors'];
  personAName: string;
  personBName: string;
}) {
  const [openAspectId, setOpenAspectId] = useState<string | null>(aspects[0] ? 'aspect-0' : null);

  return (
    <View style={styles.spotlightCol}>
      {aspects.map((aspect, idx) => {
        const meta = comparativeAspectNarrative(aspect, personAName, personBName);
        const id = `aspect-${idx}`;
        const isOpen = openAspectId === id;
        return (
          <AccordionSection
            key={`${aspect.userPlanet}-${aspect.aspectType}-${aspect.partnerPlanet}-${idx}`}
            id={id}
            title={meta.title}
            subtitle={meta.pairLine}
            expanded={isOpen}
            onToggle={(sectionId) => setOpenAspectId((prev) => (prev === sectionId ? null : sectionId))}
            icon={aspect.harmonious ? 'sparkles-outline' : 'flash-outline'}
            headerMeta={
              <View style={styles.spotlightHeaderBadges}>
                <View
                  style={[
                    styles.spotlightTonePill,
                    {
                      backgroundColor: aspect.harmonious ? '#E8FFF4' : '#FFF2F2',
                      borderColor: aspect.harmonious ? '#A7F3D0' : '#FECACA',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.spotlightTonePillText,
                      { color: aspect.harmonious ? '#0D8B56' : '#B42318' },
                    ]}
                    numberOfLines={1}
                  >
                    {aspect.harmonious ? 'Destek' : 'Tetik'}
                  </Text>
                </View>
                <View style={[styles.spotlightTonePill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Text style={[styles.spotlightTonePillText, { color: colors.textMuted }]} numberOfLines={1}>
                    {orbStrengthLabelCompact(aspect.orb)}
                  </Text>
                </View>
                <View style={[styles.spotlightTonePill, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                  <Text style={[styles.spotlightTonePillText, { color: '#475569' }]} numberOfLines={1}>
                    {meta.tag}
                  </Text>
                </View>
              </View>
            }
          >
            <View style={styles.spotlightBodyCol}>
              <View style={styles.spotlightMetaRow}>
                <Text style={[styles.spotlightMetaChip, { color: colors.text }]}>{meta.tag}</Text>
                <Text style={[styles.spotlightMetaChip, { color: colors.textMuted }]}>
                  Etki gücü: {orbStrengthLabelCompact(aspect.orb)}
                </Text>
              </View>

              <View style={styles.spotlightCompareGrid}>
                <View style={[styles.spotlightPersonCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Text style={[styles.spotlightPersonName, { color: colors.text }]}>{personAName}</Text>
                  <Text style={[styles.spotlightPersonText, { color: colors.subtext }]}>{meta.leftCompare}</Text>
                </View>
                <View style={[styles.spotlightPersonCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Text style={[styles.spotlightPersonName, { color: colors.text }]}>{personBName}</Text>
                  <Text style={[styles.spotlightPersonText, { color: colors.subtext }]}>{meta.rightCompare}</Text>
                </View>
              </View>

              <View style={[styles.spotlightIntersectionBox, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                <Text style={[styles.spotlightIntersectionTitle, { color: colors.text }]}>Kesişimde ne oluyor?</Text>
                <Text style={[styles.spotlightIntersectionText, { color: colors.subtext }]}>{meta.intersection}</Text>
              </View>

              <View style={[styles.spotlightGuideBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Text style={[styles.spotlightGuideLabel, { color: colors.textMuted }]}>Bu hafta deneyin</Text>
                <Text style={[styles.spotlightGuideText, { color: colors.subtext }]}>{meta.guidance}</Text>
              </View>
              <Text style={[styles.spotlightTechNote, { color: colors.textMuted }]}>
                Teknik arka plan: {meta.technicalLine}
              </Text>
            </View>
          </AccordionSection>
        );
      })}
    </View>
  );
}

function SynastryProPanel({
  personAName,
  personBName,
  personAChart,
  personBChart,
  relationLabel,
  relationshipType,
  result,
}: Props) {
  const { colors } = useTheme();
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);

  const scoreBreakdown: SynastryScoreBreakdown = useMemo(() => {
    const raw = result.scoreBreakdown ?? null;
    return {
      overall: clampScore(result.baseHarmonyScore ?? raw?.overall ?? result.harmonyScore),
      love: clampScore(raw?.love),
      communication: clampScore(raw?.communication),
      spiritualBond: clampScore(raw?.spiritualBond),
      methodologyNote: raw?.methodologyNote ?? result.scoringVersion ?? null,
    };
  }, [result.baseHarmonyScore, result.harmonyScore, result.scoreBreakdown, result.scoringVersion]);

  const sections = useMemo(
    () => ((result.analysisSections?.length ? result.analysisSections : buildFallbackSections(result.crossAspects)) ?? []),
    [result.analysisSections, result.crossAspects],
  );

  const topAspects = useMemo(
    () => (result.crossAspects ?? []).slice().sort((a, b) => a.orb - b.orb).slice(0, 6),
    [result.crossAspects],
  );
  const officialMetrics = useMemo(
    () => (result.displayMetrics ?? []).filter((m) => typeof m?.score === 'number'),
    [result.displayMetrics],
  );

  const statusBadge =
    result.status === 'COMPLETED'
      ? { label: 'AI Tamamlandı', bg: '#E8FFF4', fg: '#0D8B56', border: '#A7F3D0' }
      : result.status === 'FAILED'
        ? { label: 'AI Başarısız', bg: '#FFF0F0', fg: '#B42318', border: '#FECACA' }
        : { label: 'AI Yazıyor', bg: '#FFF9E8', fg: '#A16207', border: '#FDE68A' };

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: colors.textMuted }]}>Profesyonel Sinastri Analizi</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            {personAName} ↔ {personBName}
          </Text>
          <Text style={[styles.subTitle, { color: colors.subtext }]}>
            {relationLabel} • {relationshipType === 'LOVE' ? 'Partner Uyumu' : 'İlişki Dinamiği'}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusBadge.bg, borderColor: statusBadge.border }]}>
          <Ionicons
            name={result.status === 'COMPLETED' ? 'sparkles' : result.status === 'FAILED' ? 'alert-circle-outline' : 'time-outline'}
            size={13}
            color={statusBadge.fg}
          />
          <Text style={[styles.statusPillText, { color: statusBadge.fg }]}>{statusBadge.label}</Text>
        </View>
      </View>

      <DualChartSvg chartA={personAChart} chartB={personBChart} colors={colors} />

      <View style={styles.scoreGrid}>
        <ScoreTile label="Genel Uyum" value={scoreBreakdown.overall} colors={colors} subLabel="Toplam sinastri" />
        <ScoreTile label="Aşk Uyumu" value={scoreBreakdown.love} colors={colors} subLabel="Venüs / Mars" />
        <ScoreTile label="İletişim" value={scoreBreakdown.communication} colors={colors} subLabel="Merkür / Jüpiter" />
        <ScoreTile label="Ruhsal Bağ" value={scoreBreakdown.spiritualBond} colors={colors} subLabel="Ay / Satürn / Düğüm" />
      </View>

      <OfficialMetricRow metrics={officialMetrics} colors={colors} />

      {topAspects.length > 0 ? (
        <View style={[styles.topAspectCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Text style={[styles.blockTitle, { color: colors.text }]}>Bu Dinamikler İlişkiye Nasıl Yansıyor?</Text>
          <Text style={[styles.blockSubTitle, { color: colors.subtext }]}>
            Her kartta doğrudan karşılaştırma var: {personAName} nasıl tepki verir, {personBName} nasıl tepki verir, kesişimde ne olur.
          </Text>
          <TopAspectInsightCards aspects={topAspects} colors={colors} personAName={personAName} personBName={personBName} />
        </View>
      ) : null}

      <View style={styles.sectionsCol}>
        <Text style={[styles.blockTitle, { color: colors.text }]}>Karşılaştırmalı Yıldız Analizleri</Text>
        {sections.map((section) => {
          const isOpen = openSectionId === section.id;
          const tone = toneMeta(section.tone, colors);
          const scoreTone = scoreChipColor(section.score, colors);
          const comparisonPanel = buildComparativeSectionPanel(section, personAName, personBName);
          return (
            <AccordionSection
              key={section.id}
              id={section.id}
              title={translateAstroTermsForUi(section.title)}
              subtitle={translateAstroTermsForUi(section.subtitle ?? '') || undefined}
              expanded={isOpen}
              onToggle={(id) => setOpenSectionId((prev) => (prev === id ? null : id))}
              icon="git-compare-outline"
              headerMeta={
                <View style={styles.headerBadges}>
                  <View style={[styles.inlineBadge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                    <Text style={[styles.inlineBadgeText, { color: tone.fg }]} numberOfLines={1}>
                      {tone.label}
                    </Text>
                  </View>
                  {section.score != null ? (
                    <View style={[styles.inlineBadge, { backgroundColor: scoreTone.bg, borderColor: scoreTone.border }]}>
                      <Text style={[styles.inlineBadgeText, { color: scoreTone.fg }]} numberOfLines={1}>
                        %{clampScore(section.score)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              }
            >
              <View style={styles.sectionBody}>
                <Text style={[styles.sectionSummary, { color: colors.subtext }]}>
                  {translateAstroTermsForUi(section.summary)}
                </Text>
                <View style={[styles.comparePanel, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Text style={[styles.comparePanelTitle, { color: colors.text }]}>İki Taraf Nasıl Çalışıyor?</Text>
                  <View style={styles.compareBulletCol}>
                    <View style={styles.compareBulletRow}>
                      <View style={[styles.compareBulletDot, { backgroundColor: '#7C3AED' }]} />
                      <Text style={[styles.compareBulletText, { color: colors.subtext }]}>{comparisonPanel.aLine}</Text>
                    </View>
                    <View style={styles.compareBulletRow}>
                      <View style={[styles.compareBulletDot, { backgroundColor: '#2563EB' }]} />
                      <Text style={[styles.compareBulletText, { color: colors.subtext }]}>{comparisonPanel.bLine}</Text>
                    </View>
                    <View style={styles.compareBulletRow}>
                      <View style={[styles.compareBulletDot, { backgroundColor: '#D97706' }]} />
                      <Text style={[styles.compareBulletText, { color: colors.subtext }]}>{comparisonPanel.jointLine}</Text>
                    </View>
                  </View>
                </View>
                <SectionAspectList aspects={section.aspects ?? []} colors={colors} />
              </View>
            </AccordionSection>
          );
        })}
      </View>
    </View>
  );
}

export default memo(SynastryProPanel);

const styles = StyleSheet.create({
    container: {
      borderRadius: 20,
      borderWidth: 1,
      padding: 14,
      gap: 14,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 1,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    title: {
      marginTop: 2,
      fontSize: 16,
      fontWeight: '800',
    },
    subTitle: {
      marginTop: 2,
      fontSize: 12,
      lineHeight: 17,
    },
    statusPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 2,
    },
    statusPillText: {
      fontSize: 11,
      fontWeight: '800',
    },
    dualChartCanvasWrap: {
      borderRadius: 18,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      overflow: 'hidden',
    },
    planetDotWrap: {
      position: 'absolute',
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    planetDot: {
      width: 24,
      height: 24,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    planetDotInner: {
      backgroundColor: '#F5ECD6',
      borderColor: '#C8A85A',
    },
    planetDotOuter: {
      backgroundColor: '#E6F0FF',
      borderColor: '#7AA2FF',
      width: 26,
      height: 26,
    },
    planetGlyph: {
      color: '#191C26',
      fontSize: 12.5,
      fontWeight: '700',
    },
    planetGlyphOuter: {
      fontSize: 13,
    },
    dualChartLegend: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: 10,
      gap: 6,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    legendSwatch: {
      width: 10,
      height: 10,
      borderRadius: 999,
      borderWidth: 1,
    },
    legendText: {
      color: '#E2E7F2',
      fontSize: 11,
      fontWeight: '600',
    },
    scoreGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    scoreTile: {
      width: '48%',
      borderRadius: 14,
      borderWidth: 1,
      padding: 10,
      gap: 6,
    },
    scoreTileLabel: {
      fontSize: 11.5,
      fontWeight: '700',
    },
    scorePill: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    scorePillText: {
      fontSize: 13,
      fontWeight: '800',
    },
    scoreTileSub: {
      fontSize: 10.5,
      lineHeight: 14,
    },
    officialMetricWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    officialMetricCard: {
      width: '48%',
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 2,
    },
    officialMetricLabel: {
      fontSize: 11,
      fontWeight: '700',
    },
    officialMetricValue: {
      fontSize: 13.5,
      fontWeight: '800',
    },
    topAspectCard: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 10,
      gap: 10,
    },
    blockTitle: {
      fontSize: 13.5,
      fontWeight: '800',
    },
    blockSubTitle: {
      marginTop: -4,
      fontSize: 11.5,
      lineHeight: 16,
      fontWeight: '500',
    },
    sectionsCol: {
      gap: 10,
    },
    headerBadges: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
    },
    inlineBadge: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 4,
      maxWidth: '100%',
    },
    inlineBadgeText: {
      fontSize: 10.5,
      fontWeight: '800',
    },
    sectionBody: {
      gap: 10,
    },
    sectionSummary: {
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: '500',
    },
    comparePanel: {
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 10,
      gap: 8,
    },
    comparePanelTitle: {
      fontSize: 11.5,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    compareBulletCol: {
      gap: 7,
    },
    compareBulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    compareBulletDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      marginTop: 4,
      flexShrink: 0,
    },
    compareBulletText: {
      flex: 1,
      fontSize: 11.8,
      lineHeight: 17,
      fontWeight: '500',
    },
    aspectListCol: {
      gap: 8,
    },
    aspectRow: {
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 3,
    },
    aspectRowTitle: {
      fontSize: 12.5,
      fontWeight: '700',
    },
    aspectRowMeta: {
      fontSize: 11,
      lineHeight: 15,
      fontWeight: '600',
    },
    emptyAspectBox: {
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    emptyAspectText: {
      fontSize: 11.5,
      lineHeight: 16,
      fontWeight: '600',
    },
    spotlightCol: {
      gap: 10,
    },
    spotlightHeaderBadges: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
    },
    spotlightTonePill: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 7,
      paddingVertical: 4,
      maxWidth: '100%',
    },
    spotlightTonePillText: {
      fontSize: 10,
      fontWeight: '800',
    },
    spotlightMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
    },
    spotlightBodyCol: {
      gap: 8,
    },
    spotlightCompareGrid: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 8,
    },
    spotlightPersonCard: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 8,
      gap: 4,
    },
    spotlightPersonName: {
      fontSize: 11.2,
      fontWeight: '800',
    },
    spotlightPersonText: {
      fontSize: 11.2,
      lineHeight: 16,
      fontWeight: '500',
    },
    spotlightMetaChip: {
      fontSize: 10.6,
      fontWeight: '700',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: 'rgba(148,163,184,0.08)',
      overflow: 'hidden',
    },
    spotlightBodyText: {
      fontSize: 11.8,
      lineHeight: 17,
      fontWeight: '500',
    },
    spotlightBodyStrong: {
      fontSize: 11.8,
      lineHeight: 17,
      fontWeight: '700',
    },
    spotlightIntersectionBox: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 9,
      paddingVertical: 8,
      gap: 4,
    },
    spotlightIntersectionTitle: {
      fontSize: 10.8,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.35,
    },
    spotlightIntersectionText: {
      fontSize: 11.4,
      lineHeight: 16,
      fontWeight: '500',
    },
    spotlightGuideBox: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 9,
      paddingVertical: 8,
      gap: 3,
    },
    spotlightGuideLabel: {
      fontSize: 10.3,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    spotlightGuideText: {
      fontSize: 11.2,
      lineHeight: 16,
      fontWeight: '500',
    },
    spotlightTechNote: {
      fontSize: 10.4,
      lineHeight: 15,
      fontWeight: '500',
      marginTop: 2,
    },
});
