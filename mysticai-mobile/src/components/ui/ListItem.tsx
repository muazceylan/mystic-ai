import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, ACCESSIBILITY } from '../../constants/tokens';

interface ListItemProps {
  title: string;
  subtitle?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  selected?: boolean;
  accessibilityHint?: string;
}

export function ListItem({
  title,
  subtitle,
  leftIcon,
  rightIcon = 'chevron-forward',
  onPress,
  style,
  titleStyle,
  selected,
  accessibilityHint,
}: ListItemProps) {
  const { colors } = useTheme();
  const s = createStyles(colors);
  const containerStyle = [s.row, selected && s.rowSelected, style];

  if (onPress) {
    return (
      <TouchableOpacity
        style={containerStyle}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityLabel={title}
        accessibilityRole="button"
        accessibilityHint={accessibilityHint}
        accessibilityState={{ selected: selected ?? false }}
      >
      {leftIcon && (
        <View style={s.leftIcon}>
          <Ionicons
            name={leftIcon}
            size={20}
            color={selected ? colors.primary : colors.subtext}
          />
        </View>
      )}
      <View style={s.content}>
        <Text
          style={[
            s.title,
            selected && s.titleSelected,
            titleStyle,
          ]}
          numberOfLines={1}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={s.subtitle} numberOfLines={1} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightIcon && (
        <Ionicons
          name={rightIcon}
          size={16}
          color={colors.subtext}
        />
      )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={containerStyle}>
      {leftIcon && (
        <View style={s.leftIcon}>
          <Ionicons
            name={leftIcon}
            size={20}
            color={selected ? colors.primary : colors.subtext}
          />
        </View>
      )}
      <View style={s.content}>
        <Text
          style={[
            s.title,
            selected && s.titleSelected,
            titleStyle,
          ]}
          numberOfLines={1}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={s.subtitle} numberOfLines={1} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightIcon && (
        <Ionicons
          name={rightIcon}
          size={16}
          color={colors.subtext}
        />
      )}
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      minHeight: 44,
    },
    rowSelected: {
      backgroundColor: C.primarySoft,
    },
    leftIcon: { marginRight: SPACING.md },
    content: { flex: 1 },
    title: {
      ...TYPOGRAPHY.Body,
      fontWeight: '500',
      color: C.text,
    },
    titleSelected: {
      color: C.primary,
      fontWeight: '600',
    },
    subtitle: {
      ...TYPOGRAPHY.SmallAlt,
      color: C.subtext,
      marginTop: SPACING.xs,
    },
  });
}
