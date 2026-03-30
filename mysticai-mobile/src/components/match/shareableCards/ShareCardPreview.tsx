import React from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { AccessibleText } from '../../ui';
import { BrandBadge, BrandMark } from '../../ui/BrandLogo';
import { ACCESSIBILITY } from '../../../constants/tokens';
import type { IoniconName } from '../../../constants/icons';
import { radius } from '../../../theme';
import type {
  ShareCardIconSetKey,
  ShareCardThemeKey,
  ShareableCardsPreviewMetric,
  ShareableCardsPreviewModel,
} from './types';

interface ShareCardPreviewProps {
  model: ShareableCardsPreviewModel;
  variant?: 'stage' | 'capture';
  style?: ViewStyle;
}

type ThemePalette = {
  frame: readonly [string, string, string];
  surface: readonly [string, string, string];
  accent: string;
  accentStrong: string;
  accentSoft: string;
  accentGlow: string;
  border: string;
  textStrong: string;
  textSoft: string;
  panelBg: string;
  panelBorder: string;
  panelSoft: string;
  lineSoft: string;
};

type IconSetVisual = {
  header: IoniconName;
  relation: IoniconName;
  footer: IoniconName;
  pulse: IoniconName;
  metricIcons: Record<'love' | 'communication' | 'balance', IoniconName>;
};

const DISPLAY_SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: undefined,
});

function getPalette(themeKey: ShareCardThemeKey): ThemePalette {
  if (themeKey === 'lavender_mist') {
    return {
      frame: ['#F7F1FF', '#E2D2FF', '#C9B4FF'],
      surface: ['#FFF9FF', '#EEE1FF', '#D7C2FF'],
      accent: '#7750DD',
      accentStrong: '#5E33D0',
      accentSoft: 'rgba(255, 244, 252, 0.84)',
      accentGlow: 'rgba(255, 243, 251, 0.46)',
      border: 'rgba(255,255,255,0.66)',
      textStrong: '#2B1A56',
      textSoft: '#6B5A97',
      panelBg: 'rgba(255,255,255,0.18)',
      panelBorder: 'rgba(255,255,255,0.22)',
      panelSoft: 'rgba(255,255,255,0.24)',
      lineSoft: 'rgba(255,255,255,0.34)',
    };
  }

  if (themeKey === 'starlit_bloom') {
    return {
      frame: ['#4C2B90', '#7A58D8', '#F0B2E8'],
      surface: ['#4A2D86', '#7B59D3', '#D79AE8'],
      accent: '#FFF1F9',
      accentStrong: '#FFE3F6',
      accentSoft: 'rgba(255, 241, 248, 0.86)',
      accentGlow: 'rgba(255, 220, 242, 0.30)',
      border: 'rgba(255,255,255,0.28)',
      textStrong: '#FFF8FD',
      textSoft: 'rgba(255,245,252,0.78)',
      panelBg: 'rgba(255,255,255,0.12)',
      panelBorder: 'rgba(255,255,255,0.16)',
      panelSoft: 'rgba(255,255,255,0.18)',
      lineSoft: 'rgba(255,255,255,0.22)',
    };
  }

  return {
    frame: ['#F5EDFF', '#D8C0FF', '#EAAFE0'],
    surface: ['#6F51D8', '#9F79F0', '#E9B2DE'],
    accent: '#FFF1F8',
    accentStrong: '#FFE5F6',
    accentSoft: 'rgba(255, 243, 249, 0.86)',
    accentGlow: 'rgba(255, 231, 245, 0.34)',
    border: 'rgba(255,255,255,0.32)',
    textStrong: '#FFF9FF',
    textSoft: 'rgba(255,249,255,0.78)',
    panelBg: 'rgba(255,255,255,0.11)',
    panelBorder: 'rgba(255,255,255,0.16)',
    panelSoft: 'rgba(255,255,255,0.18)',
    lineSoft: 'rgba(255,255,255,0.22)',
  };
}

function iconForSet(iconSet: ShareCardIconSetKey): IconSetVisual {
  if (iconSet === 'minimal') {
    return {
      header: 'ellipse-outline',
      relation: 'git-merge-outline',
      footer: 'remove-outline',
      pulse: 'swap-horizontal-outline',
      metricIcons: {
        love: 'ellipse-outline',
        communication: 'chatbubble-outline',
        balance: 'git-compare-outline',
      },
    };
  }

  if (iconSet === 'romantic') {
    return {
      header: 'heart',
      relation: 'heart-half',
      footer: 'heart',
      pulse: 'sparkles',
      metricIcons: {
        love: 'heart',
        communication: 'chatbubble-ellipses',
        balance: 'sparkles',
      },
    };
  }

  return {
    header: 'moon',
    relation: 'planet-outline',
    footer: 'planet-outline',
    pulse: 'sparkles',
    metricIcons: {
      love: 'moon',
      communication: 'planet-outline',
      balance: 'sparkles',
    },
  };
}

