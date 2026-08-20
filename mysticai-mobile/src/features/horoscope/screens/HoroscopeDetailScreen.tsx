import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as Sharing from 'expo-sharing';
import { useTheme, ThemeColors } from '../../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../../constants/tokens';
import { SafeScreen } from '../../../components/ui/SafeScreen';
import { useBackNavigation } from '../../../hooks/useBackNavigation';
import { useHoroscopeStore } from '../store/useHoroscopeStore';
import { ZODIAC_MAP, resolveZodiacSign } from '../utils/zodiacData';
import type { HoroscopePeriod, HoroscopeResponse } from '../types/horoscope.types';
import { SegmentedControl } from '../components/SegmentedControl';
import { HoroscopeDetailSkeleton } from '../components/HoroscopeSkeleton';
import {
  ActionUnlockSheet,
  FEATURE_ACTION_KEYS,
  FEATURE_MODULE_KEYS,
  useModuleMonetization,
} from '../../monetization';
import { useAuthStore } from '../../../store/useAuthStore';
import { resolveUserScopeKey } from '../../../store/userScopedPersist';
import { queryKeys } from '../../../lib/queryKeys';
import { getDailyActions, getTodayIsoDate } from '../../../services/daily.service';
import { trackEvent } from '../../../services/analytics';

type HoroscopeSectionKey = keyof HoroscopeResponse['sections'];
type HoroscopeSectionConfig = {
  key: HoroscopeSectionKey;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  accent: keyof Pick<ThemeColors, 'horoscopeAccent' | 'pink' | 'gold' | 'green' | 'red'>;
};

/**
 * The daily "general" reading stays free — it is what makes the screen worth
 * opening and what the store listing promises. Everything else (the category
 * breakdown, the advice, and the whole weekly reading) is the premium tier.
 */
const FREE_SECTION_KEYS: HoroscopeSectionKey[] = ['general'];

const HOROSCOPE_SECTION_CONFIG: HoroscopeSectionConfig[] = [
  { key: 'general', icon: 'sparkles-outline', accent: 'horoscopeAccent' },
  { key: 'love', icon: 'heart-outline', accent: 'pink' },
  { key: 'career', icon: 'briefcase-outline', accent: 'green' },
  { key: 'money', icon: 'cash-outline', accent: 'gold' },
  { key: 'health', icon: 'fitness-outline', accent: 'red' },
  { key: 'advice', icon: 'bulb-outline', accent: 'horoscopeAccent' },
];

