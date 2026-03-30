import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AccessibleText } from '../../ui';
import { BrandMark } from '../../ui/BrandLogo';
import { ACCESSIBILITY } from '../../../constants/tokens';
import { radius, spacing } from '../../../theme';
import type { IoniconName } from '../../../constants/icons';
import type { ShareCardThemeKey } from './types';

interface ShareCardPosterShellProps {
  badgeLabel: string;
  badgeIconName: IoniconName;
  leftOrnamentIconName?: IoniconName;
  rightOrnamentIconName?: IoniconName;
  themeVariant: ShareCardThemeKey;
  variant?: 'stage' | 'capture';
  style?: ViewStyle;
  children: React.ReactNode;
}

type ShellPalette = {
  shellGlow: readonly [string, string];
  shellWash: readonly [string, string];
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  badgeIcon: string;
  ornamentBg: string;
  ornamentTint: string;
  posterSurface: readonly [string, string];
  posterBorder: string;
  posterGlow: string;
};

function getShellPalette(themeVariant: ShareCardThemeKey): ShellPalette {
  if (themeVariant === 'lavender_mist') {
    return {
      shellGlow: ['rgba(255,255,255,0.82)', 'rgba(208,194,255,0.24)'],
      shellWash: ['rgba(255,250,255,0.74)', 'rgba(232,220,255,0.24)'],
      badgeBg: 'rgba(248,243,255,0.92)',
      badgeBorder: 'rgba(217, 204, 244, 0.84)',
      badgeText: '#6F57B9',
      badgeIcon: '#7C65C5',
      ornamentBg: 'rgba(255,255,255,0.22)',
      ornamentTint: 'rgba(255,255,255,0.92)',
      posterSurface: ['rgba(255,255,255,0.98)', 'rgba(248,244,255,0.96)'],
      posterBorder: 'rgba(234, 226, 248, 0.94)',
      posterGlow: 'rgba(255,255,255,0.86)',
    };
  }

  if (themeVariant === 'starlit_bloom') {
    return {
      shellGlow: ['rgba(255,242,252,0.78)', 'rgba(245,184,235,0.24)'],
      shellWash: ['rgba(255,247,252,0.60)', 'rgba(243,210,255,0.22)'],
      badgeBg: 'rgba(255,244,250,0.90)',
      badgeBorder: 'rgba(240, 214, 241, 0.84)',
      badgeText: '#8A4D9A',
      badgeIcon: '#9960A6',
      ornamentBg: 'rgba(255,255,255,0.18)',
      ornamentTint: 'rgba(255,255,255,0.92)',
      posterSurface: ['rgba(255,252,255,0.98)', 'rgba(252,245,255,0.96)'],
      posterBorder: 'rgba(241, 224, 245, 0.92)',
      posterGlow: 'rgba(255,247,255,0.84)',
    };
  }

  return {
    shellGlow: ['rgba(255,248,255,0.78)', 'rgba(214,188,255,0.24)'],
    shellWash: ['rgba(255,250,255,0.68)', 'rgba(226,214,255,0.22)'],
    badgeBg: 'rgba(246,241,255,0.90)',
    badgeBorder: 'rgba(220, 206, 244, 0.82)',
    badgeText: '#735AC0',
    badgeIcon: '#7D65CA',
    ornamentBg: 'rgba(255,255,255,0.20)',
    ornamentTint: 'rgba(255,255,255,0.92)',
    posterSurface: ['rgba(255,255,255,0.98)', 'rgba(248,243,255,0.96)'],
    posterBorder: 'rgba(235, 224, 247, 0.92)',
    posterGlow: 'rgba(255,255,255,0.86)',
  };
}

