import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AlertTriangle,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Check,
  CheckCheck,
  Flame,
  Heart,
  MessageCircle,
  MoreHorizontal,
  RefreshCcw,
  Share2,
  Shield,
  Sparkles,
} from 'lucide-react-native';

import { AccessibleText } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { ACCESSIBILITY } from '../../constants/tokens';
import {
  MATCH_GROUP_TYPOGRAPHY,
  getMatchBadgePalette,
} from '../../constants/matchDesignTokens';
import { useMatchTraits } from '../../hooks/useMatchTraits';
import { buildMockMatchDTO, toTraitAxes } from '../../services/match.api';
import { useMatchCardStore } from '../../store/useMatchCardStore';
import type {
  CrossAspect,
  RelationshipType,
  SynastryAnalysisSection,
  SynastryDisplayMetric,
  SynastryScoreBreakdown,
} from '../../services/synastry.service';
import type { AspectDTO, CategoryScoreDTO, GrowthAreaDTO, MatchDTO, MatchResultKind } from '../../types/match';
import GrowthCard from '../../components/match/GrowthCard';
import PersonAvatar from '../../components/match/PersonAvatar';
import { buildGrowthNarrative } from './matchNarrative';
import {
  localizeAspectName,
  localizeAspectType,
  localizeAstroText,
  localizePlanetName,
  parseLocalizedSignLabel,
} from '../../utils/matchAstroLabels';

export interface MatchOverviewScreenProps {
  matchId: number;
  compatibilityScore: number;
  relationLabel: string;
  relationshipType: RelationshipType;
  scoreBreakdown?: SynastryScoreBreakdown | null;
  displayMetrics?: SynastryDisplayMetric[] | null;
  personAName: string;
  personBName: string;
  personAAvatarUri?: string | null;
  personBAvatarUri?: string | null;
  personASignLabel: string;
  personBSignLabel: string;
  aspectsCount: number;
  fallbackInsight?: string | null;
  onCreateCard?: () => void;
  createCardDisabled?: boolean;
  crossAspects?: CrossAspect[] | null;
  analysisSections?: SynastryAnalysisSection[] | null;
  strengths?: string[];
  challenges?: string[];
  keyWarning?: string | null;
}

type MainTab = 'UYUMUNUZ' | 'GELISIM' | 'DETAYLI';
type MatrixFilter = 'HEPSI' | MatchResultKind;
type DetailAspectFilter = 'TUMU' | 'ASK' | 'ILETISIM' | 'GUVEN' | 'TUTKU';
type DetailAspectTheme = Exclude<DetailAspectFilter, 'TUMU'>;

const MAIN_TABS: Array<{ id: MainTab; label: string }> = [
  { id: 'UYUMUNUZ', label: 'Uyumunuz' },
  { id: 'GELISIM', label: 'Gelişim Planı' },
  { id: 'DETAYLI', label: 'Detaylı Analiz' },
];

const MATRIX_FILTERS: Array<{ id: MatrixFilter; label: string }> = [
  { id: 'HEPSI', label: 'Hepsi' },
  { id: 'UYUMLU', label: 'Uyumlu' },
  { id: 'GELISIM_ALANI', label: 'Gelişim' },
  { id: 'DIKKAT', label: 'Dikkat' },
];

const DETAIL_ASPECT_FILTERS: Array<{ id: DetailAspectFilter; label: string }> = [
  { id: 'TUMU', label: 'Tümü' },
  { id: 'ASK', label: 'Aşk' },
  { id: 'ILETISIM', label: 'İletişim' },
  { id: 'GUVEN', label: 'Güven' },
  { id: 'TUTKU', label: 'Tutku' },
];

const MAIN_TAB_SANITIZE_RULES: Array<{ term: string; replacement: string }> = [
  { term: 'açı', replacement: 'dinamik' },
  { term: 'orb', replacement: 'yakınlık payı' },
  { term: 'ev', replacement: 'alan' },
  { term: 'kavuşum', replacement: 'yakın temas' },
  { term: 'kare', replacement: 'ritim farkı' },
  { term: 'üçgen', replacement: 'doğal akış' },
  { term: 'opozisyon', replacement: 'karşıt ritim' },
];

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function sanitizeMainCopy(value: string) {
  const WORD_CHARS = 'A-Za-z0-9ÇĞİÖŞÜçğıöşü';
  const escapeRegex = (input: string) => input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const replaceStandaloneWord = (source: string, term: string, replacement: string) => {
    const regex = new RegExp(`(^|[^${WORD_CHARS}])(${escapeRegex(term)})(?=[^${WORD_CHARS}]|$)`, 'gi');
    return source.replace(regex, (_, leading: string) => `${leading}${replacement}`);
  };

  let output = value;
  for (const rule of MAIN_TAB_SANITIZE_RULES) {
    output = replaceStandaloneWord(output, rule.term, rule.replacement);
  }
  return output.replace(/\s{2,}/g, ' ').trim();
}

function parseSignLabel(value: string | undefined) {
  const parsed = parseLocalizedSignLabel(value, '');
  return { icon: parsed.icon, sign: parsed.label };
}

function resultLabel(value: MatchResultKind) {
  if (value === 'UYUMLU') return 'Uyumlu';
  if (value === 'DIKKAT') return 'Dikkat';
  return 'Gelişim';
}

function matrixFilterIcon(filter: MatrixFilter, activeColor: string, passiveColor: string) {
  const color = filter === 'HEPSI' ? passiveColor : activeColor;
  if (filter === 'HEPSI') return null;
  if (filter === 'UYUMLU') return <CheckCheck size={12} color={color} />;
  if (filter === 'GELISIM_ALANI') return <Heart size={12} color={color} />;
  if (filter === 'DIKKAT') return <AlertTriangle size={12} color={color} />;
  return null;
}

function resolveAspectTheme(aspect: AspectDTO): DetailAspectTheme {
  const haystack = `${aspect.name} ${aspect.theme} ${aspect.aspectType ?? ''}`.toLocaleLowerCase('tr-TR');
  if (/güven|guven|satürn|saturn|boundar|sadakat/.test(haystack)) return 'GUVEN';
  if (/mars|plüton|pluton|venus|venüs|sexual|tutku|enerji|square|kare/.test(haystack)) return 'TUTKU';
  if (/merkür|merkur|mercury|jüpiter|jupiter|iletişim|zihinsel|ifade/.test(haystack)) return 'ILETISIM';
  return 'ASK';
}

function categoryMeta(category: CategoryScoreDTO) {
  if (category.id === 'love') {
    return { title: 'Aşk & Çekim', color: '#EF4444', fillA: '#EF4444', fillB: '#FACC15' };
  }
  if (category.id === 'communication') {
    return { title: 'İletişim', color: '#8B5CF6', fillA: '#A78BFA', fillB: '#7C3AED' };
  }
  if (category.id === 'trust') {
    return { title: 'Güven', color: '#10B981', fillA: '#34D399', fillB: '#6EE7B7' };
  }
  return { title: 'Tutku', color: '#F97316', fillA: '#EF4444', fillB: '#FDBA74' };
}

