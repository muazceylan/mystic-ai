import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radius, shadowHero, spacing, typography } from '../../theme';

interface SkyHeroCardProps {
  subtitleText?: string;
  phase?: string;
  illumination?: number;
  insight?: string;
  isLoading?: boolean;
  ctaLabel?: string;
  onPress: () => void;
}

const STAR_POINTS = [
  [22, 22, 2.2, 0.84],
  [58, 44, 1.7, 0.62],
  [98, 30, 2.5, 0.72],
  [150, 26, 2.0, 0.76],
  [198, 38, 1.8, 0.68],
  [250, 28, 2.1, 0.8],
  [286, 60, 1.9, 0.7],
  [34, 86, 1.7, 0.58],
  [74, 96, 2.2, 0.74],
  [122, 84, 1.8, 0.66],
  [166, 102, 1.6, 0.54],
  [214, 94, 2.0, 0.74],
  [266, 112, 1.8, 0.7],
  [302, 140, 2.4, 0.82],
  [48, 146, 1.7, 0.64],
  [108, 156, 1.5, 0.58],
  [192, 162, 2.0, 0.72],
  [246, 174, 1.8, 0.66],
] as const;

const SPARKLE_POINTS = [
  [40, 58, 0.42],
  [176, 64, 0.36],
  [228, 120, 0.38],
  [90, 170, 0.34],
  [280, 154, 0.4],
] as const;

const MOON_SIZE = spacing.xxl * 4 - spacing.xxs;
const MOON_RING_OUTER = spacing.xxl * 7 - spacing.sm;
const MOON_RING_MID = spacing.xxl * 5 + spacing.xs;
const MOON_RING_INNER = spacing.xxl * 4 + spacing.sm;
const HOME_MAX_FONT_SCALE = 1.15;

