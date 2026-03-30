import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AccessibleText } from '../../ui';
import { BrandBadge } from '../../ui/BrandLogo';
import { ACCESSIBILITY } from '../../../constants/tokens';
import { radius } from '../../../theme';
import type { HoroscopePreviewModel, ShareCardThemeKey } from './types';
import { ShareCardPosterShell } from './ShareCardPosterShell';

interface Props {
  model: HoroscopePreviewModel;
  variant?: 'stage' | 'capture';
  style?: ViewStyle;
}

type ContentPalette = {
  accent: string;
  accentSoft: string;
  textStrong: string;
  textSoft: string;
  cardBg: string;
  cardBorder: string;
  chipBg: string;
  chipBorder: string;
};

function getPalette(themeVariant: ShareCardThemeKey): ContentPalette {
  if (themeVariant === 'lavender_mist') {
    return {
      accent: '#7A63D2',
      accentSoft: '#A38BE3',
      textStrong: '#4E3B84',
      textSoft: '#7D6AAE',
      cardBg: 'rgba(250, 246, 255, 0.96)',
      cardBorder: 'rgba(228, 219, 245, 0.92)',
      chipBg: 'rgba(244, 238, 255, 0.94)',
      chipBorder: 'rgba(226, 216, 244, 0.92)',
    };
  }

  if (themeVariant === 'starlit_bloom') {
    return {
      accent: '#A65EAE',
      accentSoft: '#C07BC8',
      textStrong: '#614279',
      textSoft: '#8B68A1',
      cardBg: 'rgba(255, 248, 253, 0.96)',
      cardBorder: 'rgba(243, 225, 243, 0.92)',
      chipBg: 'rgba(253, 243, 252, 0.94)',
      chipBorder: 'rgba(242, 221, 240, 0.92)',
    };
  }

  return {
    accent: '#7D5FD0',
    accentSoft: '#A489EA',
    textStrong: '#5A468D',
    textSoft: '#806AAE',
    cardBg: 'rgba(250, 246, 255, 0.96)',
    cardBorder: 'rgba(232, 223, 245, 0.92)',
    chipBg: 'rgba(244, 238, 255, 0.94)',
    chipBorder: 'rgba(226, 216, 244, 0.92)',
  };
}

