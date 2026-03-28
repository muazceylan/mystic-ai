import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { MODULE_ICONS } from '../../constants/icons';
import { useTheme } from '../../context/ThemeContext';
import type { IconName } from './types';

type HomePremiumSize = 'sm' | 'md';

type HomePremiumIconVisual = {
  gradientLight: [string, string];
  gradientDark: [string, string];
  iconLight: string;
  iconDark: string;
  glowLight: string;
  glowDark: string;
  ringLight: string;
  ringDark: string;
};

const VISUALS: Record<string, HomePremiumIconVisual> = {
  mystic: {
    gradientLight: [COLORS.primaryLight, COLORS.primary700],
    gradientDark: [COLORS.themeDarkPrimaryLight, COLORS.primaryDark],
    iconLight: '#FCFAFF',
    iconDark: '#F5F3FF',
    glowLight: 'rgba(157,78,221,0.18)',
    glowDark: 'rgba(168,85,247,0.24)',
    ringLight: 'rgba(199,132,247,0.28)',
    ringDark: 'rgba(216,180,254,0.30)',
  },
  cosmic: {
    gradientLight: [COLORS.blue, COLORS.primary],
    gradientDark: [COLORS.themeDarkAccent, COLORS.themeDarkPrimary],
    iconLight: '#F8FAFC',
    iconDark: '#F1F5F9',
    glowLight: 'rgba(46,74,156,0.16)',
    glowDark: 'rgba(96,165,250,0.20)',
    ringLight: 'rgba(157,78,221,0.24)',
    ringDark: 'rgba(168,85,247,0.28)',
  },
  lunar: {
    gradientLight: [COLORS.moonBlue, COLORS.primaryDark],
    gradientDark: [COLORS.themeDarkAccent, '#172554'],
    iconLight: '#F8FAFC',
    iconDark: '#E0F2FE',
    glowLight: 'rgba(94,66,187,0.16)',
    glowDark: 'rgba(96,165,250,0.20)',
    ringLight: 'rgba(123,158,199,0.28)',
    ringDark: 'rgba(147,197,253,0.26)',
  },
  rose: {
    gradientLight: [COLORS.pink, COLORS.primary],
    gradientDark: [COLORS.themeDarkPrimaryLight, COLORS.primary700],
    iconLight: '#FFF7FB',
    iconDark: '#FDF2F8',
    glowLight: 'rgba(233,30,140,0.16)',
    glowDark: 'rgba(216,180,254,0.22)',
    ringLight: 'rgba(233,30,140,0.22)',
    ringDark: 'rgba(216,180,254,0.26)',
  },
  sacred: {
    gradientLight: ['#C7D2FE', '#4F46E5'],
    gradientDark: ['#818CF8', '#312E81'],
    iconLight: '#FCFAFF',
    iconDark: '#EEF2FF',
    glowLight: 'rgba(94,66,187,0.16)',
    glowDark: 'rgba(129,140,248,0.20)',
    ringLight: 'rgba(94,66,187,0.22)',
    ringDark: 'rgba(196,181,253,0.24)',
  },
  insight: {
    gradientLight: [COLORS.moonBlue, COLORS.accent],
    gradientDark: [COLORS.themeDarkAccent, COLORS.themeDarkSurface],
    iconLight: '#F8FAFC',
    iconDark: '#E2E8F0',
    glowLight: 'rgba(46,74,156,0.14)',
    glowDark: 'rgba(96,165,250,0.18)',
    ringLight: 'rgba(123,158,199,0.24)',
    ringDark: 'rgba(148,163,184,0.24)',
  },
};

function normalizeToken(value: string | undefined): string {
  return (value ?? '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '');
}

function resolveVisualKey(key?: string, iconName?: IconName): keyof typeof VISUALS {
  const token = normalizeToken(key);

  if (token.includes('compatibility') || token.includes('match')) return 'cosmic';
  if (token.includes('heart')) return 'rose';
  if (token.includes('dream') || token.includes('night') || token.includes('moon')) return 'lunar';
  if (token.includes('spiritual') || token.includes('dua') || token.includes('esma')) return 'sacred';
  if (token.includes('planner') || token.includes('calendar') || token.includes('week')) return 'cosmic';
  if (token.includes('numerology') || token.includes('name') || token.includes('analysis')) return 'insight';
  if (token.includes('decision') || token.includes('compass')) return 'cosmic';
  if (token.includes('today') || token.includes('horoscope')) return 'mystic';

  const fallbackIcon = iconName ?? MODULE_ICONS.guru;
  if (fallbackIcon.includes('heart')) return 'rose';
  if (fallbackIcon.includes('moon')) return 'lunar';
  if (fallbackIcon.includes('calendar') || fallbackIcon.includes('planet') || fallbackIcon.includes('compass')) return 'cosmic';
  if (fallbackIcon.includes('leaf') || fallbackIcon.includes('sparkles')) return 'sacred';
  if (fallbackIcon.includes('text') || fallbackIcon.includes('keypad')) return 'insight';
  return 'mystic';
}

export function HomePremiumIconBadge({
  iconName,
  contextKey,
  size = 'md',
  disabled = false,
}: {
  iconName: IconName;
  contextKey?: string;
  size?: HomePremiumSize;
  disabled?: boolean;
}) {
  const { isDark } = useTheme();
  const visual = VISUALS[resolveVisualKey(contextKey, iconName)];
  const badgeSize = size === 'sm' ? 32 : 42;
  const innerInset = size === 'sm' ? 4 : 5;
  const glowSize = badgeSize + (size === 'sm' ? 8 : 12);
  const iconSize = size === 'sm' ? 16 : 20;
  const coreBg = disabled
    ? isDark
      ? 'rgba(30,41,59,0.92)'
      : 'rgba(100,116,139,0.92)'
    : isDark
      ? 'rgba(2,6,23,0.84)'
      : 'rgba(94,66,187,0.94)';
  const coreBorder = disabled
    ? isDark
      ? 'rgba(148,163,184,0.18)'
      : 'rgba(255,255,255,0.20)'
    : isDark
      ? 'rgba(216,180,254,0.16)'
      : 'rgba(255,255,255,0.24)';

  return (
    <View style={[styles.wrap, { width: glowSize, height: glowSize, opacity: disabled ? 0.76 : 1 }]}>
      <View
        style={[
          styles.glow,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            backgroundColor: isDark ? visual.glowDark : visual.glowLight,
          },
        ]}
      />
      <LinearGradient
        colors={isDark ? visual.gradientDark : visual.gradientLight}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={[
          styles.badge,
          {
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
            borderColor: isDark ? visual.ringDark : visual.ringLight,
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
              borderRadius: (badgeSize - innerInset * 2) / 2,
              backgroundColor: coreBg,
              borderColor: coreBorder,
            },
          ]}
        >
          <Ionicons name={iconName} size={iconSize} color={isDark ? visual.iconDark : visual.iconLight} />
        </View>
        <View
          style={[
            styles.sheen,
            {
              width: badgeSize * 0.4,
              height: badgeSize * 0.18,
              borderRadius: badgeSize * 0.14,
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
  },
  glow: {
    position: 'absolute',
    opacity: 0.92,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  inner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  sheen: {
    position: 'absolute',
    top: 4,
    left: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
});
