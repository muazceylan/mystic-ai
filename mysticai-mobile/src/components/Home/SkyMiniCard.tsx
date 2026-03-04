import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, subtleShadow, typography } from '../../theme';

interface SkyMiniCardProps {
  phase?: string;
  illumination?: number;
  isLoading?: boolean;
  onPress: () => void;
}

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

export function SkyMiniCard({ phase, illumination, isLoading = false, onPress }: SkyMiniCardProps) {
  const subText = phase && typeof illumination === 'number'
    ? `${phase} • %${illumination}`
    : 'Gece haritası hazırlanıyor';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Doğduğun gece gökyüzü ekranını aç"
      hitSlop={HIT_SLOP}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={['#EDE4FF', '#F8F4FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View>
          <Text style={styles.title}>Doğduğun Gece Gökyüzü</Text>
          <Text numberOfLines={1} style={styles.subtitle}>{subText}</Text>
          {isLoading ? <View style={styles.skeletonLine} /> : null}
        </View>

        <View style={styles.moonWrap}>
          <View style={styles.moonOuter} />
          <View style={styles.moonInner} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.xl,
    borderRadius: radius.card,
    overflow: 'hidden',
    ...subtleShadow,
  },
  gradient: {
    minHeight: 94,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 12,
  },
  skeletonLine: {
    marginTop: spacing.xs,
    width: 96,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(123,77,255,0.18)',
  },
  moonWrap: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moonOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(152,110,255,0.18)',
    position: 'absolute',
  },
  moonInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(152,110,255,0.25)',
  },
  pressed: {
    opacity: 0.88,
  },
});
