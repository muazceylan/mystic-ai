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
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { SymbolInsight } from '../services/dream.service';
import { useDreamStore } from '../store/useDreamStore';
import { ErrorStateCard } from './ui';
import { COLORS } from '../constants/colors';

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
  const { analytics, analyticsLoading, analyticsError, fetchAnalytics } = useDreamStore();
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolInsight | null>(null);
  const [meaning, setMeaning] = useState<SymbolMeaning | null>(null);
  const [meaningLoading, setMeaningLoading] = useState(false);

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
        universal: 'Anlam yüklenemedi.',
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
          style={styles.symbolCard}
          onPress={() => fetchMeaning(item)}
          activeOpacity={0.8}
          accessibilityLabel={`${capitalize(item.symbolName)} detaylarını aç`}
          accessibilityRole="button"
        >
          <View style={[styles.symbolRank, { backgroundColor: houseColor + '22', borderColor: houseColor + '55' }]}>
            <Text style={[styles.symbolRankText, { color: houseColor }]}>#{index + 1}</Text>
          </View>
          <View style={styles.symbolInfo}>
            <Text style={styles.symbolName}>{capitalize(item.symbolName)}</Text>
            <Text style={styles.symbolHouse}>{item.houseAssociation}</Text>
          </View>
          <View style={styles.symbolRight}>
            <View style={styles.symbolCountBadge}>
              <Text style={styles.symbolCountText}>{item.count}x</Text>
            </View>
            {item.recurring && (
              <View style={styles.recurringDot} />
            )}
          </View>
          <Ionicons name="chevron-forward" size={14} color={COLORS.dictSub} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const symbols = analytics?.symbolInsights ?? [];

  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Rüya Sözlüğüm</Text>
        {analyticsLoading && <ActivityIndicator size="small" color={COLORS.violetLight} />}
      </View>

      {/* Stats row */}
      {analytics && (
        <Animated.View entering={FadeIn.duration(500)} style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statValue}>{analytics.totalDreams}</Text>
            <Text style={styles.statLabel}>Toplam Rüya</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statValue}>{analytics.currentStreak}</Text>
            <Text style={styles.statLabel}>Günlük Seri</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statValue}>{symbols.length}</Text>
            <Text style={styles.statLabel}>Sembol</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statValue}>{analytics.longestStreak}</Text>
            <Text style={styles.statLabel}>En Uzun</Text>
          </View>
        </Animated.View>
      )}

      {/* Symbol cloud legend */}
      {symbols.length > 0 && (
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={styles.recurringDot} />
            <Text style={styles.legendText}>Tekrarlayan</Text>
          </View>
          <Text style={styles.legendSep}>•</Text>
          <Text style={styles.legendText}>Ev rengi = astrolojik alan</Text>
        </View>
      )}

      {/* Symbol list */}
      {analyticsLoading && symbols.length === 0 ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator size="large" color={COLORS.violetLight} />
          <Text style={styles.loadingText}>Semboller analiz ediliyor...</Text>
        </View>
      ) : analyticsError ? (
        <ErrorStateCard
          message={analyticsError}
          onRetry={() => fetchAnalytics(userId)}
          variant="compact"
          accessibilityLabel="Rüya analizini tekrar yükle"
        />
      ) : symbols.length === 0 ? (
        <View style={styles.emptyBlock}>
          <Text style={styles.emptyIcon}>🔮</Text>
          <Text style={styles.emptyText}>Henüz sembol yok.</Text>
          <Text style={styles.emptySubText}>Rüyalar kaydedildikçe sözlüğün büyüyecek.</Text>
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
        onRequestClose={() => setSelectedSymbol(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setSelectedSymbol(null)}
              accessibilityLabel="Modalı kapat"
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={20} color={COLORS.dictSub} />
            </TouchableOpacity>

            {selectedSymbol && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Symbol header */}
                <Text style={styles.modalTitle}>{capitalize(selectedSymbol.symbolName)}</Text>

                <View style={styles.modalMeta}>
                  <View style={[
                    styles.houseTag,
                    { backgroundColor: getHouseColor(selectedSymbol.houseAssociation) + '25',
                      borderColor: getHouseColor(selectedSymbol.houseAssociation) + '60' }
                  ]}>
                    <Text style={[
                      styles.houseTagText,
                      { color: getHouseColor(selectedSymbol.houseAssociation) }
                    ]}>
                      {selectedSymbol.houseAssociation}
                    </Text>
                  </View>
                  <Text style={styles.modalCount}>
                    Bu sembolü <Text style={styles.modalCountBold}>{selectedSymbol.count} kez</Text> gördün
                  </Text>
                </View>

                {meaningLoading ? (
                  <View style={styles.meaningLoading}>
                    <ActivityIndicator size="large" color={COLORS.gold} />
                    <Text style={styles.meaningLoadingText}>Yorumlama yapılıyor...</Text>
                  </View>
                ) : meaning ? (
                  <View style={styles.meaningBlock}>
                    {meaning.universal === 'Anlam yüklenemedi.' ? (
                      <ErrorStateCard
                        message="Sembol anlamı yüklenemedi. Bağlantı sorunu olabilir."
                        onRetry={() => selectedSymbol && fetchMeaning(selectedSymbol)}
                        variant="compact"
                        accessibilityLabel="Sembol anlamını tekrar yükle"
                      />
                    ) : (
                      <>
                    <View style={styles.meaningSection}>
                      <Text style={styles.meaningSectionTitle}>🌍 Evrensel Anlam</Text>
                      <Text style={styles.meaningSectionText}>{meaning.universal}</Text>
                    </View>
                    <View style={styles.meaningSection}>
                      <Text style={styles.meaningSectionTitle}>🧠 Psikolojik Yansıma</Text>
                      <Text style={styles.meaningSectionText}>{meaning.psychological}</Text>
                    </View>
                    <View style={[styles.meaningSection, styles.personalSection]}>
                      <Text style={[styles.meaningSectionTitle, { color: COLORS.gold }]}>✦ Senin İçin Mesaj</Text>
                      <Text style={[styles.meaningSectionText, { color: COLORS.white }]}>{meaning.personal}</Text>
                    </View>
                      </>
                    )}
                  </View>
                ) : null}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
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
    color: COLORS.gold,
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statChip: {
    flex: 1,
    backgroundColor: COLORS.dictSurface,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.dictBorder,
  },
  statValue: { fontSize: 16, fontWeight: '800', color: COLORS.dictText },
  statLabel: { fontSize: 10, color: COLORS.dictSub, marginTop: 2 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recurringDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.gold,
  },
  legendText: { fontSize: 11, color: COLORS.dictSub },
  legendSep: { color: COLORS.dictSub, fontSize: 11 },
  symbolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.dictSurface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.dictBorder,
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
  symbolName: { fontSize: 14, fontWeight: '700', color: COLORS.dictText },
  symbolHouse: { fontSize: 11, color: COLORS.dictSub, marginTop: 2 },
  symbolRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  symbolCountBadge: {
    backgroundColor: 'rgba(124,77,255,0.2)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  symbolCountText: { fontSize: 12, fontWeight: '700', color: COLORS.violetLightLight },
  loadingBlock: { alignItems: 'center', paddingVertical: 30, gap: 12 },
  loadingText: { fontSize: 13, color: COLORS.dictSub, fontStyle: 'italic' },
  emptyBlock: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyIcon: { fontSize: 36 },
  emptyText: { fontSize: 15, color: COLORS.dictText, fontWeight: '600' },
  emptySubText: { fontSize: 12, color: COLORS.dictSub, textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.dictBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 12,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderColor: COLORS.dictBorder,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.dictBorder,
    alignSelf: 'center', marginBottom: 12,
  },
  modalClose: {
    position: 'absolute', top: 12, right: 20,
    padding: 6,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.gold,
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
  modalCount: { fontSize: 13, color: COLORS.dictSub },
  modalCountBold: { color: COLORS.dictText, fontWeight: '700' },
  meaningLoading: { alignItems: 'center', paddingVertical: 30, gap: 10 },
  meaningLoadingText: { fontSize: 13, color: COLORS.dictSub, fontStyle: 'italic' },
  meaningBlock: { gap: 14, paddingBottom: 24 },
  meaningSection: {
    backgroundColor: COLORS.dictSurface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.dictBorder,
    gap: 6,
  },
  personalSection: {
    backgroundColor: 'rgba(200,168,75,0.08)',
    borderColor: 'rgba(200,168,75,0.3)',
  },
  meaningSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  meaningSectionText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.dictSub,
  },
});
