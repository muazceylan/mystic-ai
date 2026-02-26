import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS, ACCESSIBILITY } from '../../constants/tokens';
import { Badge } from './Badge';

interface ListRowProps {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: { label: string; variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' };
  rightAccessory?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
}

export function ListRow({
  icon,
  iconColor,
  title,
  subtitle,
  meta,
  badge,
  rightAccessory,
  showChevron = true,
  onPress,
}: ListRowProps) {
  const { colors } = useTheme();
  const s = createStyles(colors);
  const tintColor = iconColor ?? colors.primary;

  const content = (
    <View style={s.container}>
      {icon ? (
        <View style={[s.iconWrap, { backgroundColor: tintColor + '15' }]}>
          <Ionicons name={icon} size={20} color={tintColor} />
        </View>
      ) : null}

      <View style={s.body}>
        <View style={s.titleRow}>
          <Text
            style={s.title}
            numberOfLines={1}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {title}
          </Text>
          {badge ? <Badge label={badge.label} variant={badge.variant} /> : null}
        </View>
        {subtitle ? (
          <Text
            style={s.subtitle}
            numberOfLines={1}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text
            style={s.meta}
            numberOfLines={1}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {meta}
          </Text>
        ) : null}
      </View>

      {rightAccessory}
      {showChevron && onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [s.pressable, pressed && s.pressed]}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    pressable: {
      borderRadius: RADIUS.md,
    },
    pressed: {
      opacity: 0.7,
    },
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.card,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: C.border,
      padding: SPACING.md,
      gap: SPACING.md,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      flex: 1,
      gap: 2,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    title: {
      ...TYPOGRAPHY.BodyBold,
      color: C.text,
      flex: 1,
    },
    subtitle: {
      ...TYPOGRAPHY.Small,
      color: C.subtext,
    },
    meta: {
      ...TYPOGRAPHY.Caption,
      color: C.muted,
    },
  });
}
