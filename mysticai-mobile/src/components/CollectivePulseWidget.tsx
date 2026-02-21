import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useDreamStore } from '../store/useDreamStore';
import { COLORS } from '../constants/colors';

interface Props {
  onPress?: () => void;
}

export default function CollectivePulseWidget({ onPress }: Props) {
  const { collectivePulse, pulseLoading, fetchCollectivePulse } = useDreamStore();

  useEffect(() => {
    fetchCollectivePulse();
  }, []);

  return (
    <Animated.View entering={FadeInDown.delay(100).duration(500)}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={styles.card}
        accessibilityLabel="Dünyanın bugün gördüğü rüyalar — detayları aç"
        accessibilityRole="button"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>🌍</Text>
          <Text style={styles.headerTitle}>Dünyanın Bugün Gördüğü Rüyalar</Text>
          {!pulseLoading && (
            <TouchableOpacity
              onPress={fetchCollectivePulse}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Kolektif nabzı yenile"
              accessibilityRole="button"
            >
              <Ionicons name="refresh-outline" size={14} color={COLORS.pulseSub} />
            </TouchableOpacity>
          )}
        </View>

        {pulseLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={COLORS.pulseTitle} />
            <Text style={styles.loadingText}>Kolektif nabız okunuyor...</Text>
          </View>
        ) : !collectivePulse || collectivePulse.topSymbols.length === 0 ? (
          <Text style={styles.emptyText}>Henüz veri yok. İlk rüyayı kaydet!</Text>
        ) : (
          <>
            {/* Top symbols */}
            <View style={styles.symbolsRow}>
              {collectivePulse.topSymbols.slice(0, 3).map((sym, i) => (
                <View key={sym.symbolName} style={[styles.symbolChip, i === 0 && styles.symbolChipTop]}>
                  <Text style={styles.symbolEmoji}>{sym.emoji}</Text>
                  <Text style={[styles.symbolName, i === 0 && styles.symbolNameTop]}>
                    {capitalize(sym.symbolName)}
                  </Text>
                  <Text style={styles.symbolCount}>{sym.count}x</Text>
                </View>
              ))}
            </View>

            {/* Astro reasoning */}
            {collectivePulse.astroReasoning ? (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonIcon}>✦</Text>
                <Text style={styles.reasonText}>{collectivePulse.astroReasoning}</Text>
              </View>
            ) : null}

            <Text style={styles.updatedAt}>
              {collectivePulse.generatedAt ? `Son güncelleme: ${collectivePulse.generatedAt}` : ''}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: COLORS.pulseBg,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: COLORS.pulseBorder,
    shadowColor: COLORS.violetLight,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  headerIcon: { fontSize: 16 },
  headerTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.pulseTitle,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: { fontSize: 12, color: COLORS.pulseSub, fontStyle: 'italic' },
  emptyText: { fontSize: 12, color: COLORS.pulseSub, fontStyle: 'italic', paddingVertical: 6 },
  symbolsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  symbolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(200,168,75,0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(200,168,75,0.3)',
  },
  symbolChipTop: {
    backgroundColor: 'rgba(124,77,255,0.13)',
    borderColor: 'rgba(124,77,255,0.35)',
  },
  symbolEmoji: { fontSize: 16 },
  symbolName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  symbolNameTop: { color: COLORS.pulseTitle, fontWeight: '800' },
  symbolCount: {
    fontSize: 11,
    color: COLORS.pulseSub,
    marginLeft: 2,
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(124,77,255,0.07)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(124,77,255,0.15)',
    marginBottom: 6,
  },
  reasonIcon: { fontSize: 12, color: COLORS.gold, marginTop: 2 },
  reasonText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.pulseTitle,
    fontStyle: 'italic',
  },
  updatedAt: {
    fontSize: 10,
    color: COLORS.pulseSub,
    textAlign: 'right',
    marginTop: 2,
  },
});
