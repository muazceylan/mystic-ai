/**
 * StatsScreen — İstatistikler: 7g / 30g sekmeleri, bar chart, metrikler
 * Y ekseni otomatik max scale (normalize etmez)
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeScreen, HeaderRightIcons } from '../../components/ui';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { useTheme } from '../../context/ThemeContext';
import { useJournalStore } from '../store/useJournalStore';
import { SpiritualBarChart } from '../components/SpiritualBarChart';
import type { BarChartDataPoint } from '../types';

type Period = '7d' | '30d' | 'all';

export default function StatsScreen() {
  const { t, i18n } = useTranslation();
  const goBack = useBackNavigation();
  const journal = useJournalStore();
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const [period, setPeriod] = useState<Period>('7d');

  const GRAD: [string, string] = isDark ? ['#0F1B2D', '#060E1A'] : [colors.bg, colors.bgGrad1];
  const ACCENT = isDark ? '#60A5FA' : colors.primary;
  const TEXT = isDark ? '#E0EEFF' : colors.text;
  const SUBTEXT = isDark ? '#93C5FD' : colors.subtext;
  const SURFACE = isDark ? '#162032' : colors.surface;
  const BORDER = isDark ? '#1E3A5F' : colors.border;

  const lcStr = i18n.language === 'tr' ? 'tr-TR' : 'en-US';

  const dateRange = useMemo(() => {
    const today = new Date();
    const toISO = today.toISOString().slice(0, 10);

    if (period === '7d') {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from: from.toISOString().slice(0, 10), to: toISO };
    }
    if (period === '30d') {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return { from: from.toISOString().slice(0, 10), to: toISO };
    }
    // all: ilk kayıttan bugüne
    const earliest = journal.entries.reduce(
      (min, e) => (e.dateISO < min ? e.dateISO : min),
      toISO,
    );
    return { from: earliest, to: toISO };
  }, [period, journal.entries]);

  const chartData = useMemo<BarChartDataPoint[]>(() => {
    const dailies = journal.getDailyTotals(dateRange.from, dateRange.to);

    if (period === '7d') {
      return dailies.map((d) => {
        const dt = new Date(d.dateISO);
        return {
          label: dt.toLocaleDateString(lcStr, { day: 'numeric', month: 'short' }),
          value: d.total,
          dateISO: d.dateISO,
        };
      });
    }

    // 30g: haftalık toplam
    const weeks: Record<string, { total: number; startDate: string }> = {};
    for (const d of dailies) {
      const dt = new Date(d.dateISO);
      const weekStart = new Date(dt);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      if (!weeks[key]) weeks[key] = { total: 0, startDate: key };
      weeks[key].total += d.total;
    }
    return Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({
        label: new Date(v.startDate).toLocaleDateString(lcStr, { day: 'numeric', month: 'short' }),
        value: v.total,
        dateISO: v.startDate,
      }));
  }, [dateRange, journal, period, lcStr]);

  const { prayerTotal, esmaTotal, dayCount } = useMemo(
    () => journal.getTotalByDateRange(dateRange.from, dateRange.to),
    [journal, dateRange],
  );

  const streak = journal.getStreakDays();

  const topItems = useMemo(
    () => journal.getTopItems(dateRange.from, dateRange.to, 3),
    [journal, dateRange],
  );

  const periodLabel: Record<Period, string> = {
    '7d': t('statsScreen.period7d'),
    '30d': t('statsScreen.period30d'),
    all: t('statsScreen.periodAll'),
  };

  return (
    <SafeScreen style={{ backgroundColor: GRAD[0] }}>
      <LinearGradient colors={GRAD} style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={TEXT} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: TEXT }]}>{t('statsScreen.headerTitle')}</Text>
        <HeaderRightIcons tintColor={TEXT} />
      </View>

      {/* Period selector */}
      <View style={[styles.periodBar, { backgroundColor: SURFACE, borderColor: BORDER }]}>
        {(['7d', '30d', 'all'] as Period[]).map((p) => (
          <Pressable
            key={p}
            style={[
              styles.periodBtn,
              period === p && { backgroundColor: ACCENT },
            ]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, { color: period === p ? (isDark ? '#0F1B2D' : '#FFFFFF') : TEXT + 'AA' }]}>
              {periodLabel[p]}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Chart */}
        <View style={[styles.chartCard, { backgroundColor: SURFACE, borderColor: BORDER }]}>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: ACCENT }]} />
            <Text style={[styles.legendText, { color: SUBTEXT }]}>{t('statsScreen.legendDhikr')}</Text>
          </View>
          <SpiritualBarChart
            data={chartData}
            width={width - 48}
            height={190}
            barColor={ACCENT}
            labelColor={SUBTEXT + 'BB'}
            axisColor={BORDER}
          />
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          <MetricCard label={t('statsScreen.metricPrayerRepeat')} value={prayerTotal} accent={ACCENT} text={TEXT} sub={SUBTEXT} surface={SURFACE} border={BORDER} />
          <MetricCard label={t('statsScreen.metricEsmaRepeat')} value={esmaTotal} accent={ACCENT} text={TEXT} sub={SUBTEXT} surface={SURFACE} border={BORDER} />
          <MetricCard label={t('statsScreen.metricActiveDays')} value={dayCount} accent={ACCENT} text={TEXT} sub={SUBTEXT} surface={SURFACE} border={BORDER} />
          <MetricCard label={t('statsScreen.metricStreak')} value={streak} accent={ACCENT} text={TEXT} sub={SUBTEXT} surface={SURFACE} border={BORDER} />
        </View>

        {/* Top 3 */}
        {topItems.length > 0 && (
          <View style={[styles.topCard, { backgroundColor: SURFACE, borderColor: BORDER }]}>
            <Text style={[styles.topTitle, { color: TEXT }]}>{t('statsScreen.topTitle')}</Text>
            {topItems.map((item, i) => (
              <View
                key={`${item.itemType}-${item.itemId}`}
                style={[styles.topRow, { borderColor: BORDER }]}
              >
                <Text style={[styles.topRank, { color: ACCENT }]}>#{i + 1}</Text>
                <View style={styles.topItemInfo}>
                  <Text style={[styles.topName, { color: TEXT }]} numberOfLines={1}>
                    {item.itemName}
                  </Text>
                  <Text style={[styles.topType, { color: SUBTEXT }]}>
                    {item.itemType === 'esma' ? t('statsScreen.typeEsma') : t('statsScreen.typeDua')}
                  </Text>
                </View>
                <Text style={[styles.topCount, { color: ACCENT }]}>{item.total}</Text>
              </View>
            ))}
          </View>
        )}

        {journal.entries.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: SUBTEXT }]}>
              {t('statsScreen.emptyText')}
            </Text>
          </View>
        )}
      </ScrollView>
      </LinearGradient>
    </SafeScreen>
  );
}

function MetricCard({
  label,
  value,
  accent,
  text,
  sub,
  surface,
  border,
}: {
  label: string;
  value: number;
  accent: string;
  text: string;
  sub: string;
  surface: string;
  border: string;
}) {
  return (
    <View style={[metricStyles.card, { backgroundColor: surface, borderColor: border }]}>
      <Text style={[metricStyles.value, { color: accent }]}>{value}</Text>
      <Text style={[metricStyles.label, { color: sub }]}>{label}</Text>
    </View>
  );
}

const metricStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    minWidth: '45%',
  },
  value: { fontSize: 28, fontWeight: '900' },
  label: { fontSize: 11, textAlign: 'center' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: { width: 40, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 22, fontWeight: '700' },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  periodBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  periodText: { fontSize: 13, fontWeight: '700' },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  chartCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontWeight: '600' },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  topCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  topTitle: { fontSize: 15, fontWeight: '700' },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  topRank: { fontSize: 14, fontWeight: '700', minWidth: 24 },
  topItemInfo: { flex: 1, gap: 2 },
  topName: { fontSize: 14, fontWeight: '600' },
  topType: { fontSize: 11 },
  topCount: { fontSize: 18, fontWeight: '900' },
  emptyState: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
