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
            {aspect.aspectSymbol} {aspect.angle.toFixed(1)}° • orb {aspect.orb.toFixed(1)}° • {aspect.harmonious ? 'destekleyici' : 'zorlayıcı'}
          </Text>
        </View>
      ))}
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
      overall: clampScore(result.harmonyScore ?? raw?.overall),
      love: clampScore(raw?.love),
      communication: clampScore(raw?.communication),
      spiritualBond: clampScore(raw?.spiritualBond),
      methodologyNote: raw?.methodologyNote ?? null,
    };
  }, [result.harmonyScore, result.scoreBreakdown]);

  const sections = useMemo(
    () => ((result.analysisSections?.length ? result.analysisSections : buildFallbackSections(result.crossAspects)) ?? []),
    [result.analysisSections, result.crossAspects],
  );

  const topAspects = useMemo(
    () => (result.crossAspects ?? []).slice().sort((a, b) => a.orb - b.orb).slice(0, 6),
    [result.crossAspects],
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

      {scoreBreakdown.methodologyNote ? (
        <View style={[styles.noteBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Text style={[styles.noteText, { color: colors.textMuted }]}>{scoreBreakdown.methodologyNote}</Text>
        </View>
      ) : null}

      {topAspects.length > 0 ? (
        <View style={[styles.topAspectCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Text style={[styles.blockTitle, { color: colors.text }]}>Öne Çıkan Çapraz Açılar</Text>
          <SectionAspectList aspects={topAspects} colors={colors} />
        </View>
      ) : null}

      <View style={styles.sectionsCol}>
        <Text style={[styles.blockTitle, { color: colors.text }]}>Yıldız Analizleri</Text>
        {sections.map((section) => {
          const isOpen = openSectionId === section.id;
          const tone = toneMeta(section.tone, colors);
          const scoreTone = scoreChipColor(section.score, colors);
          return (
            <AccordionSection
              key={section.id}
              id={section.id}
              title={translateAstroTermsForUi(section.title)}
              subtitle={translateAstroTermsForUi(section.subtitle ?? '') || undefined}
              expanded={isOpen}
              onToggle={(id) => setOpenSectionId((prev) => (prev === id ? null : id))}
              icon="git-compare-outline"
              headerRight={
                <View style={styles.headerBadges}>
                  <View style={[styles.inlineBadge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                    <Text style={[styles.inlineBadgeText, { color: tone.fg }]}>{tone.label}</Text>
                  </View>
                  {section.score != null ? (
                    <View style={[styles.inlineBadge, { backgroundColor: scoreTone.bg, borderColor: scoreTone.border }]}>
                      <Text style={[styles.inlineBadgeText, { color: scoreTone.fg }]}>%{clampScore(section.score)}</Text>
                    </View>
                  ) : null}
                </View>
              }
            >
              <View style={styles.sectionBody}>
                <Text style={[styles.sectionSummary, { color: colors.subtext }]}>
                  {translateAstroTermsForUi(section.summary)}
                </Text>
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
    noteBox: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    noteText: {
      fontSize: 11.5,
      lineHeight: 16,
      fontWeight: '600',
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
    sectionsCol: {
      gap: 10,
    },
    headerBadges: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    inlineBadge: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 3,
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
});