export function SkyHeroCard({
  subtitleText,
  phase,
  illumination,
  insight,
  isLoading = false,
  ctaLabel,
  onPress,
}: SkyHeroCardProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const fallbackSubtitleText = t('homeSurface.skyHero.fallbackSubtitle');
  const fallbackInsightText = t('homeSurface.skyHero.fallbackInsight');
  const phaseText = phase?.trim() || '—';
  const illuminationValue = typeof illumination === 'number' ? illumination : 0;
  const subtitle = subtitleText?.trim();
  const insightText = insight?.trim() || fallbackInsightText;
  const resolvedCtaLabel = ctaLabel?.trim() || t('homeSurface.skyHero.cta');
  const fallbackSubtitle =
    phaseText === '—'
      ? fallbackSubtitleText
      : t('homeSurface.skyHero.phaseSubtitle', { phase: phaseText, illumination: illuminationValue });
  const safeTextWidth = Math.max(200, Math.min(312, Math.floor(width * 0.68)));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('homeSurface.skyHero.openAccessibility')}
      hitSlop={{ top: spacing.xs, bottom: spacing.xs, left: spacing.xs, right: spacing.xs }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={[colors.heroGradA, colors.heroGradB, colors.heroGradC]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View pointerEvents="none" style={styles.starsLayer}>
          {STAR_POINTS.map(([left, top, size, opacity], index) => (
            <View
              key={`star-${index}`}
              style={[
                styles.star,
                {
                  left,
                  top,
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  opacity,
                },
              ]}
            />
          ))}
          {SPARKLE_POINTS.map(([left, top, opacity], index) => (
            <View key={`spark-${index}`} style={[styles.sparkleWrap, { left, top, opacity }]}>
              <View style={styles.sparkleH} />
              <View style={styles.sparkleV} />
            </View>
          ))}
        </View>

        <View pointerEvents="none" style={styles.moonWrap}>
          <View style={styles.moonAuraOuter} />
          <View style={styles.moonAuraMid} />
          <View style={styles.moonAuraInner} />
          <View style={styles.moonCircle}>
            <View style={[styles.crater, styles.craterA]} />
            <View style={[styles.crater, styles.craterB]} />
            <View style={[styles.crater, styles.craterC]} />
            <View style={[styles.crater, styles.craterD]} />
          </View>
        </View>

        <View style={[styles.contentZone, { maxWidth: safeTextWidth }]}>
          <Text maxFontSizeMultiplier={HOME_MAX_FONT_SCALE} style={styles.title}>{t('homeSurface.skyHero.title')}</Text>
          {isLoading ? (
            <Text maxFontSizeMultiplier={HOME_MAX_FONT_SCALE} style={styles.subTitle}>{t('homeSurface.skyHero.loadingSubtitle')}</Text>
          ) : (
            <Text maxFontSizeMultiplier={HOME_MAX_FONT_SCALE} numberOfLines={3} style={styles.subTitle}>
              {subtitle || fallbackSubtitle}
            </Text>
          )}
          <Text maxFontSizeMultiplier={HOME_MAX_FONT_SCALE} numberOfLines={4} style={styles.description}>
            {isLoading ? t('homeSurface.skyHero.loadingInsight') : insightText}
          </Text>
        </View>

        <View style={styles.cta}>
          <Text maxFontSizeMultiplier={HOME_MAX_FONT_SCALE} numberOfLines={1} style={styles.ctaText}>{resolvedCtaLabel}</Text>
          <Ionicons name="chevron-forward" size={spacing.md} color={colors.white} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.cardGap,
    borderRadius: radius.hero,
    overflow: 'hidden',
    ...shadowHero,
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.996 }],
  },
  gradient: {
    minHeight: spacing.xxl * 8 + spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sectionGap + spacing.xs,
    paddingBottom: spacing.cardPadding,
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  contentZone: {
    paddingBottom: spacing.xxl + spacing.md,
  },
  starsLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: 'absolute',
    backgroundColor: colors.white,
  },
  sparkleWrap: {
    position: 'absolute',
    width: spacing.sm + 1,
    height: spacing.sm + 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleH: {
    position: 'absolute',
    width: spacing.sm + 1,
    height: 1.2,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
  sparkleV: {
    position: 'absolute',
    width: 1.2,
    height: spacing.sm + 1,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
  moonWrap: {
    position: 'absolute',
    right: -(spacing.lg + spacing.xs),
    top: -(spacing.sm + spacing.xxs),
    width: MOON_RING_OUTER + spacing.sm,
    height: MOON_RING_OUTER + spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moonAuraOuter: {
    position: 'absolute',
    width: MOON_RING_OUTER,
    height: MOON_RING_OUTER,
    borderRadius: MOON_RING_OUTER / 2,
    backgroundColor: colors.moonAuraOuter,
  },
  moonAuraMid: {
    position: 'absolute',
    width: MOON_RING_MID,
    height: MOON_RING_MID,
    borderRadius: MOON_RING_MID / 2,
    backgroundColor: colors.moonAuraMid,
  },
  moonAuraInner: {
    position: 'absolute',
    width: MOON_RING_INNER,
    height: MOON_RING_INNER,
    borderRadius: MOON_RING_INNER / 2,
    backgroundColor: colors.moonAuraInner,
  },
  moonCircle: {
    width: MOON_SIZE,
    height: MOON_SIZE,
    borderRadius: MOON_SIZE / 2,
    backgroundColor: colors.moonBody,
    borderWidth: 1,
    borderColor: colors.moonBorder,
    overflow: 'hidden',
  },
  crater: {
    position: 'absolute',
    backgroundColor: colors.moonCrater,
    borderRadius: radius.pill,
  },
  craterA: {
    width: spacing.xl + spacing.xxs,
    height: spacing.xl + spacing.xxs,
    left: spacing.md,
    top: spacing.lg - spacing.xs,
  },
  craterB: {
    width: spacing.lg + spacing.xxs,
    height: spacing.lg + spacing.xxs,
    left: spacing.xl + spacing.xxs,
    top: spacing.md + 2,
  },
  craterC: {
    width: spacing.md + spacing.xxs,
    height: spacing.md + spacing.xxs,
    left: spacing.xl + spacing.xs,
    top: spacing.xl + spacing.xs,
  },
  craterD: {
    width: spacing.xl,
    height: spacing.xl,
    left: spacing.xl * 2 + spacing.xxs,
    top: spacing.xl + spacing.xs - 1,
  },
  title: {
    ...typography.H1,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: colors.heroTitle,
    marginBottom: spacing.sm,
  },
  subTitle: {
    ...typography.Body,
    fontWeight: '600',
    fontSize: 15,
    lineHeight: 21,
    color: colors.heroBody,
  },
  description: {
    ...typography.Body,
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
    color: colors.heroBody,
  },
  cta: {
    position: 'absolute',
    right: spacing.cardPadding,
    bottom: spacing.cardPadding,
    backgroundColor: colors.heroCtaBg,
    borderWidth: 1,
    borderColor: colors.heroCtaBorder,
    borderRadius: radius.pill,
    paddingVertical: spacing.pillPaddingY - spacing.xs,
    paddingHorizontal: spacing.pillPaddingX,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    shadowColor: colors.shadow,
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: spacing.xxs },
    shadowRadius: spacing.sm,
    elevation: 3,
  },
  ctaText: {
    ...typography.Button,
    color: colors.white,
  },
});
