import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';

const PREMIUM_ICON_TONES = {
  cosmic: {
    gradientLight: [COLORS.blue, COLORS.primary] as const,
    gradientDark: [COLORS.themeDarkAccent, COLORS.themeDarkPrimary] as const,
    iconLight: '#F8FAFC',
    iconDark: '#F1F5F9',
    glowLight: 'rgba(46,74,156,0.18)',
    glowDark: 'rgba(96,165,250,0.24)',
    ringLight: 'rgba(157,78,221,0.24)',
    ringDark: 'rgba(168,85,247,0.30)',
  },
  mystic: {
    gradientLight: [COLORS.primaryLight, COLORS.primary700] as const,
    gradientDark: [COLORS.themeDarkPrimaryLight, COLORS.primaryDark] as const,
    iconLight: '#FCFAFF',
    iconDark: '#F5F3FF',
    glowLight: 'rgba(157,78,221,0.20)',
    glowDark: 'rgba(168,85,247,0.28)',
    ringLight: 'rgba(199,132,247,0.30)',
    ringDark: 'rgba(216,180,254,0.34)',
  },
  lunar: {
    gradientLight: [COLORS.moonBlue, COLORS.primaryDark] as const,
    gradientDark: [COLORS.themeDarkAccent, '#172554'] as const,
    iconLight: '#F8FAFC',
    iconDark: '#E0F2FE',
    glowLight: 'rgba(94,66,187,0.18)',
    glowDark: 'rgba(96,165,250,0.22)',
    ringLight: 'rgba(123,158,199,0.34)',
    ringDark: 'rgba(147,197,253,0.28)',
  },
  rose: {
    gradientLight: [COLORS.primaryLight, COLORS.accent] as const,
    gradientDark: [COLORS.themeDarkPrimary, COLORS.themeDarkAccent] as const,
    iconLight: '#FAF7FF',
    iconDark: '#F1F5F9',
    glowLight: 'rgba(157,78,221,0.18)',
    glowDark: 'rgba(96,165,250,0.22)',
    ringLight: 'rgba(157,78,221,0.24)',
    ringDark: 'rgba(168,85,247,0.30)',
  },
  insight: {
    gradientLight: [COLORS.moonBlue, COLORS.accent] as const,
    gradientDark: [COLORS.themeDarkAccent, COLORS.themeDarkSurface] as const,
    iconLight: '#F8FAFC',
    iconDark: '#E2E8F0',
    glowLight: 'rgba(46,74,156,0.16)',
    glowDark: 'rgba(96,165,250,0.22)',
    ringLight: 'rgba(123,158,199,0.30)',
    ringDark: 'rgba(148,163,184,0.26)',
  },
  sacred: {
    gradientLight: ['#C7D2FE', '#4F46E5'] as const,
    gradientDark: ['#818CF8', '#312E81'] as const,
    iconLight: '#FCFAFF',
    iconDark: '#EEF2FF',
    glowLight: 'rgba(94,66,187,0.18)',
    glowDark: 'rgba(129,140,248,0.24)',
    ringLight: 'rgba(94,66,187,0.24)',
    ringDark: 'rgba(196,181,253,0.28)',
  },
  oracle: {
    gradientLight: [COLORS.primary, COLORS.accent] as const,
    gradientDark: [COLORS.themeDarkPrimary, COLORS.themeDarkAccent] as const,
    iconLight: '#FAF7FF',
    iconDark: '#F1F5F9',
    glowLight: 'rgba(157,78,221,0.18)',
    glowDark: 'rgba(96,165,250,0.22)',
    ringLight: 'rgba(157,78,221,0.24)',
    ringDark: 'rgba(168,85,247,0.30)',
  },
} as const;

export type PremiumIconTone = keyof typeof PREMIUM_ICON_TONES;

type PremiumIconBadgeProps = {
  icon: keyof typeof Ionicons.glyphMap;
  tone?: PremiumIconTone;
  size?: number;
  iconSize?: number;
  glowSize?: number;
  innerInset?: number;
  style?: StyleProp<ViewStyle>;
};

export function PremiumIconBadge({
  icon,
  tone = 'mystic',
  size = 38,
  iconSize = 17,
  glowSize = 50,
  innerInset = 6,
  style,
}: PremiumIconBadgeProps) {
  const { isDark } = useTheme();
  const premiumTone = PREMIUM_ICON_TONES[tone];
  const shellShadowColor = isDark ? premiumTone.glowDark : premiumTone.glowLight;
  const coreBackground = isDark ? 'rgba(2,6,23,0.84)' : 'rgba(94,66,187,0.94)';
  const coreBorder = isDark ? 'rgba(216,180,254,0.18)' : 'rgba(255,255,255,0.26)';
  const sheenTop = Math.max(4, Math.round(size * 0.16));
  const sheenLeft = Math.max(5, Math.round(size * 0.2));
  const sparkSize = Math.max(5, Math.round(size * 0.16));
  const sparkTop = Math.max(5, Math.round(size * 0.18));
  const sparkRight = Math.max(6, Math.round(size * 0.2));

  return (
    <View style={[styles.wrap, { width: glowSize, height: glowSize }, style]}>
      <View
        style={[
          styles.glow,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            backgroundColor: shellShadowColor,
          },
        ]}
      />
      <LinearGradient
        colors={isDark ? premiumTone.gradientDark : premiumTone.gradientLight}
        start={{ x: 0.15, y: 0.05 }}
        end={{ x: 0.9, y: 1 }}
        style={[
          styles.shell,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: isDark ? premiumTone.ringDark : premiumTone.ringLight,
            shadowColor: shellShadowColor,
          },
        ]}
      >
        <View
          style={[
            styles.inner,
            {
              top: innerInset,
              right: innerInset,
              bottom: innerInset,
              left: innerInset,
              borderRadius: (size - innerInset * 2) / 2,
              backgroundColor: coreBackground,
              borderColor: coreBorder,
            },
          ]}
        >
          <Ionicons name={icon} size={iconSize} color={isDark ? premiumTone.iconDark : premiumTone.iconLight} />
        </View>
        <View
          style={[
            styles.sheen,
            {
              top: sheenTop,
              left: sheenLeft,
              width: size * 0.46,
              height: size * 0.18,
              borderRadius: size * 0.16,
            },
          ]}
        />
        <View
          style={[
            styles.spark,
            {
              top: sparkTop,
              right: sparkRight,
              width: sparkSize,
              height: sparkSize,
            },
          ]}
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  glow: {
    position: 'absolute',
    opacity: 0.9,
  },
  shell: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
  },
  inner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  sheen: {
    position: 'absolute',
    opacity: 0.7,
    backgroundColor: 'rgba(255,255,255,0.24)',
    transform: [{ rotate: '-14deg' }],
  },
  spark: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
});
