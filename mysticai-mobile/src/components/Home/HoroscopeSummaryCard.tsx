import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radius, shadowSubtle, spacing, typography } from '../../theme';

interface HoroscopeSummaryCardProps {
  sign?: string;
  theme?: string;
  advice?: string;
  isLoading?: boolean;
  onPressToday: () => void;
  onPressWeek: () => void;
  onPressDetails: () => void;
}

const SHORTCUT_ICON_SIZE = spacing.sm + spacing.xs + spacing.xxs;
const SHORTCUT_ICON_WRAP = spacing.iconWrap - spacing.sm;
const SHORTCUT_HEIGHT = spacing.chevronHitArea + spacing.xxl;

function cleanSignName(value: string | undefined, fallback: string): string {
  const raw = (value ?? '').trim();
  if (!raw) {
    return fallback;
  }

  const withoutGlyph = raw
    .replace(/[♈-♓]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!withoutGlyph) {
    return fallback;
  }

  const parts = withoutGlyph.split(' ');
  const lastPart = parts[parts.length - 1]?.trim();
  return lastPart || withoutGlyph || fallback;
}

function zodiacGlyph(signName: string): string {
  const key = signName.trim().toLowerCase();
  const normalized = key
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u');

  const map: Record<string, string> = {
    koc: '♈',
    boga: '♉',
    ikizler: '♊',
    yengec: '♋',
    aslan: '♌',
    basak: '♍',
    terazi: '♎',
    akrep: '♏',
    yay: '♐',
    oglak: '♑',
    kova: '♒',
    balik: '♓',
    aries: '♈',
    taurus: '♉',
    gemini: '♊',
    cancer: '♋',
    leo: '♌',
    virgo: '♍',
    libra: '♎',
    scorpio: '♏',
    sagittarius: '♐',
    capricorn: '♑',
    aquarius: '♒',
    pisces: '♓',
  };

  return map[normalized] ?? '♓';
}

function TopShortcutCard({
  titlePrefix,
  sign,
  signIcon,
  subtitle,
  iconName,
  onPress,
}: {
  titlePrefix: string;
  sign: string;
  signIcon: string;
  subtitle: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const fullTitle = `${titlePrefix} ${sign}`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('homeSurface.horoscopeSummary.cardAccessibility', { title: fullTitle })}
      hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
      style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}
    >
      <View style={styles.shortcutIconShell}>
        <Ionicons name={iconName} size={SHORTCUT_ICON_SIZE} color={colors.white} />
      </View>
      <View style={styles.shortcutContent}>
        <Text numberOfLines={1} style={styles.shortcutTitlePrefix}>{titlePrefix}</Text>
        <View style={styles.signRow}>
          <Text style={styles.signIcon}>{signIcon}</Text>
          <Text numberOfLines={1} style={styles.shortcutSignText}>{sign}</Text>
        </View>
        <Text numberOfLines={1} style={styles.shortcutSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={spacing.md + spacing.xs} color={colors.primaryMuted} />
    </Pressable>
  );
}

export function HoroscopeSummaryCard({
  sign,
  theme,
  advice,
  isLoading = false,
  onPressToday,
  onPressWeek,
  onPressDetails,
}: HoroscopeSummaryCardProps) {
  const { t } = useTranslation();
  const signText = cleanSignName(sign, t('zodiac.pisces'));
  const signIcon = zodiacGlyph(signText);
  const themeText = theme?.trim() || '';
  const adviceText = advice?.trim() || '';
  const hasContent = Boolean(themeText || adviceText);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('homeSurface.horoscopeSummary.title')}</Text>

      <View style={styles.card}>
        <View style={styles.shortcutRow}>
          <TopShortcutCard
            titlePrefix={t('homeSurface.horoscopeSummary.todayPrefix')}
            sign={signText}
            signIcon={signIcon}
            subtitle={t('homeSurface.horoscopeSummary.todaySubtitle')}
            iconName="sparkles"
            onPress={onPressToday}
          />
          <TopShortcutCard
            titlePrefix={t('homeSurface.horoscopeSummary.weekPrefix')}
            sign={signText}
            signIcon={signIcon}
            subtitle={t('homeSurface.horoscopeSummary.weekSubtitle')}
            iconName="calendar"
            onPress={onPressWeek}
          />
        </View>

        <View style={styles.summaryArea}>
          {isLoading || !hasContent ? (
            <Text style={styles.loadingText}>{t('homeSurface.horoscopeSummary.loading')}</Text>
          ) : (
            <>
              {themeText ? (
                <Text numberOfLines={2} style={styles.line}>
                  <Text style={styles.lineLabel}>{t('homeSurface.horoscopeSummary.themeLabel')}</Text> {themeText}
                </Text>
              ) : null}
              {adviceText ? (
                <Text numberOfLines={2} style={styles.line}>
                  <Text style={styles.lineLabel}>{t('homeSurface.horoscopeSummary.adviceLabel')}</Text> {adviceText}
                </Text>
              ) : null}
              <View style={styles.detailRow}>
                <Pressable
                  onPress={onPressDetails}
                  accessibilityRole="button"
                  accessibilityLabel={t('homeSurface.horoscopeSummary.detailsAccessibility')}
                  hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
                  style={({ pressed }) => [styles.detailBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.detailText}>{t('homeSurface.horoscopeSummary.detailsCta')}</Text>
                  <Ionicons name="chevron-forward" size={spacing.sm + spacing.xs} color={colors.primary} />
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.sectionGap,
  },
  title: {
    ...typography.H2,
    marginBottom: spacing.cardGap,
  },
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceGlass,
    overflow: 'hidden',
    ...shadowSubtle,
  },
  shortcutRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    gap: spacing.cardGap,
  },
  shortcut: {
    flex: 1,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.horoscopeShortcutBorder,
    backgroundColor: colors.horoscopeShortcutBg,
    minHeight: SHORTCUT_HEIGHT,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  shortcutIconShell: {
    width: SHORTCUT_ICON_WRAP,
    height: SHORTCUT_ICON_WRAP,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.horoscopeShortcutIconBg,
    marginTop: 2,
  },
  shortcutContent: {
    flex: 1,
    marginRight: spacing.xxs,
  },
  shortcutTitlePrefix: {
    ...typography.Caption,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    color: colors.horoscopeTitle,
  },
  signRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginTop: 1,
  },
  signIcon: {
    fontSize: 14,
    lineHeight: 16,
    color: colors.primaryDark,
  },
  shortcutSignText: {
    ...typography.Body,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.horoscopeTitle,
    flexShrink: 1,
  },
  shortcutSubtitle: {
    ...typography.Caption,
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
    color: colors.horoscopeTextSubtle,
  },
  summaryArea: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  line: {
    ...typography.Body,
    color: colors.horoscopeTextBody,
    paddingRight: spacing.xs,
  },
  lineLabel: {
    fontWeight: '700',
    color: colors.horoscopeTextStrong,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.xxs,
  },
  detailBtn: {
    minWidth: spacing.chevronHitArea + spacing.md,
    minHeight: spacing.chevronHitArea,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.primarySoft,
  },
  detailText: {
    ...typography.Caption,
    color: colors.primary,
    fontWeight: '700',
  },
  loadingText: {
    ...typography.Body,
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.85,
  },
});
