import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Sparkles, RefreshCcw } from 'lucide-react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import TraitCategoryCard from '../../components/match/TraitCategoryCard';
import { useMatchTraits } from '../../hooks/useMatchTraits';
import { useMatchCardStore } from '../../store/useMatchCardStore';
import type { RelationshipType, SynastryDisplayMetric, SynastryScoreBreakdown } from '../../services/synastry.service';
import type { CategoryGroup, TraitAxis } from '../../services/match.api';

function extractShareVerdict(text: string | null | undefined) {
  const raw = (text ?? '').trim();
  if (!raw) return 'Yıldızlar bu bağ için güçlü bir çekim alanı işaret ediyor.';
  const firstChunk = raw
    .split(/\n+/)
    .map((line) => line.trim())
    .find(Boolean) ?? raw;
  const firstSentence = firstChunk.split(/(?<=[.!?])\s+/)[0]?.trim() || firstChunk;
  return firstSentence.length > 120 ? `${firstSentence.slice(0, 117).trimEnd()}...` : firstSentence;
}

function buildFallbackCategoryGroups(
  compatibilityScore: number,
  relationshipType: RelationshipType,
): CategoryGroup[] {
  const score = Math.max(0, Math.min(100, Math.round(compatibilityScore || 0)));
  const center = 50;
  const tilt = Math.round((score - center) * 0.5);
  const clamp = (n: number) => Math.max(8, Math.min(92, n));
  const relationLabel =
    relationshipType === 'LOVE'
      ? 'romantik ritim'
      : relationshipType === 'BUSINESS'
        ? 'iş birliği akışı'
        : relationshipType === 'FAMILY'
          ? 'aile bağı'
          : relationshipType === 'RIVAL'
            ? 'rekabet dengesi'
            : 'ilişki ritmi';

  return [
    {
      id: 'fallback_duygusal',
      title: 'Duygusal Tempo ve Yakınlık',
      items: [
        {
          id: 'sakinlik-heyecan',
          leftLabel: 'Sakin akış',
          rightLabel: 'Yoğun tempo',
          score0to100: clamp(50 + tilt),
          note: `Bu eksen ${relationLabel} içinde bir tarafın yaklaşma hızını, diğer tarafın güven ihtiyacını nasıl etkilediğinizi gösterir.`,
        },
        {
          id: 'mesafe-yakinlik',
          leftLabel: 'Alan ihtiyacı',
          rightLabel: 'Yakınlık ihtiyacı',
          score0to100: clamp(48 + Math.round(tilt * 0.7)),
          note: 'Yakınlık ve kişisel alan dengesi konuşulduğunda ilişkinin yıpranma riski azalır.',
        },
      ],
    },
    {
      id: 'fallback_iletisim',
      title: 'İletişim ve Karar Dili',
      items: [
        {
          id: 'duz-anlatim',
          leftLabel: 'Direkt anlatım',
          rightLabel: 'Dolaylı anlatım',
          score0to100: clamp(52 - Math.round(tilt * 0.35)),
          note: 'Biriniz netlik isterken diğeriniz duygu tonu arıyor olabilir; önce niyeti sonra çözümü söylemek işe yarar.',
        },
        {
          id: 'hizli-karar',
          leftLabel: 'Hızlı karar',
          rightLabel: 'Düşünerek karar',
          score0to100: clamp(50 + Math.round(tilt * 0.25)),
          note: 'Karar temposu farklıysa ortak bir karar ritmi belirlemek çatışmayı azaltır.',
        },
      ],
    },
    {
      id: 'fallback_baglilik',
      title: 'Bağlılık ve Ortak Hedef',
      items: [
        {
          id: 'esneklik-duzen',
          leftLabel: 'Esnek akış',
          rightLabel: 'Düzen ve plan',
          score0to100: clamp(54 + Math.round(tilt * 0.2)),
          note: 'Bu eksen birlikte gelecek kurarken kimin yapı, kimin hareket getirdiğini gösterir.',
        },
        {
          id: 'ben-biz',
          leftLabel: 'Bireysel alan',
          rightLabel: 'Ortak alan',
          score0to100: clamp(46 + Math.round(tilt * 0.4)),
          note: 'İlişkinin uzun ömürlü olması için hem bireysel alan hem ortak amaç görünür olmalıdır.',
        },
      ],
    },
  ];
}

function ScoreRing({ score }: { score: number }) {
  const size = 112;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <View style={styles.scoreRingWrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <SvgLinearGradient id="match-score-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#C4B5FD" />
            <Stop offset="100%" stopColor="#6D28D9" />
          </SvgLinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#E9E6FF" strokeWidth={stroke} fill="transparent" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#match-score-gradient)"
          strokeWidth={stroke}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.scoreRingLabelWrap}>
        <Text style={styles.scoreRingValue}>{clamped}%</Text>
        <Text style={styles.scoreRingLabel}>Uyum</Text>
      </View>
    </View>
  );
}

