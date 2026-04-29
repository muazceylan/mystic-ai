/**
 * JournalScreen — Günlük kayıtlar (gün bazlı gruplama)
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  Pressable,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeScreen, HeaderRightIcons } from '../../components/ui';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { useTheme } from '../../context/ThemeContext';
import { useJournalStore } from '../store/useJournalStore';
import type { JournalEntry } from '../types';

type FilterType = 'all' | 'esma' | 'dua';

interface Section {
  title: string;
  dateISO: string;
  data: JournalEntry[];
}

function formatDateLabel(dateISO: string, todayLabel: string, yesterdayLabel: string, locale: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateISO === today) return todayLabel;
  if (dateISO === yesterday) return yesterdayLabel;
  return new Date(dateISO).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function JournalScreen() {
  const { t, i18n } = useTranslation();
  const goBack = useBackNavigation();
  const journal = useJournalStore();
  const { colors, isDark } = useTheme();
  const [filter, setFilter] = useState<FilterType>('all');

  const GRAD: [string, string] = isDark ? ['#1A1033', '#0D0720'] : [colors.bg, colors.bgGrad1];
  const ACCENT = isDark ? '#9C6FEA' : colors.primary;
  const TEXT = isDark ? '#F3EEFF' : colors.text;
  const SUBTEXT = isDark ? '#C4B5FD' : colors.subtext;
  const SURFACE = isDark ? '#24193E' : colors.surface;
  const BORDER = isDark ? '#3D2F6A' : colors.border;

  const sections = useMemo<Section[]>(() => {
    const filtered = journal.entries.filter(
      (e) => filter === 'all' || e.itemType === filter,
    );

    const grouped: Record<string, JournalEntry[]> = {};
    for (const e of filtered) {
      if (!grouped[e.dateISO]) grouped[e.dateISO] = [];
      grouped[e.dateISO].push(e);
    }

    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a)) // en yeni önce
      .map(([dateISO, data]) => ({
        title: formatDateLabel(dateISO, t('journalScreen.today'), t('journalScreen.yesterday'), i18n.language),
        dateISO,
        data,
      }));
  }, [journal.entries, filter]);

  const totalThisWeek = useMemo(() => {
    const from = new Date();
    from.setDate(from.getDate() - 6);
    const { prayerTotal, esmaTotal } = journal.getTotalByDateRange(
      from.toISOString().slice(0, 10),
      new Date().toISOString().slice(0, 10),
    );
    return prayerTotal + esmaTotal;
  }, [journal]);

  const streak = journal.getStreakDays();

  const handleDelete = (id: string) => {
    Alert.alert(t('journalScreen.deleteTitle'), t('journalScreen.deleteMsg'), [
      { text: t('journalScreen.deleteCancel'), style: 'cancel' },
      {
        text: t('journalScreen.deleteConfirm'),
        style: 'destructive',
        onPress: () => journal.deleteEntry(id),
      },
    ]);
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
        <Text style={[styles.headerTitle, { color: TEXT }]}>{t('journalScreen.headerTitle')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.push('/spiritual/journal/stats')}>
            <Text style={[styles.statsLink, { color: ACCENT }]}>{t('journalScreen.statsLink')}</Text>
          </Pressable>
          <HeaderRightIcons tintColor={TEXT} />
        </View>
      </View>

      {/* Mini stats bar */}
      <View style={[styles.statsBar, { backgroundColor: SURFACE, borderColor: BORDER }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: ACCENT }]}>{streak}</Text>
          <Text style={[styles.statLabel, { color: SUBTEXT }]}>{t('journalScreen.statStreak')}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: BORDER }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: ACCENT }]}>{totalThisWeek}</Text>
          <Text style={[styles.statLabel, { color: SUBTEXT }]}>{t('journalScreen.statThisWeek')}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: BORDER }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: ACCENT }]}>{journal.entries.length}</Text>
          <Text style={[styles.statLabel, { color: SUBTEXT }]}>{t('journalScreen.statTotal')}</Text>
        </View>
      </View>

      {/* Filtre */}
      <View style={styles.filterRow}>
        {(['all', 'esma', 'dua'] as FilterType[]).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.filterChip,
              { borderColor: f === filter ? ACCENT : BORDER },
              f === filter && { backgroundColor: ACCENT + '22' },
            ]}
          >
            <Text style={[styles.filterText, { color: f === filter ? ACCENT : SUBTEXT }]}>
              {f === 'all' ? t('journalScreen.filterAll') : f === 'esma' ? t('journalScreen.filterEsma') : t('journalScreen.filterDua')}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Liste */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyIcon]}>🤲</Text>
            <Text style={[styles.emptyText, { color: SUBTEXT }]}>
              {t('journalScreen.emptyText')}
            </Text>
            <Pressable
              style={[styles.emptyBtn, { backgroundColor: ACCENT + '22', borderColor: ACCENT + '44' }]}
              onPress={() => router.push('/spiritual/asma')}
            >
              <Text style={[styles.emptyBtnText, { color: ACCENT }]}>{t('journalScreen.emptyBtn')}</Text>
            </Pressable>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: TEXT + 'CC' }]}>{section.title}</Text>
            <View style={[styles.sectionDivider, { backgroundColor: BORDER }]} />
          </View>
        )}
        renderItem={({ item }) => (
          <View style={[styles.entryCard, { backgroundColor: SURFACE, borderColor: BORDER }]}>
            <View style={styles.entryLeft}>
              <View style={styles.entryTopRow}>
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: item.itemType === 'esma' ? ACCENT + '22' : '#4CAF5022' },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeText,
                      { color: item.itemType === 'esma' ? ACCENT : '#4CAF50' },
                    ]}
                  >
                    {item.itemType === 'esma' ? t('journalScreen.typeBadgeEsma') : t('journalScreen.typeBadgeDua')}
                  </Text>
                </View>
                <Text style={[styles.entryTime, { color: TEXT + '55' }]}>
                  {new Date(item.createdAt).toLocaleTimeString(i18n.language === 'tr' ? 'tr-TR' : 'en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <Text style={[styles.entryName, { color: TEXT }]} numberOfLines={1}>
                {item.itemName}
              </Text>
              <Text style={[styles.entryMeta, { color: SUBTEXT }]}>
                {t('journalScreen.repeatCount', { done: item.completed, target: item.target })}
                {item.durationSec > 0 ? t('journalScreen.duration', { min: Math.floor(item.durationSec / 60), sec: item.durationSec % 60 }) : ''}
              </Text>
              {item.note ? (
                <Text style={[styles.entryNote, { color: TEXT + '88' }]} numberOfLines={2}>
                  "{item.note}"
                </Text>
              ) : null}
            </View>

            <Pressable
              onPress={() => handleDelete(item.id)}
              style={styles.deleteBtn}
              hitSlop={8}
            >
              <Text style={[styles.deleteIcon, { color: TEXT + '44' }]}>🗑</Text>
            </Pressable>
          </View>
        )}
      />
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
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: { padding: 4 },
  backBtnText: { fontSize: 22, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  statsLink: { fontSize: 14, fontWeight: '700' },
  statsBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 12,
  },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 11 },
  statDivider: { width: 1, height: 32 },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: { fontSize: 13, fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionHeader: { gap: 4, marginTop: 16, marginBottom: 6 },
  sectionTitle: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  sectionDivider: { height: StyleSheet.hairlineWidth },
  entryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  entryLeft: { flex: 1, gap: 4 },
  entryTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  typeText: { fontSize: 10, fontWeight: '700' },
  entryTime: { fontSize: 11 },
  entryName: { fontSize: 14, fontWeight: '700' },
  entryMeta: { fontSize: 12 },
  entryNote: { fontSize: 12, fontStyle: 'italic' },
  deleteBtn: { padding: 4, alignSelf: 'center' },
  deleteIcon: { fontSize: 16 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700' },
});