function detailThemeMeta(theme: DetailAspectTheme) {
  if (theme === 'ILETISIM') {
    return { label: 'İletişim', Icon: MessageCircle, iconColor: '#7C3AED', rail: '#A78BFA' };
  }
  if (theme === 'GUVEN') {
    return { label: 'Güven', Icon: Shield, iconColor: '#059669', rail: '#34D399' };
  }
  if (theme === 'TUTKU') {
    return { label: 'Tutku', Icon: Flame, iconColor: '#EA580C', rail: '#FB7185' };
  }
  return { label: 'Aşk & Çekim', Icon: Heart, iconColor: '#DB2777', rail: '#34D399' };
}

function detailScoreBadge(aspect: AspectDTO) {
  const orb = aspect.orb.toFixed(1);
  if (aspect.tone === 'DESTEKLEYICI') {
    if (aspect.orb <= 1.5) return { text: `Çok iyi (${orb}°)`, tone: 'good' as const };
    return { text: `İyi (${orb}°)`, tone: 'good' as const };
  }
  if (aspect.orb <= 2.5) return { text: `Orta (${orb}°)`, tone: 'warn' as const };
  return { text: `Zorlayabilir (${orb}°)`, tone: 'risk' as const };
}

function getMetricScore(metrics: SynastryDisplayMetric[] | null | undefined, keys: string[]) {
  const metric = (metrics ?? []).find((item) => {
    const haystack = `${item.id} ${item.label}`.toLowerCase();
    return keys.some((key) => haystack.includes(key));
  });

  if (typeof metric?.score !== 'number') return null;
  return clampScore(metric.score);
}

function mergeCategories(
  baseCategories: CategoryScoreDTO[],
  overall: number,
  scoreBreakdown?: SynastryScoreBreakdown | null,
  displayMetrics?: SynastryDisplayMetric[] | null,
): CategoryScoreDTO[] {
  const fromMetrics = {
    love: getMetricScore(displayMetrics, ['love', 'sevgi']),
    communication: getMetricScore(displayMetrics, ['communication', 'ilet']),
    trust: getMetricScore(displayMetrics, ['trust', 'güven', 'guven']),
    passion: getMetricScore(displayMetrics, ['passion', 'tutku', 'chemistry']),
  };

  const fallbackFromBreakdown = {
    love: typeof scoreBreakdown?.love === 'number' ? clampScore(scoreBreakdown.love) : clampScore(overall + 4),
    communication:
      typeof scoreBreakdown?.communication === 'number'
        ? clampScore(scoreBreakdown.communication)
        : clampScore(overall - 2),
    trust: clampScore(overall - 3),
    passion:
      typeof scoreBreakdown?.spiritualBond === 'number'
        ? clampScore(scoreBreakdown.spiritualBond)
        : clampScore(overall + 2),
  };

  const byId = new Map<CategoryScoreDTO['id'], CategoryScoreDTO>(
    baseCategories.map((item) => [item.id, item]),
  );

  const normalized: CategoryScoreDTO[] = [
    { id: 'love', label: 'Love', value: fromMetrics.love ?? fallbackFromBreakdown.love },
    {
      id: 'communication',
      label: 'Communication',
      value: fromMetrics.communication ?? fallbackFromBreakdown.communication,
    },
    { id: 'trust', label: 'Trust', value: fromMetrics.trust ?? fallbackFromBreakdown.trust },
    { id: 'passion', label: 'Passion', value: fromMetrics.passion ?? fallbackFromBreakdown.passion },
  ];

  return normalized.map((item) => {
    const found = byId.get(item.id);
    return found ? { ...found, value: item.value, label: item.label } : item;
  });
}

function mapCrossAspects(crossAspects: CrossAspect[] | null | undefined): AspectDTO[] {
  return (crossAspects ?? []).map((aspect, index) => {
    const leftPlanet = localizePlanetName(aspect.userPlanet, 'Kişi A');
    const rightPlanet = localizePlanetName(aspect.partnerPlanet, 'Kişi B');
    const rawAspectType = aspect.aspectTurkish || aspect.aspectType;
    const aspectType = localizeAspectType(rawAspectType);
    const nameFallback = `${leftPlanet} ${aspectType ?? 'Dinamik'} ${rightPlanet}`;
    return {
      id: `cross-${index + 1}`,
      name: localizeAspectName(nameFallback, nameFallback),
      theme: localizeAstroText(
        aspect.harmonious
          ? 'Akışı kolaylaştıran teknik bağ'
          : 'Denge kurmayı isteyen teknik bağ',
        'Akışı kolaylaştıran bağ',
      ),
      orb: Number.isFinite(aspect.orb) ? aspect.orb : 0,
      tone: aspect.harmonious ? 'DESTEKLEYICI' : 'ZORLAYICI',
      aspectType,
    };
  });
}

function mapSectionsToGrowthAreas(
  sections: SynastryAnalysisSection[] | null | undefined,
  fallback: GrowthAreaDTO[],
): GrowthAreaDTO[] {
  if (!sections?.length) {
    return fallback.map((area, index) => {
      const dynamic = buildGrowthNarrative({
        seed: `fallback-growth-${area.id}-${index + 1}`,
        title: area.title,
        subtitle: area.trigger,
        summary: area.pattern,
        tone: 'ZORLAYICI',
      });

      return {
        ...area,
        trigger: area.trigger || dynamic.trigger,
        protocol: dynamic.protocol,
        habitLabel: dynamic.habitLabel,
      };
    });
  }

  return sections.slice(0, 4).map((section, index) => {
    const title = section.title || `Gelişim Alanı ${index + 1}`;
    const dynamic = buildGrowthNarrative({
      seed: `section-growth-${section.id || index + 1}`,
      title,
      subtitle: section.subtitle,
      summary: section.summary,
      tone: section.tone,
    });

    return {
      id: `section-growth-${section.id || index + 1}`,
      title,
      trigger: (section.subtitle ?? '').trim() || dynamic.trigger,
      pattern: section.summary,
      protocol: dynamic.protocol,
      habitLabel: dynamic.habitLabel,
    };
  });
}

function enrichWithProps(match: MatchDTO, props: MatchOverviewScreenProps): MatchDTO {
  const preserveFetchedOverall = match.source === 'api';
  const preserveFetchedNarrative = match.source === 'api';
  const mergedCategories = mergeCategories(
    match.categories,
    preserveFetchedOverall ? match.overallScore : props.compatibilityScore,
    props.scoreBreakdown,
    props.displayMetrics,
  );

  const mappedCrossAspects = mapCrossAspects(props.crossAspects);
  const aspects = mappedCrossAspects.length > 0 ? mappedCrossAspects : match.aspects;

  return {
    ...match,
    overallScore: preserveFetchedOverall
      ? match.overallScore
      : clampScore(props.compatibilityScore || match.overallScore),
    people: {
      left: {
        ...match.people.left,
        name: props.personAName,
      },
      right: {
        ...match.people.right,
        name: props.personBName,
      },
    },
    summaryPlain: {
      ...match.summaryPlain,
      headline: sanitizeMainCopy(match.summaryPlain.headline),
      body: sanitizeMainCopy(
        preserveFetchedNarrative
          ? match.summaryPlain.body
          : props.fallbackInsight || match.summaryPlain.body,
      ),
    },
    categories: mergedCategories,
    growthAreas: mapSectionsToGrowthAreas(props.analysisSections, match.growthAreas),
    aspects,
    aspectsEvaluated: props.aspectsCount || aspects.length || match.aspectsEvaluated,
  };
}

