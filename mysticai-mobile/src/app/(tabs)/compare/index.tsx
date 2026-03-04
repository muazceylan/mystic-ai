import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AlertTriangle,
  Flame,
  Heart,
  MessageCircle,
  Shield,
  Sparkles,
} from 'lucide-react-native';

import { AccessibleText, SafeScreen } from '../../../components/ui';
import { ACCESSIBILITY } from '../../../constants/tokens';
import type {
  CompareThemeSectionDTO,
  ComparisonCardDTO,
  MiniCategoryScoreDTO,
  RelationshipType,
} from '../../../types/compare';
import { RELATIONSHIP_TYPE_LABELS } from '../../../types/compare';
import {
  buildMiniCategoryScores,
  groupCardsByTheme,
  parseRelationshipTypeParam,
} from '../../../services/compare.service';
import useComparison from '../../../hooks/useComparison';
import PersonAvatar from '../../../components/match/PersonAvatar';
import MatchCircularScore from '../../../components/match/MatchCircularScore';
import RelationshipTypeChips from '../../../components/RelationshipTypeChips';
import ThemeSectionHeader from '../../../components/ThemeSectionHeader';
import ComparisonCard from '../../../components/ComparisonCard';
import { getRelationshipPalette } from '../../../constants/compareDesignTokens';
import CompareHeader from '../../../components/compare/CompareHeader';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInt(value: string | string[] | undefined): number | null {
  const raw = firstParam(value);
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

function resolveIcon(label: string) {
  const value = label.toLocaleLowerCase('tr-TR');
  if (value.includes('aşk') || value.includes('bağ')) return Heart;
  if (value.includes('iletişim')) return MessageCircle;
  if (value.includes('güven') || value.includes('sadakat') || value.includes('adil')) return Shield;
  if (value.includes('tutku') || value.includes('tetik')) return Flame;
  if (value.includes('çatışma')) return AlertTriangle;
  return Sparkles;
}

interface SectionData extends CompareThemeSectionDTO {
  data: ComparisonCardDTO[];
}

export default function CompareOverviewScreen() {
  const params = useLocalSearchParams<{
    matchId?: string;
    type?: string;
    leftName?: string;
    rightName?: string;
    leftAvatarUri?: string;
    rightAvatarUri?: string;
    leftSignLabel?: string;
    rightSignLabel?: string;
  }>();

  const matchId = parsePositiveInt(params.matchId) ?? 1;
  const typeParam = firstParam(params.type);
  const relationshipType = parseRelationshipTypeParam(typeParam, 'love');
  const hasTypeParam = Boolean(typeParam);

  const leftName = firstParam(params.leftName) ?? 'Kişi 1';
  const rightName = firstParam(params.rightName) ?? 'Kişi 2';
  const leftAvatarUri = firstParam(params.leftAvatarUri);
  const rightAvatarUri = firstParam(params.rightAvatarUri);
  const leftSignLabel = firstParam(params.leftSignLabel) ?? '—';
  const rightSignLabel = firstParam(params.rightSignLabel) ?? '—';

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const { data, error, loading, isMock, refetch } = useComparison({
    matchId,
    relationshipType,
    leftName,
    rightName,
    enabled: hasTypeParam,
  });

  useEffect(() => {
    if (hasTypeParam) return;
    router.replace({
      pathname: '/compare/type-picker',
      params: {
        ...(params.matchId ? { matchId: firstParam(params.matchId) } : {}),
        ...(params.leftName ? { leftName: firstParam(params.leftName) } : {}),
        ...(params.rightName ? { rightName: firstParam(params.rightName) } : {}),
        ...(params.leftAvatarUri ? { leftAvatarUri: firstParam(params.leftAvatarUri) } : {}),
        ...(params.rightAvatarUri ? { rightAvatarUri: firstParam(params.rightAvatarUri) } : {}),
        ...(params.leftSignLabel ? { leftSignLabel: firstParam(params.leftSignLabel) } : {}),
        ...(params.rightSignLabel ? { rightSignLabel: firstParam(params.rightSignLabel) } : {}),
      },
    } as never);
  }, [
    hasTypeParam,
    params.leftAvatarUri,
    params.leftName,
    params.leftSignLabel,
    params.matchId,
    params.rightAvatarUri,
    params.rightName,
    params.rightSignLabel,
  ]);

  const sections = useMemo(() => {
    if (!data) return [] as SectionData[];

    const grouped = groupCardsByTheme(data.cards, relationshipType, data.themeScores);

    return grouped.map((section) => {
      const expanded = Boolean(expandedSections[section.themeGroup]);
      return {
        ...section,
        data: expanded ? section.cards : section.cards.slice(0, 7),
      };
    });
  }, [data, expandedSections, relationshipType]);

  const miniCategoryScores = useMemo(() => {
    if (!data) return [] as MiniCategoryScoreDTO[];
    return buildMiniCategoryScores(relationshipType, data.themeScores);
  }, [data, relationshipType]);

  const palette = getRelationshipPalette(relationshipType);

  const onSwitchType = (nextType: RelationshipType) => {
    setExpandedSections({});
    router.replace({
      pathname: '/compare',
      params: {
        type: nextType,
        matchId: String(matchId),
        leftName,
        rightName,
        ...(leftAvatarUri ? { leftAvatarUri } : {}),
        ...(rightAvatarUri ? { rightAvatarUri } : {}),
        ...(leftSignLabel ? { leftSignLabel } : {}),
        ...(rightSignLabel ? { rightSignLabel } : {}),
      },
    } as never);
  };

  const goTechnical = () => {
    router.push({
      pathname: '/compare/technical',
      params: {
        type: relationshipType,
        matchId: String(matchId),
        leftName,
        rightName,
        ...(leftAvatarUri ? { leftAvatarUri } : {}),
        ...(rightAvatarUri ? { rightAvatarUri } : {}),
        ...(leftSignLabel ? { leftSignLabel } : {}),
        ...(rightSignLabel ? { rightSignLabel } : {}),
      },
    } as never);
  };

  const goBackSafely = () => {
    router.replace('/(tabs)/compatibility' as never);
  };

  return (
    <SafeScreen edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: '#F7F5FB' }}>
      <View style={{ flex: 1 }}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.headerWrap}>
              <CompareHeader
                title={`${RELATIONSHIP_TYPE_LABELS[relationshipType]} Uyum Haritası`}
                onBack={goBackSafely}
              />

              <RelationshipTypeChips value={relationshipType} onChange={onSwitchType} />

              <LinearGradient
                colors={[palette.surface, '#FFFFFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.summaryCard, { borderColor: palette.border }]}
              >
                <View style={styles.peopleRow}>
                  <View style={styles.personBlock}>
                    <PersonAvatar name={leftName} uri={leftAvatarUri} side="left" size={52} />
                    <AccessibleText
                      style={styles.personName}
                      maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                    >
                      {leftName}
                    </AccessibleText>
                    <AccessibleText
                      style={styles.signText}
                      maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                    >
                      {leftSignLabel}
                    </AccessibleText>
                  </View>

                  <View style={[styles.crossChip, { borderColor: palette.border, backgroundColor: palette.accentSoft }]}> 
                    <AccessibleText
                      style={[styles.crossText, { color: palette.accent }]}
                      maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                    >
                      Kesişim
                    </AccessibleText>
                  </View>

                  <View style={styles.personBlock}>
                    <PersonAvatar name={rightName} uri={rightAvatarUri} side="right" size={52} />
                    <AccessibleText
                      style={styles.personName}
                      maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                    >
                      {rightName}
                    </AccessibleText>
                    <AccessibleText
                      style={styles.signText}
                      maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                    >
                      {rightSignLabel}
                    </AccessibleText>
                  </View>
                </View>

                {loading && !data ? (
                  <View style={styles.stateCard}>
                    <ActivityIndicator size="small" color={palette.accent} />
                    <AccessibleText
                      style={styles.stateText}
                      maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                    >
                      Uyum verisi hazırlanıyor…
                    </AccessibleText>
                  </View>
                ) : null}

                {!loading && error ? (
                  <View style={styles.stateCard}>
                    <AccessibleText
                      style={styles.errorText}
                      maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                    >
                      {error || 'Uyum verisi yüklenemedi.'}
                    </AccessibleText>
                    <Pressable
                      onPress={() => {
                        void refetch();
                      }}
                      style={[styles.retryBtn, { borderColor: palette.border }]}
                    >
                      <AccessibleText
                        style={[styles.retryText, { color: palette.accent }]}
                        maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                      >
                        Tekrar dene
                      </AccessibleText>
                    </Pressable>
                  </View>
                ) : null}

                {data ? (
                  <>
                    <View style={styles.summaryRow}>
                      <MatchCircularScore score={data.overallScore} size={126} />
                      <View style={styles.summaryTextWrap}>
                        <AccessibleText
                          style={styles.summaryHeadline}
                          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                        >
                          {data.summaryPlain.headline}
                        </AccessibleText>
                        <AccessibleText
                          style={styles.summaryBody}
                          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                        >
                          {data.summaryPlain.body}
                        </AccessibleText>
                      </View>
                    </View>

                    <View style={styles.miniGrid}>
                      {miniCategoryScores.map((score) => {
                        const Icon = resolveIcon(score.label);
                        return (
                          <View key={score.id} style={styles.miniPill}>
                            <View style={[styles.miniIconWrap, { backgroundColor: palette.accentSoft }]}> 
                              <Icon size={13} color={palette.accent} />
                            </View>
                            <AccessibleText
                              style={styles.miniLabel}
                              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                            >
                              {score.label}
                            </AccessibleText>
                            <AccessibleText
                              style={styles.miniScore}
                              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                            >
                              %{score.score}
                            </AccessibleText>
                          </View>
                        );
                      })}
                    </View>
                  </>
                ) : null}

                {isMock ? (
                  <View style={styles.mockBanner}>
                    <AccessibleText
                      style={styles.mockText}
                      maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                    >
                      Canlı endpoint yerine mock veri gösteriliyor.
                    </AccessibleText>
                  </View>
                ) : null}
              </LinearGradient>

              <View style={styles.tabRow}>
                <View style={styles.activeTab}>
                  <AccessibleText
                    style={styles.activeTabText}
                    maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                  >
                    Uyum Özeti
                  </AccessibleText>
                </View>

                <Pressable onPress={goTechnical} style={styles.passiveTab}>
                  <AccessibleText
                    style={styles.passiveTabText}
                    maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                  >
                    Detaylı Analiz
                  </AccessibleText>
                </Pressable>
              </View>

              {!loading && data ? (
                <AccessibleText
                  style={styles.sectionTitle}
                  maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                >
                  Tema Grupları
                </AccessibleText>
              ) : null}
            </View>
          }
          renderSectionHeader={({ section }) => (
            <ThemeSectionHeader
              themeGroup={section.themeGroup}
              score={section.score}
              totalCount={section.totalCount}
              isExpanded={Boolean(expandedSections[section.themeGroup])}
              onToggleExpand={() => {
                setExpandedSections((prev) => ({
                  ...prev,
                  [section.themeGroup]: !prev[section.themeGroup],
                }));
              }}
            />
          )}
          renderItem={({ item }) => <ComparisonCard card={item} />}
          ListEmptyComponent={
            !loading && hasTypeParam ? (
              <View style={styles.emptyCard}>
                <AccessibleText
                  style={styles.emptyText}
                  maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                >
                  Bu ilişki türü için kart bulunamadı.
                </AccessibleText>
              </View>
            ) : null
          }
          SectionSeparatorComponent={() => <View style={{ height: 6 }} />}
        />
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 112,
  },
  headerWrap: {
    gap: 10,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 12,
    shadowColor: '#2D0A5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  peopleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E9E2F3',
  },
  personBlock: {
    alignItems: 'center',
    gap: 2,
    minWidth: 86,
  },
  personName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2A2140',
  },
  signText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6A6181',
  },
  crossChip: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossText: {
    fontSize: 13,
    fontWeight: '700',
  },
  stateCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E6E0EE',
    backgroundColor: '#FFFFFF',
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  stateText: {
    fontSize: 14,
    color: '#534A69',
    fontWeight: '700',
  },
  errorText: {
    fontSize: 14,
    color: '#9F1239',
    fontWeight: '700',
    textAlign: 'center',
  },
  retryBtn: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryTextWrap: {
    flex: 1,
    gap: 8,
  },
  summaryHeadline: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
    color: '#2A2140',
    letterSpacing: -0.2,
  },
  summaryBody: {
    fontSize: 14,
    lineHeight: 20,
    color: '#574D70',
    fontWeight: '600',
  },
  miniGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  miniPill: {
    width: '48.5%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7E0F1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F4667',
    flex: 1,
  },
  miniScore: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2E2544',
  },
  mockBanner: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D9C9FB',
    backgroundColor: '#F4EEFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  mockText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#6B21A8',
    fontWeight: '700',
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E1F2',
    padding: 3,
    marginTop: 2,
  },
  activeTab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 11,
    backgroundColor: '#EEE5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passiveTab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#5B21B6',
  },
  passiveTabText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#504866',
  },
  sectionTitle: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '800',
    color: '#201935',
    letterSpacing: -0.25,
  },
  emptyCard: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E1F2',
    backgroundColor: '#FFFFFF',
    padding: 14,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5E5575',
  },
});