export interface MatchResultScreenProps {
  matchId: number;
  compatibilityScore: number;
  relationLabel: string;
  relationshipType: RelationshipType;
  scoreBreakdown?: SynastryScoreBreakdown | null;
  displayMetrics?: SynastryDisplayMetric[] | null;
  personAName: string;
  personBName: string;
  personASignLabel: string;
  personBSignLabel: string;
  aspectsCount: number;
  fallbackInsight?: string | null;
  onCreateCard: () => void;
  createCardDisabled?: boolean;
}

export default function MatchResultScreen({
  matchId,
  compatibilityScore,
  relationLabel,
  relationshipType,
  scoreBreakdown,
  displayMetrics,
  personAName,
  personBName,
  personASignLabel,
  personBSignLabel,
  aspectsCount,
  fallbackInsight,
  onCreateCard,
  createCardDisabled = false,
}: MatchResultScreenProps) {
  const { colors } = useTheme();
  const setMatchCardDraft = useMatchCardStore((s) => s.setDraft);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const { data, loading, error, refetch } = useMatchTraits(matchId);
  const lastDraftSignatureRef = useRef<string | null>(null);

  const categories = data?.categories ?? null;
  const cardSummary = data?.cardSummary ?? null;
  const fallbackCategories = useMemo(
    () => buildFallbackCategoryGroups(compatibilityScore, relationshipType),
    [compatibilityScore, relationshipType],
  );
  const cardFallbackCategories = (error || !categories || categories.length === 0) ? fallbackCategories : null;
  const effectiveCategories = (categories && categories.length > 0) ? categories : null;
  const renderableCategories = effectiveCategories && effectiveCategories.length > 0 ? effectiveCategories : fallbackCategories;
  const cardAxesForDraft: TraitAxis[] = useMemo(
    () => {
      if (data?.cardAxes?.length) return data.cardAxes.slice(0, 8);
      return (cardFallbackCategories ?? []).flatMap((group) => group.items).slice(0, 8);
    },
    [data?.cardAxes, cardFallbackCategories],
  );

  const visibleCategories = useMemo(() => {
    if (!renderableCategories?.length) return [];
    if (showAllCategories) return renderableCategories;
    return renderableCategories.slice(0, 4);
  }, [renderableCategories, showAllCategories]);

  const canExpandCategories = (renderableCategories?.length ?? 0) > 4;
  const summaryText = cardSummary || fallbackInsight || 'Kategori bazlı karşılaştırma eksenleri hazırlanıyor…';
  const shareVerdict = useMemo(() => extractShareVerdict(fallbackInsight), [fallbackInsight]);
  const officialMetrics = useMemo(
    () => (displayMetrics ?? []).filter((metric) => typeof metric?.score === 'number').slice(0, 4),
    [displayMetrics],
  );

  const draftSignature = useMemo(
    () =>
      JSON.stringify({
        matchId,
        personAName,
        personBName,
        personASignLabel,
        personBSignLabel,
        compatibilityScore,
        relationshipType,
        relationLabel,
        aspectsCount,
        summary: cardSummary || fallbackInsight || shareVerdict,
        traitAxes: cardAxesForDraft.map((axis) => [axis.id, axis.score0to100, axis.note ?? '']),
        scoreBreakdown: scoreBreakdown
          ? {
              overall: scoreBreakdown.overall ?? null,
              love: scoreBreakdown.love ?? null,
              communication: scoreBreakdown.communication ?? null,
              spiritualBond: scoreBreakdown.spiritualBond ?? null,
            }
          : null,
        displayMetrics: officialMetrics.map((metric) => ({
          id: metric.id,
          label: metric.label,
          score: metric.score ?? null,
        })),
      }),
    [
      aspectsCount,
      cardAxesForDraft,
      cardSummary,
      compatibilityScore,
      fallbackInsight,
      matchId,
      personAName,
      personASignLabel,
      personBName,
      personBSignLabel,
      relationLabel,
      relationshipType,
      scoreBreakdown,
      officialMetrics,
      shareVerdict,
    ],
  );

  useEffect(() => {
    if (!matchId) return;
    if (lastDraftSignatureRef.current === draftSignature) return;
    lastDraftSignatureRef.current = draftSignature;

    setMatchCardDraft({
      user1Name: personAName,
      user2Name: personBName,
      user1Sign: personASignLabel,
      user2Sign: personBSignLabel,
      compatibilityScore,
      relationshipType,
      aiSummary: fallbackInsight || shareVerdict,
      cardSummary: cardSummary ?? fallbackInsight ?? shareVerdict,
      aspectsCount,
      relationLabel,
      traitAxes: cardAxesForDraft,
      scoreBreakdown: scoreBreakdown
        ? {
            overall: scoreBreakdown.overall ?? null,
            love: scoreBreakdown.love ?? null,
            communication: scoreBreakdown.communication ?? null,
            spiritualBond: scoreBreakdown.spiritualBond ?? null,
          }
        : null,
      displayMetrics: officialMetrics,
      createdAt: Date.now(),
    });
  }, [
    aspectsCount,
    cardAxesForDraft,
    cardSummary,
    compatibilityScore,
    draftSignature,
    fallbackInsight,
    matchId,
    personAName,
    personASignLabel,
    personBName,
    personBSignLabel,
    relationLabel,
    relationshipType,
    scoreBreakdown,
    officialMetrics,
    setMatchCardDraft,
    shareVerdict,
  ]);

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.profileBlock}>
            <Text style={styles.profileName} numberOfLines={1}>{personAName}</Text>
            <Text style={styles.signLine}>{personASignLabel}</Text>
          </View>
          <View style={styles.vsPill}>
            <Text style={styles.vsText}>{relationshipType === 'LOVE' ? '&' : 'vs'}</Text>
          </View>
          <View style={[styles.profileBlock, styles.profileBlockRight]}>
            <Text style={styles.profileName} numberOfLines={1}>{personBName}</Text>
            <Text style={styles.signLine}>{personBSignLabel}</Text>
          </View>
        </View>

        <View style={styles.scoreRow}>
          <ScoreRing score={compatibilityScore} />
          <View style={styles.metaCol}>
            <Text style={styles.eyebrow}>Sinastri Atölyesi</Text>
            <Text style={styles.title}>{relationLabel}</Text>
            <Text style={styles.sub}>{aspectsCount} çapraz açı değerlendirildi</Text>
          </View>
        </View>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <Text style={[styles.summaryTitle, { color: colors.text }]}>Karşılaştırmalı Özet</Text>
        <Text style={[styles.summaryBody, { color: colors.subtext }]}>{summaryText}</Text>
      </View>

      {officialMetrics.length > 0 ? (
        <View style={styles.metricsWrap}>
          {officialMetrics.map((metric) => (
            <View
              key={`official-metric-${metric.id}`}
              style={[styles.metricChip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
            >
              <Text style={[styles.metricChipLabel, { color: colors.subtext }]} numberOfLines={1}>
                {metric.label}
              </Text>
              <Text style={[styles.metricChipValue, { color: colors.text }]}>
                %{Math.max(0, Math.min(100, Math.round(metric.score ?? 0)))}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.categoriesCol}>
        {loading ? (
          <View style={[styles.stateCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.violet} />
            <Text style={[styles.stateTitle, { color: colors.text }]}>Eksenler hazırlanıyor…</Text>
            <Text style={[styles.stateSub, { color: colors.subtext }]}>
              Astrolojik açılardan kategori bazlı denge haritası oluşturuluyor.
            </Text>
          </View>
        ) : renderableCategories && renderableCategories.length > 0 ? (
          <>
            {visibleCategories.map((group) => (
              <TraitCategoryCard key={group.id} category={group} previewCount={3} />
            ))}
            {canExpandCategories ? (
              <Pressable
                style={[styles.showMoreBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                onPress={() => setShowAllCategories((v) => !v)}
              >
                <Text style={[styles.showMoreText, { color: colors.text }]}>
                  {showAllCategories ? 'Daha az kategori göster' : 'Tüm kategorileri göster'}
                </Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <View style={[styles.stateCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={[styles.stateTitle, { color: colors.text }]}>Henüz eksen verisi yok</Text>
            <Text style={[styles.stateSub, { color: colors.subtext }]}>
              Karşılaştırma tamamlandığında kategori bazlı eksenler burada görünecek.
            </Text>
            {!!error && (
              <Pressable
                style={[styles.retryBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  void refetch();
                }}
              >
                <RefreshCcw size={14} color={colors.text} />
                <Text style={[styles.retryBtnText, { color: colors.text }]}>Tekrar dene</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      <Pressable
        style={[
          styles.ctaBtn,
          { backgroundColor: colors.violet },
          createCardDisabled && styles.ctaBtnDisabled,
        ]}
        onPress={onCreateCard}
        disabled={createCardDisabled}
      >
        <Sparkles size={16} color="#FFFFFF" />
        <Text style={styles.ctaBtnText}>Yıldız Kartımızı Oluştur</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6EAF2',
    padding: 14,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  profileBlockRight: {
    alignItems: 'flex-end',
  },
  profileName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  signLine: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  vsPill: {
    minWidth: 36,
    height: 30,
    borderRadius: 999,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  vsText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#5B21B6',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreRingWrap: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRingLabelWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRingValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#4C1D95',
  },
  scoreRingLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: -1,
  },
  metaCol: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#7C3AED',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  summaryBody: {
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: '500',
  },
  categoriesCol: {
    gap: 10,
  },
  metricsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricChip: {
    minWidth: '48%',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  metricChipLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricChipValue: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  warningCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  warningTitle: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  warningSub: {
    fontSize: 11.5,
    lineHeight: 17,
  },
  stateCard: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  stateTitle: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateSub: {
    fontSize: 11.5,
    lineHeight: 17,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 2,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  showMoreBtn: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  showMoreText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ctaBtn: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  ctaBtnDisabled: {
    opacity: 0.6,
  },
  ctaBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
