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
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { ErrorStateCard } from './ui';

interface Props {
  onPress?: () => void;
}

export default function CollectivePulseWidget({ onPress }: Props) {
  const { colors } = useTheme();
  const s = createStyles(colors);
  const { collectivePulse, pulseLoading, pulseError, fetchCollectivePulse } = useDreamStore();

  useEffect(() => {
    fetchCollectivePulse();
  }, []);

  return (
    <Animated.View entering={FadeInDown.delay(100).duration(500)}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={s.card}
        accessibilityLabel="Dünyanın bugün gördüğü rüyalar — detayları aç"
        accessibilityRole="button"
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerIcon}>🌍</Text>
          <Text style={s.headerTitle}>Dünyanın Bugün Gördüğü Rüyalar</Text>
          {!pulseLoading && (
            <TouchableOpacity
              onPress={fetchCollectivePulse}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Kolektif nabzı yenile"
              accessibilityRole="button"
            >
              <Ionicons name="refresh-outline" size={14} color={colors.pulseSub} />
            </TouchableOpacity>
          )}
        </View>

        {pulseLoading ? (
          <View style={s.loadingRow}>
            <ActivityIndicator size="small" color={colors.pulseTitle} />
            <Text style={s.loadingText}>Kolektif nabız okunuyor...</Text>
          </View>
        ) : pulseError ? (
          <ErrorStateCard
            message={pulseError}
            onRetry={fetchCollectivePulse}
            variant="compact"
            accessibilityLabel="Kolektif nabzı tekrar yükle"
          />
        ) : !collectivePulse || collectivePulse.topSymbols.length === 0 ? (
          <Text style={s.emptyText}>Henüz veri yok. İlk rüyayı kaydet!</Text>
        ) : (
          <>
            <View style={s.symbolsRow}>
              {collectivePulse.topSymbols.slice(0, 3).map((sym, i) => (
                <View key={sym.symbolName} style={[s.symbolChip, i === 0 && s.symbolChipTop]}>
                  <Text style={s.symbolEmoji}>{sym.emoji}</Text>
                  <Text style={[s.symbolName, i === 0 && s.symbolNameTop]}>
                    {capitalize(sym.symbolName)}
                  </Text>
                  <Text style={s.symbolCount}>{sym.count}x</Text>
                </View>
              ))}
            </View>

            {collectivePulse.astroReasoning ? (
              <View style={s.reasonBox}>
                <Text style={s.reasonIcon}>✦</Text>
                <Text style={s.reasonText}>{collectivePulse.astroReasoning}</Text>
              </View>
            ) : null}

            <Text style={s.updatedAt}>
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

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    card: {
      marginHorizontal: 20,
      marginTop: 10,
      backgroundColor: C.pulseBg,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1.5,
      borderColor: C.pulseBorder,
      shadowColor: C.violetLight,
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
      color: C.pulseTitle,
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
    },
    loadingText: { fontSize: 12, color: C.pulseSub, fontStyle: 'italic' },
    emptyText: { fontSize: 12, color: C.pulseSub, fontStyle: 'italic', paddingVertical: 6 },
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
      backgroundColor: C.amberLight,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: C.border,
    },
    symbolChipTop: {
      backgroundColor: C.violetBg,
      borderColor: C.violetLight,
    },
    symbolEmoji: { fontSize: 16 },
    symbolName: {
      fontSize: 13,
      fontWeight: '600',
      color: C.textDark,
    },
    symbolNameTop: { color: C.pulseTitle, fontWeight: '800' },
    symbolCount: {
      fontSize: 11,
      color: C.pulseSub,
      marginLeft: 2,
    },
    reasonBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
      backgroundColor: C.violetBg,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 6,
    },
    reasonIcon: { fontSize: 12, color: C.gold, marginTop: 2 },
    reasonText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
      color: C.pulseTitle,
      fontStyle: 'italic',
    },
    updatedAt: {
      fontSize: 10,
      color: C.pulseSub,
      textAlign: 'right',
      marginTop: 2,
    },
  });
}
