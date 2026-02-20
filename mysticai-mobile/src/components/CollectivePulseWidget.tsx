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

const C = {
  bg: '#F5F0FF',
  border: '#D5C2F5',
  title: '#4A2F7A',
  sub: '#7A6A9A',
  gold: '#C8A84B',
  text: '#2A1A4A',
  card: 'rgba(255,255,255,0.85)',
};

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
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>🌍</Text>
          <Text style={styles.headerTitle}>Dünyanın Bugün Gördüğü Rüyalar</Text>
          {!pulseLoading && (
            <TouchableOpacity onPress={fetchCollectivePulse} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="refresh-outline" size={14} color={C.sub} />
            </TouchableOpacity>
          )}
        </View>

        {pulseLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={C.title} />
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
    backgroundColor: C.bg,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    shadowColor: '#7C4DFF',
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
    color: C.title,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: { fontSize: 12, color: C.sub, fontStyle: 'italic' },
  emptyText: { fontSize: 12, color: C.sub, fontStyle: 'italic', paddingVertical: 6 },
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
    color: C.text,
  },
  symbolNameTop: { color: '#4A2F7A', fontWeight: '800' },
  symbolCount: {
    fontSize: 11,
    color: C.sub,
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
  reasonIcon: { fontSize: 12, color: C.gold, marginTop: 2 },
  reasonText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: C.title,
    fontStyle: 'italic',
  },
  updatedAt: {
    fontSize: 10,
    color: C.sub,
    textAlign: 'right',
    marginTop: 2,
  },
});
