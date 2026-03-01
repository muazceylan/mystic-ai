/**
 * EsmaListScreen — Esmaül Hüsna listesi
 * Seçim / İstatistikler sekmeleri
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
import { SafeScreen, HeaderRightIcons } from '../../components/ui';
import { TYPOGRAPHY, SPACING, RADIUS, ACCESSIBILITY } from '../../constants/tokens';
import type { EsmaItem, BarChartDataPoint } from '../types';

type Tab = 'selection' | 'stats';

export default function EsmaListScreen() {
  const { esmaList } = useContentStore();
  const journal = useJournalStore();
  const { colors, isDark } = useTheme();

  const [tab, setTab] = useState<Tab>('selection');
  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined);
  const { width } = useWindowDimensions();

  // Theme-aware colors derived from spiritual tokens
  const ACCENT = colors.spiritualEsma;
  const ACCENT2 = isDark ? '#86EFAC' : '#BBF7D0';
  const TEXT = isDark ? '#F0FFF4' : '#0F172A';
  const SUBTEXT = isDark ? '#86EFAC' : '#16A34A';
  const SURFACE = isDark ? '#1A3D28' : '#F0FDF4';
  const BORDER = isDark ? '#2D5A3D' : '#BBF7D0';
  const GRAD: [string, string] = isDark
    ? ['#0D3B21', '#0A2A17']
    : ['#F0FDF4', '#DCFCE7'];

  // Filter
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return esmaList.filter((e) => {
      const mQ =
        q === '' ||
        e.nameTr.toLowerCase().includes(q) ||
        e.transliteration.toLowerCase().includes(q) ||
        e.meaningTr.toLowerCase().includes(q);
      const mT = !selectedTag || e.tags.includes(selectedTag);
      return mQ && mT;
    });
  }, [esmaList, query, selectedTag]);

  // Stats: last 7 days bar chart
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

  // Top 3 esma
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

  const renderEsma = useCallback(
    ({ item }: { item: EsmaItem }) => (
      <SpiritualListItem
        order={item.order}
        title={item.nameTr}
        subtitle={item.meaningTr}
        arabicText={item.nameAr}
        accentColor={ACCENT}
        textColor={TEXT}
        subtextColor={SUBTEXT}
        borderColor={BORDER}
        onPress={() =>
          router.push({ pathname: '/spiritual/asma/[id]', params: { id: item.id } })
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
          Esmaül Hüsna
        </Text>
        <HeaderRightIcons tintColor={TEXT} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: SURFACE + '88', borderColor: BORDER }]}>
        {(['selection', 'stats'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            style={[
              styles.tab,
              tab === t && { backgroundColor: ACCENT },
            ]}
            onPress={() => setTab(t)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
          >
            <Text
              style={[
                styles.tabText,
                { color: tab === t ? (isDark ? '#0D3B21' : '#fff') : TEXT + 'AA' },
              ]}
            >
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
              placeholder="Ara..."
              placeholderTextColor={TEXT + '44'}
              value={query}
              onChangeText={setQuery}
              accessibilityLabel="Esma ara"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} accessibilityLabel="Aramayı temizle">
                <Ionicons name="close-circle" size={18} color={TEXT + '88'} />
              </Pressable>
            )}
          </View>

          {/* List */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderEsma}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={[styles.empty, { color: SUBTEXT }]}>Sonuç bulunamadı.</Text>
            }
          />
        </>
      ) : (
        <ScrollView contentContainerStyle={styles.statsContent}>
          {/* Bar Chart */}
          <View style={[styles.chartCard, { backgroundColor: SURFACE, borderColor: BORDER }]}>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: ACCENT }]} />
              <Text style={[styles.legendText, { color: SUBTEXT }]}>Zikir Sayısı</Text>
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

          {/* Streak */}
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

          {/* Top 3 */}
          {topItems.length > 0 && (
            <View style={[styles.topCard, { backgroundColor: SURFACE, borderColor: BORDER }]}>
              <Text style={[styles.topTitle, { color: TEXT }]}>En Çok Okunanlar</Text>
              {topItems.map((item, i) => (
                <View key={`${item.itemType}-${item.itemId}`} style={[styles.topRow, { borderColor: BORDER }]}>
                  <Text style={[styles.topRank, { color: ACCENT }]}>#{i + 1}</Text>
                  <Text style={[styles.topName, { color: TEXT }]} numberOfLines={1}>
                    {item.itemName}
                  </Text>
                  <Text style={[styles.topCount, { color: SUBTEXT }]}>{item.total}</Text>
                </View>
              ))}
            </View>
          )}

          {topItems.length === 0 && (
            <Text style={[styles.empty, { color: SUBTEXT, textAlign: 'center', marginTop: 20 }]}>
              Henüz kayıt yok. İlk zikrini tamamla!
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
    paddingTop: SPACING.md,
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
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
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
  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: 32 },
  empty: { textAlign: 'center', marginTop: 32, ...TYPOGRAPHY.Small },

  // Stats
  statsContent: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: 40 },
  chartCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.mdLg,
    gap: 10,
  },
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
  topCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.mdLg,
    gap: 10,
  },
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
