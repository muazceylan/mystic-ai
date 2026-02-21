import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useDreamStore } from '../../store/useDreamStore';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, TYPOGRAPHY } from '../../constants/tokens';

interface CollectiveTickerProps {
  onPress?: () => void;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function CollectiveTicker({ onPress }: CollectiveTickerProps) {
  const { colors, isDark } = useTheme();
  const { collectivePulse, pulseLoading, fetchCollectivePulse } = useDreamStore();

  useEffect(() => {
    fetchCollectivePulse();
  }, []);

  // Hide gracefully when no data
  if (pulseLoading || !collectivePulse || collectivePulse.topSymbols.length === 0) {
    return null;
  }

  return (
    <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.wrapper}>
      <Pressable
        onPress={onPress}
        accessibilityLabel="Kolektif rüya sembollerini gör"
        accessibilityRole="button"
      >
        <View style={[styles.container, { backgroundColor: colors.surfaceGlass, borderColor: colors.surfaceGlassBorder }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.pulseTitle }]}>🌍 Kolektif Rüyalar</Text>
            <Text style={[styles.tapHint, { color: colors.pulseSub }]}>Detaylar ›</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsRow}
            scrollEnabled
          >
            {collectivePulse.topSymbols.slice(0, 6).map((sym, i) => (
              <View
                key={sym.symbolName}
                style={[
                  styles.pill,
                  {
                    backgroundColor: i === 0
                      ? (isDark ? 'rgba(109,40,217,0.35)' : 'rgba(99,102,241,0.12)')
                      : (isDark ? colors.surfaceGlass : colors.amberLight),
                    borderColor: i === 0
                      ? (isDark ? 'rgba(139,92,246,0.6)' : 'rgba(99,102,241,0.3)')
                      : colors.border,
                  },
                ]}
              >
                <Text style={styles.pillEmoji}>{sym.emoji}</Text>
                <Text
                  style={[
                    styles.pillName,
                    {
                      color: i === 0
                        ? (isDark ? '#c4b5fd' : '#4f46e5')
                        : colors.textDark,
                      fontWeight: i === 0 ? '700' : '500',
                    },
                  ]}
                >
                  {capitalize(sym.symbolName)}
                </Text>
                <Text style={[styles.pillCount, { color: colors.pulseSub }]}>{sym.count}x</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: SPACING.lgXl,
    marginTop: SPACING.smMd,
  },
  container: {
    borderRadius: 16,
    paddingHorizontal: SPACING.mdLg,
    paddingTop: SPACING.smMd,
    paddingBottom: SPACING.smMd,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xsSm,
  },
  title: {
    ...TYPOGRAPHY.CaptionBold,
  },
  tapHint: {
    ...TYPOGRAPHY.CaptionXS,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xsSm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    borderRadius: 20,
    paddingHorizontal: SPACING.smMd,
    paddingVertical: SPACING.xs + 2,
    borderWidth: 1,
  },
  pillEmoji: {
    fontSize: 14,
  },
  pillName: {
    ...TYPOGRAPHY.CaptionSmall,
  },
  pillCount: {
    ...TYPOGRAPHY.CaptionXS,
    marginLeft: 1,
  },
});
