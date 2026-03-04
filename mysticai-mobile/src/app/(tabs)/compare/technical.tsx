import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Sparkles,
} from 'lucide-react-native';

import { AccessibleText, SafeScreen } from '../../../components/ui';
import { ACCESSIBILITY } from '../../../constants/tokens';
import type { RelationshipType, TechnicalAspectDTO } from '../../../types/compare';
import { RELATIONSHIP_TYPE_LABELS } from '../../../types/compare';
import { getRelationshipPalette } from '../../../constants/compareDesignTokens';
import { parseRelationshipTypeParam } from '../../../services/compare.service';
import useComparison from '../../../hooks/useComparison';
import RelationshipTypeChips from '../../../components/RelationshipTypeChips';
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

type TechnicalFilter = 'all' | 'supportive' | 'challenging';

export default function TechnicalAnalysisScreen() {
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
  const relationshipType = parseRelationshipTypeParam(firstParam(params.type), 'love');
  const leftName = firstParam(params.leftName) ?? 'Kişi 1';
  const rightName = firstParam(params.rightName) ?? 'Kişi 2';
  const leftAvatarUri = firstParam(params.leftAvatarUri);
  const rightAvatarUri = firstParam(params.rightAvatarUri);
  const leftSignLabel = firstParam(params.leftSignLabel);
  const rightSignLabel = firstParam(params.rightSignLabel);

  const [filter, setFilter] = useState<TechnicalFilter>('all');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const { data, loading, error, isMock, refetch } = useComparison({
    matchId,
    relationshipType,
    leftName,
    rightName,
    enabled: true,
  });

  const filteredAspects = useMemo(() => {
    if (!data) return [] as TechnicalAspectDTO[];

    if (filter === 'all') {
      return data.technicalAspects;
    }

    return data.technicalAspects.filter((item) => item.type === filter);
  }, [data, filter]);

  const palette = getRelationshipPalette(relationshipType);

  const onTypeSwitch = (nextType: RelationshipType) => {
    setExpandedRows({});
    router.replace({
      pathname: '/compare/technical',
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

  const goOverview = () => {
    router.replace({
      pathname: '/compare',
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
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <CompareHeader
            title="Detaylı Analiz"
            subtitle={`${RELATIONSHIP_TYPE_LABELS[relationshipType]} türü için teknik etkileşim listesi`}
            onBack={goBackSafely}
          />

          <RelationshipTypeChips value={relationshipType} onChange={onTypeSwitch} />

        <View style={styles.tabRow}>
          <Pressable onPress={goOverview} style={styles.passiveTab}>
            <AccessibleText
              style={styles.passiveTabText}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              Uyum Özeti
            </AccessibleText>
          </Pressable>
          <View style={styles.activeTab}>
            <AccessibleText
              style={styles.activeTabText}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              Detaylı Analiz
            </AccessibleText>
          </View>
        </View>

        <View style={[styles.counterCard, { borderColor: palette.border, backgroundColor: palette.surface }]}> 
          <AccessibleText style={styles.counterLabel} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            Değerlendirilen teknik etkileşim
          </AccessibleText>
          <AccessibleText style={[styles.counterValue, { color: palette.accent }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            {data?.technicalAspects.length ?? 0}
          </AccessibleText>
        </View>

        <View style={styles.filterRow}>
          <Pressable
            onPress={() => setFilter('all')}
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          >
            <AccessibleText
              style={[styles.filterText, filter === 'all' && styles.filterTextActive]}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              Hepsi
            </AccessibleText>
          </Pressable>

          <Pressable
            onPress={() => setFilter('supportive')}
            style={[styles.filterChip, filter === 'supportive' && styles.supportiveChipActive]}
          >
            <CheckCircle2 size={14} color={filter === 'supportive' ? '#166534' : '#475569'} />
            <AccessibleText
              style={[
                styles.filterText,
                filter === 'supportive' && { color: '#166534' },
              ]}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              Destekleyici
            </AccessibleText>
          </Pressable>

          <Pressable
            onPress={() => setFilter('challenging')}
            style={[styles.filterChip, filter === 'challenging' && styles.challengingChipActive]}
          >
            <AlertTriangle size={14} color={filter === 'challenging' ? '#9F1239' : '#475569'} />
            <AccessibleText
              style={[
                styles.filterText,
                filter === 'challenging' && { color: '#9F1239' },
              ]}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              Zorlayıcı
            </AccessibleText>
          </Pressable>
        </View>

        {isMock ? (
          <View style={styles.mockBanner}>
            <AccessibleText style={styles.mockText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              Canlı endpoint yerine mock detay listesi gösteriliyor.
            </AccessibleText>
          </View>
        ) : null}

        {loading && !data ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="small" color={palette.accent} />
            <AccessibleText style={styles.stateText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              Teknik etkileşimler yükleniyor…
            </AccessibleText>
          </View>
        ) : null}

        {!loading && error ? (
          <View style={styles.stateCard}>
            <AccessibleText style={styles.errorText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              {error}
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

        {filteredAspects.map((aspect) => {
          const expanded = Boolean(expandedRows[aspect.id]);
          const supportive = aspect.type === 'supportive';

          return (
            <View key={aspect.id} style={styles.aspectCard}>
              <Pressable
                onPress={() => {
                  setExpandedRows((prev) => ({
                    ...prev,
                    [aspect.id]: !prev[aspect.id],
                  }));
                }}
                style={styles.aspectHead}
                accessibilityRole="button"
                accessibilityLabel={`${aspect.aspectName} detayını ${expanded ? 'kapat' : 'aç'}`}
              >
                <View style={styles.aspectTitleWrap}>
                  <AccessibleText
                    style={styles.aspectTitle}
                    maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                  >
                    {aspect.aspectName}
                  </AccessibleText>
                  <AccessibleText
                    style={styles.aspectMeta}
                    maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                  >
                    {aspect.themeGroup} • Orb {aspect.orb.toFixed(1)}°
                  </AccessibleText>
                </View>

                <View
                  style={[
                    styles.aspectTypeBadge,
                    supportive ? styles.supportiveTypeBadge : styles.challengingTypeBadge,
                  ]}
                >
                  {supportive ? (
                    <CheckCircle2 size={12} color="#166534" />
                  ) : (
                    <AlertTriangle size={12} color="#9F1239" />
                  )}
                  <AccessibleText
                    style={[styles.aspectTypeText, supportive ? styles.supportiveText : styles.challengingText]}
                    maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                  >
                    {supportive ? 'Destekleyici' : 'Zorlayıcı'}
                  </AccessibleText>
                </View>

                {expanded ? <ChevronUp size={16} color="#6B6381" /> : <ChevronDown size={16} color="#6B6381" />}
              </Pressable>

              <AccessibleText
                style={styles.aspectMeaning}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              >
                {aspect.plainMeaning}
              </AccessibleText>

              {expanded ? (
                <View style={styles.detailBox}>
                  <AccessibleText
                    style={styles.detailTitle}
                    maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                  >
                    Öneri
                  </AccessibleText>
                  <AccessibleText
                    style={styles.detailText}
                    maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                  >
                    {aspect.advicePlain}
                  </AccessibleText>

                  {aspect.planets?.length ? (
                    <AccessibleText
                      style={styles.detailMeta}
                      maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                    >
                      Gezegenler: {aspect.planets.join(' • ')}
                    </AccessibleText>
                  ) : null}

                  {aspect.houses?.length ? (
                    <AccessibleText
                      style={styles.detailMeta}
                      maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                    >
                      Evler: {aspect.houses.join(' • ')}
                    </AccessibleText>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}

        {!loading && !filteredAspects.length ? (
          <View style={styles.emptyCard}>
            <Sparkles size={16} color="#6D28D9" />
            <AccessibleText style={styles.emptyText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              Bu filtre için etkileşim bulunamadı.
            </AccessibleText>
          </View>
        ) : null}
        </ScrollView>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 108,
    gap: 10,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E1F2',
    padding: 3,
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
  counterCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counterLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#463D5E',
  },
  counterValue: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.35,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E4DDEC',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterChipActive: {
    borderColor: '#D1C1F8',
    backgroundColor: '#F3ECFF',
  },
  supportiveChipActive: {
    borderColor: '#B7E7C8',
    backgroundColor: '#ECFDF3',
  },
  challengingChipActive: {
    borderColor: '#F8C5CB',
    backgroundColor: '#FFF1F4',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  filterTextActive: {
    color: '#5B21B6',
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
  aspectCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7E0F1',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 8,
  },
  aspectHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aspectTitleWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  aspectTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#251E38',
    letterSpacing: -0.3,
  },
  aspectMeta: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6C6482',
  },
  aspectTypeBadge: {
    minHeight: 28,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  supportiveTypeBadge: {
    backgroundColor: '#EAF9F0',
    borderColor: '#B7E7C8',
  },
  challengingTypeBadge: {
    backgroundColor: '#FDEEEF',
    borderColor: '#F8C5CB',
  },
  aspectTypeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  supportiveText: {
    color: '#166534',
  },
  challengingText: {
    color: '#9F1239',
  },
  aspectMeaning: {
    fontSize: 14,
    lineHeight: 20,
    color: '#453C5D',
    fontWeight: '600',
  },
  detailBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9E1F5',
    backgroundColor: '#FBF8FF',
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 5,
  },
  detailTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#5B21B6',
  },
  detailText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#332C47',
  },
  detailMeta: {
    fontSize: 12,
    lineHeight: 16,
    color: '#5C5474',
    fontWeight: '600',
  },
  emptyCard: {
    marginTop: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7E0F1',
    backgroundColor: '#FFFFFF',
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#5A5272',
    fontWeight: '700',
  },
});
