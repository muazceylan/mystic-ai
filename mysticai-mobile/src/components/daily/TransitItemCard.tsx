import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants/tokens';
import type { DailyFeedbackPayload, DailyTransitsDTO } from '../../types/daily.types';

interface TransitItemCardProps {
  transit: DailyTransitsDTO['transits'][number];
  date: string;
  onDetailOpened?: (transitId: string) => void;
  onFeedback?: (payload: DailyFeedbackPayload) => void;
}

function formatTechnicalLabel(value?: string): string {
  if (!value) return '-';
  return value;
}

function isHouseTransitAspect(aspect?: string | null): boolean {
  return normalizeToken(aspect).includes('ev gecisi') || normalizeToken(aspect).includes('house transit');
}

function formatTechnicalOrb(value?: number, aspect?: string | null): string {
  if (isHouseTransitAspect(aspect)) return '-';
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) return '-';
  return value.toFixed(1);
}

function normalizeToken(value?: string | null): string {
  const trMap: Record<string, string> = {
    ç: 'c',
    ğ: 'g',
    ı: 'i',
    ö: 'o',
    ş: 's',
    ü: 'u',
  };

  return (value ?? '')
    .trim()
    .toLowerCase()
    .split('')
    .map((char) => trMap[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isCautionLabel(label?: string | null): boolean {
  const token = normalizeToken(label);
  return token.includes('dikkat') || token.includes('caution');
}

function localizeTransitTheme(theme: string, locale: string): string {
  const token = normalizeToken(theme);
  const resolvedLocale = locale.toLowerCase().startsWith('en') ? 'en' : 'tr';

  if (token.includes('iletisim') || token.includes('communication')) {
    return resolvedLocale === 'en' ? 'Communication' : 'İletişim';
  }
  if (token.includes('ask') || token.includes('love') || token.includes('relationship')) {
    return resolvedLocale === 'en' ? 'Love' : 'Aşk';
  }
  if (token === 'is' || token.includes('work') || token.includes('career')) {
    return resolvedLocale === 'en' ? 'Work' : 'İş';
  }
  if (token.includes('enerji') || token.includes('energy')) {
    return resolvedLocale === 'en' ? 'Energy' : 'Enerji';
  }
  return resolvedLocale === 'en' ? 'Mood' : 'Ruh Hali';
}

export function TransitItemCard({ transit, date, onDetailOpened, onFeedback }: TransitItemCardProps) {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const localizedLabel = isCautionLabel(transit.label) ? t('dailyTransits.badgeCaution') : t('dailyTransits.badgeSupportive');
  const localizedTheme = localizeTransitTheme(transit.theme, i18n.resolvedLanguage ?? i18n.language);

  const badgeColors = useMemo(() => {
    if (isCautionLabel(transit.label)) {
      return {
        text: isDark ? '#FFCCCC' : '#B42318',
        bg: isDark ? 'rgba(239,68,68,0.20)' : '#FEE4E2',
      };
    }
    return {
      text: isDark ? '#CCFCE4' : '#067647',
      bg: isDark ? 'rgba(34,197,94,0.22)' : '#D1FADF',
    };
  }, [isDark, transit.label]);

  const toggleDetails = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      onDetailOpened?.(transit.id);
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#EAE4F8',
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <Text style={[styles.themeText, { color: colors.primary }]}>{localizedTheme}</Text>
          {transit.timeWindow ? <Text style={[styles.timeText, { color: colors.subtext }]}>{transit.timeWindow}</Text> : null}
        </View>
        <View style={[styles.badge, { backgroundColor: badgeColors.bg }]}>
          <Text style={[styles.badgeText, { color: badgeColors.text }]}>{localizedLabel}</Text>
        </View>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{transit.titlePlain}</Text>
      <Text style={[styles.impact, { color: colors.subtext }]}>{transit.impactPlain}</Text>

      <View style={styles.metaRow}>
        <Pressable
          onPress={toggleDetails}
          style={styles.detailsBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={expanded ? t('dailyTransits.detailsCloseA11y') : t('dailyTransits.detailsOpenA11y')}
        >
          <Text style={[styles.detailsText, { color: colors.primary }]}>
            {expanded ? t('dailyTransits.detailsClose') : t('dailyTransits.detailsOpen')}
          </Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
        </Pressable>
      </View>

      {expanded && transit.technical ? (
        <View
          style={[
            styles.technicalWrap,
            {
              borderColor: isDark ? 'rgba(255,255,255,0.10)' : '#E9E2FA',
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FAF8FF',
            },
          ]}
        >
          <View style={styles.technicalRow}>
            <Text style={[styles.technicalLabel, { color: colors.subtext }]}>{t('dailyTransits.technicalTransitPlanet')}</Text>
            <Text style={[styles.technicalValue, { color: colors.text }]}>
              {formatTechnicalLabel(transit.technical.transitPlanet)}
            </Text>
          </View>
          <View style={styles.technicalRow}>
            <Text style={[styles.technicalLabel, { color: colors.subtext }]}>{t('dailyTransits.technicalNatalPoint')}</Text>
            <Text style={[styles.technicalValue, { color: colors.text }]}>
              {formatTechnicalLabel(transit.technical.natalPoint)}
            </Text>
          </View>
          <View style={styles.technicalRow}>
            <Text style={[styles.technicalLabel, { color: colors.subtext }]}>{t('dailyTransits.technicalAspect')}</Text>
            <Text style={[styles.technicalValue, { color: colors.text }]}>
              {formatTechnicalLabel(transit.technical.aspect)}
            </Text>
          </View>
          <View style={styles.technicalRow}>
            <Text style={[styles.technicalLabel, { color: colors.subtext }]}>{t('dailyTransits.technicalOrb')}</Text>
            <Text style={[styles.technicalValue, { color: colors.text }]}>
              {formatTechnicalOrb(transit.technical.orb, transit.technical.aspect)}
            </Text>
          </View>
          <View style={styles.technicalRow}>
            <Text style={[styles.technicalLabel, { color: colors.subtext }]}>{t('dailyTransits.technicalExactAt')}</Text>
            <Text style={[styles.technicalValue, { color: colors.text }]}>
              {formatTechnicalLabel(transit.technical.exactAt)}
            </Text>
          </View>
          <View style={styles.technicalRow}>
            <Text style={[styles.technicalLabel, { color: colors.subtext }]}>{t('dailyTransits.technicalHouse')}</Text>
            <Text style={[styles.technicalValue, { color: colors.text }]}>
              {formatTechnicalLabel(transit.technical.house)}
            </Text>
          </View>
          <View style={styles.technicalRow}>
            <Text style={[styles.technicalLabel, { color: colors.subtext }]}>{t('dailyTransits.technicalConfidence')}</Text>
            <Text style={[styles.technicalValue, { color: colors.text }]}>
              %{transit.confidence}
            </Text>
          </View>
        </View>
      ) : null}

      {onFeedback ? (
        <View style={styles.feedbackRow}>
          <Pressable
            style={[styles.feedbackBtn, { borderColor: isDark ? 'rgba(255,255,255,0.18)' : '#E6DFFF' }]}
            onPress={() => onFeedback({ date, itemType: 'transit', itemId: transit.id, sentiment: 'up' })}
          >
            <Ionicons name="thumbs-up-outline" size={13} color={colors.primary} />
            <Text style={[styles.feedbackText, { color: colors.primary }]}>{t('dailyTransits.feedbackHelpful')}</Text>
          </Pressable>
          {expanded ? (
            <Pressable
              style={[styles.feedbackBtn, { borderColor: isDark ? 'rgba(255,255,255,0.18)' : '#E6DFFF' }]}
              onPress={() => onFeedback({ date, itemType: 'transit', itemId: transit.id, sentiment: 'down' })}
            >
              <Ionicons name="thumbs-down-outline" size={13} color={colors.primary} />
              <Text style={[styles.feedbackText, { color: colors.primary }]}>{t('dailyTransits.feedbackImprove')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    gap: SPACING.smMd,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  topLeft: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  themeText: {
    ...TYPOGRAPHY.CaptionBold,
    fontSize: 13,
  },
  timeText: {
    ...TYPOGRAPHY.Caption,
    fontSize: 13,
  },
  badge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.smMd,
    paddingVertical: SPACING.xsSm,
  },
  badgeText: {
    ...TYPOGRAPHY.CaptionBold,
    fontSize: 12,
  },
  title: {
    ...TYPOGRAPHY.BodyLarge,
    fontSize: 20,
    lineHeight: 26,
  },
  impact: {
    ...TYPOGRAPHY.BodyMid,
    fontSize: 15,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: SPACING.xsSm,
    gap: SPACING.xs,
  },
  detailsText: {
    ...TYPOGRAPHY.SmallBold,
    fontSize: 13,
  },
  technicalWrap: {
    marginTop: SPACING.xs,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    gap: SPACING.xsSm,
  },
  technicalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  technicalLabel: {
    ...TYPOGRAPHY.Caption,
    fontSize: 12,
    flex: 1,
  },
  technicalValue: {
    ...TYPOGRAPHY.SmallBold,
    fontSize: 13,
    flex: 1,
    textAlign: 'right',
  },
  feedbackRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.xsSm,
  },
  feedbackBtn: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xsSm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xsSm,
  },
  feedbackText: {
    ...TYPOGRAPHY.CaptionBold,
    fontSize: 12,
  },
});

export default TransitItemCard;
