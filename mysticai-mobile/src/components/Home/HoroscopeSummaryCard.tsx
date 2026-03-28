import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius, shadowSubtle, spacing, typography } from '../../theme';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';
import { HomePremiumIconBadge } from './HomePremiumIconBadge';

const FONT_REGULAR = Platform.select({ ios: 'MysticInter-Regular', android: 'MysticInter-Regular', default: undefined });
const FONT_SEMIBOLD = Platform.select({ ios: 'MysticInter-SemiBold', android: 'MysticInter-SemiBold', default: undefined });

interface HoroscopeSummaryCardProps {
  sign?: string;
  theme?: string;
  advice?: string;
  isLoading?: boolean;
  onPressToday: () => void;
  onPressWeek: () => void;
  onPressDetails: () => void;
}

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

/** Maps any raw sign value (English or Turkish) to the i18n key. */
function signToI18nKey(raw: string): string | null {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u');

  const map: Record<string, string> = {
    koc: 'aries', aries: 'aries',
    boga: 'taurus', taurus: 'taurus',
    ikizler: 'gemini', gemini: 'gemini',
    yengec: 'cancer', cancer: 'cancer',
    aslan: 'leo', leo: 'leo',
    basak: 'virgo', virgo: 'virgo',
    terazi: 'libra', libra: 'libra',
    akrep: 'scorpio', scorpio: 'scorpio',
    yay: 'sagittarius', sagittarius: 'sagittarius',
    oglak: 'capricorn', capricorn: 'capricorn',
    kova: 'aquarius', aquarius: 'aquarius',
    balik: 'pisces', pisces: 'pisces',
  };

  return map[normalized] ?? null;
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
  visualKey,
  onPress,
  styles,
  chevronColor,
}: {
  titlePrefix: string;
  sign: string;
  signIcon: string;
  subtitle: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  visualKey: string;
  onPress: () => void;
  styles: HoroscopeSummaryStyles;
  chevronColor: string;
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
      <HomePremiumIconBadge iconName={iconName} contextKey={visualKey} size="sm" />
      <View style={styles.shortcutContent}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={styles.shortcutTitlePrefix}>{titlePrefix}</Text>
        <View style={styles.signRow}>
          <Text style={styles.signIcon}>{signIcon}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.shortcutSignText}>{sign}</Text>
        </View>
        <Text numberOfLines={1} style={styles.shortcutSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={spacing.md + spacing.xs} color={chevronColor} />
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
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const rawSignText = cleanSignName(sign, 'pisces');
  const i18nKey = signToI18nKey(rawSignText);
  const signText = i18nKey ? t(`zodiac.${i18nKey}`) : rawSignText;
  const signIcon = zodiacGlyph(rawSignText);
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
            visualKey="horoscope_today"
            onPress={onPressToday}
            styles={styles}
            chevronColor={isDark ? colors.primaryLight : colors.primary700}
          />
          <TopShortcutCard
            titlePrefix={t('homeSurface.horoscopeSummary.weekPrefix')}
            sign={signText}
            signIcon={signIcon}
            subtitle={t('homeSurface.horoscopeSummary.weekSubtitle')}
            iconName="calendar"
            visualKey="horoscope_weekly"
            onPress={onPressWeek}
            styles={styles}
            chevronColor={isDark ? colors.primaryLight : colors.primary700}
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

type HoroscopeSummaryStyles = ReturnType<typeof makeStyles>;

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    wrap: {
      marginTop: spacing.sectionGap,
    },
    title: {
      ...typography.H2,
      marginBottom: spacing.cardGap,
      color: C.text,
    },
    card: {
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: isDark ? C.surfaceGlassBorder : C.borderLight,
      backgroundColor: C.surfaceGlass,
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
      borderColor: isDark ? 'rgba(143,116,242,0.30)' : '#DDD2FF',
      backgroundColor: isDark ? 'rgba(46,40,74,0.84)' : '#F8F4FF',
      minHeight: SHORTCUT_HEIGHT,
      paddingVertical: spacing.xs + 2,
      paddingHorizontal: spacing.sm,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.xs,
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
      color: C.subtext,
      ...(FONT_SEMIBOLD ? { fontFamily: FONT_SEMIBOLD } : {}),
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
      color: C.primary,
    },
    shortcutSignText: {
      ...typography.Body,
      fontSize: 15,
      lineHeight: 18,
      fontWeight: '700',
      color: C.text,
      flexShrink: 1,
      ...(FONT_SEMIBOLD ? { fontFamily: FONT_SEMIBOLD } : {}),
    },
    shortcutSubtitle: {
      ...typography.Caption,
      marginTop: 2,
      fontSize: 11,
      lineHeight: 14,
      color: C.subtext,
    },
    summaryArea: {
      borderTopWidth: 1,
      borderTopColor: C.border,
      paddingHorizontal: spacing.cardPadding,
      paddingVertical: spacing.sm,
      gap: spacing.xs,
    },
    line: {
      ...typography.Body,
      color: C.body,
      paddingRight: spacing.xs,
    },
    lineLabel: {
      fontWeight: '700',
      color: C.text,
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
      borderColor: C.border,
      backgroundColor: isDark ? 'rgba(123,95,230,0.22)' : C.primarySoft,
    },
    detailText: {
      ...typography.Caption,
      color: C.primary,
      fontWeight: '700',
    },
    loadingText: {
      ...typography.Body,
      color: C.subtext,
    },
    pressed: {
      opacity: 0.85,
    },
  });
}
