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
import { SafeScreen, HeaderRightIcons } from '../../components/ui';
import { useJournalStore } from '../store/useJournalStore';
import type { JournalEntry } from '../types';

type FilterType = 'all' | 'esma' | 'dua';

interface Section {
  title: string;
  dateISO: string;
  data: JournalEntry[];
}

function formatDateLabel(dateISO: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateISO === today) return 'Bugün';
  if (dateISO === yesterday) return 'Dün';
  return new Date(dateISO).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function JournalScreen() {
  const journal = useJournalStore();
  const [filter, setFilter] = useState<FilterType>('all');

  const GRAD: [string, string] = ['#1A1033', '#0D0720'];
  const ACCENT = '#9C6FEA';
  const TEXT = '#F3EEFF';
  const SUBTEXT = '#C4B5FD';
  const SURFACE = '#24193E';
  const BORDER = '#3D2F6A';

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
        title: formatDateLabel(dateISO),
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
    Alert.alert('Kaydı Sil', 'Bu kayıt silinecek. Emin misin?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => journal.deleteEntry(id),
      },
    ]);
  };

  return (
    <SafeScreen style={{ backgroundColor: GRAD[0] }}>
      <LinearGradient colors={GRAD} style={styles.container}>
        <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backBtnText, { color: TEXT + 'BB' }]}>←</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: TEXT }]}>Zikir Günlüğüm</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.push('/spiritual/journal/stats')}>
            <Text style={[styles.statsLink, { color: ACCENT }]}>İstatistik</Text>
          </Pressable>
          <HeaderRightIcons tintColor={TEXT} />
        </View>
      </View>

      {/* Mini stats bar */}
      <View style={[styles.statsBar, { backgroundColor: SURFACE, borderColor: BORDER }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: ACCENT }]}>{streak}</Text>
          <Text style={[styles.statLabel, { color: SUBTEXT }]}>Gün Serisi</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: BORDER }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: ACCENT }]}>{totalThisWeek}</Text>
          <Text style={[styles.statLabel, { color: SUBTEXT }]}>Bu Hafta</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: BORDER }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: ACCENT }]}>{journal.entries.length}</Text>
          <Text style={[styles.statLabel, { color: SUBTEXT }]}>Toplam Kayıt</Text>
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
              {f === 'all' ? 'Tümü' : f === 'esma' ? 'Esma' : 'Dua'}
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
              Henüz kayıt yok.{'\n'}İlk zikrini tamamla!
            </Text>
            <Pressable
              style={[styles.emptyBtn, { backgroundColor: ACCENT + '22', borderColor: ACCENT + '44' }]}
              onPress={() => router.push('/spiritual/asma')}
            >
              <Text style={[styles.emptyBtnText, { color: ACCENT }]}>Esmaül Hüsna'ya Git</Text>
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
                    {item.itemType === 'esma' ? 'Esma' : 'Dua'}
                  </Text>
                </View>
                <Text style={[styles.entryTime, { color: TEXT + '55' }]}>
                  {new Date(item.createdAt).toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <Text style={[styles.entryName, { color: TEXT }]} numberOfLines={1}>
                {item.itemName}
              </Text>
              <Text style={[styles.entryMeta, { color: SUBTEXT }]}>
                {item.completed}/{item.target} tekrar
                {item.durationSec > 0 ? ` • ${Math.floor(item.durationSec / 60)}dk ${item.durationSec % 60}sn` : ''}
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
    paddingTop: 56,
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
