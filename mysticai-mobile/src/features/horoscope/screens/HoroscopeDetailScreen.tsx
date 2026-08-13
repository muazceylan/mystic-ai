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

  useEffect(() => {
    if (periodParam === 'daily' || periodParam === 'weekly') {
      setPeriod(periodParam);
    }
  }, [periodParam, setPeriod]);

  const signData = ZODIAC_MAP.get(sign);
  const signName = signData ? (lang.startsWith('en') ? signData.nameEn : signData.nameTr) : sign;
  const horoscopeContentKey = React.useMemo(
    () => `horoscope:${period}:${sign}:${period === 'weekly' ? getIsoWeekKey() : getLocalDateKey()}`,
    [period, sign],
  );
  const isUnlocked = !horoscopeUnlockState.usesMonetization || unlockedContentKey === horoscopeContentKey;

  useEffect(() => {
    if (!horoscopeUnlockState.usesMonetization) {
      setUnlockedContentKey(horoscopeContentKey);
      setShowUnlockSheet(false);
      return;
    }
    if (unlockedContentKey === horoscopeContentKey) {
      setShowUnlockSheet(false);
      return;
    }
    setShowUnlockSheet(true);
  }, [horoscopeContentKey, horoscopeUnlockState.usesMonetization, unlockedContentKey]);

  useEffect(() => {
    if (!isUnlocked) return;
    fetchHoroscope(sign, period);
  }, [fetchHoroscope, isUnlocked, period, sign]);

  const handleRetry = useCallback(() => {
    fetchHoroscope(sign, period);
  }, [sign, period, fetchHoroscope]);

  const handleOpenUnlockSheet = useCallback(() => {
    if (!isUnlocked && horoscopeUnlockState.usesMonetization) {
      setShowUnlockSheet(true);
    }
  }, [horoscopeUnlockState.usesMonetization, isUnlocked]);

  const handlePeriodChange = useCallback((p: HoroscopePeriod) => {
    setPeriod(p);
    if (horoscopeUnlockState.usesMonetization && (!isUnlocked || p !== period)) {
      setShowUnlockSheet(true);
    }
  }, [horoscopeUnlockState.usesMonetization, isUnlocked, period, setPeriod]);

  const favKey = `${sign}:${period}:${current?.date ?? ''}`;
  const isFav = favorites.includes(favKey);

  const horoscopeText = current?.sections?.general?.trim() ?? '';
  const horoscopeSections = HOROSCOPE_SECTION_CONFIG
    .map((section) => ({
      ...section,
      title: t(`horoscope.${section.key}`),
      content: current?.sections?.[section.key]?.trim() ?? '',
      accentColor: colors[section.accent],
    }))
    .filter((section) => section.content.length > 0);
  const horoscopeShareText = horoscopeSections
    .map((section) => `${section.title}\n${section.content}`)
    .join('\n\n') || horoscopeText;

  const handleShare = useCallback(async () => {
    if (!current) return;
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

      {!isUnlocked && (
        <Pressable
          onPress={handleOpenUnlockSheet}
          style={({ pressed }) => [S.errorBox, S.unlockPrompt, pressed && S.unlockPromptPressed]}
          accessibilityRole="button"
          accessibilityLabel={t('horoscope.unlockPrompt', 'Burç yorumunu görmek için kilidi aç')}
        >
          <Ionicons name="lock-closed-outline" size={24} color={colors.error} />
          <Text style={S.errorText}>{t('horoscope.subtitle', 'Burç yorumunu görmek için kilidi aç')}</Text>
          <Text style={S.unlockHintText}>{t('horoscope.unlockHint', 'Guru harca ya da video izle')}</Text>
        </Pressable>
      )}

      {loading && isUnlocked && (
        <ScrollView contentContainerStyle={S.content}>
          <HoroscopeDetailSkeleton />
        </ScrollView>
      )}

      {error && !loading && isUnlocked && (
        <View style={S.errorBox}>
          <Text style={S.errorText}>{t('horoscope.error')}</Text>
          <Pressable onPress={handleRetry} style={S.retryBtn}>
            <Text style={S.retryText}>{t('horoscope.retry')}</Text>
          </Pressable>
        </View>
      )}

      {current && isUnlocked && !loading && !error && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={S.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {horoscopeSections.map((section) => (
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
