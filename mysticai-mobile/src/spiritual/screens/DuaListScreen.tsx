/**
 * DuaListScreen — Dua listesi (Sure hariç)
 * EsmaListScreen ile birebir tasarım: sıra no | isim+anlam | Arapça kaligrafi
 * Seçim / İstatistikler sekmeleri, Light tema
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useContentStore } from '../store/useContentStore';
import { useJournalStore } from '../store/useJournalStore';
import { SpiritualBarChart } from '../components/SpiritualBarChart';
import { SpiritualListItem } from '../components/SpiritualListItem';
import { useTheme } from '../../context/ThemeContext';
import { SafeScreen } from '../../components/ui';
import { TYPOGRAPHY, SPACING, RADIUS, ACCESSIBILITY } from '../../constants/tokens';
import type { DuaItem, BarChartDataPoint } from '../types';

type Tab = 'selection' | 'stats';

/** First meaningful Arabic word(s) for list display */
function arabicSnippet(arabic: string): string {
  // Take first 2-3 words (up to ~30 chars) for compact display
  const words = arabic.replace(/^بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\s*۝?\s*/, '').split(/\s+/);
  let result = '';
  for (const w of words) {
    if (result.length + w.length > 25) break;
    result += (result ? ' ' : '') + w;
  }
  return result || words[0] || '';
}