function rowFillFlex(value: number) {
  const clamped = clampScore(value);
  return Math.max(6, clamped);
}

export default function MatchOverviewScreen(props: MatchOverviewScreenProps) {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<MainTab>('UYUMUNUZ');
  const [matrixFilter, setMatrixFilter] = useState<MatrixFilter>('HEPSI');
  const [detailAspectFilter, setDetailAspectFilter] = useState<DetailAspectFilter>('TUMU');
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});
  const [showDaily, setShowDaily] = useState(true);
  const setMatchCardDraft = useMatchCardStore((state) => state.setDraft);

  const { data, loading, error, isMock, refetch } = useMatchTraits(props.matchId, {
    personAName: props.personAName,
    personBName: props.personBName,
    personASignLabel: props.personASignLabel,
    personBSignLabel: props.personBSignLabel,
    overallScore: props.compatibilityScore,
    summary: props.fallbackInsight,
    relationshipType: props.relationshipType,
  });

  const fallbackFromProps = useMemo(() => {
    const seed = {
      matchId: props.matchId,
      personAName: props.personAName,
      personBName: props.personBName,
      personASignLabel: props.personASignLabel,
      personBSignLabel: props.personBSignLabel,
      overallScore: props.compatibilityScore,
      summary: props.fallbackInsight,
    };
    return enrichWithProps(buildMockMatchDTO(seed), props);
  }, [
    props.matchId,
    props.personAName,
    props.personBName,
    props.personASignLabel,
    props.personBSignLabel,
    props.compatibilityScore,
    props.fallbackInsight,
    props.scoreBreakdown,
    props.displayMetrics,
    props.crossAspects,
    props.analysisSections,
    props.aspectsCount,
  ]);

  const resolvedData = useMemo(() => {
    if (data) return enrichWithProps(data, props);
    return fallbackFromProps;
  }, [
    data,
    fallbackFromProps,
    props.compatibilityScore,
    props.fallbackInsight,
    props.scoreBreakdown,
    props.displayMetrics,
    props.crossAspects,
    props.analysisSections,
    props.aspectsCount,
    props.personAName,
    props.personBName,
    props.personASignLabel,
    props.personBSignLabel,
  ]);

  const filteredAxes = useMemo(() => {
    const list = resolvedData?.axes ?? [];
    if (matrixFilter === 'HEPSI') return list;
    return list.filter((item) => item.result === matrixFilter);
  }, [matrixFilter, resolvedData?.axes]);

  const detailFilteredAspects = useMemo(() => {
    const list = resolvedData?.aspects ?? [];
    if (detailAspectFilter === 'TUMU') return list;
    return list.filter((aspect) => resolveAspectTheme(aspect) === detailAspectFilter);
  }, [detailAspectFilter, resolvedData?.aspects]);

  const { supportiveAspects, challengingAspects } = useMemo(() => {
    // Performance: compute both buckets in a single pass.
    const supportive: AspectDTO[] = [];
    const challenging: AspectDTO[] = [];

    for (const item of detailFilteredAspects) {
      if (item.tone === 'DESTEKLEYICI') supportive.push(item);
      else if (item.tone === 'ZORLAYICI') challenging.push(item);
    }

    return { supportiveAspects: supportive, challengingAspects: challenging };
  }, [detailFilteredAspects]);

  const leftSignInfo = useMemo(() => parseSignLabel(props.personASignLabel), [props.personASignLabel]);
  const rightSignInfo = useMemo(() => parseSignLabel(props.personBSignLabel), [props.personBSignLabel]);

  useEffect(() => {
    if (!resolvedData) return;

    setMatchCardDraft({
      user1Name: props.personAName,
      user2Name: props.personBName,
      user1Sign: props.personASignLabel,
      user2Sign: props.personBSignLabel,
      compatibilityScore: resolvedData.overallScore,
      relationshipType: props.relationshipType,
      aiSummary: resolvedData.summaryPlain.body,
      cardSummary: resolvedData.summaryPlain.body,
      aspectsCount: resolvedData.aspectsEvaluated,
      relationLabel: props.relationLabel,
      traitAxes: toTraitAxes(resolvedData.axes),
      scoreBreakdown: props.scoreBreakdown
        ? {
            overall: props.scoreBreakdown.overall ?? null,
            love: props.scoreBreakdown.love ?? null,
            communication: props.scoreBreakdown.communication ?? null,
            spiritualBond: props.scoreBreakdown.spiritualBond ?? null,
          }
        : null,
      displayMetrics: props.displayMetrics ?? null,
      createdAt: Date.now(),
    });
  }, [
    props.displayMetrics,
    props.personAName,
    props.personASignLabel,
    props.personBName,
    props.personBSignLabel,
    props.relationLabel,
    props.relationshipType,
    props.scoreBreakdown,
    resolvedData,
    setMatchCardDraft,
  ]);

  const pushWithMatchParams = (pathname: '/share-card-preview' | '/compare-matrix' | '/growth-plan') => {
    if (!resolvedData) return;

    router.push({
      pathname,
      params: {
        matchId: String(props.matchId),
        personAName: resolvedData.people.left.name,
        personBName: resolvedData.people.right.name,
        ...(props.personAAvatarUri ? { personAAvatarUri: props.personAAvatarUri } : {}),
        ...(props.personBAvatarUri ? { personBAvatarUri: props.personBAvatarUri } : {}),
        personASignLabel: props.personASignLabel,
        personBSignLabel: props.personBSignLabel,
        overallScore: String(resolvedData.overallScore),
        relationshipType: props.relationshipType,
        relationLabel: props.relationLabel,
      },
    } as never);
  };

  if (loading && !resolvedData) {
    return (
      <View style={[styles.stateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
        <ActivityIndicator size="small" color={colors.violet} />
        <AccessibleText style={[styles.stateTitle, { color: colors.text }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
          Uyum ekranı hazırlanıyor…
        </AccessibleText>
        <AccessibleText style={[styles.stateSub, { color: colors.subtext }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
          Karşılaştırma modeli birkaç saniye içinde görünecek.
        </AccessibleText>
      </View>
    );
  }

  if (!resolvedData) {
    return (
      <View style={[styles.stateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
        <AccessibleText style={[styles.stateTitle, { color: colors.text }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
          Uyum verisi yüklenemedi
        </AccessibleText>
        <AccessibleText style={[styles.stateSub, { color: colors.subtext }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
          {error ?? 'Ağ bağlantınızı kontrol edip tekrar deneyin.'}
        </AccessibleText>
        <Pressable
          style={[styles.retryBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          onPress={() => {
            void refetch();
          }}
        >
          <RefreshCcw size={14} color={colors.text} />
          <AccessibleText style={[styles.retryBtnText, { color: colors.text }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            Tekrar dene
          </AccessibleText>
        </Pressable>
      </View>
    );
  }

  const leftName = resolvedData.people.left.name;
  const rightName = resolvedData.people.right.name;
  const dailySuggestions = resolvedData.dailySuggestions.slice(0, 2);
  const goToInteractionDetail = (aspect: AspectDTO) => {
    const themeKey = resolveAspectTheme(aspect);
    router.push({
      pathname: '/interaction-detail',
      params: {
        matchId: String(props.matchId),
        aspectId: aspect.id,
        aspectName: aspect.name,
        themeKey,
        theme: aspect.theme,
        tone: aspect.tone,
        orb: aspect.orb.toFixed(1),
        aspectType: aspect.aspectType ?? '',
        personAName: leftName,
        personBName: rightName,
        personASignLabel: props.personASignLabel,
        personBSignLabel: props.personBSignLabel,
        ...(props.personAAvatarUri ? { personAAvatarUri: props.personAAvatarUri } : {}),
        ...(props.personBAvatarUri ? { personBAvatarUri: props.personBAvatarUri } : {}),
      },
    } as never);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FCFAFF', '#F5EEFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.headerRow}>
          <AccessibleText style={[styles.screenTitle, { color: colors.text }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            {activeTab === 'GELISIM' ? 'Gelişim Planı' : activeTab === 'DETAYLI' ? 'Detaylı Analiz' : 'Uyum Haritası'}
          </AccessibleText>
          <View style={[styles.scoreChip, { backgroundColor: colors.violetBg, borderColor: colors.violetLight }]}>
            <Sparkles size={14} color={colors.violet} />
            <AccessibleText style={[styles.scoreChipText, { color: colors.violet }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              %{resolvedData.overallScore}
            </AccessibleText>
          </View>
        </View>

        <View style={styles.tabRow}>
          {MAIN_TABS.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <Pressable
                key={`match-tab-${tab.id}`}
                style={[
                  styles.tabPill,
                  {
                    backgroundColor: active ? '#FFFFFF' : '#F4F1FA',
                    borderColor: active ? '#DCCCF9' : '#E6E0EF',
                  },
                ]}
                onPress={() => setActiveTab(tab.id)}
              >
                <AccessibleText
                  style={[styles.tabText, { color: active ? '#5A2FA8' : '#6B7280' }]}
                  maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                >
                  {tab.label}
                </AccessibleText>
              </Pressable>
            );
          })}
        </View>
      </LinearGradient>

      {isMock || error ? (
        <View style={[styles.infoBanner, { backgroundColor: '#F3ECFF', borderColor: '#DCCCF9' }]}> 
          <AccessibleText style={[styles.infoBannerText, { color: '#5B21B6' }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            {isMock
              ? 'Demo veri gösteriliyor. Endpoint hazır olduğunda içerik otomatik güncellenecek.'
              : 'Ağdan detay yüklenemedi, mevcut analiz verisi gösteriliyor.'}
          </AccessibleText>
        </View>
      ) : null}

      {activeTab === 'UYUMUNUZ' ? (
        <>
          <View style={styles.matrixFilterRow}>
            {MATRIX_FILTERS.map((item) => {
              const active = matrixFilter === item.id;
              const palette =
                item.id === 'UYUMLU'
                  ? getMatchBadgePalette('UYUMLU')
                  : item.id === 'GELISIM_ALANI'
                    ? getMatchBadgePalette('GELISIM_ALANI')
                    : item.id === 'DIKKAT'
                      ? getMatchBadgePalette('DIKKAT')
                      : null;

              return (
                <Pressable
                  key={`matrix-filter-${item.id}`}
                  onPress={() => setMatrixFilter(item.id)}
                  style={[
                    styles.matrixFilterChip,
                    {
                      backgroundColor: active
                        ? (palette?.background ?? '#F3ECFF')
                        : '#FFFFFF',
                      borderColor: active
                        ? (palette?.border ?? '#D9C7FA')
                        : '#E5E1EC',
                    },
                  ]}
                >
                  {matrixFilterIcon(item.id, active ? (palette?.text ?? '#5B21B6') : '#6B7280', '#6B7280')}
                  <AccessibleText
                    style={[
                      styles.matrixFilterText,
                      {
                        color: active
                          ? (palette?.text ?? '#5B21B6')
                          : '#4B5563',
                      },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                  >
                    {item.label}
                  </AccessibleText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.matrixCard}>
            <LinearGradient
              colors={['#FFFFFF', '#F8F3FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.matrixTopGradient}
            >
              <View style={styles.peopleSummaryRow}>
                <View style={styles.personBlock}>
                  <PersonAvatar
                    name={leftName}
                    uri={props.personAAvatarUri}
                    side="left"
                    size={58}
                  />
                  <AccessibleText style={styles.personName} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                    {leftName}
                  </AccessibleText>
                  <AccessibleText style={styles.personSign} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                    {leftSignInfo.icon} {leftSignInfo.sign}
                  </AccessibleText>
                </View>

                <View style={styles.centerAnd}>
                  <AccessibleText style={styles.centerAndText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                    &
                  </AccessibleText>
                </View>

                <View style={styles.personBlock}>
                  <PersonAvatar
                    name={rightName}
                    uri={props.personBAvatarUri}
                    side="right"
                    size={58}
                  />
                  <AccessibleText style={styles.personName} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                    {rightName}
                  </AccessibleText>
                  <AccessibleText style={styles.personSign} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                    {rightSignInfo.icon} {rightSignInfo.sign}
                  </AccessibleText>
                </View>
              </View>

              <View style={styles.sparkRow}>
                <View style={styles.sparkLine} />
                <Sparkles size={14} color="#D79B45" />
                <View style={styles.sparkLine} />
              </View>
            </LinearGradient>

            <View style={styles.compareNamesRow}>
              <View style={styles.compareNamePill}>
                <AccessibleText style={styles.compareNameText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  {leftName}
                </AccessibleText>
              </View>
              <View style={styles.compareCenterPill}>
                <Sparkles size={12} color="#D79B45" />
                <AccessibleText style={styles.compareCenterText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  Kesişim
                </AccessibleText>
              </View>
              <View style={styles.compareNamePill}>
                <AccessibleText style={styles.compareNameText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  {rightName}
                </AccessibleText>
              </View>
            </View>

            {filteredAxes.length === 0 ? (
              <View style={styles.emptyRows}>
                <AccessibleText style={styles.emptyRowsText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  Bu filtrede eşleşme bulunamadı.
                </AccessibleText>
              </View>
            ) : (
              <View style={styles.axisCardList}>
                {filteredAxes.map((axis, index) => {
                const resultPalette = getMatchBadgePalette(axis.result);
                return (
                  <View
                    key={`axis-row-${axis.id}`}
                    style={[
                      styles.axisInsightCard,
                      index === filteredAxes.length - 1 && styles.axisInsightCardLast,
                    ]}
                  >
                    <View style={styles.axisInsightHeader}>
                      <AccessibleText style={styles.axisInsightTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                        {localizeAstroText(axis.title, axis.title)}
                      </AccessibleText>
                      <View
                        style={[
                          styles.intersectResultBadge,
                          {
                            backgroundColor: resultPalette.background,
                            borderColor: resultPalette.border,
                          },
                        ]}
                      >
                        <AccessibleText
                          style={[styles.intersectResultText, { color: resultPalette.text }]}
                          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                        >
                          {resultLabel(axis.result)}
                        </AccessibleText>
                      </View>
                    </View>

                    <View style={styles.axisCompareRow}>
                      <View style={styles.axisSideCard}>
                        <AccessibleText style={styles.axisSideName} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                          {leftName}
                        </AccessibleText>
                        <AccessibleText style={styles.axisLabelLeft} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                          {localizeAstroText(axis.leftLabel, axis.leftLabel)}
                        </AccessibleText>
                      </View>

                      <View
                        style={[
                          styles.axisImpactCard,
                          {
                            backgroundColor: resultPalette.softSurface,
                            borderColor: resultPalette.border,
                          },
                        ]}
                      >
                        <AccessibleText style={styles.intersectText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                          {localizeAstroText(axis.impactPlain, axis.impactPlain)}
                        </AccessibleText>
                      </View>

                      <View style={styles.axisSideCard}>
                        <AccessibleText style={styles.axisSideName} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                          {rightName}
                        </AccessibleText>
                        <AccessibleText style={styles.axisLabelRight} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                          {localizeAstroText(axis.rightLabel, axis.rightLabel)}
                        </AccessibleText>
                      </View>
                    </View>

                    <View style={styles.compareBarWrap}>
                      <View style={styles.compareBarTrack}>
                        <View style={[styles.leftCompareFill, { flex: rowFillFlex(axis.leftScore) }]} />
                        <View style={[styles.rightCompareFill, { flex: rowFillFlex(axis.rightScore) }]} />
                      </View>
                      <AccessibleText style={styles.tipLine} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                        Öneri: {axis.tipPlain}
                      </AccessibleText>
                    </View>
                  </View>
                );
              })}
              </View>
            )}
          </View>

          <View style={styles.themeSectionHeader}>
            <AccessibleText style={styles.themeSectionTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              Ana Temalar
            </AccessibleText>
            <MoreHorizontal size={16} color="#7A748D" />
          </View>

          <View style={styles.themeGrid}>
            {resolvedData.categories.map((category) => {
              const meta = categoryMeta(category);
              return (
                <View key={`theme-card-${category.id}`} style={styles.themeCard}>
                  <AccessibleText style={styles.themeCardTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                    {meta.title}
                  </AccessibleText>
                  <View style={styles.themeBarWrap}>
                    <LinearGradient
                      colors={[meta.fillA, meta.fillB]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={[styles.themeBarFill, { width: `${Math.max(12, category.value)}%` }]}
                    />
                  </View>
                  <AccessibleText style={[styles.themeCardPercent, { color: meta.color }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                    %{category.value}
                  </AccessibleText>
                </View>
              );
            })}
          </View>

          <View style={styles.summaryCard}>
            <AccessibleText style={styles.summaryKicker} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              Siz böyle çalışıyorsunuz
            </AccessibleText>
            <AccessibleText style={styles.summaryHeadline} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              {resolvedData.summaryPlain.headline}
            </AccessibleText>
            <AccessibleText style={styles.summaryBody} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              {resolvedData.summaryPlain.body}
            </AccessibleText>
          </View>

          <View style={styles.ctaRow}>
            <Pressable
              onPress={() => setActiveTab('GELISIM')}
              style={styles.primaryCta}
            >
              <Sparkles size={16} color="#FFFFFF" />
              <AccessibleText style={styles.primaryCtaText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                Gelişim Planına Geç
              </AccessibleText>
            </Pressable>

            <Pressable onPress={() => pushWithMatchParams('/share-card-preview')} style={styles.secondaryCta}>
              <Share2 size={15} color="#5B21B6" />
              <AccessibleText style={styles.secondaryCtaText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                Story Kartı Oluştur
              </AccessibleText>
            </Pressable>
          </View>
        </>
      ) : null}

      {activeTab === 'GELISIM' ? (
        <>
          <LinearGradient
            colors={['#FDF8FF', '#F3EEFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.growthIntroCard}
          >
            <View style={styles.growthIntroRow}>
              <View style={styles.growthHeartBubble}>
                <Heart size={17} color="#B42376" />
              </View>
              <AccessibleText style={styles.growthIntroText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                Biz geliştikçe uyumunuz artacak. Hadi, yapabileceğinize bakalım.
              </AccessibleText>
            </View>
          </LinearGradient>

          <View style={styles.growthList}>
            {resolvedData.growthAreas.map((area, index) => (
              <GrowthCard
                key={area.id}
                area={area}
                index={index}
                checked={Boolean(checkedMap[area.id])}
                onToggle={() => {
                  setCheckedMap((prev) => ({
                    ...prev,
                    [area.id]: !prev[area.id],
                  }));
                }}
              />
            ))}
          </View>

          <Pressable onPress={() => setShowDaily((prev) => !prev)} style={styles.dailyToggle}>
            <Sparkles size={14} color="#6D28D9" />
            <AccessibleText style={styles.dailyToggleText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              Günlük önerileri {showDaily ? 'gizle' : 'gör'}
            </AccessibleText>
          </Pressable>

          {showDaily ? (
            <View style={styles.dailyCard}>
              <AccessibleText style={styles.dailyTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                Günlük Öneri
              </AccessibleText>
              {dailySuggestions.map((suggestion, index) => (
                <View key={`daily-${index}`} style={styles.dailyItemRow}>
                  <View style={styles.dailyDot} />
                  <AccessibleText style={styles.dailyItemText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                    {suggestion}
                  </AccessibleText>
                </View>
              ))}
            </View>
          ) : null}

          <Pressable onPress={() => setActiveTab('DETAYLI')} style={styles.ghostCta}>
            <AccessibleText style={styles.ghostCtaText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              Detaylı Analize Geç
            </AccessibleText>
          </Pressable>
        </>
      ) : null}

      {activeTab === 'DETAYLI' ? (
        <View style={styles.detailShell}>
          <View style={styles.detailPeopleRow}>
            <View style={styles.detailPersonWrap}>
              <PersonAvatar
                name={leftName}
                uri={props.personAAvatarUri}
                side="left"
                size={58}
              />
              <AccessibleText style={styles.detailPersonName} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                {leftName}
              </AccessibleText>
              <AccessibleText style={styles.detailSignLine} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                {leftSignInfo.icon} {leftSignInfo.sign}
              </AccessibleText>
            </View>

            <View style={styles.detailCenterConnector}>
              <View style={styles.detailDotLine} />
              <View style={styles.detailHeartChip}>
                <Heart size={16} color="#7C3AED" />
              </View>
              <View style={styles.detailDotLine} />
            </View>

            <View style={styles.detailPersonWrap}>
              <PersonAvatar
                name={rightName}
                uri={props.personBAvatarUri}
                side="right"
                size={58}
              />
              <AccessibleText style={styles.detailPersonName} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                {rightName}
              </AccessibleText>
              <AccessibleText style={styles.detailSignLine} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                {rightSignInfo.icon} {rightSignInfo.sign}
              </AccessibleText>
            </View>
          </View>

          <View style={styles.detailSubTabs}>
            <View style={styles.detailSubTabInactive}>
              <AccessibleText style={styles.detailSubTabTextInactive} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                Uyum Özeti
              </AccessibleText>
            </View>
            <View style={styles.detailSubTabActive}>
              <AccessibleText style={styles.detailSubTabTextActive} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                Detaylı Analiz
              </AccessibleText>
            </View>
            <View style={styles.detailSubTabInactive}>
              <AccessibleText style={styles.detailSubTabTextInactive} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                Öneriler
              </AccessibleText>
            </View>
          </View>

          <View style={styles.detailStatsCard}>
            <View style={styles.detailStatRow}>
              <View style={styles.detailStatTitleWrap}>
                <CircleCheck size={16} color="#10B981" />
                <AccessibleText style={styles.detailStatTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  İlişkinin Güçlü Yönleri
                </AccessibleText>
              </View>
              <View style={styles.detailStatCountGood}>
                <AccessibleText style={styles.detailStatCountGoodText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  {supportiveAspects.length}
                </AccessibleText>
              </View>
              <ChevronRight size={16} color="#83809A" />
            </View>
            <View style={styles.detailStatDivider} />
            <View style={styles.detailStatRow}>
              <View style={styles.detailStatTitleWrap}>
                <CircleAlert size={16} color="#E11D48" />
                <AccessibleText style={styles.detailStatTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  Zorlayıcı Konular
                </AccessibleText>
              </View>
              <View style={styles.detailStatCountRisk}>
                <AccessibleText style={styles.detailStatCountRiskText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  {challengingAspects.length}
                </AccessibleText>
              </View>
              <ChevronRight size={16} color="#83809A" />
            </View>
          </View>

          <View style={styles.detailSectionHeader}>
            <AccessibleText style={styles.detailSectionTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              Ana Temalar
            </AccessibleText>
            <MoreHorizontal size={16} color="#83809A" />
          </View>

          <View style={styles.themeGrid}>
            {resolvedData.categories.map((category) => {
              const meta = categoryMeta(category);
              return (
                <View key={`detail-theme-${category.id}`} style={styles.themeCard}>
                  <AccessibleText style={styles.themeCardTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                    {meta.title}
                  </AccessibleText>
                  <View style={styles.themeBarWrap}>
                    <LinearGradient
                      colors={[meta.fillA, meta.fillB]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={[styles.themeBarFill, { width: `${Math.max(12, category.value)}%` }]}
                    />
                  </View>
                  <AccessibleText
                    style={[styles.themeCardPercent, { color: meta.color }]}
                    maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                  >
                    %{category.value}
                  </AccessibleText>
                </View>
              );
            })}
          </View>

          <View style={styles.detailSectionHeader}>
            <AccessibleText style={styles.detailSectionTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              Etkileşim Listesi
            </AccessibleText>
            <AccessibleText style={styles.detailAspectCount} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              {detailFilteredAspects.length}
            </AccessibleText>
          </View>

          <View style={styles.detailFilterRow}>
            {DETAIL_ASPECT_FILTERS.map((item) => {
              const active = detailAspectFilter === item.id;
              return (
                <Pressable
                  key={`detail-filter-${item.id}`}
                  onPress={() => setDetailAspectFilter(item.id)}
                  style={[
                    styles.detailFilterChip,
                    active ? styles.detailFilterChipActive : styles.detailFilterChipInactive,
                  ]}
                >
                  <AccessibleText
                    style={active ? styles.detailFilterTextActive : styles.detailFilterText}
                    maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                    numberOfLines={1}
                  >
                    {item.label}
                  </AccessibleText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.detailGroupWrap}>
            <AccessibleText style={styles.detailStrongTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              • Güçlü Etkileşimler
            </AccessibleText>
            {supportiveAspects.length ? (
              supportiveAspects.map((aspect) => {
                const theme = resolveAspectTheme(aspect);
                const themeMeta = detailThemeMeta(theme);
                const badge = detailScoreBadge(aspect);
                const badgePalette = getMatchBadgePalette('DESTEKLEYICI');
                const localizedAspectType = localizeAspectType(aspect.aspectType);

                return (
                  <Pressable
                    key={`good-${aspect.id}`}
                    style={styles.aspectListCardGood}
                    onPress={() => goToInteractionDetail(aspect)}
                  >
                    <View style={[styles.aspectListRail, { backgroundColor: themeMeta.rail }]} />
                    <View style={styles.aspectListBody}>
                      <View style={styles.aspectListTopRow}>
                        <View style={styles.aspectListTitleWrap}>
                          <View style={styles.aspectIconWrapGood}>
                            <themeMeta.Icon size={16} color={themeMeta.iconColor} />
                          </View>
                          <View style={styles.aspectTexts}>
                            <AccessibleText style={styles.aspectName} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                              {localizeAspectName(aspect.name, aspect.name)}
                            </AccessibleText>
                            <AccessibleText style={styles.aspectSub} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                              {themeMeta.label} • {localizeAstroText(aspect.theme, aspect.theme)}
                            </AccessibleText>
                          </View>
                        </View>
                        <View style={[styles.aspectBadge, { backgroundColor: badgePalette.background, borderColor: badgePalette.border }]}>
                          <AccessibleText style={[styles.aspectBadgeText, { color: badgePalette.text }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                            {badge.text}
                          </AccessibleText>
                        </View>
                      </View>
                      <View style={styles.aspectBottomRow}>
                        <AccessibleText style={styles.aspectOrb} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                          Orb {aspect.orb.toFixed(1)}° {localizedAspectType ? `• ${localizedAspectType}` : ''}
                        </AccessibleText>
                        <ChevronRight size={16} color="#8A879D" />
                      </View>
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <View style={styles.emptyCard}>
                <AccessibleText style={styles.emptySub} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  Bu filtrede güçlü etkileşim bulunamadı.
                </AccessibleText>
              </View>
            )}
          </View>

          <View style={styles.detailGroupWrap}>
            <AccessibleText style={styles.detailRiskTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              • Dikkat Edilmesi Gerekenler
            </AccessibleText>
            {challengingAspects.length ? (
              challengingAspects.map((aspect) => {
                const theme = resolveAspectTheme(aspect);
                const themeMeta = detailThemeMeta(theme);
                const badge = detailScoreBadge(aspect);
                const badgePalette = badge.tone === 'risk' ? getMatchBadgePalette('DIKKAT') : getMatchBadgePalette('GELISIM_ALANI');
                const localizedAspectType = localizeAspectType(aspect.aspectType);

                return (
                  <View key={`risk-${aspect.id}`} style={styles.aspectListCardRisk}>
                    <Pressable
                      onPress={() => goToInteractionDetail(aspect)}
                      style={styles.aspectListPress}
                    >
                      <View style={[styles.aspectListRail, { backgroundColor: '#F87171' }]} />
                      <View style={styles.aspectListBody}>
                        <View style={styles.aspectListTopRow}>
                          <View style={styles.aspectListTitleWrap}>
                            <View style={styles.aspectIconWrapRisk}>
                              <themeMeta.Icon size={16} color="#BE123C" />
                            </View>
                            <View style={styles.aspectTexts}>
                              <AccessibleText style={styles.aspectName} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                                {localizeAspectName(aspect.name, aspect.name)}
                              </AccessibleText>
                              <AccessibleText style={styles.aspectSubRisk} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                                {localizeAstroText(aspect.theme, aspect.theme)}
                              </AccessibleText>
                            </View>
                          </View>
                          <View style={[styles.aspectBadge, { backgroundColor: badgePalette.background, borderColor: badgePalette.border }]}>
                            <AccessibleText style={[styles.aspectBadgeText, { color: badgePalette.text }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                              {badge.text}
                            </AccessibleText>
                          </View>
                        </View>
                        <View style={styles.aspectBottomRow}>
                          <AccessibleText style={styles.aspectOrb} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                            Orb {aspect.orb.toFixed(1)}° {localizedAspectType ? `• ${localizedAspectType}` : ''}
                          </AccessibleText>
                          <ChevronRight size={16} color="#8A879D" />
                        </View>
                      </View>
                    </Pressable>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyCard}>
                <AccessibleText style={styles.emptySub} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  Bu filtrede zorlayıcı etkileşim bulunamadı.
                </AccessibleText>
              </View>
            )}
          </View>

          <Pressable onPress={() => pushWithMatchParams('/compare-matrix')} style={styles.ghostCta}>
            <AccessibleText style={styles.ghostCtaText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              Tam Uyum Matrisini Aç
            </AccessibleText>
          </Pressable>
        </View>
      ) : null}

      {props.onCreateCard ? (
        <Pressable
          onPress={props.onCreateCard}
          style={[styles.cardCta, props.createCardDisabled && styles.cardCtaDisabled]}
          disabled={props.createCardDisabled}
        >
          <AccessibleText style={styles.cardCtaText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            Yıldız Kartını Aç
          </AccessibleText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    paddingBottom: 6,
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E3D8F4',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  screenTitle: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.7,
    color: '#1F1A2C',
  },
  scoreChip: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreChipText: {
    fontSize: 14,
    fontWeight: '800',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tabPill: {
    flex: 1,
    minHeight: 46,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '800',
  },
  infoBanner: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  infoBannerText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  matrixFilterRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
  },
  matrixFilterChip: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  matrixFilterText: {
    flexShrink: 1,
    fontSize: 13.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  matrixCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E5E1EC',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  matrixTopGradient: {
    borderBottomWidth: 1,
    borderBottomColor: '#EDE8F3',
  },
  peopleSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  personBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  personName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#221B33',
  },
  personSign: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B6680',
  },
  centerAnd: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#DCCCF9',
    backgroundColor: '#F5F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerAndText: {
    fontSize: 27,
    fontWeight: '800',
    color: '#7C3AED',
    marginTop: -2,
  },
  sparkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  sparkLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8DDF8',
  },
  compareNamesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 4,
  },
  compareNamePill: {
    flex: 1,
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E8E1F3',
    backgroundColor: '#FCFAFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  compareNameText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4A435C',
    lineHeight: 16,
  },
  compareCenterPill: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E6D6F8',
    backgroundColor: '#F7F1FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    gap: 4,
    flexDirection: 'row',
  },
  compareCenterText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#6D28D9',
  },
  axisCardList: {
    gap: 10,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
  },
  axisInsightCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9E2F3',
    backgroundColor: '#FFFFFF',
    padding: 10,
    gap: 8,
  },
  axisInsightCardLast: {
    marginBottom: 0,
  },
  axisInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  axisInsightTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#231D34',
    lineHeight: 19,
  },
  axisCompareRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  axisSideCard: {
    flex: 0.9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECE6F4',
    backgroundColor: '#FCFBFE',
    paddingHorizontal: 8,
    paddingVertical: 7,
    gap: 4,
    justifyContent: 'center',
  },
  axisSideName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  axisImpactCard: {
    flex: 1.25,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  matrixHeaderRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: '#ECE7F1',
    backgroundColor: '#FCFBFE',
  },
  matrixHeaderCell: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#4B5563',
    paddingHorizontal: 8,
    paddingVertical: 9,
    textAlign: 'center',
  },
  axisCol: {
    flex: 0.9,
  },
  sideCol: {
    flex: 1,
  },
  centerCol: {
    flex: 1.2,
  },
  matrixRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEE8F5',
  },
  matrixRowLast: {
    borderBottomWidth: 0,
  },
  matrixDataRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cellDivider: {
    borderRightWidth: 1,
    borderRightColor: '#ECE6F4',
  },
  axisCell: {
    paddingHorizontal: 8,
    paddingTop: 11,
    paddingBottom: 7,
    justifyContent: 'center',
  },
  axisTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#231D34',
    lineHeight: 19,
  },
  axisLabelLeft: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 19,
  },
  axisLabelRight: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#374151',
    lineHeight: 19,
  },
  intersectBubble: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 5,
  },
  intersectText: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  intersectResultText: {
    fontSize: 11,
    fontWeight: '800',
  },
  intersectResultBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  compareBarWrap: {
    paddingHorizontal: 2,
    paddingBottom: 2,
    gap: 6,
  },
  compareBarTrack: {
    minHeight: 9,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: '#F1EBFC',
    borderWidth: 1,
    borderColor: '#E1D7F3',
  },
  leftCompareFill: {
    height: '100%',
    backgroundColor: '#D5C0F8',
  },
  rightCompareFill: {
    height: '100%',
    backgroundColor: '#9065E9',
  },
  tipLine: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5B4E75',
    lineHeight: 18,
  },
  themeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  themeSectionTitle: {
    fontSize: 34,
    letterSpacing: -0.6,
    fontWeight: '800',
    color: '#1F1A2C',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  themeCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E2F1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 11,
    paddingVertical: 10,
    gap: 8,
  },
  themeCardTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    color: '#211A32',
  },
  themeBarWrap: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#EFEAF6',
    overflow: 'hidden',
  },
  themeBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  themeCardPercent: {
    fontSize: 31,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  emptyRows: {
    paddingHorizontal: 10,
    paddingVertical: 14,
  },
  emptyRowsText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7280',
    fontWeight: '600',
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E1EC',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 6,
  },
  summaryKicker: {
    ...MATCH_GROUP_TYPOGRAPHY.sectionKicker,
    color: '#5B4B7D',
  },
  summaryHeadline: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: '#1F1A2C',
  },
  summaryBody: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    color: '#5E5A70',
  },
  ctaRow: {
    gap: 8,
  },
  primaryCta: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#6D28D9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryCta: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2D7F6',
    backgroundColor: '#F5F0FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  secondaryCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5B21B6',
  },
  growthIntroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  growthIntroCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6DCF6',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  growthHeartBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FBE8F2',
    borderWidth: 1,
    borderColor: '#F4C8DD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  growthIntroText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    color: '#5F5B72',
  },
  growthList: {
    gap: 12,
  },
  dailyToggle: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2D7F6',
    backgroundColor: '#F5F0FF',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  dailyToggleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6D28D9',
  },
  dailyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E1EC',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 8,
  },
  dailyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#221B33',
  },
  dailyItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  dailyDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 7,
    backgroundColor: '#7C3AED',
  },
  dailyItemText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    color: '#59526F',
  },
  detailShell: {
    borderWidth: 1,
    borderColor: '#E5E1EC',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  detailPeopleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  detailCenterConnector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: -12,
  },
  detailDotLine: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#D9D0EA',
    borderStyle: 'dotted',
  },
  detailHeartChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1E8FF',
    borderWidth: 1,
    borderColor: '#D8C3FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailPersonWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  detailPersonName: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    color: '#211A32',
  },
  detailSignLine: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    color: '#6B6680',
  },
  detailSubTabs: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E4DEEE',
    borderRadius: 999,
    padding: 4,
    backgroundColor: '#F7F4FB',
    gap: 4,
  },
  detailSubTabInactive: {
    flex: 1,
    minHeight: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  detailSubTabActive: {
    flex: 1,
    minHeight: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCCCF9',
  },
  detailSubTabTextInactive: {
    fontSize: 15,
    fontWeight: '600',
    color: '#605B72',
  },
  detailSubTabTextActive: {
    fontSize: 15,
    fontWeight: '800',
    color: '#5B21B6',
  },
  detailStatsCard: {
    borderWidth: 1,
    borderColor: '#E5E1EC',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  detailStatRow: {
    minHeight: 56,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailStatTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailStatTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#211A32',
  },
  detailStatCountGood: {
    minWidth: 42,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#B9E7CF',
    backgroundColor: '#EAF8EF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  detailStatCountGoodText: {
    fontSize: 23,
    lineHeight: 25,
    color: '#087F5B',
    fontWeight: '900',
  },
  detailStatCountRisk: {
    minWidth: 42,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#F2C0CB',
    backgroundColor: '#FDECEF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  detailStatCountRiskText: {
    fontSize: 23,
    lineHeight: 25,
    color: '#C11B46',
    fontWeight: '900',
  },
  detailStatDivider: {
    height: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#EBE6F2',
    borderStyle: 'dotted',
  },
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  detailSectionTitle: {
    fontSize: 24,
    letterSpacing: -0.3,
    fontWeight: '800',
    color: '#1F1A2C',
  },
  detailAspectCount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7D7890',
  },
  detailAndChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DCCCF9',
    backgroundColor: '#F5F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailAndText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#7C3AED',
    marginTop: -2,
  },
  detailCounterText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
    color: '#5F5B72',
  },
  detailFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  detailFilterChip: {
    minHeight: 40,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailFilterChipActive: {
    backgroundColor: '#F2EAFE',
    borderColor: '#CBAFF7',
  },
  detailFilterChipInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E1EC',
  },
  detailFilterText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#5F5B72',
  },
  detailFilterTextActive: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#5B21B6',
  },
  detailFilterMore: {
    minHeight: 44,
    minWidth: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E1EC',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  detailGroupsCol: {
    gap: 12,
  },
  detailGroupWrap: {
    gap: 8,
  },
  detailStrongTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0B8F63',
  },
  detailRiskTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#A7193B',
  },
  aspectListCardGood: {
    borderWidth: 1,
    borderColor: '#C6EEDD',
    backgroundColor: '#F8FEFA',
    borderRadius: 16,
    overflow: 'hidden',
  },
  aspectListCardRisk: {
    borderWidth: 1,
    borderColor: '#F3D1D8',
    backgroundColor: '#FFF8FA',
    borderRadius: 16,
    overflow: 'hidden',
  },
  aspectListPress: {
    flexDirection: 'row',
  },
  aspectListRail: {
    width: 4,
  },
  aspectListBody: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 6,
  },
  aspectListTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  aspectListTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aspectTexts: {
    flex: 1,
    gap: 1,
  },
  aspectIconWrapGood: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E5F7EF',
    borderWidth: 1,
    borderColor: '#C4EEDB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aspectIconWrapRisk: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FDECEF',
    borderWidth: 1,
    borderColor: '#F7CED7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aspectName: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
    color: '#1F1A2C',
  },
  aspectSub: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '600',
    color: '#0B8F63',
  },
  aspectSubRisk: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '600',
    color: '#A7193B',
  },
  aspectBadge: {
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    maxWidth: '40%',
  },
  aspectBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  aspectBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  aspectOrb: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '600',
    color: '#6A6481',
  },
  aspectExpandBox: {
    marginHorizontal: 10,
    marginBottom: 10,
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#EDDDE2',
    borderRadius: 14,
    backgroundColor: '#FFFDFE',
    padding: 10,
    gap: 8,
  },
  aspectPairLine: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#2A243B',
  },
  aspectMiniBars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aspectMiniBarLeft: {
    height: 7,
    borderRadius: 999,
    backgroundColor: '#F59E0B',
  },
  aspectMiniBarRight: {
    height: 7,
    borderRadius: 999,
    backgroundColor: '#A78BFA',
  },
  solutionCard: {
    borderWidth: 1,
    borderColor: '#F2E4EA',
    borderRadius: 12,
    backgroundColor: '#FFF8FB',
    padding: 9,
    gap: 7,
  },
  solutionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#7A2544',
  },
  solutionText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: '#41384E',
  },
  solutionBtn: {
    alignSelf: 'flex-start',
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DCCCF9',
    backgroundColor: '#F3ECFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  solutionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#5B21B6',
  },
  detailGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 2,
  },
  detailGroupTitle: {
    ...MATCH_GROUP_TYPOGRAPHY.detailGroupTitle,
    color: '#221B33',
  },
  detailGroupCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E1EC',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  detailAspectRow: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  detailAspectRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#EEE8F5',
  },
  detailAspectIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  detailAspectBody: {
    flex: 1,
    gap: 2,
  },
  detailAspectTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  detailAspectTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    color: '#211A32',
  },
  detailToneBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    maxWidth: '56%',
  },
  detailToneBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  detailAspectMeta: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: '#5F5B72',
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: '#E5E1EC',
    borderRadius: 14,
    padding: 14,
    gap: 4,
    backgroundColor: '#FAF8FD',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#221B33',
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    color: '#5F5B72',
  },
  ghostCta: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4DBF4',
    backgroundColor: '#FAF7FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  ghostCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5B21B6',
  },
  cardCta: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4DBF4',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  cardCtaDisabled: {
    opacity: 0.55,
  },
  cardCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2F2349',
  },
  stateCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 8,
    alignItems: 'center',
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateSub: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    fontWeight: '500',
  },
  retryBtn: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
