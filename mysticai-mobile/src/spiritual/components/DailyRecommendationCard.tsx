import React, { memo, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useNatalChartStore } from '../../store/useNatalChartStore';
import { useRecommendationStore } from '../store/useRecommendationStore';
import { useContentStore } from '../store/useContentStore';

interface Props {
  accentColor?: string;
  surfaceColor?: string;
  textColor?: string;
  subtextColor?: string;
  borderColor?: string;
  onShowAll?: () => void;
}

const SURE_ACCENT = '#0D9488';

export const DailyRecommendationCard = memo(function DailyRecommendationCard({
  accentColor = '#4CAF50',
  surfaceColor = '#1A2E22',
  textColor = '#F0FFF4',
  subtextColor = '#86EFAC',
  borderColor = '#2D5A3D',
  onShowAll,
}: Props) {
  const { chart } = useNatalChartStore();
  const { today, generate, markShown } = useRecommendationStore();
  const { esmaList, duaList, getEsmaById, getDuaById } = useContentStore();

  useEffect(() => {
    if (esmaList.length > 0 && duaList.length > 0) {
      const rec = generate(chart, esmaList, duaList);
      markShown(rec.esmaId, rec.duaId, rec.sureId);
    }
  }, [esmaList.length, duaList.length]);

  if (!today) return null;

  const esma = getEsmaById(today.esmaId);
  const dua = getDuaById(today.duaId);
  const sure = getDuaById(today.sureId);

  if (!esma && !dua) return null;

  return (
    <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.badge, { backgroundColor: accentColor + '22', color: accentColor }]}>
          ✨ Günün Önerisi
        </Text>
      </View>

      <Text style={[styles.reason, { color: subtextColor }]}>{today.reason}</Text>

      <View style={styles.items}>
        {esma && (
          <Pressable
            style={[styles.itemRow, { borderColor: borderColor }]}
            onPress={() => router.push({ pathname: '/spiritual/asma/[id]', params: { id: esma.id } })}
          >
            <View style={styles.itemLeft}>
              <Text style={[styles.itemLabel, { color: subtextColor }]}>Günün Esması</Text>
              <Text style={[styles.itemName, { color: textColor }]}>{esma.nameTr}</Text>
              <Text style={[styles.itemSub, { color: subtextColor + 'BB' }]}>{esma.transliteration}</Text>
            </View>
            <Text style={[styles.arabic, { color: accentColor + 'CC' }]}>{esma.nameAr}</Text>
          </Pressable>
        )}

        {dua && (
          <Pressable
            style={[styles.itemRow, { borderColor: borderColor }]}
            onPress={() => router.push({ pathname: '/spiritual/dua/[id]', params: { id: dua.id } })}
          >
            <View style={styles.itemLeft}>
              <Text style={[styles.itemLabel, { color: subtextColor }]}>Günün Duası</Text>
              <Text style={[styles.itemName, { color: textColor }]}>{dua.title}</Text>
              <Text style={[styles.itemSub, { color: subtextColor + 'BB' }]}>{dua.shortBenefit}</Text>
            </View>
            <View style={[styles.categoryBadge, { backgroundColor: accentColor + '22' }]}>
              <Text style={[styles.categoryText, { color: accentColor }]}>{dua.category}</Text>
            </View>
          </Pressable>
        )}

        {sure && (
          <Pressable
            style={[styles.itemRow, { borderColor: borderColor }]}
            onPress={() => router.push({ pathname: '/spiritual/dua/[id]', params: { id: sure.id } })}
          >
            <View style={styles.itemLeft}>
              <Text style={[styles.itemLabel, { color: SURE_ACCENT }]}>Günün Suresi</Text>
              <Text style={[styles.itemName, { color: textColor }]}>{sure.title}</Text>
              <Text style={[styles.itemSub, { color: subtextColor + 'BB' }]}>{sure.shortBenefit}</Text>
            </View>
            <View style={[styles.categoryBadge, { backgroundColor: SURE_ACCENT + '22' }]}>
              <Text style={[styles.categoryText, { color: SURE_ACCENT }]}>{sure.category}</Text>
            </View>
          </Pressable>
        )}
      </View>

      {onShowAll && (
        <Pressable onPress={onShowAll} style={styles.showAllRow}>
          <Text style={[styles.showAllText, { color: accentColor }]}>Tümünü Gör →</Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    letterSpacing: 0.3,
  },
  reason: { fontSize: 12, lineHeight: 18, fontStyle: 'italic' },
  items: { gap: 8 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  itemLeft: { flex: 1, gap: 2 },
  itemLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  itemName: { fontSize: 15, fontWeight: '700' },
  itemSub: { fontSize: 12 },
  arabic: { fontSize: 20, fontWeight: '700' },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  categoryText: { fontSize: 11, fontWeight: '700' },
  showAllRow: { alignItems: 'center', paddingTop: 8 },
  showAllText: { fontSize: 12, fontWeight: '700' },
});
