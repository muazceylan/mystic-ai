import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { SPACING } from '../../constants/tokens';
import type { IoniconName } from '../../constants/icons';

const SIZE_MAP = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

export interface AppIconProps {
  name: IoniconName;
  size?: keyof typeof SIZE_MAP;
  color?: string;
  /** Color when active prop is true */
  activeColor?: string;
  /** Color when active prop is false */
  inactiveColor?: string;
  /** Controls which of activeColor/inactiveColor is used */
  active?: boolean;
  /** Wrap icon in a circular/rounded background container */
  container?: boolean;
  /** Background color of the container (defaults to primary at ~15% opacity) */
  containerColor?: string;
  /** Size of the container box (defaults to icon size + SPACING.md padding) */
  containerSize?: number;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function AppIcon({
  name,
  size = 'md',
  color,
  activeColor,
  inactiveColor,
  active,
  container = false,
  containerColor,
  containerSize,
  accessibilityLabel,
  style,
}: AppIconProps) {
  const { colors } = useTheme();

  const iconSize = SIZE_MAP[size];

  // Resolve icon color
  let resolvedColor = color ?? colors.text;
  if (active !== undefined) {
    if (active && activeColor) {
      resolvedColor = activeColor;
    } else if (!active && inactiveColor) {
      resolvedColor = inactiveColor;
    }
  }

  const icon = (
    <Ionicons
      name={name}
      size={iconSize}
      color={resolvedColor}
      accessibilityLabel={accessibilityLabel}
    />
  );

  if (!container) {
    if (style) {
      return <View style={style}>{icon}</View>;
    }
    return icon;
  }

  const defaultContainerSize = containerSize ?? iconSize + SPACING.md;
  const defaultContainerColor = containerColor ?? `${colors.primary}26`; // ~15% opacity

  return (
    <View
      style={[
        {
          width: defaultContainerSize,
          height: defaultContainerSize,
          borderRadius: defaultContainerSize / 2,
          backgroundColor: defaultContainerColor,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
    >
      {icon}
    </View>
  );
}
