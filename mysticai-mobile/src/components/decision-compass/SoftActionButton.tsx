import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { getCompassTokens } from './tokens';

interface SoftActionButtonProps {
  label: string;
  onPress: () => void;
  gradient: [string, string];
  borderColor: string;
  textColor: string;
  iconColor: string;
  large?: boolean;
  style?: ViewStyle;
}

export function SoftActionButton({
  label,
  onPress,
  gradient,
  borderColor,
  textColor,
  iconColor,
  large = false,
  style,
}: SoftActionButtonProps) {
  const { colors, isDark } = useTheme();
  const T = getCompassTokens(colors, isDark);
  const S = styles(borderColor, textColor, large, isDark, T);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [S.wrap, style, pressed && S.pressed]}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.surface}>
        {/* Top shine strip — premium satin effect */}
        <LinearGradient
          pointerEvents="none"
          colors={isDark ? ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.00)'] : ['rgba(255,255,255,0.82)', 'rgba(255,255,255,0.00)']}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={S.innerSheen}
        />
        {/* Ambient top glow orb */}
        <View pointerEvents="none" style={S.ambientGlow} />
        <Text style={S.label}>{label}</Text>
        <Ionicons name="chevron-forward" size={large ? 17 : 14} color={iconColor} />
      </LinearGradient>
    </Pressable>
  );
}

function styles(
  borderColor: string,
  textColor: string,
  large: boolean,
  isDark: boolean,
  T: ReturnType<typeof getCompassTokens>,
) {
  return StyleSheet.create({
    wrap: {
      borderRadius: T.radii.pill,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor,
      alignSelf: 'flex-start',
      // Softer ambient shadow
      shadowColor: isDark ? '#000000' : '#C8AEF0',
      shadowOpacity: isDark ? 0.20 : 0.18,
      shadowRadius: isDark ? 14 : 12,
      shadowOffset: { width: 0, height: isDark ? 6 : 5 },
      elevation: isDark ? 4 : 3,
    },
    surface: {
      minHeight: large ? 56 : 40,
      paddingHorizontal: large ? 28 : 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: large ? 8 : 5,
      position: 'relative',
    },
    ambientGlow: {
      position: 'absolute',
      top: -8,
      left: 14,
      right: 14,
      height: large ? 26 : 18,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.60)',
    },
    innerSheen: {
      position: 'absolute',
      top: 1,
      left: 1,
      right: 1,
      bottom: large ? '44%' : '40%',
      borderRadius: 999,
    },
    label: {
      color: textColor,
      fontSize: large ? 16.5 : 14,
      fontWeight: '900',
      letterSpacing: large ? -0.35 : -0.2,
    },
    pressed: {
      opacity: 0.87,
      transform: [{ scale: 0.985 }],
    },
  });
}
