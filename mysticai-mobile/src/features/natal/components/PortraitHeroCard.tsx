import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppText, Skeleton } from '../../../components/ui';
import { useTheme, type ThemeColors } from '../../../context/ThemeContext';
import { spacing, radius } from '../../../theme';
import * as Haptics from '../../../utils/haptics';
import type { NatalPortrait } from '../../../services/natalPortrait.service';
import EvidenceDisclosure from './EvidenceDisclosure';
import natalAnalytics from '../analytics';

interface Props {
  portrait: NatalPortrait | null;
  loading: boolean;
  locale: string;
  /** Big Three summary line, e.g. "Balık Güneş · Başak Ay · Aslan Yükselen". */
  bigThreeLine: string;
  isFallback: boolean;
  onOpenDetail: () => void;
}

/**
 * The hero: one headline, a synthesis of the whole chart, and chart-derived trait chips.
 *
 * This is the first thing a reader sees, so it deliberately says nothing technical. The summary is
 * a single synthesis — not Sun, Moon and Rising definitions printed in sequence — and the chips
 * are adjectives the interpreter derived from real placements rather than a fixed list.
 *
 * Loading is local to this card. The calculated chart below it renders immediately either way; an
 * interpretation that is still generating must never hold up data we already have.
 */
export default function PortraitHeroCard({
  portrait,
  loading,
  locale,
  bigThreeLine,
  isFallback,
  onOpenDetail,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = createStyles(colors);

  const handleOpen = useCallback(() => {
    Haptics.impactAsync();
    natalAnalytics.portraitOpened({ locale, source: portrait?.source ?? 'unknown' });
    onOpenDetail();
  }, [locale, portrait?.source, onOpenDetail]);

  return (
    <View style={s.card}>
      <AppText variant="CaptionBold" style={s.eyebrow}>
        {t('natalPortrait.heroEyebrow')}
      </AppText>

      {bigThreeLine ? (
        <AppText variant="Small" style={s.bigThreeLine}>
          {bigThreeLine}
        </AppText>
      ) : null}

      {loading ? (
        <View style={s.skeletonBlock}>
          <Skeleton height={26} width="88%" />
          <Skeleton height={16} width="100%" />
          <Skeleton height={16} width="94%" />
          <Skeleton height={16} width="70%" />
        </View>
      ) : portrait ? (
        <>
          <AppText variant="H2" style={s.headline}>
            {portrait.portrait.headline}
          </AppText>
          <AppText variant="Body" style={s.summary}>
            {portrait.portrait.summary}
          </AppText>

          {portrait.portrait.traits?.length ? (
            <View style={s.traits}>
              {portrait.portrait.traits.map((trait) => (
                <View key={trait} style={s.traitChip}>
                  <AppText variant="CaptionBold" style={s.traitText}>
                    {trait}
                  </AppText>
                </View>
              ))}
            </View>
          ) : null}

          <EvidenceDisclosure
            evidence={portrait.portrait.evidence}
            context="portrait_hero"
            locale={locale}
          />

          {isFallback ? (
            <View style={s.fallbackNote}>
              <Ionicons
                name="cloud-offline-outline"
                size={13}
                color={colors.birthChart.textMuted}
              />
              <AppText variant="CaptionSmall" style={s.fallbackText}>
                {t('natalPortrait.fallbackNote')}
              </AppText>
            </View>
          ) : null}
        </>
      ) : null}

      <Pressable
        onPress={handleOpen}
        disabled={loading || !portrait}
        accessibilityRole="button"
        accessibilityLabel={t('natalPortrait.heroCta')}
        style={({ pressed }) => [s.cta, pressed && !loading ? s.ctaPressed : undefined]}
      >
        <AppText variant="BodyBold" style={s.ctaText}>
          {t('natalPortrait.heroCta')}
        </AppText>
        <Ionicons name="sparkles" size={16} color={colors.birthChart.ctaText} />
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.birthChart.cardElevated,
      borderRadius: radius.hero,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.birthChart.cardBorderStrong,
      padding: spacing.xl,
      gap: spacing.sm,
    },
    eyebrow: {
      color: colors.birthChart.primaryAccent,
      letterSpacing: 1.1,
      textTransform: 'uppercase',
    },
    bigThreeLine: {
      color: colors.birthChart.textSecondary,
    },
    skeletonBlock: {
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    headline: {
      color: colors.birthChart.textPrimary,
      marginTop: spacing.xxs,
    },
    summary: {
      color: colors.birthChart.textSecondary,
      lineHeight: 22,
    },
    traits: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginTop: spacing.xxs,
    },
    traitChip: {
      backgroundColor: colors.birthChart.iconBadgeBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.birthChart.iconBadgeBorder,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
    },
    traitText: {
      color: colors.birthChart.primaryAccent,
    },
    fallbackNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      marginTop: spacing.xxs,
    },
    fallbackText: {
      color: colors.birthChart.textMuted,
      flex: 1,
    },
    cta: {
      marginTop: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: colors.birthChart.ctaBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.birthChart.ctaBorder,
      borderRadius: radius.pill,
      paddingVertical: spacing.md,
    },
    ctaPressed: {
      opacity: 0.85,
    },
    ctaText: {
      color: colors.birthChart.ctaText,
    },
  });
