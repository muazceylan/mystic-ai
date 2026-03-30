import React from 'react';
import { LayoutChangeEvent, StyleSheet, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MatchCard, { type MatchCardProps } from '../MatchCard';
import { AccessibleText } from '../../ui';
import { BrandMark } from '../../ui/BrandLogo';
import { ACCESSIBILITY } from '../../../constants/tokens';
import { radius, spacing } from '../../../theme';
import type { IoniconName } from '../../../constants/icons';
import type { ShareCardAspectRatioKey, ShareCardIconSetKey, ShareCardThemeKey } from './types';

interface ShareCardPreviewGuruProps {
  matchCardProps: MatchCardProps;
  iconSet: ShareCardIconSetKey;
  aspectRatio: ShareCardAspectRatioKey;
  themeVariant: ShareCardThemeKey;
  ornamentLabel: string;
  variant?: 'stage' | 'capture';
  style?: ViewStyle;
}

const CARD_WIDTH = 360;
const CARD_HEIGHT = 720;

type GuruPreviewMeta = {
  topIcon: IoniconName;
  sideIcon: IoniconName;
  footerIcon: IoniconName;
  badgeBg: string;
  badgeBorder: string;
  glow: readonly [string, string];
};

function previewMeta(iconSet: ShareCardIconSetKey): GuruPreviewMeta {
  if (iconSet === 'minimal') {
    return {
      topIcon: 'ellipse-outline',
      sideIcon: 'git-compare-outline',
      footerIcon: 'remove-outline',
      badgeBg: 'rgba(255,255,255,0.82)',
      badgeBorder: 'rgba(201, 185, 229, 0.7)',
      glow: ['rgba(255,255,255,0.54)', 'rgba(205,189,235,0.18)'],
    };
  }

  if (iconSet === 'romantic') {
    return {
      topIcon: 'heart',
      sideIcon: 'heart-half',
      footerIcon: 'sparkles',
      badgeBg: 'rgba(255,244,250,0.88)',
      badgeBorder: 'rgba(240, 206, 239, 0.82)',
      glow: ['rgba(255,239,248,0.72)', 'rgba(239,196,255,0.20)'],
    };
  }

  return {
    topIcon: 'moon',
    sideIcon: 'planet-outline',
    footerIcon: 'sparkles',
    badgeBg: 'rgba(246,241,255,0.86)',
    badgeBorder: 'rgba(216, 203, 243, 0.78)',
    glow: ['rgba(255,247,255,0.7)', 'rgba(205,196,255,0.22)'],
  };
}

function themeGlow(themeVariant: ShareCardThemeKey): readonly [string, string] {
  if (themeVariant === 'lavender_mist') {
    return ['rgba(255,255,255,0.78)', 'rgba(206, 194, 255, 0.22)'];
  }

  if (themeVariant === 'starlit_bloom') {
    return ['rgba(255,242,252,0.78)', 'rgba(242, 184, 230, 0.24)'];
  }

  return ['rgba(255,248,255,0.76)', 'rgba(214, 188, 255, 0.24)'];
}

export function ShareCardPreviewGuru({
  matchCardProps,
  iconSet,
  aspectRatio,
  themeVariant,
  ornamentLabel,
  variant = 'stage',
  style,
}: ShareCardPreviewGuruProps) {
  const [bounds, setBounds] = React.useState({ width: 0, height: 0 });
  const meta = previewMeta(iconSet);

  const handleLayout = React.useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width === bounds.width && height === bounds.height) return;
    setBounds({ width, height });
  }, [bounds.height, bounds.width]);

  const scale = React.useMemo(() => {
    if (!bounds.width || !bounds.height) {
      return variant === 'capture' ? 0.9 : 0.8;
    }

    const horizontalInset = variant === 'capture'
      ? aspectRatio === 'portrait' ? 18 : 10
      : aspectRatio === 'portrait' ? 28 : 14;
    const verticalInset = variant === 'capture'
      ? aspectRatio === 'portrait' ? 22 : 14
      : aspectRatio === 'portrait' ? 34 : 18;

    return Math.max(
      0.56,
      Math.min(
        (bounds.width - horizontalInset) / CARD_WIDTH,
        (bounds.height - verticalInset) / CARD_HEIGHT,
      ),
    );
  }, [aspectRatio, bounds.height, bounds.width, variant]);

  return (
    <View style={[styles.frame, style]} onLayout={handleLayout} collapsable={false}>
      <LinearGradient
        colors={themeGlow(themeVariant)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <LinearGradient
        colors={meta.glow}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.brandHalo} />
      <View style={styles.brandWatermarkWrap}>
        <BrandMark
          variant="icon-transparent"
          size={92}
          style={styles.brandWatermark}
          accessibilityLabel="Astro Guru"
        />
      </View>

      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: meta.badgeBg, borderColor: meta.badgeBorder }]}>
          <Ionicons name={meta.topIcon} size={14} color="#7D5FD0" />
          <AccessibleText
            style={styles.badgeText}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            numberOfLines={1}
          >
            {ornamentLabel}
          </AccessibleText>
        </View>
      </View>

      <View style={styles.centerStage}>
        <View
          style={[
            styles.cardWrap,
            {
              width: CARD_WIDTH * scale,
              height: CARD_HEIGHT * scale,
            },
          ]}
        >
          <View
            style={[
              styles.scaleShell,
              {
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                transform: [
                  { translateX: -((CARD_WIDTH * (1 - scale)) / 2) },
                  { translateY: -((CARD_HEIGHT * (1 - scale)) / 2) },
                  { scale },
                ],
              },
            ]}
          >
            <MatchCard {...matchCardProps} />
          </View>
        </View>
      </View>

      <View style={styles.cornerOrnamentLeft}>
        <Ionicons name={meta.sideIcon} size={18} color="rgba(255,255,255,0.92)" />
      </View>
      <View style={styles.cornerOrnamentRight}>
        <Ionicons name={meta.footerIcon} size={18} color="rgba(255,255,255,0.92)" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    borderRadius: radius.hero,
    overflow: 'hidden',
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  badgeRow: {
    alignItems: 'center',
    zIndex: 2,
  },
  badge: {
    minHeight: 30,
    maxWidth: '72%',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    color: '#6E56B8',
  },
  centerStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandHalo: {
    position: 'absolute',
    width: 164,
    height: 164,
    borderRadius: 999,
    top: 94,
    right: -8,
    backgroundColor: 'rgba(255,255,255,0.26)',
    opacity: 0.46,
  },
  brandWatermarkWrap: {
    position: 'absolute',
    top: 106,
    right: 8,
  },
  brandWatermark: {
    opacity: 0.14,
    transform: [{ rotate: '-8deg' }],
  },
  cardWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleShell: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  cornerOrnamentLeft: {
    position: 'absolute',
    left: 18,
    top: '46%',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
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
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
