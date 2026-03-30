import React from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AccessibleText } from '../../ui';
import { BrandBadge } from '../../ui/BrandLogo';
import { ACCESSIBILITY } from '../../../constants/tokens';
import { radius } from '../../../theme';
import type { NumerologyPreviewModel, ShareCardThemeKey } from './types';
import { ShareCardPosterShell } from './ShareCardPosterShell';

interface Props {
  model: NumerologyPreviewModel;
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
      textStrong: '#4F3B84',
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

export function ShareCardPreviewNumerology({ model, variant = 'stage', style }: Props) {
  const { t } = useTranslation();
  const compact = variant === 'stage';
  const palette = getPalette(model.themeVariant);
  const styles = React.useMemo(() => createStyles(compact), [compact]);

  return (
    <ShareCardPosterShell
      badgeLabel={model.title}
      badgeIconName="keypad"
      leftOrnamentIconName="sparkles"
      rightOrnamentIconName="diamond-outline"
      themeVariant={model.themeVariant}
      variant={variant}
      style={style}
    >
      <View style={styles.content}>
        <AccessibleText
          style={[styles.nameText, { color: palette.textSoft }]}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          numberOfLines={1}
        >
          {model.name}
        </AccessibleText>

        <View style={styles.heroSection}>
          <AccessibleText style={[styles.bigNumber, { color: palette.accent }]}>
            {model.mainNumber}
          </AccessibleText>
          <AccessibleText
            style={[styles.headline, { color: palette.textStrong }]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            numberOfLines={2}
          >
            {model.headline}
          </AccessibleText>
        </View>

        <View style={styles.metricRow}>
          <View style={[styles.metricCard, { backgroundColor: palette.chipBg, borderColor: palette.chipBorder }]}>
            <Ionicons name="calendar-outline" size={compact ? 14 : 16} color={palette.accent} />
            <AccessibleText
              style={[styles.metricLabel, { color: palette.textSoft }]}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              numberOfLines={1}
            >
              {t('shareableCards.numerologyCard.personalYear', { year: model.personalYear })}
            </AccessibleText>
          </View>
        </View>

        <View style={[styles.themeCard, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
          <AccessibleText
            style={[styles.themeTitle, { color: palette.accentSoft }]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {model.shortTheme}
          </AccessibleText>
          <AccessibleText
            style={[styles.themeText, { color: palette.textStrong }]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            numberOfLines={compact ? 5 : 7}
          >
            {model.headline}
          </AccessibleText>
        </View>

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
    nameText: {
      fontSize: compact ? 14 : 16,
      lineHeight: compact ? 18 : 20,
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: 0.5,
    },
    heroSection: {
      alignItems: 'center',
      gap: compact ? 4 : 6,
    },
    bigNumber: {
      fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: undefined }),
      fontSize: compact ? 84 : 104,
      lineHeight: compact ? 90 : 110,
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: -2.2,
    },
    headline: {
      fontSize: compact ? 18 : 22,
      lineHeight: compact ? 22 : 28,
      fontWeight: '800',
      textAlign: 'center',
      letterSpacing: -0.4,
    },
    metricRow: {
      alignItems: 'center',
    },
    metricCard: {
      minHeight: compact ? 44 : 50,
      borderRadius: radius.pill,
      borderWidth: 1,
      paddingHorizontal: compact ? 14 : 16,
      paddingVertical: compact ? 8 : 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    metricLabel: {
      fontSize: compact ? 12 : 14,
      lineHeight: compact ? 16 : 18,
      fontWeight: '700',
      textAlign: 'center',
    },
    themeCard: {
      borderRadius: compact ? 22 : 26,
      borderWidth: 1,
      paddingHorizontal: compact ? 16 : 20,
      paddingVertical: compact ? 16 : 20,
      gap: compact ? 10 : 12,
    },
    themeTitle: {
      fontSize: compact ? 12 : 14,
      lineHeight: compact ? 15 : 18,
      fontWeight: '800',
      textAlign: 'center',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    themeText: {
      fontSize: compact ? 14 : 16,
      lineHeight: compact ? 20 : 24,
      fontWeight: '600',
      textAlign: 'center',
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
