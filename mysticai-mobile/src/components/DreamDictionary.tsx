import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { SymbolInsight } from '../services/dream.service';
import { useDreamStore } from '../store/useDreamStore';
import { ErrorStateCard } from './ui';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../constants/colors';
import { useBottomSheetDragGesture } from './ui/useBottomSheetDragGesture';

const HOUSE_COLORS: Record<string, string> = {
  '1. Ev': COLORS.house1, '2. Ev': COLORS.house2, '3. Ev': COLORS.house3,
  '4. Ev': COLORS.house4, '5. Ev': COLORS.house5, '6. Ev': COLORS.house6,
  '7. Ev': COLORS.house7, '8. Ev': COLORS.house8, '9. Ev': COLORS.house9,
  '10. Ev': COLORS.house10, '11. Ev': COLORS.house11, '12. Ev': COLORS.house12,
};

function getHouseColor(houseStr: string): string {
  const match = Object.keys(HOUSE_COLORS).find(k => houseStr.includes(k));
  return match ? HOUSE_COLORS[match] : COLORS.violetLight;
}

interface SymbolMeaning {
  universal: string;
  psychological: string;
  personal: string;
}

interface Props {
  userId: number;
}

export default function DreamDictionary({ userId }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = createStyles(colors);
  const { analytics, analyticsLoading, analyticsError, fetchAnalytics } = useDreamStore();
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolInsight | null>(null);
  const [meaning, setMeaning] = useState<SymbolMeaning | null>(null);
  const [meaningLoading, setMeaningLoading] = useState(false);
  const closeSymbolModal = useCallback(() => setSelectedSymbol(null), []);
  const { animatedStyle, gesture } = useBottomSheetDragGesture({
    enabled: !!selectedSymbol,
    onClose: closeSymbolModal,
  });

  useEffect(() => {
    fetchAnalytics(userId);
  }, [userId]);

  const fetchMeaning = async (symbol: SymbolInsight) => {
    setSelectedSymbol(symbol);
    setMeaning(null);
    setMeaningLoading(true);
    try {
      const res = await api.post<SymbolMeaning>('/api/orchestrator/api/ai/dream/symbol-meaning', {
        symbolName: symbol.symbolName,
        userCount: symbol.count,
        houseAssociation: symbol.houseAssociation,
      });
      setMeaning(res.data);
    } catch {
      setMeaning({
        universal: t('dreamDictionary.meaningLoadError'),
        psychological: '',
        personal: '',
      });
    } finally {
      setMeaningLoading(false);
    }
  };

  const renderSymbolCard = ({ item, index }: { item: SymbolInsight; index: number }) => {
    const houseColor = getHouseColor(item.houseAssociation);
    return (
      <Animated.View entering={FadeInDown.delay(index * 50).duration(400)}>
        <TouchableOpacity
          style={s.symbolCard}
          onPress={() => fetchMeaning(item)}
          activeOpacity={0.8}
          accessibilityLabel={t('dreamDictionary.openDetails', { name: capitalize(item.symbolName) })}
          accessibilityRole="button"
        >
          <View style={[s.symbolRank, { backgroundColor: houseColor + '22', borderColor: houseColor + '55' }]}>
            <Text style={[s.symbolRankText, { color: houseColor }]}>#{index + 1}</Text>
          </View>
          <View style={s.symbolInfo}>
            <Text style={s.symbolName}>{capitalize(item.symbolName)}</Text>
            <Text style={s.symbolHouse}>{item.houseAssociation}</Text>
          </View>
          <View style={s.symbolRight}>
            <View style={s.symbolCountBadge}>
              <Text style={s.symbolCountText}>{item.count}x</Text>
            </View>
            {item.recurring && (
              <View style={s.recurringDot} />
            )}
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.dictSub} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const symbols = analytics?.symbolInsights ?? [];

  return (
    <View style={s.container}>
      <View style={s.headerRow}>
        <Text style={s.sectionTitle}>Rüya Sözlüğüm</Text>
        {analyticsLoading && <ActivityIndicator size="small" color={colors.violetLight} />}
      </View>

      {analytics && (
        <Animated.View entering={FadeIn.duration(500)} style={s.statsRow}>
          <View style={s.statChip}>
            <Text style={s.statValue}>{analytics.totalDreams}</Text>
            <Text style={s.statLabel}>Toplam Rüya</Text>
          </View>
          <View style={s.statChip}>
            <Text style={s.statValue}>{analytics.currentStreak}</Text>
            <Text style={s.statLabel}>Günlük Seri</Text>
          </View>
          <View style={s.statChip}>
            <Text style={s.statValue}>{symbols.length}</Text>
            <Text style={s.statLabel}>Sembol</Text>
          </View>
          <View style={s.statChip}>
            <Text style={s.statValue}>{analytics.longestStreak}</Text>
            <Text style={s.statLabel}>En Uzun</Text>
          </View>
        </Animated.View>
      )}

      {symbols.length > 0 && (
        <View style={s.legendRow}>
          <View style={s.legendItem}>
            <View style={s.recurringDot} />
            <Text style={s.legendText}>Tekrarlayan</Text>
          </View>
          <Text style={s.legendSep}>•</Text>
          <Text style={s.legendText}>Ev rengi = astrolojik alan</Text>
        </View>
      )}

      {analyticsLoading && symbols.length === 0 ? (
        <View style={s.loadingBlock}>
          <ActivityIndicator size="large" color={colors.violetLight} />
          <Text style={s.loadingText}>{t('dreamDictionary.symbolsAnalyzing')}</Text>
        </View>
      ) : analyticsError ? (
        <ErrorStateCard
          message={analyticsError}
          onRetry={() => fetchAnalytics(userId)}
          variant="compact"
          accessibilityLabel={t('dreamDictionary.retryAnalysis')}
        />
      ) : symbols.length === 0 ? (
        <View style={s.emptyBlock}>
          <Text style={s.emptyIcon}>🔮</Text>
          <Text style={s.emptyText}>{t('dreamDictionary.noSymbolsYet')}</Text>
          <Text style={s.emptySubText}>{t('dreamDictionary.noSymbolsHint')}</Text>
        </View>
      ) : (
        <FlatList
          data={symbols}
          keyExtractor={item => item.symbolName}
          renderItem={renderSymbolCard}
          scrollEnabled={false}
          contentContainerStyle={{ paddingBottom: 8 }}
        />
      )}

      {/* Symbol meaning modal */}
      <Modal
        visible={!!selectedSymbol}
        animationType="slide"
        transparent
        onRequestClose={closeSymbolModal}
      >
        <View style={s.modalOverlay}>
          <Animated.View style={[s.modalSheet, animatedStyle]}>
            <GestureDetector gesture={gesture}>
              <View style={s.modalHandle} />
            </GestureDetector>

            <TouchableOpacity
              style={s.modalClose}
              onPress={closeSymbolModal}
              accessibilityLabel={t('dreamDictionary.closeModal')}
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={20} color={colors.dictSub} />
            </TouchableOpacity>

            {selectedSymbol && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={s.modalTitle}>{capitalize(selectedSymbol.symbolName)}</Text>

                <View style={s.modalMeta}>
                  <View style={[
                    s.houseTag,
                    { backgroundColor: getHouseColor(selectedSymbol.houseAssociation) + '25',
                      borderColor: getHouseColor(selectedSymbol.houseAssociation) + '60' }
                  ]}>
                    <Text style={[
                      s.houseTagText,
                      { color: getHouseColor(selectedSymbol.houseAssociation) }
                    ]}>
                      {selectedSymbol.houseAssociation}
                    </Text>
                  </View>
                  <Text style={s.modalCount}>
                    {t('dreamDictionary.seenCount', { count: selectedSymbol.count })}
                  </Text>
                </View>

                {meaningLoading ? (
                  <View style={s.meaningLoading}>
                    <ActivityIndicator size="large" color={colors.gold} />
                    <Text style={s.meaningLoadingText}>{t('dreamDictionary.interpretLoading')}</Text>
                  </View>
                ) : meaning ? (
                  <View style={s.meaningBlock}>
                    {meaning.universal === t('dreamDictionary.meaningLoadError') ? (
                      <ErrorStateCard
                        message={t('dreamDictionary.symbolLoadError')}
                        onRetry={() => selectedSymbol && fetchMeaning(selectedSymbol)}
                        variant="compact"
                        accessibilityLabel={t('dreamDictionary.retrySymbol')}
                      />
                    ) : (
                      <>
                    <View style={s.meaningSection}>
                      <Text style={s.meaningSectionTitle}>🌍 {t('dreamDictionary.universalMeaning')}</Text>
                      <Text style={s.meaningSectionText}>{meaning.universal}</Text>
                    </View>
                    <View style={s.meaningSection}>
                      <Text style={s.meaningSectionTitle}>🧠 {t('dreamDictionary.psychologicalReflection')}</Text>
                      <Text style={s.meaningSectionText}>{meaning.psychological}</Text>
                    </View>
                    <View style={[s.meaningSection, s.personalSection]}>
                      <Text style={[s.meaningSectionTitle, { color: colors.gold }]}>✦ {t('dreamDictionary.messageForYou')}</Text>
                      <Text style={[s.meaningSectionText, { color: colors.white }]}>{meaning.personal}</Text>
                    </View>
                      </>
                    )}
                  </View>
                ) : null}
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function createStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { paddingHorizontal: 16 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      marginTop: 4,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: C.gold,
      letterSpacing: 0.5,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    statChip: {
      flex: 1,
      backgroundColor: C.dictSurface,
      borderRadius: 12,
      paddingVertical: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.dictBorder,
    },
    statValue: { fontSize: 16, fontWeight: '800', color: C.dictText },
    statLabel: { fontSize: 10, color: C.dictSub, marginTop: 2 },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 10,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    recurringDot: {
      width: 8, height: 8, borderRadius: 4, backgroundColor: C.gold,
    },
    legendText: { fontSize: 11, color: C.dictSub },
    legendSep: { color: C.dictSub, fontSize: 11 },
    symbolCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: C.dictSurface,
      borderRadius: 14,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: C.dictBorder,
    },
    symbolRank: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    symbolRankText: { fontSize: 12, fontWeight: '800' },
    symbolInfo: { flex: 1 },
    symbolName: { fontSize: 14, fontWeight: '700', color: C.dictText },
    symbolHouse: { fontSize: 11, color: C.dictSub, marginTop: 2 },
    symbolRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    symbolCountBadge: {
      backgroundColor: C.violetBg,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    symbolCountText: { fontSize: 12, fontWeight: '700', color: C.violetLight },
    loadingBlock: { alignItems: 'center', paddingVertical: 30, gap: 12 },
    loadingText: { fontSize: 13, color: C.dictSub, fontStyle: 'italic' },
    emptyBlock: { alignItems: 'center', paddingVertical: 32, gap: 8 },
    emptyIcon: { fontSize: 36 },
    emptyText: { fontSize: 15, color: C.dictText, fontWeight: '600' },
    emptySubText: { fontSize: 12, color: C.dictSub, textAlign: 'center' },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: C.dictBg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingTop: 12,
      maxHeight: '85%',
      borderTopWidth: 1,
      borderColor: C.dictBorder,
    },
    modalHandle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: C.dictBorder,
      alignSelf: 'center', marginBottom: 12,
    },
    modalClose: {
      position: 'absolute', top: 12, right: 20,
      padding: 6,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: C.gold,
      marginBottom: 10,
      marginTop: 8,
    },
    modalMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16,
      flexWrap: 'wrap',
    },
    houseTag: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      borderWidth: 1,
    },
    houseTagText: { fontSize: 12, fontWeight: '700' },
    modalCount: { fontSize: 13, color: C.dictSub },
    modalCountBold: { color: C.dictText, fontWeight: '700' },
    meaningLoading: { alignItems: 'center', paddingVertical: 30, gap: 10 },
    meaningLoadingText: { fontSize: 13, color: C.dictSub, fontStyle: 'italic' },
    meaningBlock: { gap: 14, paddingBottom: 24 },
    meaningSection: {
      backgroundColor: C.dictSurface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: C.dictBorder,
      gap: 6,
    },
    personalSection: {
      backgroundColor: C.amberLight,
      borderColor: C.border,
    },
    meaningSectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: C.gold,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    meaningSectionText: {
      fontSize: 14,
      lineHeight: 22,
      color: C.dictSub,
    },
  });
}