export function ShareCardPreviewHoroscope({ model, variant = 'stage', style }: Props) {
  const { t } = useTranslation();
  const compact = variant === 'stage';
  const palette = getPalette(model.themeVariant);
  const styles = React.useMemo(() => createStyles(compact), [compact]);
  const highlights = React.useMemo(
    () => model.highlights.map((item) => item.trim()).filter(Boolean),
    [model.highlights],
  );
  const insightCards = [
    model.luckyColor
      ? {
          key: 'color',
          icon: 'color-palette-outline' as const,
          label: t('shareableCards.horoscope.luckyColor'),
          value: model.luckyColor,
        }
      : null,
    model.luckyNumber
      ? {
          key: 'number',
          icon: 'sparkles-outline' as const,
          label: t('shareableCards.horoscope.luckyNumber'),
          value: String(model.luckyNumber),
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }>;

  return (
    <ShareCardPosterShell
      badgeLabel={model.title}
      badgeIconName="sunny"
      leftOrnamentIconName="sparkles"
      rightOrnamentIconName="moon"
      themeVariant={model.themeVariant}
      variant={variant}
      style={style}
    >
      <View style={styles.content}>
        <View style={styles.dateRow}>
          <View style={[styles.rule, { backgroundColor: palette.chipBorder }]} />
          <AccessibleText
            style={[styles.dateText, { color: palette.textSoft }]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            numberOfLines={1}
          >
            {model.date}
          </AccessibleText>
          <View style={[styles.rule, { backgroundColor: palette.chipBorder }]} />
        </View>

        <View style={styles.heroSection}>
          <AccessibleText style={[styles.signEmoji, { color: palette.accent }]}>
            {model.signEmoji}
          </AccessibleText>
          <AccessibleText
            style={[styles.signName, { color: palette.textStrong }]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            numberOfLines={1}
          >
            {model.signName}
          </AccessibleText>
          {model.mood ? (
            <View style={[styles.moodChip, { backgroundColor: palette.chipBg, borderColor: palette.chipBorder }]}>
              <Ionicons name="sparkles" size={compact ? 11 : 13} color={palette.accent} />
              <AccessibleText
                style={[styles.moodText, { color: palette.accent }]}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                numberOfLines={1}
              >
                {model.mood}
              </AccessibleText>
            </View>
          ) : null}
        </View>

        <View style={[styles.summaryCard, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
          <AccessibleText
            style={[styles.summaryText, { color: palette.textStrong }]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {model.generalText}
          </AccessibleText>
        </View>

        {insightCards.length > 0 ? (
          <View style={styles.metricsRow}>
            {insightCards.slice(0, compact ? 2 : 3).map((item) => (
              <View
                key={item.key}
                style={[styles.metricCard, { backgroundColor: palette.chipBg, borderColor: palette.chipBorder }]}
              >
                <Ionicons name={item.icon} size={compact ? 13 : 15} color={palette.accent} />
                <AccessibleText
                  style={[styles.metricLabel, { color: palette.textSoft }]}
                  maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                  numberOfLines={1}
                >
                  {item.label}
                </AccessibleText>
                <AccessibleText
                  style={[styles.metricValue, { color: palette.textStrong }]}
                  maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                  numberOfLines={1}
                >
                  {item.value}
                </AccessibleText>
              </View>
            ))}
          </View>
        ) : null}

        {highlights.length > 0 ? (
          <View style={[styles.highlightsCard, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
            {highlights.slice(0, compact ? 2 : 3).map((highlight, index) => (
              <View key={`${highlight}-${index}`} style={styles.highlightRow}>
                <Ionicons name="sparkles" size={compact ? 12 : 14} color={palette.accentSoft} />
                <AccessibleText
                  style={[styles.highlightText, { color: palette.textStrong }]}
                  maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                  numberOfLines={1}
                >
                  {highlight}
                </AccessibleText>
              </View>
            ))}
          </View>
        ) : null}

        <View style={[styles.footerBadge, { backgroundColor: palette.chipBg, borderColor: palette.chipBorder }]}>
          <BrandBadge variant="icon-transparent" size={compact ? 18 : 20} />
          <AccessibleText
            style={[styles.footerText, { color: palette.textSoft }]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            numberOfLines={1}
          >
            {model.brandLabel}
          </AccessibleText>
        </View>
      </View>
    </ShareCardPosterShell>
  );
}

function createStyles(compact: boolean) {
  return StyleSheet.create({
    content: {
      flex: 1,
      gap: compact ? 12 : 16,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: compact ? 8 : 10,
    },
    rule: {
      flex: 1,
      height: 1,
    },
    dateText: {
      fontSize: compact ? 10 : 12,
      lineHeight: compact ? 13 : 16,
      fontWeight: '700',
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    heroSection: {
      alignItems: 'center',
      gap: compact ? 4 : 6,
    },
    signEmoji: {
      fontSize: compact ? 42 : 54,
      lineHeight: compact ? 46 : 60,
    },
    signName: {
      fontSize: compact ? 26 : 32,
      lineHeight: compact ? 30 : 36,
      fontWeight: '800',
      letterSpacing: -0.4,
      textAlign: 'center',
    },
    moodChip: {
      borderRadius: radius.pill,
      borderWidth: 1,
      paddingHorizontal: compact ? 10 : 12,
      paddingVertical: compact ? 5 : 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    moodText: {
      fontSize: compact ? 11 : 12,
      lineHeight: compact ? 14 : 16,
      fontWeight: '700',
    },
    summaryCard: {
      borderRadius: compact ? 20 : 24,
      borderWidth: 1,
      paddingHorizontal: compact ? 14 : 18,
      paddingVertical: compact ? 14 : 18,
      flexShrink: 1,
    },
    summaryText: {
      fontSize: compact ? 12 : 15,
      lineHeight: compact ? 18 : 23,
      fontWeight: '600',
      textAlign: 'center',
    },
    metricsRow: {
      flexDirection: 'row',
      gap: compact ? 8 : 10,
      justifyContent: 'center',
    },
    metricCard: {
      flex: 1,
      borderRadius: compact ? 18 : 20,
      borderWidth: 1,
      paddingHorizontal: compact ? 10 : 12,
      paddingVertical: compact ? 10 : 12,
      gap: 4,
      alignItems: 'center',
    },
    metricLabel: {
      fontSize: compact ? 10 : 11,
      lineHeight: compact ? 12 : 14,
      fontWeight: '700',
      textAlign: 'center',
    },
    metricValue: {
      fontSize: compact ? 12 : 14,
      lineHeight: compact ? 16 : 18,
      fontWeight: '800',
      textAlign: 'center',
    },
    highlightsCard: {
      borderRadius: compact ? 18 : 22,
      borderWidth: 1,
      paddingHorizontal: compact ? 12 : 16,
      paddingVertical: compact ? 12 : 14,
      gap: compact ? 8 : 10,
    },
    highlightRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    highlightText: {
      flex: 1,
      fontSize: compact ? 12 : 14,
      lineHeight: compact ? 16 : 18,
      fontWeight: '700',
    },
    footerBadge: {
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 'auto',
      borderRadius: radius.pill,
      borderWidth: 1,
      paddingHorizontal: compact ? 12 : 14,
      paddingVertical: compact ? 7 : 8,
      maxWidth: '100%',
    },
    footerText: {
      fontSize: compact ? 11 : 12,
      lineHeight: compact ? 14 : 16,
      fontWeight: '700',
    },
  });
}