export function ShareCardPosterShell({
  badgeLabel,
  badgeIconName,
  leftOrnamentIconName = 'sparkles',
  rightOrnamentIconName = 'moon',
  themeVariant,
  variant = 'stage',
  style,
  children,
}: ShareCardPosterShellProps) {
  const compact = variant === 'stage';
  const palette = getShellPalette(themeVariant);

  return (
    <View style={[styles.frame, compact ? styles.compactFrame : styles.captureFrame, style]}>
      <LinearGradient
        colors={palette.shellGlow}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={palette.shellWash}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.badgeRow}>
        <View
          style={[
            styles.badge,
            compact ? styles.compactBadge : styles.captureBadge,
            { backgroundColor: palette.badgeBg, borderColor: palette.badgeBorder },
          ]}
        >
          <Ionicons
            name={badgeIconName}
            size={compact ? 14 : 16}
            color={palette.badgeIcon}
          />
          <AccessibleText
            style={[styles.badgeText, compact ? styles.compactBadgeText : styles.captureBadgeText, { color: palette.badgeText }]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            numberOfLines={1}
          >
            {badgeLabel}
          </AccessibleText>
        </View>
      </View>

      <View style={styles.posterStage}>
        <LinearGradient
          colors={palette.posterSurface}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.posterCard,
            compact ? styles.compactPosterCard : styles.capturePosterCard,
            { borderColor: palette.posterBorder },
          ]}
        >
          <View style={[styles.posterGlow, { backgroundColor: palette.posterGlow }]} />
          <View style={[styles.brandHalo, compact ? styles.compactBrandHalo : styles.captureBrandHalo, { backgroundColor: palette.posterGlow }]} />
          <View style={[styles.brandWatermarkWrap, compact ? styles.compactBrandWatermarkWrap : styles.captureBrandWatermarkWrap]}>
            <BrandMark
              variant="icon-transparent"
              size={compact ? 84 : 108}
              style={styles.brandWatermark}
              accessibilityLabel="Astro Guru"
            />
          </View>
          <View style={styles.posterContent}>{children}</View>
        </LinearGradient>
      </View>

      <View style={[styles.cornerOrnamentLeft, { backgroundColor: palette.ornamentBg }]}>
        <Ionicons name={leftOrnamentIconName} size={18} color={palette.ornamentTint} />
      </View>
      <View style={[styles.cornerOrnamentRight, { backgroundColor: palette.ornamentBg }]}>
        <Ionicons name={rightOrnamentIconName} size={18} color={palette.ornamentTint} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    borderRadius: radius.hero,
    overflow: 'hidden',
  },
  compactFrame: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  captureFrame: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  badgeRow: {
    alignItems: 'center',
    zIndex: 2,
  },
  badge: {
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  compactBadge: {
    minHeight: 30,
    maxWidth: '72%',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  captureBadge: {
    minHeight: 34,
    maxWidth: '76%',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  badgeText: {
    fontWeight: '800',
  },
  compactBadgeText: {
    fontSize: 11,
    lineHeight: 14,
  },
  captureBadgeText: {
    fontSize: 13,
    lineHeight: 16,
  },
  posterStage: {
    flex: 1,
    justifyContent: 'center',
  },
  posterCard: {
    flex: 1,
    borderWidth: 1,
    overflow: 'hidden',
  },
  compactPosterCard: {
    borderRadius: 28,
  },
  capturePosterCard: {
    borderRadius: 34,
  },
  posterGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    top: -70,
    right: -40,
    opacity: 0.68,
  },
  brandHalo: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.4,
  },
  compactBrandHalo: {
    width: 140,
    height: 140,
    top: 74,
    right: -8,
  },
  captureBrandHalo: {
    width: 184,
    height: 184,
    top: 94,
    right: 8,
  },
  brandWatermarkWrap: {
    position: 'absolute',
    zIndex: 0,
  },
  compactBrandWatermarkWrap: {
    top: 82,
    right: 4,
  },
  captureBrandWatermarkWrap: {
    top: 104,
    right: 18,
  },
  brandWatermark: {
    opacity: 0.14,
    transform: [{ rotate: '-7deg' }],
  },
  posterContent: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    zIndex: 1,
  },
  cornerOrnamentLeft: {
    position: 'absolute',
    left: 18,
    top: '46%',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerOrnamentRight: {
    position: 'absolute',
    right: 18,
    top: '46%',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
