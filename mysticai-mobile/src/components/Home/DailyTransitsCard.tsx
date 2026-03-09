import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadowSubtle, spacing, typography } from '../../theme';

interface DailyTransitsCardProps {
  phase?: string;
  moonSign?: string;
  retroCount?: number;
  isLoading?: boolean;
  onPress: () => void;
}

const ICON_SIZE = spacing.md + spacing.xs - spacing.xxs;

export function DailyTransitsCard({
  phase,
  moonSign,
  retroCount = 0,
  isLoading = false,
  onPress,
}: DailyTransitsCardProps) {
  const phaseText = phase?.trim() || '—';
  const moonSignText = moonSign?.trim() || '—';

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Bugünün Gökyüzü Etkileri</Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Bugünün Gökyüzü Etkileri ekranını aç"
        hitSlop={{ top: spacing.xs, bottom: spacing.xs, left: spacing.xs, right: spacing.xs }}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.leftSide}>
          <View style={styles.iconShell}>
            <Ionicons name="moon" size={ICON_SIZE} color={colors.white} />
          </View>
          <View style={styles.textBlock}>
            <Text numberOfLines={1} style={styles.mainLine}>
              {isLoading ? 'Transit özeti hazırlanıyor…' : `Ay Fazı: ${phaseText}`}
            </Text>
            {!isLoading ? (
              <Text numberOfLines={1} style={styles.subLine}>{`Ay Burcu: ${moonSignText}`}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.retroPill}>
          <Text style={styles.retroText}>{`Retro: ${retroCount}`}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.sectionGap,
  },
  title: {
    ...typography.H2,
    marginBottom: spacing.cardGap,
  },
  card: {
    minHeight: spacing.iconWrap + spacing.xl,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceGlass,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadowSubtle,
  },
  leftSide: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  iconShell: {
    width: spacing.iconWrap,
    height: spacing.iconWrap,
    borderRadius: radius.icon,
    backgroundColor: colors.transitIconBg,
    borderWidth: 1,
    borderColor: colors.transitIconBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  mainLine: {
    ...typography.Body,
    fontWeight: '700',
    color: colors.transitTextPrimary,
  },
  subLine: {
    ...typography.Body,
    color: colors.transitTextSecondary,
    marginTop: spacing.xxs,
  },
  retroPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.transitPillBorder,
    backgroundColor: colors.transitPillBg,
    paddingHorizontal: spacing.pillPaddingX - spacing.xs,
    paddingVertical: spacing.pillPaddingY - spacing.xxs - 1,
  },
  retroText: {
    ...typography.Caption,
    fontWeight: '700',
    color: colors.transitPillText,
  },
  pressed: {
    opacity: 0.86,
  },
});
