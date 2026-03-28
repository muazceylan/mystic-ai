import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import type { CompassStatus } from './model';

type DecisionCompassBadgeTone = 'hero' | 'supportive' | 'balanced' | 'caution' | 'cosmic';
type DecisionCompassBadgeSize = 'xs' | 'sm' | 'md';

type BadgeVisual = {
  gradientLight: [string, string];
  gradientDark: [string, string];
  iconLight: string;
  iconDark: string;
  glowLight: string;
  glowDark: string;
  ringLight: string;
  ringDark: string;
};

const VISUALS: Record<DecisionCompassBadgeTone, BadgeVisual> = {
  hero: {
    gradientLight: [COLORS.primaryLight, COLORS.primary700],
    gradientDark: [COLORS.themeDarkPrimaryLight, COLORS.primaryDark],
    iconLight: '#FCFAFF',
    iconDark: '#F5F3FF',
    glowLight: 'rgba(157,78,221,0.18)',
    glowDark: 'rgba(168,85,247,0.24)',
    ringLight: 'rgba(199,132,247,0.28)',
    ringDark: 'rgba(216,180,254,0.30)',
  },
  supportive: {
    gradientLight: [COLORS.blue, COLORS.primary],
    gradientDark: [COLORS.themeDarkAccent, COLORS.themeDarkPrimary],
    iconLight: '#F8FAFC',
    iconDark: '#F1F5F9',
    glowLight: 'rgba(46,74,156,0.16)',
    glowDark: 'rgba(96,165,250,0.22)',
    ringLight: 'rgba(157,78,221,0.24)',
    ringDark: 'rgba(168,85,247,0.28)',
  },
  balanced: {
    gradientLight: [COLORS.moonBlue, COLORS.accent],
    gradientDark: [COLORS.themeDarkAccent, COLORS.themeDarkSurface],
    iconLight: '#F8FAFC',
    iconDark: '#E2E8F0',
    glowLight: 'rgba(46,74,156,0.14)',
    glowDark: 'rgba(96,165,250,0.20)',
    ringLight: 'rgba(123,158,199,0.24)',
    ringDark: 'rgba(148,163,184,0.24)',
  },
  caution: {
    gradientLight: ['#DDD6FE', '#64748B'],
    gradientDark: ['#A78BFA', '#334155'],
    iconLight: '#FAF7FF',
    iconDark: '#F8FAFC',
    glowLight: 'rgba(148,163,184,0.16)',
    glowDark: 'rgba(148,163,184,0.22)',
    ringLight: 'rgba(196,181,253,0.24)',
    ringDark: 'rgba(196,181,253,0.26)',
  },
  cosmic: {
    gradientLight: [COLORS.moonBlue, COLORS.primaryDark],
    gradientDark: [COLORS.themeDarkAccent, '#172554'],
    iconLight: '#F8FAFC',
    iconDark: '#E0F2FE',
    glowLight: 'rgba(94,66,187,0.16)',
    glowDark: 'rgba(96,165,250,0.20)',
    ringLight: 'rgba(123,158,199,0.28)',
    ringDark: 'rgba(147,197,253,0.26)',
  },
};

function resolveTone(
  tone?: DecisionCompassBadgeTone,
  status?: CompassStatus,
): DecisionCompassBadgeTone {
  if (tone) return tone;
  if (status === 'STRONG') return 'hero';
  if (status === 'SUPPORTIVE') return 'supportive';
  if (status === 'BALANCED') return 'balanced';
  if (status === 'CAUTION' || status === 'HOLD') return 'caution';
  return 'hero';
}

export function DecisionCompassPremiumBadge({
  iconName,
  tone,
  status,
  size = 'md',
}: {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  tone?: DecisionCompassBadgeTone;
  status?: CompassStatus;
  size?: DecisionCompassBadgeSize;
}) {
  const { isDark } = useTheme();
  const visual = VISUALS[resolveTone(tone, status)];
  const badgeSize = size === 'xs' ? 22 : size === 'sm' ? 32 : 42;
  const innerInset = size === 'xs' ? 3 : size === 'sm' ? 4 : 5;
  const iconSize = size === 'xs' ? 11 : size === 'sm' ? 16 : 20;
  const glowSize = badgeSize + (size === 'xs' ? 8 : 12);
  const coreBg = isDark ? 'rgba(2,6,23,0.84)' : 'rgba(94,66,187,0.94)';
  const coreBorder = isDark ? 'rgba(216,180,254,0.16)' : 'rgba(255,255,255,0.24)';

  return (
    <View style={[styles.wrap, { width: glowSize, height: glowSize }]}>
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