function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getIsoWeekKey(date = new Date()): string {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export default function HoroscopeDetailScreen() {
  const { sign: signParam, period: periodParam } = useLocalSearchParams<{ sign: string; period?: string }>();
  const sign = resolveZodiacSign(signParam ?? 'aries') ?? 'aries';

  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const goBack = useBackNavigation();
  const S = makeStyles(colors, isDark);
  const lang = (i18n.resolvedLanguage ?? i18n.language ?? 'tr').toLowerCase();
  const monetization = useModuleMonetization(FEATURE_MODULE_KEYS.HOROSCOPE);
  const user = useAuthStore((state) => state.user);
  const userScopeKey = resolveUserScopeKey(user);
  const dailyPlanDate = React.useMemo(() => getTodayIsoDate(), []);
  const dailyPlanLocale = lang.startsWith('en') ? 'en' : 'tr';
  const dailyPlanQuery = useQuery({
    queryKey: queryKeys.dailyActions(dailyPlanDate, dailyPlanLocale, userScopeKey),
    queryFn: () => getDailyActions(dailyPlanDate, dailyPlanLocale, userScopeKey),
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60 * 60 * 6,
  });
  const horoscopeUnlockState = monetization.getActionUnlockState(FEATURE_ACTION_KEYS.HOROSCOPE_VIEW);
  const [unlockedContentKey, setUnlockedContentKey] = React.useState<string | null>(null);
  const [showUnlockSheet, setShowUnlockSheet] = React.useState(false);

  const {
    current,
    loading,
    error,
    period,
    favorites,
    setPeriod,
    fetch: fetchHoroscope,
    toggleFavorite,
  } = useHoroscopeStore();

  // The store period is persisted, so on mount it can still hold the previous
  // value while the route asks for another one. Fetching before the two agree
  // fires a throwaway request for the wrong period, so gate the fetch until the
  // route period has been applied once.
  const routePeriod: HoroscopePeriod | null =
    periodParam === 'daily' || periodParam === 'weekly' ? periodParam : null;
  const [routePeriodApplied, setRoutePeriodApplied] = React.useState(routePeriod === null);

  useEffect(() => {
    if (routePeriod) {
      setPeriod(routePeriod);
    }
    setRoutePeriodApplied(true);
  }, [routePeriod, setPeriod]);

  const signData = ZODIAC_MAP.get(sign);
  const signName = signData ? (lang.startsWith('en') ? signData.nameEn : signData.nameTr) : sign;
  const horoscopeContentKey = React.useMemo(
    () => `horoscope:${period}:${sign}:${period === 'weekly' ? getIsoWeekKey() : getLocalDateKey()}`,
    [period, sign],
  );
  const isPremiumUnlocked = !horoscopeUnlockState.usesMonetization
    || unlockedContentKey === horoscopeContentKey;
  // Weekly readings are premium end to end; daily keeps its general section free.
  const isPremiumPeriod = period === 'weekly';

  // Switching sign or period moves to a different content key, which is locked
  // again on its own terms — never carry an open sheet across that boundary.
  useEffect(() => {
    setShowUnlockSheet(false);
  }, [horoscopeContentKey]);

  // The free tier needs the data too, so this no longer waits for an unlock.
  useEffect(() => {
    if (!routePeriodApplied) return;
    fetchHoroscope(sign, period);
  }, [fetchHoroscope, period, routePeriodApplied, sign]);

  const handleRetry = useCallback(() => {
    fetchHoroscope(sign, period);
  }, [sign, period, fetchHoroscope]);

  const handleOpenUnlockSheet = useCallback(() => {
    if (isPremiumUnlocked) return;
    trackEvent('horoscope_premium_unlock_tapped', {
      sign,
      period,
      locale: lang.startsWith('en') ? 'en' : 'tr',
      surface: 'horoscope_detail',
    });
    setShowUnlockSheet(true);
  }, [isPremiumUnlocked, lang, period, sign]);

  const handlePeriodChange = useCallback((p: HoroscopePeriod) => {
    setPeriod(p);
  }, [setPeriod]);

  const favKey = `${sign}:${period}:${current?.date ?? ''}`;
  const isFav = favorites.includes(favKey);

  const horoscopeText = current?.sections?.general?.trim() ?? '';
  const allSections = HOROSCOPE_SECTION_CONFIG
    .map((section) => ({
      ...section,
      title: t(`horoscope.${section.key}`),
      content: current?.sections?.[section.key]?.trim() ?? '',
      accentColor: colors[section.accent],
    }))
    .filter((section) => section.content.length > 0);
  const visibleSections = isPremiumUnlocked
    ? allSections
    : isPremiumPeriod
      ? []
      : allSections.filter((section) => FREE_SECTION_KEYS.includes(section.key));
  const lockedSectionCount = allSections.length - visibleSections.length;
  const showPremiumTeaser = !isPremiumUnlocked && lockedSectionCount > 0;

  // A locked weekly reading would otherwise be a blank screen, so show enough of
  // the opening to be honest about what is behind the lock.
  const lockedPreviewText = showPremiumTeaser && isPremiumPeriod && horoscopeText.length > 0
    ? (horoscopeText.length > 180 ? `${horoscopeText.slice(0, 180).trimEnd()}…` : horoscopeText)
    : '';

  // Share only what the user actually has access to.
  const horoscopeShareText = visibleSections
    .map((section) => `${section.title}\n${section.content}`)
    .join('\n\n');

  const handleShare = useCallback(async () => {
    if (!current || !horoscopeShareText) return;
    const text = `${signData?.emoji} ${signName}\n${current.date}\n\n${horoscopeShareText}\n\n— Astro Guru`;
    try {
      await Sharing.shareAsync('data:text/plain;base64,' + btoa(unescape(encodeURIComponent(text))), {
        mimeType: 'text/plain',
        dialogTitle: signName,
      });
    } catch {
      // user cancelled
    }
  }, [current, signName, signData, horoscopeShareText]);

  return (
    <SafeScreen>
      {/* Header */}
      <View style={S.header}>
        <Pressable onPress={goBack} style={S.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={S.emoji}>{signData?.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={S.headerTitle}>{signName}</Text>
          <Text style={S.headerDate}>{current?.date ?? ''}</Text>
        </View>
        <Pressable onPress={() => toggleFavorite(favKey)} style={S.actionBtn}>
          <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={20} color={isFav ? colors.red : colors.subtext} />
        </Pressable>
        <Pressable onPress={handleShare} style={S.actionBtn}>
          <Ionicons name="share-outline" size={20} color={colors.subtext} />
        </Pressable>
      </View>

      {/* Period toggle */}
      <View style={S.periodRow}>
        <SegmentedControl
          value={period}
          onChange={handlePeriodChange}
          labels={[t('horoscope.today'), t('horoscope.thisWeek')]}
        />
      </View>

      {loading && (
        <ScrollView contentContainerStyle={S.content}>
          <HoroscopeDetailSkeleton />
        </ScrollView>
      )}

      {error && !loading && (
        <View style={S.errorBox}>
          <Text style={S.errorText}>{t('horoscope.error')}</Text>
          <Pressable onPress={handleRetry} style={S.retryBtn}>
            <Text style={S.retryText}>{t('horoscope.retry')}</Text>
          </Pressable>
        </View>
      )}

      {current && !loading && !error && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={S.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {visibleSections.map((section) => (
            <React.Fragment key={section.key}>
              <View style={S.card}>
                <View style={S.cardHeader}>
                  <View style={[S.cardIconWrap, { backgroundColor: `${section.accentColor}1A` }]}>
                    <Ionicons name={section.icon} size={18} color={section.accentColor} />
                  </View>
                  <Text style={S.cardTitle}>
                    {section.key === 'general' ? t('horoscope.generalContext') : section.title}
                  </Text>
                </View>
                <Text style={S.bodyText}>{section.content}</Text>
              </View>

              {section.key === 'general' && dailyPlanQuery.data?.mainTheme ? (
                <Pressable
                  onPress={() => {
                    trackEvent('personal_plan_viewed', {
                      source: 'horoscope_detail',
                      surface: 'horoscope_detail',
                      personalization_level: dailyPlanQuery.data?.personalizationLevel,
                      locale: dailyPlanLocale,
                    });
                    router.push('/(tabs)/today-actions');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('horoscope.openPersonalPlan')}
                  style={({ pressed }) => [S.chartContextCard, pressed && S.chartContextPressed]}
                >
                  <View style={S.cardHeader}>
                    <View style={[S.cardIconWrap, S.chartContextIcon]}>
                      <Ionicons name="planet-outline" size={18} color={colors.horoscopeAccent} />
                    </View>
                    <View style={S.chartContextHeading}>
                      <Text style={S.chartContextEyebrow}>{t('horoscope.yourChartToday')}</Text>
                      <Text style={S.cardTitle}>{dailyPlanQuery.data.mainTheme.title}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.horoscopeAccent} />
                  </View>
                  <Text style={S.bodyText}>{dailyPlanQuery.data.mainTheme.description}</Text>
                  {dailyPlanQuery.data.primaryAction?.title ? (
                    <Text style={S.chartContextAction}>{dailyPlanQuery.data.primaryAction.title}</Text>
                  ) : null}
                </Pressable>
              ) : null}
            </React.Fragment>
          ))}

          {showPremiumTeaser && (
            <Pressable
              onPress={handleOpenUnlockSheet}
              style={({ pressed }) => [S.premiumCard, pressed && S.premiumCardPressed]}
              accessibilityRole="button"
              accessibilityLabel={t('horoscope.premiumUnlockA11y')}
            >
              {lockedPreviewText ? (
                <Text style={S.premiumPreviewText} numberOfLines={3}>{lockedPreviewText}</Text>
              ) : null}

              <View style={S.premiumHeaderRow}>
                <View style={S.premiumIconWrap}>
                  <Ionicons name="lock-closed" size={15} color={colors.gold} />
                </View>
                <Text style={S.premiumBadge}>{t('horoscope.premiumBadge')}</Text>
              </View>

              <Text style={S.premiumTitle}>
                {isPremiumPeriod ? t('horoscope.premiumWeeklyTitle') : t('horoscope.premiumSectionsTitle')}
              </Text>
              <Text style={S.premiumBody}>
                {isPremiumPeriod ? t('horoscope.premiumWeeklyBody') : t('horoscope.premiumSectionsBody')}
              </Text>

              <View style={S.premiumCtaRow}>
                <Text style={S.premiumCta}>{t('horoscope.premiumCta')}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.horoscopeAccent} />
              </View>
              <Text style={S.unlockHintText}>{t('horoscope.unlockHint')}</Text>
            </Pressable>
          )}

          {/* Source badge */}
          {current.sources && current.sources.length > 0 && (
            <View style={S.sourceInfo}>
              <Ionicons name="globe-outline" size={13} color={colors.subtext} />
              <Text style={S.sourceInfoText}>
                Kaynak: {current.sources.map((s) => s.name).join(', ')}
              </Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <ActionUnlockSheet
        visible={showUnlockSheet}
        moduleKey={FEATURE_MODULE_KEYS.HOROSCOPE}
        actionKey={FEATURE_ACTION_KEYS.HOROSCOPE_VIEW}
        contentKey={horoscopeContentKey}
        title={signName}
        onClose={() => {
          setShowUnlockSheet(false);
        }}
        onUnlocked={async () => {
          setUnlockedContentKey(horoscopeContentKey);
          setShowUnlockSheet(false);
          await fetchHoroscope(sign, period);
        }}
      />
    </SafeScreen>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
      gap: SPACING.sm,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    },
    emoji: {
      fontSize: 28,
    },
    headerTitle: {
      ...TYPOGRAPHY.H3,
      color: C.text,
    },
    headerDate: {
      ...TYPOGRAPHY.CaptionSmall,
      color: C.subtext,
    },
    actionBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
    },
    periodRow: {
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.md,
    },
    content: {
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.md,
    },
    errorBox: {
      alignItems: 'center',
      paddingVertical: SPACING.xxl,
    },
    errorText: {
      ...TYPOGRAPHY.Body,
      color: C.error,
      textAlign: 'center',
      marginTop: SPACING.sm,
      marginBottom: SPACING.xs,
    },
    premiumCard: {
      marginTop: SPACING.sm,
      marginBottom: SPACING.md,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.10)' : C.border,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : C.surface,
      padding: SPACING.lg,
      gap: SPACING.xs,
    },
    premiumCardPressed: {
      opacity: 0.82,
    },
    premiumPreviewText: {
      ...TYPOGRAPHY.Body,
      color: C.subtext,
      marginBottom: SPACING.sm,
    },
    premiumHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
    },
    premiumIconWrap: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${C.gold}1A`,
    },
    premiumBadge: {
      ...TYPOGRAPHY.CaptionBold,
      color: C.gold,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    premiumTitle: {
      ...TYPOGRAPHY.H3,
      color: C.text,
      marginTop: SPACING.xs,
    },
    premiumBody: {
      ...TYPOGRAPHY.Body,
      color: C.subtext,
    },
    premiumCtaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
      marginTop: SPACING.sm,
    },
    premiumCta: {
      ...TYPOGRAPHY.SmallBold,
      color: C.horoscopeAccent,
    },
    unlockPrompt: {
      marginHorizontal: SPACING.lg,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : C.border,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : C.surface,
      paddingHorizontal: SPACING.lg,
    },
    unlockPromptPressed: {
      opacity: 0.82,
    },
    unlockHintText: {
      ...TYPOGRAPHY.CaptionBold,
      color: C.horoscopeAccent,
      textAlign: 'center',
    },
    retryBtn: {
      backgroundColor: C.horoscopeAccent,
      borderRadius: RADIUS.sm,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
    },
    retryText: {
      ...TYPOGRAPHY.SmallBold,
      color: '#FFFFFF',
    },

    /* Main content */
    scrollContent: {
      paddingHorizontal: SPACING.lg,
      gap: SPACING.md,
    },
    card: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : C.surface,
      borderRadius: RADIUS.lg,
      padding: SPACING.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : C.border,
      gap: SPACING.md,
    },
    chartContextCard: {
      backgroundColor: isDark ? 'rgba(168,85,247,0.12)' : C.primarySoftBg,
      borderRadius: RADIUS.lg,
      padding: SPACING.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(168,85,247,0.34)' : C.horoscopeAccent,
      gap: SPACING.md,
    },
    chartContextPressed: {
      opacity: 0.8,
    },
    chartContextIcon: {
      backgroundColor: isDark ? 'rgba(168,85,247,0.18)' : C.surface,
    },
    chartContextHeading: {
      flex: 1,
      gap: 2,
    },
    chartContextEyebrow: {
      ...TYPOGRAPHY.CaptionBold,
      color: C.horoscopeAccent,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    chartContextAction: {
      ...TYPOGRAPHY.BodyBold,
      color: C.text,
      lineHeight: 22,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    cardIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: {
      ...TYPOGRAPHY.H3,
      color: C.text,
      flex: 1,
    },
    bodyText: {
      ...TYPOGRAPHY.Body,
      color: C.body,
      lineHeight: 26,
    },

    /* Source info */
    sourceInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: SPACING.sm,
      paddingHorizontal: SPACING.xs,
    },
    sourceInfoText: {
      ...TYPOGRAPHY.CaptionSmall,
      color: C.subtext,
    },
  });
}