export default function DuaListScreen() {
  const { duaList } = useContentStore();
  const journal = useJournalStore();
  const { isDark } = useTheme();

  const [tab, setTab] = useState<Tab>('selection');
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const { width } = useWindowDimensions();

  // Sadece Sure olmayanlar
  const duaOnly = useMemo(() => duaList.filter((d) => d.category !== 'SURE'), [duaList]);

  // --- LIGHT-FORWARD PALETTE (indigo/violet) ---
  const ACCENT = isDark ? '#818CF8' : '#6366F1';
  const TEXT = isDark ? '#F8FAFC' : '#1E1B4B';
  const SUBTEXT = isDark ? '#A5B4FC' : '#6B7280';
  const SURFACE = isDark ? '#1E1B4B' : '#FFFFFF';
  const BORDER = isDark ? '#312E81' : '#E0E7FF';
  const GRAD: [string, string] = isDark
    ? ['#0F0D2E', '#1E1B4B']
    : ['#F5F3FF', '#EEF2FF'];
  const TAB_ACTIVE_TEXT = isDark ? '#1E1B4B' : '#FFFFFF';

  // Categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    duaOnly.forEach((d) => cats.add(d.category));
    return [...cats].sort();
  }, [duaOnly]);

  const categoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      SABAH: 'Sabah', AKSAM: 'Akşam', GECE: 'Gece', 'ZİKİR': 'Zikir',
      KORUNMA: 'Korunma', SALAVAT: 'Salavat', BEREKET: 'Bereket',
      HUZUR: 'Huzur', 'ŞİFA': 'Şifa', 'İLİM': 'İlim',
      SABAH_AKSAM: 'Sabah/Akşam',
    };
    return labels[cat] ?? cat;
  };

  // Filter
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return duaOnly.filter((d) => {
      const mQ =
        q === '' ||
        d.title.toLowerCase().includes(q) ||
        d.transliteration.toLowerCase().includes(q) ||
        d.meaningTr.toLowerCase().includes(q);
      const mC = !selectedCategory || d.category === selectedCategory;
      return mQ && mC;
    });
  }, [duaOnly, query, selectedCategory]);

  // Stats
  const chartData = useMemo<BarChartDataPoint[]>(() => {
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    const dailies = journal.getDailyTotals(
      from.toISOString().slice(0, 10),
      today.toISOString().slice(0, 10),
    );
    return dailies.map((d) => {
      const dt = new Date(d.dateISO);
      const label = dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
      return { label, value: d.total, dateISO: d.dateISO };
    });
  }, [journal]);

  const today7From = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  }, []);
  const topItems = useMemo(
    () => journal.getTopItems(today7From, new Date().toISOString().slice(0, 10), 3),
    [journal, today7From],
  );
  const streak = journal.getStreakDays();

  const renderDua = useCallback(
    ({ item, index }: { item: DuaItem; index: number }) => (
      <SpiritualListItem
        order={index + 1}
        title={item.title}
        subtitle={item.meaningTr}
        arabicText={arabicSnippet(item.arabic)}
        accentColor={ACCENT}
        textColor={TEXT}
        subtextColor={SUBTEXT}
        borderColor={BORDER}
        onPress={() =>
          router.push({ pathname: '/spiritual/dua/[id]', params: { id: item.id } })
        }
      />
    ),
    [ACCENT, TEXT, SUBTEXT, BORDER],
  );

  return (
    <SafeScreen style={{ backgroundColor: GRAD[0] }}>
      <LinearGradient colors={GRAD} style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12} accessibilityLabel="Geri">
            <Ionicons name="chevron-back" size={24} color={TEXT} />
          </Pressable>
        <Text
          style={[styles.headerTitle, { color: TEXT }]}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          Dualar
        </Text>
        <View style={styles.backBtn} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: SURFACE + '88', borderColor: BORDER }]}>
        {(['selection', 'stats'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.tab, tab === t && { backgroundColor: ACCENT }]}
            onPress={() => setTab(t)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
          >
            <Text style={[styles.tabText, { color: tab === t ? TAB_ACTIVE_TEXT : TEXT + 'AA' }]}>
              {t === 'selection' ? 'Seçim' : 'İstatistikler'}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'selection' ? (
        <>
          {/* Search */}
          <View style={[styles.searchWrapper, { backgroundColor: SURFACE + 'AA', borderColor: BORDER }]}>
            <Ionicons name="search" size={16} color={SUBTEXT} />
            <TextInput
              style={[styles.searchInput, { color: TEXT }]}
              placeholder="Dua ara..."
              placeholderTextColor={TEXT + '44'}
              value={query}
              onChangeText={setQuery}
              accessibilityLabel="Dua ara"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} accessibilityLabel="Aramayı temizle">
                <Ionicons name="close-circle" size={18} color={TEXT + '88'} />
              </Pressable>
            )}
          </View>

          {/* Category filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catFilterRow}
          >
            <Pressable
              style={[styles.catChip, !selectedCategory && { backgroundColor: ACCENT }]}
              onPress={() => setSelectedCategory(undefined)}
            >
              <Text style={[styles.catChipText, { color: !selectedCategory ? TAB_ACTIVE_TEXT : SUBTEXT }]}>
                Tümü
              </Text>
            </Pressable>
            {categories.map((cat) => (
              <Pressable
                key={cat}
                style={[
                  styles.catChip,
                  { borderColor: BORDER, borderWidth: 1 },
                  selectedCategory === cat && { backgroundColor: ACCENT, borderColor: ACCENT },
                ]}
                onPress={() => setSelectedCategory(selectedCategory === cat ? undefined : cat)}
              >
                <Text style={[styles.catChipText, { color: selectedCategory === cat ? TAB_ACTIVE_TEXT : SUBTEXT }]}>
                  {categoryLabel(cat)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* List */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderDua}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={[styles.empty, { color: SUBTEXT }]}>Sonuç bulunamadı.</Text>
            }
          />
        </>
      ) : (
        <ScrollView contentContainerStyle={styles.statsContent}>
          <View style={[styles.chartCard, { backgroundColor: SURFACE, borderColor: BORDER }]}>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: ACCENT }]} />
              <Text style={[styles.legendText, { color: SUBTEXT }]}>Dua Sayısı</Text>
            </View>
            <SpiritualBarChart
              data={chartData}
              width={width - 48}
              height={180}
              barColor={ACCENT}
              labelColor={SUBTEXT + 'BB'}
              axisColor={BORDER}
            />
          </View>

          <View style={[styles.metricRow, { backgroundColor: SURFACE, borderColor: BORDER }]}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: ACCENT }]}>{streak}</Text>
              <Text style={[styles.metricLabel, { color: SUBTEXT }]}>Gün Serisi</Text>
            </View>
            <View style={[styles.metricDivider, { backgroundColor: BORDER }]} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: ACCENT }]}>
                {chartData.reduce((sum, d) => sum + d.value, 0)}
              </Text>
              <Text style={[styles.metricLabel, { color: SUBTEXT }]}>7 Günlük Toplam</Text>
            </View>
          </View>

          {topItems.length > 0 && (
            <View style={[styles.topCard, { backgroundColor: SURFACE, borderColor: BORDER }]}>
              <Text style={[styles.topTitle, { color: TEXT }]}>En Çok Okunanlar</Text>
              {topItems.map((item, i) => (
                <View key={`${item.itemType}-${item.itemId}`} style={[styles.topRow, { borderColor: BORDER }]}>
                  <Text style={[styles.topRank, { color: ACCENT }]}>#{i + 1}</Text>
                  <Text style={[styles.topName, { color: TEXT }]} numberOfLines={1}>{item.itemName}</Text>
                  <Text style={[styles.topCount, { color: SUBTEXT }]}>{item.total}</Text>
                </View>
              ))}
            </View>
          )}

          {topItems.length === 0 && (
            <Text style={[styles.empty, { color: SUBTEXT, textAlign: 'center', marginTop: 20 }]}>
              Henüz kayıt yok. İlk duanı oku!
            </Text>
          )}
        </ScrollView>
      )}
      </LinearGradient>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: SPACING.lgXl,
    paddingBottom: SPACING.md,
  },
  backBtn: { width: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...TYPOGRAPHY.H2 },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabText: { ...TYPOGRAPHY.SmallBold },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  searchInput: { flex: 1, ...TYPOGRAPHY.Body },
  catFilterRow: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  catChipText: { ...TYPOGRAPHY.CaptionBold },
  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: 32 },
  empty: { textAlign: 'center', marginTop: 32, ...TYPOGRAPHY.Small },
  statsContent: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: 40 },
  chartCard: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.mdLg, gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { ...TYPOGRAPHY.CaptionBold },
  metricRow: {
    flexDirection: 'row',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricItem: { alignItems: 'center', gap: 4 },
  metricValue: { fontSize: 28, fontWeight: '900' },
  metricLabel: { ...TYPOGRAPHY.Caption },
  metricDivider: { width: 1, height: 40 },
  topCard: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.mdLg, gap: 10 },
  topTitle: { ...TYPOGRAPHY.BodyBold },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  topRank: { ...TYPOGRAPHY.SmallBold, minWidth: 24 },
  topName: { flex: 1, ...TYPOGRAPHY.SmallBold },
  topCount: { ...TYPOGRAPHY.SmallBold },
});