function rankMetrics(metrics: ShareableCardsPreviewMetric[]) {
  const ranked = [...metrics].sort((a, b) => b.value - a.value);
  return {
    strongest: ranked[0] ?? metrics[0],
    focus: ranked[ranked.length - 1] ?? metrics[0],
    middle: ranked[1] ?? ranked[0] ?? metrics[0],
  };
}

function metricFillColor(score: number, palette: ThemePalette) {
  if (score >= 88) return palette.accentStrong;
  if (score >= 74) return palette.accent;
  return 'rgba(255,255,255,0.52)';
}

function createStyles({
  compact,
  portrait,
  isBond,
}: {
  compact: boolean;
  portrait: boolean;
  isBond: boolean;
}) {
  const portraitStageCompact = compact && portrait;
  const bondPortraitStage = compact && portrait && isBond;

  return StyleSheet.create({
    frame: {
      borderRadius: compact ? 28 : 34,
      padding: bondPortraitStage ? 6 : compact ? 8 : 12,
      overflow: 'hidden',
    },
    outerGlow: {
      position: 'absolute',
      borderRadius: 999,
    },
    glowTop: {
      width: compact ? 180 : 240,
      height: compact ? 180 : 240,
      top: compact ? -24 : -10,
      right: compact ? -56 : -36,
    },
    glowBottom: {
      width: compact ? 220 : 280,
      height: compact ? 220 : 280,
      left: compact ? -92 : -70,
      bottom: compact ? -100 : -82,
    },
    orbitalLine: {
      position: 'absolute',
      left: compact ? 34 : 44,
      right: compact ? 34 : 44,
      top: portrait ? (compact ? 138 : 154) : (compact ? 122 : 144),
      height: 1,
      opacity: isBond ? 1 : 0.64,
    },
    surface: {
      flex: 1,
      borderRadius: compact ? 24 : 30,
      borderWidth: 1,
      overflow: 'hidden',
      paddingHorizontal: bondPortraitStage ? 14 : compact ? 16 : 22,
      paddingTop: bondPortraitStage ? 14 : compact ? 16 : 20,
      paddingBottom: bondPortraitStage ? 14 : compact ? 16 : 20,
      justifyContent: 'space-between',
      gap: bondPortraitStage ? 10 : compact ? 12 : 16,
    },
    nebula: {
      position: 'absolute',
      borderRadius: 999,
      opacity: 0.95,
    },
    nebulaTop: {
      width: compact ? 160 : 220,
      height: compact ? 160 : 220,
      top: compact ? -38 : -22,
      right: compact ? -48 : -34,
    },
    nebulaBottom: {
      width: compact ? 200 : 240,
      height: compact ? 200 : 240,
      left: compact ? -70 : -46,
      bottom: compact ? -100 : -84,
    },
    brandHalo: {
      position: 'absolute',
      width: compact ? 164 : 208,
      height: compact ? 164 : 208,
      borderRadius: 999,
      top: compact ? 92 : 108,
      right: compact ? -16 : 4,
      opacity: 0.4,
    },
    brandWatermarkWrap: {
      position: 'absolute',
      top: compact ? 106 : 122,
      right: compact ? 4 : 18,
    },
    brandWatermark: {
      opacity: 0.13,
      transform: [{ rotate: '-8deg' }],
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: bondPortraitStage ? 6 : compact ? 8 : 10,
    },
    topPill: {
      minHeight: bondPortraitStage ? 30 : compact ? 32 : 36,
      maxWidth: bondPortraitStage ? '47.5%' : portraitStageCompact ? '56%' : '58%',
      paddingHorizontal: bondPortraitStage ? 9 : compact ? 10 : 12,
      borderRadius: radius.pill,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: bondPortraitStage ? 5 : 6,
    },
    topPillRight: {
      maxWidth: bondPortraitStage ? '47.5%' : portraitStageCompact ? '42%' : '40%',
      justifyContent: 'center',
    },
    topPillText: {
      fontSize: bondPortraitStage ? 10 : compact ? 11 : 12,
      lineHeight: bondPortraitStage ? 13 : compact ? 14 : 16,
      fontWeight: '800',
      flexShrink: 1,
    },
    heroStage: {
      gap: compact ? 12 : 14,
    },
    duoHeroStage: {
      gap: compact ? 10 : 12,
    },
    identityRow: {
      flexDirection: 'row',
      alignItems: portrait ? 'stretch' : 'flex-end',
      justifyContent: 'space-between',
      gap: compact ? 10 : 14,
    },
    personCard: {
      flex: 1,
      borderWidth: 1,
      borderRadius: compact ? 18 : 22,
      paddingHorizontal: compact ? 12 : 14,
      paddingVertical: compact ? 12 : 14,
      gap: compact ? 3 : 4,
      justifyContent: 'center',
      minWidth: 0,
    },
    portraitPersonCard: {
      flex: portrait ? 0.95 : 1,
    },
    personSign: {
      fontSize: compact ? 24 : 28,
      lineHeight: compact ? 28 : 32,
      textAlign: portrait ? 'left' : 'center',
    },
    personName: {
      fontSize: compact ? 15 : 17,
      lineHeight: compact ? 18 : 20,
      fontWeight: '800',
      textAlign: portrait ? 'left' : 'center',
    },
    personMeta: {
      fontSize: compact ? 11 : 12,
      lineHeight: compact ? 14 : 16,
      fontWeight: '600',
      textAlign: portrait ? 'left' : 'center',
    },
    scoreHalo: {
      flex: portrait ? 1.05 : 1.15,
      minHeight: portrait ? (compact ? 184 : 220) : (compact ? 200 : 230),
      borderRadius: compact ? 28 : 34,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: compact ? 14 : 18,
      paddingVertical: compact ? 16 : 20,
      overflow: 'hidden',
      gap: compact ? 4 : 6,
    },
    scoreGlow: {
      position: 'absolute',
      width: compact ? 120 : 150,
      height: compact ? 120 : 150,
      borderRadius: 999,
      top: compact ? 18 : 24,
      opacity: 0.35,
    },
    titleText: {
      fontSize: compact ? 16 : 20,
      lineHeight: compact ? 20 : 24,
      fontWeight: '800',
      textAlign: 'center',
      letterSpacing: -0.35,
    },
    scoreText: {
      fontFamily: DISPLAY_SERIF,
      fontSize: compact ? (portrait ? 62 : 74) : (portrait ? 76 : 92),
      lineHeight: compact ? (portrait ? 68 : 78) : (portrait ? 82 : 98),
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: -2.4,
    },
    scoreMeta: {
      fontSize: compact ? 11 : 12,
      lineHeight: compact ? 14 : 16,
      fontWeight: '700',
      textAlign: 'center',
    },
    supportRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: compact ? 8 : 10,
    },
    supportChip: {
      minHeight: compact ? 30 : 34,
      paddingHorizontal: compact ? 10 : 12,
      borderRadius: radius.pill,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    supportText: {
      fontSize: compact ? 11 : 12,
      lineHeight: compact ? 14 : 16,
      fontWeight: '700',
    },
    metricsGrid: {
      flexDirection: portrait ? 'column' : 'row',
      gap: compact ? 8 : 10,
    },
    metricCard: {
      flex: 1,
      minHeight: compact ? 86 : 102,
      borderRadius: compact ? 18 : 20,
      borderWidth: 1,
      paddingHorizontal: compact ? 10 : 12,
      paddingVertical: compact ? 12 : 14,
      justifyContent: 'space-between',
      gap: compact ? 6 : 8,
    },
    metricTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    metricBadge: {
      width: compact ? 28 : 30,
      height: compact ? 28 : 30,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    metricValue: {
      fontSize: compact ? 20 : 24,
      lineHeight: compact ? 24 : 28,
      fontWeight: '800',
    },
    metricLabel: {
      fontSize: compact ? 11 : 12,
      lineHeight: compact ? 14 : 16,
      fontWeight: '700',
    },
    metricTrack: {
      height: compact ? 5 : 6,
      borderRadius: radius.pill,
      overflow: 'hidden',
      backgroundColor: 'rgba(255,255,255,0.14)',
    },
    metricFill: {
      height: '100%',
      borderRadius: radius.pill,
    },
    insightRow: {
      flexDirection: portrait ? 'column' : 'row',
      gap: compact ? 8 : 10,
    },
    insightCard: {
      flex: 1,
      borderRadius: compact ? 18 : 20,
      borderWidth: 1,
      paddingHorizontal: compact ? 12 : 14,
      paddingVertical: compact ? 12 : 14,
      gap: compact ? 4 : 5,
    },
    insightLabel: {
      fontSize: compact ? 10 : 11,
      lineHeight: compact ? 13 : 14,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    insightMetricRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    insightMetricName: {
      flex: 1,
      fontSize: compact ? 14 : 16,
      lineHeight: compact ? 18 : 20,
      fontWeight: '800',
    },
    insightMetricValue: {
      fontSize: compact ? 18 : 22,
      lineHeight: compact ? 22 : 26,
      fontWeight: '800',
    },
    summaryCard: {
      borderRadius: compact ? 18 : 22,
      borderWidth: 1,
      paddingHorizontal: bondPortraitStage ? 12 : compact ? 14 : 18,
      paddingVertical: bondPortraitStage ? 12 : compact ? 14 : 16,
      gap: bondPortraitStage ? 7 : compact ? 8 : 10,
    },
    summaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    summaryLabel: {
      fontSize: compact ? 10 : 11,
      lineHeight: compact ? 13 : 14,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    summaryText: {
      fontSize: bondPortraitStage ? 12 : compact ? 13 : 15,
      lineHeight: bondPortraitStage ? 17 : compact ? 19 : 22,
      fontWeight: '600',
      textAlign: portrait && isBond ? 'left' : 'center',
    },
    bondStage: {
      gap: bondPortraitStage ? 8 : compact ? 12 : 16,
    },
    bondHeroCard: {
      borderRadius: compact ? 22 : 28,
      borderWidth: 1,
      overflow: 'hidden',
      paddingHorizontal: bondPortraitStage ? 10 : compact ? 12 : 16,
      paddingVertical: bondPortraitStage ? 12 : compact ? 14 : 18,
    },
    orbitBoard: {
      minHeight: bondPortraitStage
        ? 120
        : portrait
        ? compact
          ? 160
          : 184
        : compact
        ? 150
        : 172,
      justifyContent: 'center',
      gap: bondPortraitStage ? 10 : compact ? 14 : 18,
    },
    orbitLine: {
      position: 'absolute',
      left: bondPortraitStage ? 22 : compact ? 28 : 34,
      right: bondPortraitStage ? 22 : compact ? 28 : 34,
      top: '50%',
      height: 1,
      marginTop: -0.5,
    },
    orbitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: bondPortraitStage ? 5 : compact ? 8 : 12,
    },
    orbitNode: {
      flex: 1,
      alignItems: 'center',
      gap: bondPortraitStage ? 2 : compact ? 3 : 4,
      minWidth: 0,
    },
    orbitNodeSign: {
      fontSize: bondPortraitStage ? 20 : compact ? 22 : 26,
      lineHeight: bondPortraitStage ? 23 : compact ? 26 : 30,
    },
    orbitNodeName: {
      fontSize: bondPortraitStage ? 12 : compact ? 14 : 16,
      lineHeight: bondPortraitStage ? 15 : compact ? 18 : 20,
      fontWeight: '800',
      textAlign: 'center',
    },
    orbitNodeMeta: {
      fontSize: bondPortraitStage ? 9 : compact ? 10 : 11,
      lineHeight: bondPortraitStage ? 12 : compact ? 13 : 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    pulseCore: {
      width: bondPortraitStage
        ? 94
        : compact
        ? portrait
          ? 116
          : 124
        : portrait
        ? 132
        : 148,
      height: bondPortraitStage
        ? 94
        : compact
        ? portrait
          ? 116
          : 124
        : portrait
        ? 132
        : 148,
      borderRadius: 999,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: bondPortraitStage ? 8 : compact ? 10 : 12,
      gap: bondPortraitStage ? 1 : compact ? 2 : 4,
    },
    pulseLabel: {
      fontSize: bondPortraitStage ? 8 : compact ? 10 : 11,
      lineHeight: bondPortraitStage ? 10 : compact ? 13 : 14,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      textAlign: 'center',
    },
    pulseScore: {
      fontFamily: DISPLAY_SERIF,
      fontSize: bondPortraitStage ? 30 : compact ? 34 : 42,
      lineHeight: bondPortraitStage ? 32 : compact ? 38 : 46,
      fontWeight: '700',
      textAlign: 'center',
    },
    pulseTheme: {
      fontSize: bondPortraitStage ? 9 : compact ? 10 : 11,
      lineHeight: bondPortraitStage ? 11 : compact ? 13 : 14,
      fontWeight: '700',
      textAlign: 'center',
    },
    pulseRail: {
      gap: bondPortraitStage ? 7 : compact ? 8 : 10,
    },
    pulseRow: {
      borderRadius: compact ? 18 : 20,
      borderWidth: 1,
      paddingHorizontal: bondPortraitStage ? 11 : compact ? 12 : 14,
      paddingVertical: bondPortraitStage ? 9 : compact ? 10 : 12,
      gap: bondPortraitStage ? 5 : compact ? 6 : 8,
    },
    pulseTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    pulseTopLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minWidth: 0,
      flex: 1,
    },
    pulseMetricName: {
      flex: 1,
      fontSize: bondPortraitStage ? 12 : compact ? 13 : 15,
      lineHeight: bondPortraitStage ? 15 : compact ? 16 : 18,
      fontWeight: '800',
    },
    pulseMetricValue: {
      fontSize: bondPortraitStage ? 15 : compact ? 16 : 18,
      lineHeight: bondPortraitStage ? 18 : compact ? 20 : 22,
      fontWeight: '800',
    },
    microInsightRow: {
      flexDirection: 'row',
      gap: bondPortraitStage ? 6 : 8,
    },
    microInsightCard: {
      flex: 1,
      borderRadius: compact ? 16 : 18,
      borderWidth: 1,
      paddingHorizontal: bondPortraitStage ? 10 : 12,
      paddingVertical: bondPortraitStage ? 9 : 10,
      gap: 4,
    },
    microInsightLabel: {
      fontSize: bondPortraitStage ? 9 : 10,
      lineHeight: bondPortraitStage ? 11 : 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    microInsightTitle: {
      fontSize: bondPortraitStage ? 11 : 13,
      lineHeight: bondPortraitStage ? 14 : 16,
      fontWeight: '800',
    },
    microInsightValue: {
      fontSize: bondPortraitStage ? 16 : 18,
      lineHeight: bondPortraitStage ? 18 : 20,
      fontWeight: '800',
    },
    utilityRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: compact ? 8 : 10,
    },
    utilityChip: {
      minHeight: compact ? 30 : 34,
      paddingHorizontal: compact ? 10 : 12,
      borderRadius: radius.pill,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    utilityText: {
      fontSize: compact ? 11 : 12,
      lineHeight: compact ? 14 : 16,
      fontWeight: '700',
    },
    footerRow: {
      marginTop: bondPortraitStage ? 0 : compact ? 2 : 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: bondPortraitStage ? 6 : 8,
    },
    footerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: radius.pill,
      borderWidth: 1,
      paddingHorizontal: bondPortraitStage ? 9 : compact ? 10 : 12,
      paddingVertical: bondPortraitStage ? 5 : compact ? 6 : 8,
    },
    footerText: {
      fontSize: bondPortraitStage ? 10 : compact ? 11 : 12,
      lineHeight: bondPortraitStage ? 12 : compact ? 14 : 16,
      fontWeight: '700',
    },
    sourceText: {
      flex: 1,
      textAlign: 'right',
      fontSize: bondPortraitStage ? 10 : compact ? 11 : 12,
      lineHeight: bondPortraitStage ? 12 : compact ? 14 : 16,
      fontWeight: '600',
    },
  });
}

export function ShareCardPreview({
  model,
  variant = 'stage',
  style,
}: ShareCardPreviewProps) {
  const { t } = useTranslation();
  const palette = getPalette(model.themeVariant);
  const iconSet = iconForSet(model.iconSet);
  const compact = variant === 'stage';
  const portrait = model.aspectRatio === 'portrait';
  const isBondCard = model.cardTypeKey === 'bond_snapshot';
  const bondPortraitStage = compact && portrait && isBondCard;
  const duoLayout = model.layoutVariant === 'duo';
  const summaryFirst = model.layoutVariant === 'insight';
  const styles = React.useMemo(
    () => createStyles({ compact, portrait, isBond: isBondCard }),
    [compact, isBondCard, portrait],
  );

  const { strongest, focus } = React.useMemo(() => rankMetrics(model.metrics), [model.metrics]);
  const headerIconSize = bondPortraitStage ? 12 : compact ? 14 : 16;
  const relationIconSize = bondPortraitStage ? 11 : compact ? 13 : 15;

  const metricsBlock = (
    <View style={styles.metricsGrid}>
      {model.metrics.map((metric) => (
        <View
          key={metric.id}
          style={[
            styles.metricCard,
            {
              backgroundColor: palette.panelBg,
              borderColor: palette.panelBorder,
            },
          ]}
        >
          <View style={styles.metricTopRow}>
            <View style={styles.metricBadge}>
              <Ionicons
                name={iconSet.metricIcons[metric.id] ?? metric.iconName}
                size={compact ? 14 : 16}
                color={palette.accent}
              />
            </View>
            <AccessibleText
              style={[styles.metricValue, { color: palette.textStrong }]}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              {metric.value}
            </AccessibleText>
          </View>
          <AccessibleText
            style={[styles.metricLabel, { color: palette.textSoft }]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            numberOfLines={1}
          >
            {metric.label}
          </AccessibleText>
          <View style={styles.metricTrack}>
            <View
              style={[
                styles.metricFill,
                {
                  width: `${Math.max(12, metric.value)}%`,
                  backgroundColor: metricFillColor(metric.value, palette),
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );

  const insightRow = (
    <View style={styles.insightRow}>
      <View
        style={[
          styles.insightCard,
          {
            backgroundColor: palette.panelSoft,
            borderColor: palette.panelBorder,
          },
        ]}
      >
        <AccessibleText
          style={[styles.insightLabel, { color: palette.textSoft }]}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          {t('shareableCards.preview.strongestArea')}
        </AccessibleText>
        <View style={styles.insightMetricRow}>
          <AccessibleText
            style={[styles.insightMetricName, { color: palette.textStrong }]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            numberOfLines={1}
          >
            {strongest.label}
          </AccessibleText>
          <AccessibleText
            style={[styles.insightMetricValue, { color: palette.accent }]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {strongest.value}
          </AccessibleText>
        </View>
      </View>

      <View
        style={[
          styles.insightCard,
          {
            backgroundColor: palette.panelSoft,
            borderColor: palette.panelBorder,
          },
        ]}
      >
        <AccessibleText
          style={[styles.insightLabel, { color: palette.textSoft }]}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          {t('shareableCards.preview.focusArea')}
        </AccessibleText>
        <View style={styles.insightMetricRow}>
          <AccessibleText
            style={[styles.insightMetricName, { color: palette.textStrong }]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            numberOfLines={1}
          >
            {focus.label}
          </AccessibleText>
          <AccessibleText
            style={[styles.insightMetricValue, { color: palette.accent }]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {focus.value}
          </AccessibleText>
        </View>
      </View>
    </View>
  );

  const summaryBlock = (
    <View
      style={[
        styles.summaryCard,
        {
          backgroundColor: palette.panelSoft,
          borderColor: palette.panelBorder,
        },
      ]}
    >
      <View style={styles.summaryHeader}>
        <Ionicons name={iconSet.pulse} size={compact ? 13 : 15} color={palette.accent} />
        <AccessibleText
          style={[styles.summaryLabel, { color: palette.textSoft }]}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          {isBondCard ? t('shareableCards.preview.sharedCurrent') : t('shareableCards.preview.connectionPulse')}
        </AccessibleText>
      </View>
      <AccessibleText
        style={[styles.summaryText, { color: palette.textStrong }]}
        maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        numberOfLines={bondPortraitStage ? 4 : undefined}
        ellipsizeMode="tail"
      >
        {model.summary}
      </AccessibleText>
    </View>
  );

  const bondInsightStrip = (
    <View style={styles.microInsightRow}>
      <View
        style={[
          styles.microInsightCard,
          {
            backgroundColor: palette.panelBg,
            borderColor: palette.panelBorder,
          },
        ]}
      >
        <AccessibleText
          style={[styles.microInsightLabel, { color: palette.textSoft }]}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          numberOfLines={1}
        >
          {t('shareableCards.preview.strongestArea')}
        </AccessibleText>
        <AccessibleText
          style={[styles.microInsightTitle, { color: palette.textStrong }]}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          numberOfLines={1}
        >
          {strongest.label}
        </AccessibleText>
        <AccessibleText
          style={[styles.microInsightValue, { color: palette.accentStrong }]}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          {strongest.value}
        </AccessibleText>
      </View>

      <View
        style={[
          styles.microInsightCard,
          {
            backgroundColor: palette.panelSoft,
            borderColor: palette.panelBorder,
          },
        ]}
      >
        <AccessibleText
          style={[styles.microInsightLabel, { color: palette.textSoft }]}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          numberOfLines={1}
        >
          {t('shareableCards.preview.focusArea')}
        </AccessibleText>
        <AccessibleText
          style={[styles.microInsightTitle, { color: palette.textStrong }]}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          numberOfLines={1}
        >
          {focus.label}
        </AccessibleText>
        <AccessibleText
          style={[styles.microInsightValue, { color: palette.accent }]}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          {focus.value}
        </AccessibleText>
      </View>
    </View>
  );

  const summaryTemplate = (
    <>
      <View style={[styles.heroStage, duoLayout && styles.duoHeroStage]}>
        <View style={styles.identityRow}>
          <View
            style={[
              styles.personCard,
              styles.portraitPersonCard,
              { backgroundColor: palette.panelBg, borderColor: palette.panelBorder },
            ]}
          >
            <AccessibleText style={[styles.personSign, { color: palette.accent }]}>
              {model.leftPersonSignIcon}
            </AccessibleText>
            <AccessibleText
              style={[styles.personName, { color: palette.textStrong }]}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              numberOfLines={1}
            >
              {model.leftPersonName}
            </AccessibleText>
            <AccessibleText
              style={[styles.personMeta, { color: palette.textSoft }]}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              numberOfLines={1}
            >
              {model.leftPersonSignLabel}
            </AccessibleText>
          </View>

          <View
            style={[
              styles.scoreHalo,
              { backgroundColor: palette.panelSoft, borderColor: palette.panelBorder },
            ]}
          >
            <View style={[styles.scoreGlow, { backgroundColor: palette.accentGlow }]} />
            <AccessibleText
              style={[styles.titleText, { color: palette.textStrong }]}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              {model.title}
            </AccessibleText>
            <AccessibleText style={[styles.scoreText, { color: palette.accentStrong }]}>
              {model.score}
            </AccessibleText>
            <AccessibleText
              style={[styles.scoreMeta, { color: palette.textSoft }]}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              numberOfLines={1}
            >
              {model.themeName}
            </AccessibleText>
          </View>

          <View
            style={[
              styles.personCard,
              styles.portraitPersonCard,
              { backgroundColor: palette.panelBg, borderColor: palette.panelBorder },
            ]}
          >
            <AccessibleText style={[styles.personSign, { color: palette.accent }]}>
              {model.rightPersonSignIcon}
            </AccessibleText>
            <AccessibleText
              style={[styles.personName, { color: palette.textStrong }]}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              numberOfLines={1}
            >
              {model.rightPersonName}
            </AccessibleText>
            <AccessibleText
              style={[styles.personMeta, { color: palette.textSoft }]}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              numberOfLines={1}
            >
              {model.rightPersonSignLabel}
            </AccessibleText>
          </View>
        </View>

        <View style={styles.supportRow}>
          <View
            style={[
              styles.supportChip,
              { backgroundColor: palette.panelBg, borderColor: palette.panelBorder },
            ]}
          >
            <Ionicons name={iconSet.relation} size={compact ? 13 : 15} color={palette.accent} />
            <AccessibleText
              style={[styles.supportText, { color: palette.textStrong }]}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              numberOfLines={1}
            >
              {model.relationshipLabel}
            </AccessibleText>
          </View>

          <View
            style={[
              styles.supportChip,
              { backgroundColor: palette.accentSoft, borderColor: palette.panelBorder },
            ]}
          >
            <Ionicons name={iconSet.pulse} size={compact ? 13 : 15} color={palette.accentStrong} />
            <AccessibleText
              style={[styles.supportText, { color: palette.accentStrong }]}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              numberOfLines={1}
            >
              {t('shareableCards.preview.shareReady')}
            </AccessibleText>
          </View>
        </View>
      </View>

      {summaryFirst ? summaryBlock : insightRow}
      {metricsBlock}
      {summaryFirst ? insightRow : summaryBlock}
    </>
  );

  const bondTemplate = (
    <View style={styles.bondStage}>
      <View
        style={[
          styles.bondHeroCard,
          {
            backgroundColor: palette.panelBg,
            borderColor: palette.panelBorder,
          },
        ]}
      >
        <View style={styles.orbitBoard}>
          <View style={[styles.orbitLine, { backgroundColor: palette.lineSoft }]} />

          <View style={styles.orbitRow}>
            <View style={styles.orbitNode}>
              <AccessibleText style={[styles.orbitNodeSign, { color: palette.accent }]}>
                {model.leftPersonSignIcon}
              </AccessibleText>
              <AccessibleText
                style={[styles.orbitNodeName, { color: palette.textStrong }]}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                numberOfLines={bondPortraitStage ? 2 : 1}
              >
                {model.leftPersonName}
              </AccessibleText>
              <AccessibleText
                style={[styles.orbitNodeMeta, { color: palette.textSoft }]}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                numberOfLines={1}
              >
                {model.leftPersonSignLabel}
              </AccessibleText>
            </View>

            <View
              style={[
                styles.pulseCore,
                { backgroundColor: palette.panelSoft, borderColor: palette.panelBorder },
              ]}
            >
              <AccessibleText
                style={[styles.pulseLabel, { color: palette.textSoft }]}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              >
                {t('shareableCards.preview.connectionPulse')}
              </AccessibleText>
              <AccessibleText style={[styles.pulseScore, { color: palette.accentStrong }]}>
                {model.score}
              </AccessibleText>
              <AccessibleText
                style={[styles.pulseTheme, { color: palette.textStrong }]}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                numberOfLines={2}
              >
                {model.relationshipLabel}
              </AccessibleText>
            </View>

            <View style={styles.orbitNode}>
              <AccessibleText style={[styles.orbitNodeSign, { color: palette.accent }]}>
                {model.rightPersonSignIcon}
              </AccessibleText>
              <AccessibleText
                style={[styles.orbitNodeName, { color: palette.textStrong }]}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                numberOfLines={bondPortraitStage ? 2 : 1}
              >
                {model.rightPersonName}
              </AccessibleText>
              <AccessibleText
                style={[styles.orbitNodeMeta, { color: palette.textSoft }]}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                numberOfLines={1}
              >
                {model.rightPersonSignLabel}
              </AccessibleText>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.pulseRail}>
        {model.metrics.map((metric) => (
          <View
            key={metric.id}
            style={[
              styles.pulseRow,
              { backgroundColor: palette.panelBg, borderColor: palette.panelBorder },
            ]}
          >
            <View style={styles.pulseTop}>
              <View style={styles.pulseTopLeft}>
                <Ionicons
                  name={iconSet.metricIcons[metric.id] ?? metric.iconName}
                  size={compact ? 14 : 16}
                  color={palette.accent}
                />
                <AccessibleText
                  style={[styles.pulseMetricName, { color: palette.textStrong }]}
                  maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                  numberOfLines={1}
          >
            {metric.label}
          </AccessibleText>
              </View>
              <AccessibleText
                style={[styles.pulseMetricValue, { color: palette.accentStrong }]}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              >
                {metric.value}
              </AccessibleText>
            </View>
            <View style={styles.metricTrack}>
              <View
                style={[
                  styles.metricFill,
                  {
                    width: `${Math.max(12, metric.value)}%`,
                    backgroundColor: metricFillColor(metric.value, palette),
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>

      {bondPortraitStage ? bondInsightStrip : summaryFirst ? insightRow : summaryBlock}

      {bondPortraitStage ? (
        summaryBlock
      ) : (
        <>
          <View style={styles.utilityRow}>
            <View
              style={[
                styles.utilityChip,
                { backgroundColor: palette.panelBg, borderColor: palette.panelBorder },
              ]}
            >
              <Ionicons name={iconSet.relation} size={relationIconSize} color={palette.accent} />
              <AccessibleText
                style={[styles.utilityText, { color: palette.textStrong }]}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                numberOfLines={1}
              >
                {t('shareableCards.preview.sharedCurrent')}
              </AccessibleText>
            </View>

            <View
              style={[
                styles.utilityChip,
                { backgroundColor: palette.accentSoft, borderColor: palette.panelBorder },
              ]}
            >
              <Ionicons name={iconSet.pulse} size={relationIconSize} color={palette.accentStrong} />
              <AccessibleText
                style={[styles.utilityText, { color: palette.accentStrong }]}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                numberOfLines={1}
              >
                {model.themeName}
              </AccessibleText>
            </View>
          </View>

          {summaryFirst ? summaryBlock : insightRow}
        </>
      )}
    </View>
  );

  return (
    <View style={[styles.frame, style]}>
      <LinearGradient
        colors={palette.frame}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[styles.outerGlow, styles.glowTop, { backgroundColor: palette.accentGlow }]} />
      <View style={[styles.outerGlow, styles.glowBottom, { backgroundColor: 'rgba(255,255,255,0.14)' }]} />
      {isBondCard ? <View style={[styles.orbitalLine, { backgroundColor: palette.lineSoft }]} /> : null}

      <View style={[styles.surface, { borderColor: palette.border }]}>
        <LinearGradient
          colors={palette.surface}
          start={{ x: 0, y: 0.04 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={[styles.nebula, styles.nebulaTop, { backgroundColor: palette.accentGlow }]} />
        <View style={[styles.nebula, styles.nebulaBottom, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
        <View style={[styles.brandHalo, { backgroundColor: palette.accentGlow }]} />
        <View style={styles.brandWatermarkWrap}>
          <BrandMark
            variant="icon-transparent"
            size={compact ? 92 : 120}
            style={styles.brandWatermark}
            accessibilityLabel="Astro Guru"
          />
        </View>

        <View style={styles.headerRow}>
          <View style={[styles.topPill, { backgroundColor: palette.panelBg, borderColor: palette.panelBorder }]}>
            <Ionicons name={iconSet.header} size={headerIconSize} color={palette.accent} />
            <AccessibleText
              style={[styles.topPillText, { color: palette.textStrong }]}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              numberOfLines={1}
            >
              {model.cardTypeLabel || model.title}
            </AccessibleText>
          </View>

          <View
            style={[
              styles.topPill,
              styles.topPillRight,
              { backgroundColor: palette.accentSoft, borderColor: palette.panelBorder },
            ]}
          >
            <Ionicons name={iconSet.relation} size={relationIconSize} color={palette.accentStrong} />
            <AccessibleText
              style={[styles.topPillText, { color: palette.accentStrong }]}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              numberOfLines={1}
            >
              {model.relationshipLabel}
            </AccessibleText>
          </View>
        </View>

        {isBondCard ? bondTemplate : summaryTemplate}

        <View style={styles.footerRow}>
          <View
            style={[
            styles.footerBadge,
              { backgroundColor: palette.panelBg, borderColor: palette.panelBorder },
            ]}
          >
            <BrandBadge variant="icon-transparent" size={compact ? 18 : 20} />
            <AccessibleText
              style={[styles.footerText, { color: palette.textSoft }]}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              {model.brandLabel}
            </AccessibleText>
          </View>

          {model.sourceLabel && !bondPortraitStage ? (
            <AccessibleText
              style={[styles.sourceText, { color: palette.textSoft }]}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              numberOfLines={1}
            >
              {model.sourceLabel}
            </AccessibleText>
          ) : null}
        </View>
      </View>
    </View>
  );
}
