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

const C = {
  bg: '#12103D',
  surface: '#1F1C5A',
  border: 'rgba(124,77,255,0.3)',
  gold: '#C8A84B',
  purple: '#7C4DFF',
  purpleLight: '#A880FF',
  white: '#EEE8FF',
  sub: '#8A7FA8',
  green: '#3FA46A',
  orange: '#E08A00',
};

const HOUSE_COLORS: Record<string, string> = {
  '1. Ev': '#E53935', '2. Ev': '#8D6E63', '3. Ev': '#1E88E5',
  '4. Ev': '#26A69A', '5. Ev': '#F4511E', '6. Ev': '#43A047',
  '7. Ev': '#D81B60', '8. Ev': '#6A1B9A', '9. Ev': '#00838F',
  '10. Ev': '#FF8F00', '11. Ev': '#3949AB', '12. Ev': '#4527A0',
};

function getHouseColor(houseStr: string): string {
  const match = Object.keys(HOUSE_COLORS).find(k => houseStr.includes(k));
  return match ? HOUSE_COLORS[match] : '#7C4DFF';
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
  const { analytics, analyticsLoading, fetchAnalytics } = useDreamStore();
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
        <TouchableOpacity style={styles.symbolCard} onPress={() => fetchMeaning(item)} activeOpacity={0.8}>
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
          <Ionicons name="chevron-forward" size={14} color={C.sub} />
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
        {analyticsLoading && <ActivityIndicator size="small" color={C.purple} />}
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
          <ActivityIndicator size="large" color={C.purple} />
          <Text style={styles.loadingText}>Semboller analiz ediliyor...</Text>
        </View>
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

            <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedSymbol(null)}>
              <Ionicons name="close" size={20} color={C.sub} />
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
                    <ActivityIndicator size="large" color={C.gold} />
                    <Text style={styles.meaningLoadingText}>Yorumlama yapılıyor...</Text>
                  </View>
                ) : meaning ? (
                  <View style={styles.meaningBlock}>
                    <View style={styles.meaningSection}>
                      <Text style={styles.meaningSectionTitle}>🌍 Evrensel Anlam</Text>
                      <Text style={styles.meaningSectionText}>{meaning.universal}</Text>
                    </View>
                    <View style={styles.meaningSection}>
                      <Text style={styles.meaningSectionTitle}>🧠 Psikolojik Yansıma</Text>
                      <Text style={styles.meaningSectionText}>{meaning.psychological}</Text>
                    </View>
                    <View style={[styles.meaningSection, styles.personalSection]}>
                      <Text style={[styles.meaningSectionTitle, { color: C.gold }]}>✦ Senin İçin Mesaj</Text>
                      <Text style={[styles.meaningSectionText, { color: '#EEE8FF' }]}>{meaning.personal}</Text>
                    </View>
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
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  statValue: { fontSize: 16, fontWeight: '800', color: C.white },
  statLabel: { fontSize: 10, color: C.sub, marginTop: 2 },
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
  legendText: { fontSize: 11, color: C.sub },
  legendSep: { color: C.sub, fontSize: 11 },
  symbolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
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
  symbolName: { fontSize: 14, fontWeight: '700', color: C.white },
  symbolHouse: { fontSize: 11, color: C.sub, marginTop: 2 },
  symbolRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  symbolCountBadge: {
    backgroundColor: 'rgba(124,77,255,0.2)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  symbolCountText: { fontSize: 12, fontWeight: '700', color: C.purpleLight },
  loadingBlock: { alignItems: 'center', paddingVertical: 30, gap: 12 },
  loadingText: { fontSize: 13, color: C.sub, fontStyle: 'italic' },
  emptyBlock: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyIcon: { fontSize: 36 },
  emptyText: { fontSize: 15, color: C.white, fontWeight: '600' },
  emptySubText: { fontSize: 12, color: C.sub, textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 12,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderColor: C.border,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.border,
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
  modalCount: { fontSize: 13, color: C.sub },
  modalCountBold: { color: C.white, fontWeight: '700' },
  meaningLoading: { alignItems: 'center', paddingVertical: 30, gap: 10 },
  meaningLoadingText: { fontSize: 13, color: C.sub, fontStyle: 'italic' },
  meaningBlock: { gap: 14, paddingBottom: 24 },
  meaningSection: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 6,
  },
  personalSection: {
    backgroundColor: 'rgba(200,168,75,0.08)',
    borderColor: 'rgba(200,168,75,0.3)',
  },
  meaningSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: C.purpleLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  meaningSectionText: {
    fontSize: 14,
    lineHeight: 22,
    color: C.sub,
  },
});
