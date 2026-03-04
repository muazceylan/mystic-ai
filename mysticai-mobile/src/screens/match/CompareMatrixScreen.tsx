import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { AlertTriangle, CheckCheck, ChevronLeft, Sparkles, Share2 } from 'lucide-react-native';
import { SafeScreen, AccessibleText } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { ACCESSIBILITY } from '../../constants/tokens';
import {
  MATCH_GROUP_TYPOGRAPHY,
  getMatchBadgePalette,
} from '../../constants/matchDesignTokens';
import { useMatchTraits } from '../../hooks/useMatchTraits';
import type { MatchResultKind } from '../../types/match';
import PersonAvatar from '../../components/match/PersonAvatar';
import { localizeAstroText, parseLocalizedSignLabel } from '../../utils/matchAstroLabels';

function parseMatchId(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

type MatrixFilter = 'HEPSI' | 'UYUMLU' | 'GELISIM_ALANI' | 'DIKKAT';

const FILTERS: Array<{ id: MatrixFilter; label: string; icon: 'all' | 'ok' | 'focus' | 'warn' }> = [
  { id: 'HEPSI', label: 'Hepsi', icon: 'all' },
  { id: 'UYUMLU', label: 'Uyumlu', icon: 'ok' },
  { id: 'GELISIM_ALANI', label: 'Gelişim', icon: 'focus' },
  { id: 'DIKKAT', label: 'Dikkat', icon: 'warn' },
];

function parseSignLabel(value: string | undefined) {
  return parseLocalizedSignLabel(value, '');
}

function resultLabel(value: MatchResultKind) {
  if (value === 'UYUMLU') return 'Uyumlu';
  if (value === 'DIKKAT') return 'Dikkat';
  return 'Gelişim';
}

export default function CompareMatrixScreen() {
  const params = useLocalSearchParams<{
    matchId?: string;
    personAName?: string;
    personBName?: string;
    personASignLabel?: string;
    personBSignLabel?: string;
    personAAvatarUri?: string;
    personBAvatarUri?: string;
    overallScore?: string;
  }>();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<MatrixFilter>('HEPSI');

  const matchId = parseMatchId(params.matchId);
  const overallScore = Number.isFinite(Number(params.overallScore)) ? Number(params.overallScore) : null;

  const { data, loading, error, isMock, refetch } = useMatchTraits(matchId, {
    personAName: params.personAName,
    personBName: params.personBName,
    personASignLabel: params.personASignLabel,
    personBSignLabel: params.personBSignLabel,
    overallScore,
  });

  const filteredAxes = useMemo(() => {
    const all = data?.axes ?? [];
    if (filter === 'HEPSI') return all;
    return all.filter((axis) => axis.result === filter);
  }, [data?.axes, filter]);

  const leftName = data?.people.left.name ?? params.personAName ?? 'Aslı';
  const rightName = data?.people.right.name ?? params.personBName ?? 'Muaz';
  const leftAvatarUri = Array.isArray(params.personAAvatarUri) ? params.personAAvatarUri[0] : params.personAAvatarUri;
  const rightAvatarUri = Array.isArray(params.personBAvatarUri) ? params.personBAvatarUri[0] : params.personBAvatarUri;
  const leftSign = parseSignLabel(params.personASignLabel);
  const rightSign = parseSignLabel(params.personBSignLabel);

  const goSharePreview = () => {
    if (!matchId) return;
    router.push({
      pathname: '/share-card-preview',
      params: {
        matchId: String(matchId),
        personAName: leftName,
        personBName: rightName,
        ...(leftAvatarUri ? { personAAvatarUri: leftAvatarUri } : {}),
        ...(rightAvatarUri ? { personBAvatarUri: rightAvatarUri } : {}),
        personASignLabel: params.personASignLabel,
        personBSignLabel: params.personBSignLabel,
        overallScore: String(data?.overallScore ?? overallScore ?? 0),
      },
    } as any);
  };

  return (
    <SafeScreen edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: '#F7F5FB' }}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: '#E6E0EF' }]}
          >
            <ChevronLeft size={20} color={colors.text} />
          </Pressable>
          <AccessibleText style={[styles.title, { color: colors.text }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            Uyum Haritası
          </AccessibleText>
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((item) => {
            const active = filter === item.id;
            const iconColor = active ? '#6D28D9' : '#6B7280';
            return (
              <Pressable
                key={`matrix-filter-${item.id}`}
                onPress={() => setFilter(item.id)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? '#EFE8FF' : '#FFFFFF',
                    borderColor: active ? '#CDBAF8' : '#E5E1EC',
                  },
                ]}
              >
                {item.icon === 'ok' ? <CheckCheck size={14} color={iconColor} /> : null}
                {item.icon === 'focus' ? <Sparkles size={14} color={iconColor} /> : null}
                {item.icon === 'warn' ? <AlertTriangle size={14} color={iconColor} /> : null}
                <AccessibleText style={[styles.filterText, { color: active ? '#5B21B6' : '#4B5563' }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  {item.label}
                </AccessibleText>
              </Pressable>
            );
          })}
        </View>

        {isMock || error ? (
          <View style={styles.banner}> 
            <AccessibleText style={styles.bannerText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              {isMock
                ? 'Endpoint yerine mock veri görüntüleniyor.'
                : `Hata: ${error}. Yerel veriler gösteriliyor.`}
            </AccessibleText>
          </View>
        ) : null}

        {loading && !data ? (
          <View style={[styles.stateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <ActivityIndicator size="small" color={colors.violet} />
            <AccessibleText style={[styles.stateText, { color: colors.subtext }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              Matris yükleniyor…
            </AccessibleText>
          </View>
        ) : null}

        {!loading && !data ? (
          <View style={[styles.stateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <AccessibleText style={[styles.stateText, { color: colors.subtext }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              Ekran verisi alınamadı.
            </AccessibleText>
            <Pressable
              style={[styles.retryBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
              onPress={() => {
                void refetch();
              }}
            >
              <AccessibleText style={[styles.retryText, { color: colors.text }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                Tekrar dene
              </AccessibleText>
            </Pressable>
          </View>
        ) : null}

        {data ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.matrixScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.matrixCard}>
              <View style={styles.peopleHeader}>
                <View style={styles.personWrap}>
                  <PersonAvatar name={leftName} uri={leftAvatarUri} side="left" size={50} style={styles.avatar} />
                  <AccessibleText style={styles.personName} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                    {leftName}
                  </AccessibleText>
                  <AccessibleText style={styles.signText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                    {leftSign.icon} {leftSign.label}
                  </AccessibleText>
                </View>

                <View style={styles.andBadge}>
                  <AccessibleText style={styles.andBadgeText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                    &
                  </AccessibleText>
                </View>

                <View style={styles.personWrap}>
                  <PersonAvatar name={rightName} uri={rightAvatarUri} side="right" size={50} style={styles.avatar} />
                  <AccessibleText style={styles.personName} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                    {rightName}
                  </AccessibleText>
                  <AccessibleText style={styles.signText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                    {rightSign.icon} {rightSign.label}
                  </AccessibleText>
                </View>
              </View>

              <View style={styles.gridHeaderRow}>
                <AccessibleText style={[styles.gridHeaderText, styles.personCol]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  {leftName}
                </AccessibleText>
                <AccessibleText style={[styles.gridHeaderText, styles.intersectCol]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  Kesişim
                </AccessibleText>
                <AccessibleText style={[styles.gridHeaderText, styles.personCol]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  {rightName}
                </AccessibleText>
              </View>

              <View style={styles.axisCardList}>
                {filteredAxes.map((axis, index) => {
                  const resultPalette = getMatchBadgePalette(axis.result);
                  return (
                    <View
                      key={`grid-row-${axis.id}`}
                      style={[styles.axisCard, index === filteredAxes.length - 1 && styles.axisCardLast]}
                    >
                      <View style={styles.axisHeader}>
                        <AccessibleText style={styles.axisTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                          {localizeAstroText(axis.title, axis.title)}
                        </AccessibleText>
                        <View
                          style={[
                            styles.axisResultChip,
                            { backgroundColor: resultPalette.background, borderColor: resultPalette.border },
                          ]}
                        >
                          <AccessibleText
                            style={[styles.axisResultChipText, { color: resultPalette.text }]}
                            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                          >
                            {resultLabel(axis.result)}
                          </AccessibleText>
                        </View>
                      </View>

                      <View style={styles.axisBodyRow}>
                        <View style={styles.axisSideCard}>
                          <AccessibleText style={styles.axisSideName} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                            {leftName}
                          </AccessibleText>
                          <AccessibleText style={styles.personTrait} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                            {localizeAstroText(axis.leftLabel, axis.leftLabel)}
                          </AccessibleText>
                        </View>

                        <View
                          style={[
                            styles.intersectBubble,
                            { backgroundColor: resultPalette.softSurface, borderColor: resultPalette.border },
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
                          <AccessibleText style={styles.personTrait} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                            {localizeAstroText(axis.rightLabel, axis.rightLabel)}
                          </AccessibleText>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            <Pressable onPress={goSharePreview} style={styles.shareBtn}> 
              <Share2 size={16} color="#FFFFFF" />
              <AccessibleText style={styles.shareBtnText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                Story Kartı Oluştur
              </AccessibleText>
            </Pressable>
          </ScrollView>
        ) : null}
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '700',
  },
  banner: {
    borderWidth: 1,
    borderColor: '#DCCCF9',
    backgroundColor: '#F4EDFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bannerText: {
    color: '#5B21B6',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  matrixScroll: {
    gap: 12,
    paddingBottom: 20,
  },
  matrixCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7E1EF',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  peopleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E1EF',
  },
  personWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  avatar: {
    marginBottom: 2,
  },
  personName: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  signText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  andBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D7C8F6',
    backgroundColor: '#F3ECFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  andBadgeText: {
    color: '#6D28D9',
    fontSize: 17,
    fontWeight: '900',
    marginTop: -1,
  },
  gridHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E7E1EF',
    backgroundColor: '#FBF9FF',
  },
  gridHeaderText: {
    color: '#6B7280',
    ...MATCH_GROUP_TYPOGRAPHY.matrixGroupHeader,
    paddingVertical: 9,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  axisCardList: {
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  axisCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7E1EF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  axisCardLast: {
    marginBottom: 0,
  },
  axisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  axisResultChip: {
    minHeight: 26,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  axisResultChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  axisBodyRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
  },
  axisSideCard: {
    flex: 0.95,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#ECE6F4',
    backgroundColor: '#FCFBFE',
    paddingHorizontal: 8,
    paddingVertical: 7,
    gap: 4,
    justifyContent: 'center',
  },
  axisSideName: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  gridRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E7E1EF',
    minHeight: 74,
  },
  gridRowLast: {
    borderBottomWidth: 0,
  },
  gridCell: {
    paddingHorizontal: 8,
    paddingVertical: 9,
    justifyContent: 'center',
  },
  cellBorderRight: {
    borderRightWidth: 1,
    borderRightColor: '#E7E1EF',
  },
  axisCol: {
    flex: 0.9,
  },
  personCol: {
    flex: 0.9,
  },
  intersectCol: {
    flex: 1.2,
  },
  axisTitle: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  personTrait: {
    color: '#1F2937',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  intersectBubble: {
    flex: 1.15,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 7,
    gap: 4,
    justifyContent: 'center',
  },
  intersectText: {
    color: '#111827',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  resultBadge: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  shareBtn: {
    minHeight: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    backgroundColor: '#7C3AED',
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  stateCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 8,
  },
  stateText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryBtn: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
