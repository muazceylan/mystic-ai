import React, { useMemo } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AppHeader, SafeScreen, Skeleton, SurfaceHeaderIconButton } from '../components/ui';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { useCosmicSummary, useHomeBrief, useSkyPulse } from '../hooks/useHomeQueries';
import { useInnerHeaderSpacing } from '../hooks/useInnerHeaderSpacing';
import { useSmartBackNavigation } from '../hooks/useSmartBackNavigation';

function formatShortDate(input: string | null | undefined, locale: string) {
  const d = input ? new Date(input) : new Date();
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

type TFn = (key: string, opts?: Record<string, string>) => string;

function riskLabel(score: number | null | undefined, t: TFn) {
  if (typeof score !== 'number') return t('dailySummary.riskMedium');
  if (score >= 72) return t('dailySummary.riskLow');
  if (score <= 42) return t('dailySummary.riskHigh');
  return t('dailySummary.riskMedium');
}

function shortEmotionLabel(input: string | null | undefined, t: TFn) {
  const s = (input ?? '').toLowerCase();
  if (!s) return t('dailySummary.emotionCalm');
  if (s.includes('dikkat') || s.includes('temkin') || s.includes('cautious')) return t('dailySummary.emotionCautious');
  if (s.includes('hareket') || s.includes('aktif') || s.includes('lively') || s.includes('active')) return t('dailySummary.emotionLively');
  if (s.includes('akış') || s.includes('sakin') || s.includes('calm')) return t('dailySummary.emotionCalm');
  return t('dailySummary.emotionBalanced');
}

export default function DailySummaryScreen() {
  const { colors, isDark } = useTheme();
  const { i18n, t } = useTranslation();
  const tFn = t as TFn;
  const { width } = useWindowDimensions();
  const goBack = useSmartBackNavigation({ fallbackRoute: '/(tabs)/home' });
  const { headerPaddingTop, headerPaddingBottom, headerHorizontalPadding } = useInnerHeaderSpacing();
  const user = useAuthStore((s) => s.user);
  const onboardingMaritalStatus = useOnboardingStore((s) => s.maritalStatus);

  const dailySecretParams = useMemo(
    () =>
      user
        ? {
            name: user.name ?? (`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined),
            birthDate: user.birthDate ?? undefined,
            maritalStatus: user.maritalStatus ?? onboardingMaritalStatus ?? undefined,
          }
        : null,
    [user, onboardingMaritalStatus],
  );

  const homeBriefQuery = useHomeBrief(dailySecretParams);
  const skyPulseQuery = useSkyPulse();
  const cosmicSummaryQuery = useCosmicSummary(
    user?.id
      ? {
          userId: user.id,
          locale: user.preferredLanguage ?? i18n.language,
          userGender: user.gender,
          maritalStatus: user.maritalStatus,
        }
      : null,
  );

  const homeBrief = homeBriefQuery.data;
  const skyPulse = skyPulseQuery.data;
  const cosmicSummary = cosmicSummaryQuery.data;
  const score = cosmicSummary?.dailyGuide?.overallScore ?? null;
  const themeLine = homeBrief?.transitHeadline || skyPulse?.dailyVibe || t('dailySummary.fallbackTheme');
  const suggestionLine = homeBrief?.actionMessage || homeBrief?.transitSummary || t('dailySummary.fallbackSuggestion');
  const emotionLabel = shortEmotionLabel(homeBrief?.transitSummary || skyPulse?.dailyVibe, tFn);
  const impactScore = homeBrief?.meta?.impactScore ?? null;

  const S = makeStyles(colors, isDark, {
    headerPaddingTop,
    headerPaddingBottom,
    headerHorizontalPadding,
  });
  const contentMaxWidth = Platform.OS === 'web' ? Math.min(900, width - 24) : undefined;

  const isRefreshing = cosmicSummaryQuery.isRefetching || homeBriefQuery.isRefetching || skyPulseQuery.isRefetching;
  const isInitialLoading = (!homeBrief && homeBriefQuery.isLoading) || (!skyPulse && skyPulseQuery.isLoading) || (!cosmicSummary && cosmicSummaryQuery.isLoading);
  const isError = homeBriefQuery.isError || skyPulseQuery.isError || cosmicSummaryQuery.isError;

  return (
    <SafeScreen>
      <View style={S.container}>
        <AppHeader
          title={t('dailySummary.title')}
          subtitle={`${formatShortDate(skyPulse?.date, i18n.language)} • ${skyPulse?.moonSignTurkish ? `☾ ${skyPulse.moonSignTurkish}` : t('dailySummary.skyFlowFallback')}`}
          onBack={goBack}
          rightActions={(
            <SurfaceHeaderIconButton
              iconName="calendar-outline"
              onPress={() => router.push('/(tabs)/calendar')}
              accessibilityLabel={t('dailySummary.calendarA11y')}
            />
          )}
        />

        <ScrollView
          style={S.scroll}
          contentContainerStyle={[S.scrollContent, contentMaxWidth ? { width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' } : null]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                void Promise.allSettled([
                  skyPulseQuery.refetch(),
                  homeBriefQuery.refetch(),
                  cosmicSummaryQuery.refetch(),
                ]);
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(380)} style={S.heroCard}>
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(24,28,46,0.84)', 'rgba(12,16,28,0.72)']
                  : ['rgba(255,255,255,0.95)', 'rgba(248,245,255,0.78)']
              }
              style={StyleSheet.absoluteFillObject}
            />
            <View style={S.heroAura} />
            <View style={S.topGlow} />
            <View style={S.heroHeaderRow}>
              <Text style={S.heroTitle}>{t('dailySummary.title')}</Text>
              <View style={S.heroHeaderRight}>
                <View style={S.scorePill}>
                  {isInitialLoading ? (
                    <>
                      <Skeleton width={24} height={12} borderRadius={6} />
                      <Skeleton width={24} height={10} borderRadius={5} />
                    </>
                  ) : (
                    <>
                      <Text style={S.scoreValue}>{typeof score === 'number' ? Math.round(score) : '--'}</Text>
                      <Text style={S.scoreSub}>{t('dailySummary.scoreOverall')}</Text>
                    </>
                  )}
                </View>
                <Pressable
                  onPress={() => router.push({ pathname: '/(tabs)/decision-compass-tab', params: { from: '/daily-summary' } } as never)}
                  style={({ pressed }) => [S.heroChevronBtn, pressed && S.pressed]}
                >
                  <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
                </Pressable>
              </View>
            </View>

            <View style={S.summaryRowsCard}>
              {isInitialLoading ? (
                <>
                  <View style={S.summaryRow}>
                    <Skeleton width={62} height={12} borderRadius={6} />
                    <Skeleton width="62%" height={14} borderRadius={7} />
                  </View>
                  <View style={S.summaryRowDivider} />
                  <View style={S.summaryRow}>
                    <Skeleton width={70} height={12} borderRadius={6} />
                    <Skeleton width="72%" height={14} borderRadius={7} />
                  </View>
                </>
              ) : (
                <>
                  <View style={S.summaryRow}>
                    <Text style={S.summaryRowLabel}>{t('dailySummary.themeLabel')}</Text>
                    <Text style={S.summaryRowValue} numberOfLines={1}>{themeLine}</Text>
                  </View>
                  <View style={S.summaryRowDivider} />
                  <View style={S.summaryRow}>
                    <Text style={S.summaryRowLabel}>{t('dailySummary.suggestionLabel')}</Text>
                    <Text style={[S.summaryRowValue, S.summaryRowValueStrong]} numberOfLines={2}>{suggestionLine}</Text>
                  </View>
                </>
              )}
            </View>

            <View style={S.heroDivider} />
            <View style={S.chipsRow}>
              {isInitialLoading ? (
                <>
                  <Skeleton width={100} height={28} borderRadius={14} />
                  <Skeleton width={96} height={28} borderRadius={14} />
                  <Skeleton width={84} height={28} borderRadius={14} />
                </>
              ) : (
                <>
                  <View style={[S.chip, S.chipEmotion]}><Text style={S.chipText}>{t('dailySummary.emotionChip', { label: emotionLabel })}</Text></View>
                  <View style={[S.chip, S.chipRisk]}><Text style={S.chipText}>{t('dailySummary.riskChip', { label: riskLabel(impactScore, tFn) })}</Text></View>
                </>
              )}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(60).duration(420)} style={S.actionRow}>
            <Pressable
              onPress={() => router.push({ pathname: '/(tabs)/decision-compass-tab', params: { from: '/daily-summary' } } as never)}
              style={({ pressed }) => [S.actionBtn, pressed && S.pressed]}
            >
              <Ionicons name="compass-outline" size={16} color={colors.primary} />
              <Text style={S.actionBtnText}>{t('dailySummary.compassBtn')}</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/(tabs)/calendar')} style={({ pressed }) => [S.actionBtn, pressed && S.pressed]}>
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <Text style={S.actionBtnText}>{t('dailySummary.plannerBtn')}</Text>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(460)} style={S.panel}>
            <Text style={S.panelTitle}>{t('dailySummary.focusPanelTitle')}</Text>
            {isInitialLoading ? (
              <>
                <Skeleton height={46} borderRadius={14} />
                <Skeleton height={46} borderRadius={14} />
                <Skeleton height={46} borderRadius={14} />
              </>
            ) : (cosmicSummary?.focusCards ?? []).slice(0, 6).map((card, index) => (
              <Pressable
                key={`${card.activityKey}-${index}`}
                onPress={() =>
                  router.push({
                    pathname: '/decision-compass-detail',
                    params: {
                      categoryKey: card.categoryKey,
                      label: card.categoryLabel || card.activityLabel,
                      activityLabel: card.activityLabel,
                      score: String(Math.round(card.score)),
                      date: cosmicSummary?.date ?? '',
                    },
                  })
                }
                style={({ pressed }) => [S.focusRow, pressed && S.pressed]}
              >
                <View style={S.focusLeft}>
                  <View style={S.focusIconBubble}>
                    <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.focusLabel} numberOfLines={1}>{card.categoryLabel || card.activityLabel}</Text>
                    <Text style={S.focusSub} numberOfLines={1}>{card.shortAdvice || card.activityLabel}</Text>
                  </View>
                </View>
                <View style={S.focusScorePill}><Text style={S.focusScore}>{Math.round(card.score)}</Text></View>
                <Ionicons name="chevron-forward" size={14} color={colors.subtext} />
              </Pressable>
            ))}
            {!isInitialLoading && !(cosmicSummary?.focusCards?.length) ? (
              <Text style={S.emptyInline}>{t('dailySummary.focusEmptyState')}</Text>
            ) : null}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(180).duration(500)} style={S.panel}>
            <Text style={S.panelTitle}>{t('dailySummary.weeklyPanelTitle')}</Text>
            {isInitialLoading ? (
              <>
                <Skeleton height={40} borderRadius={12} />
                <Skeleton height={40} borderRadius={12} />
                <Skeleton height={40} borderRadius={12} />
              </>
            ) : (homeBrief?.weeklyCards ?? []).slice(0, 4).map((card, idx) => (
              <View key={`${card.key}-${idx}`} style={S.weeklyRow}>
                <View style={S.weeklyBullet} />
                <View style={{ flex: 1 }}>
                  <Text style={S.weeklyTitle}>{card.title || card.headline}</Text>
                  <Text style={S.weeklySub} numberOfLines={2}>{card.quickTip || card.subtext || t('dailySummary.weeklyCardSubFallback')}</Text>
                </View>
              </View>
            ))}
            {!isInitialLoading && !(homeBrief?.weeklyCards?.length) ? (
              <Text style={S.emptyInline}>{t('dailySummary.weeklyEmptyState')}</Text>
            ) : null}
          </Animated.View>

          {skyPulse?.dailyVibe && !isInitialLoading ? (
            <Animated.View entering={FadeInDown.delay(240).duration(460)} style={S.panel}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="moon-outline" size={16} color={colors.primary} />
                <Text style={S.panelTitle}>{t('dailySummary.skyPulseTitle')}</Text>
              </View>
              <Text style={S.weeklyTitle}>{skyPulse.dailyVibe}</Text>
              {skyPulse.moonSignTurkish ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={S.focusSub}>{t('dailySummary.moonSignLabel', { sign: skyPulse.moonSignTurkish })}</Text>
                  {(skyPulse as any).moonPhaseTurkish ? <Text style={S.focusSub}>• {(skyPulse as any).moonPhaseTurkish}</Text> : null}
                </View>
              ) : null}
            </Animated.View>
          ) : null}

          {isError ? (
            <Animated.View entering={FadeIn.duration(220)} style={S.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={isDark ? '#E7C0CD' : '#A85D77'} />
              <Text style={S.errorBannerText}>{t('dailySummary.errorBanner')}</Text>
            </Animated.View>
          ) : null}
        </ScrollView>
      </View>
    </SafeScreen>
  );
}

function makeStyles(
  C: ReturnType<typeof useTheme>['colors'],
  isDark: boolean,
  headerLayout: {
    headerPaddingTop: number;
    headerPaddingBottom: number;
    headerHorizontalPadding: number;
  },
) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: headerLayout.headerHorizontalPadding,
      paddingTop: headerLayout.headerPaddingTop,
      paddingBottom: headerLayout.headerPaddingBottom,
    },
    headerBtn: {
      width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
      backgroundColor: C.surfaceGlass, borderWidth: 1, borderColor: C.surfaceGlassBorder,
    },
    headerTitleWrap: { flex: 1 },
    headerTitle: { color: C.text, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
    headerSub: { color: C.subtext, fontSize: 11.5, fontWeight: '600', marginTop: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 130 : Platform.OS === 'web' ? 40 : 88, gap: 10 },
    heroCard: {
      borderRadius: 20, backgroundColor: C.surfaceGlass, borderWidth: 1, borderColor: C.surfaceGlassBorder,
      padding: 14, gap: 10, overflow: 'hidden',
      shadowColor: isDark ? '#000' : '#B9B0D7',
      shadowOpacity: isDark ? 0.22 : 0.12,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    heroAura: {
      position: 'absolute',
      top: -28,
      right: -12,
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: isDark ? 'rgba(115,96,210,0.18)' : 'rgba(122,91,234,0.10)',
    },
    topGlow: {
      position: 'absolute', top: 0, left: 14, right: 14, height: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)',
    },
    heroHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    heroHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    heroTitle: { color: C.text, fontSize: 15, fontWeight: '800' },
    heroChevronBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.72)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(122,91,234,0.05)',
    },
    scorePill: {
      minHeight: 30, borderRadius: 15, paddingHorizontal: 12,
      backgroundColor: isDark ? 'rgba(180,148,255,0.14)' : 'rgba(122,91,234,0.08)',
      flexDirection: 'row', alignItems: 'center', gap: 5,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(122,91,234,0.05)',
    },
    scoreValue: { color: C.primary, fontSize: 14, fontWeight: '800' },
    scoreSub: { color: C.subtext, fontSize: 10, fontWeight: '700' },
    summaryRowsCard: {
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.72)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(122,91,234,0.04)',
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      minHeight: 18,
    },
    summaryRowDivider: {
      height: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(122,91,234,0.06)',
    },
    summaryRowLabel: {
      color: C.subtext,
      fontSize: 11.5,
      fontWeight: '700',
      minWidth: 38,
    },
    summaryRowValue: {
      flex: 1,
      color: C.text,
      fontSize: 12.5,
      fontWeight: '600',
      textAlign: 'left',
    },
    summaryRowValueStrong: {
      fontWeight: '700',
    },
    heroDivider: {
      height: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(122,91,234,0.05)',
      marginTop: -2,
    },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
    chipFocus: { backgroundColor: isDark ? 'rgba(180,148,255,0.14)' : '#F3EEFF', borderColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' },
    chipEmotion: { backgroundColor: isDark ? 'rgba(96,187,161,0.12)' : '#EEF8F4', borderColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' },
    chipRisk: { backgroundColor: isDark ? 'rgba(146,89,112,0.20)' : '#FBF2EA', borderColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' },
    chipText: { color: C.text, fontSize: 11, fontWeight: '700' },
    actionRow: { flexDirection: 'row', gap: 8 },
    actionBtn: {
      flex: 1, minHeight: 40, borderRadius: 14,
      backgroundColor: C.surfaceGlass, borderWidth: 1, borderColor: C.surfaceGlassBorder,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    },
    actionBtnText: { color: C.text, fontSize: 12, fontWeight: '700' },
    panel: {
      borderRadius: 18, backgroundColor: C.surfaceGlass, borderWidth: 1, borderColor: C.surfaceGlassBorder,
      padding: 14, gap: 8,
      shadowColor: isDark ? '#000' : '#C0B8DB',
      shadowOpacity: isDark ? 0.14 : 0.07,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    panelTitle: { color: C.text, fontSize: 14.5, fontWeight: '800' },
    focusRow: {
      minHeight: 46, borderRadius: 14,
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.70)',
      borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(122,91,234,0.05)',
      flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10,
    },
    focusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    focusIconBubble: {
      width: 24, height: 24, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(180,148,255,0.10)' : 'rgba(122,91,234,0.08)',
    },
    focusLabel: { color: C.text, fontSize: 12.5, fontWeight: '700' },
    focusSub: { color: C.subtext, fontSize: 10.5, fontWeight: '600', marginTop: 1 },
    focusScorePill: {
      minWidth: 32, height: 22, borderRadius: 11,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(180,148,255,0.12)' : 'rgba(122,91,234,0.08)',
      paddingHorizontal: 8,
    },
    focusScore: { color: C.primary, fontSize: 11, fontWeight: '800' },
    weeklyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 2 },
    weeklyBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary, marginTop: 5 },
    weeklyTitle: { color: C.text, fontSize: 12.5, fontWeight: '700' },
    weeklySub: { color: C.subtext, fontSize: 11, lineHeight: 16, fontWeight: '500', marginTop: 1 },
    emptyInline: { color: C.subtext, fontSize: 12, fontWeight: '500' },
    errorBanner: {
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: isDark ? 'rgba(146,89,112,0.14)' : 'rgba(180,94,121,0.08)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(229,182,198,0.12)' : 'rgba(168,93,119,0.10)',
      marginTop: -2,
    },
    errorBannerText: {
      flex: 1,
      color: isDark ? '#E4C4CF' : '#8A5D70',
      fontSize: 11.5,
      fontWeight: '600',
      lineHeight: 16,
    },
    pressed: { opacity: 0.86 },
  });
}
