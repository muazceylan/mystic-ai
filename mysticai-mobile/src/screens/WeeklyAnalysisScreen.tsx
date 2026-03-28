/**
 * WeeklyAnalysisScreen — Haftalık SWOT detay sayfası
 * Güç, Fırsat, Uyarı, Enerji Kaybı detaylı görünüm
 */
import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeScreen, TabHeader } from '../components/ui';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { useHomeBrief } from '../hooks/useHomeQueries';
import { queryKeys } from '../lib/queryKeys';
import { TYPOGRAPHY, SPACING, RADIUS } from '../constants/tokens';
import type { HomeBrief } from '../services/oracle.service';
import type { HomeDashboardResponse, HomeDashboardWeeklyHighlightItem } from '../services/home-dashboard.service';

const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

interface SwotCardData {
  id: string;
  titleKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  accentBg: string;
  headline: string;
  subtext: string;
  quickTip: string;
}

function getWeekRange(): { label: string; startDate: string; endDate: string } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const sameMonth = start.getMonth() === end.getMonth();
  const label = sameMonth
    ? `${start.getDate()} – ${end.getDate()} ${TR_MONTHS[end.getMonth()]}`
    : `${start.getDate()} ${TR_MONTHS[start.getMonth()]} – ${end.getDate()} ${TR_MONTHS[end.getMonth()]}`;

  return {
    label,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function buildCards(
  homeBrief: HomeBrief | null,
  t: (key: string) => string,
  weeklyHighlights?: HomeDashboardWeeklyHighlightItem[] | null,
): SwotCardData[] {
  const byKey = new Map(
    (homeBrief?.weeklyCards ?? []).map((c) => [c.key, c]),
  );
  const weeklyByKey = new Map(
    (weeklyHighlights ?? []).map((item) => [item.key, item]),
  );

  const items: Array<{
    id: string;
    titleKey: string;
    icon: keyof typeof Ionicons.glyphMap;
    accent: string;
    accentBg: string;
  }> = [
    { id: 'strength', titleKey: 'home.strength', icon: 'flash', accent: '#10B981', accentBg: 'rgba(16,185,129,0.12)' },
    { id: 'opportunity', titleKey: 'home.opportunity', icon: 'star', accent: '#F59E0B', accentBg: 'rgba(245,158,11,0.12)' },
    { id: 'threat', titleKey: 'home.threat', icon: 'warning', accent: '#EF4444', accentBg: 'rgba(239,68,68,0.12)' },
    { id: 'weakness', titleKey: 'home.weakness', icon: 'alert-circle', accent: '#8B5CF6', accentBg: 'rgba(139,92,246,0.12)' },
  ];

  return items.map((item) => {
    const card = byKey.get(item.id);
    const weeklyFallback = weeklyByKey.get(item.id);
    return {
      ...item,
      headline: card?.headline ?? weeklyFallback?.title ?? t('home.areaActiveThisWeek'),
      subtext: card?.subtext ?? weeklyFallback?.desc ?? '',
      quickTip: card?.quickTip ?? '',
    };
  });
}

export default function WeeklyAnalysisScreen() {
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const onboardingMaritalStatus = useOnboardingStore((s) => s.maritalStatus);
  const S = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const resolvedLocale = useMemo<'tr' | 'en'>(
    () => ((i18n.resolvedLanguage ?? i18n.language ?? user?.preferredLanguage ?? 'tr').toLowerCase().startsWith('en') ? 'en' : 'tr'),
    [i18n.language, i18n.resolvedLanguage, user?.preferredLanguage],
  );

  // Must match home.tsx dailySecretParams exactly to share react-query cache
  const homeBriefParams = useMemo(() => {
    if (!user) return null;
    return {
      name: user.name ?? (`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined),
      birthDate: user.birthDate ?? undefined,
      maritalStatus: user.maritalStatus ?? onboardingMaritalStatus ?? undefined,
    };
  }, [user, onboardingMaritalStatus]);

  const { data: homeBrief, isLoading, isError, refetch, isRefetching } = useHomeBrief(homeBriefParams);

  const cachedDashboard = useMemo(() => {
    const dashboardUserId = user?.id ?? 'guest';
    const dashboardSign = user?.zodiacSign ?? '';
    return (
      queryClient.getQueryData<HomeDashboardResponse>(queryKeys.homeDashboard(dashboardUserId, dashboardSign, resolvedLocale))
      ?? queryClient.getQueryData<HomeDashboardResponse>(queryKeys.homeDashboardFast(dashboardUserId, resolvedLocale))
      ?? null
    );
  }, [queryClient, resolvedLocale, user?.id, user?.zodiacSign]);

  const weekRange = useMemo(() => getWeekRange(), []);
  const weekLabel = cachedDashboard?.weeklyHighlights?.rangeText?.trim() || weekRange.label;
  const cachedWeeklyHighlights = cachedDashboard?.weeklyHighlights?.items ?? null;
  const cards = useMemo(
    () => buildCards(homeBrief ?? null, t, cachedWeeklyHighlights),
    [cachedWeeklyHighlights, homeBrief, t],
  );
  const shouldShowFullError = isError && !homeBrief && !(cachedWeeklyHighlights?.length);

  return (
    <SafeScreen>
      <TabHeader title={t('home.weeklyAnalysis')} subtitle={weekLabel} />

      <ScrollView
        contentContainerStyle={S.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {/* Section header */}
        <Animated.View entering={FadeInDown.duration(400)} style={S.sectionIntro}>
          <LinearGradient
            colors={
              isDark
                ? ['rgba(124,58,237,0.10)', 'rgba(124,58,237,0.02)']
                : ['rgba(124,58,237,0.06)', 'rgba(124,58,237,0.01)']
            }
            style={S.sectionIntroBg}
          />
          <View style={S.sectionIntroIcon}>
            <Ionicons name="analytics" size={20} color={isDark ? '#A78BFA' : '#7C3AED'} />
          </View>
          <Text style={S.sectionIntroTitle}>{t('home.swotSectionTitle')}</Text>
          <Text style={S.sectionIntroDesc}>
            {t('discover.weeklySwotDesc')}
          </Text>
        </Animated.View>

        {isLoading && !homeBrief ? (
          <View style={S.inlineLoadingWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={S.inlineLoadingText}>{t('home.swotLoading')}</Text>
          </View>
        ) : null}

        {shouldShowFullError ? (
          <View style={S.errorWrap}>
            <Ionicons name="cloud-offline-outline" size={40} color={colors.muted} />
            <Text style={S.errorText}>{t('home.swotError')}</Text>
            <Pressable style={S.retryBtn} onPress={() => refetch()}>
              <Text style={S.retryBtnText}>{t('home.swotRetryBtn')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={S.cardsWrap}>
            {cards.map((card, index) => (
              <Animated.View
                key={card.id}
                entering={FadeInDown.delay(index * 100).duration(450)}
              >
                <View style={S.card}>
                  <View style={S.cardHeader}>
                    <View style={[S.cardIconWrap, { backgroundColor: card.accentBg }]}>
                      <Ionicons name={card.icon} size={18} color={card.accent} />
                    </View>
                    <Text style={[S.cardTitle, { color: card.accent }]}>
                      {t(card.titleKey)}
                    </Text>
                  </View>

                  <Text style={S.cardHeadline}>{card.headline}</Text>

                  {card.subtext ? (
                    <Text style={S.cardSubtext}>{card.subtext}</Text>
                  ) : null}

                  {card.quickTip ? (
                    <View style={[S.tipRow, { borderLeftColor: card.accent + '55' }]}>
                      <Ionicons name="bulb-outline" size={14} color={card.accent} style={{ marginTop: 1 }} />
                      <Text style={S.tipText}>{card.quickTip}</Text>
                    </View>
                  ) : null}
                </View>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeScreen>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  const accent = isDark ? '#A78BFA' : '#7C3AED';

  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.md,
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
    headerCenter: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    headerTitle: {
      ...TYPOGRAPHY.BodyLarge,
      color: C.text,
      letterSpacing: -0.3,
    },
    headerSub: {
      ...TYPOGRAPHY.CaptionXS,
      color: C.subtext,
    },

    scrollContent: {
      paddingHorizontal: SPACING.lgXl,
      paddingBottom: 100,
    },

    /* Section intro */
    sectionIntro: {
      alignItems: 'center',
      padding: SPACING.xl,
      marginBottom: SPACING.lg,
      borderRadius: RADIUS.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148,163,184,0.10)' : C.border,
    },
    sectionIntroBg: {
      ...StyleSheet.absoluteFillObject,
    },
    sectionIntroIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(167,139,250,0.14)' : 'rgba(124,58,237,0.08)',
      marginBottom: SPACING.smMd,
    },
    sectionIntroTitle: {
      ...TYPOGRAPHY.H3,
      color: C.text,
      textAlign: 'center',
      marginBottom: SPACING.xs,
    },
    sectionIntroDesc: {
      ...TYPOGRAPHY.Caption,
      color: C.subtext,
      textAlign: 'center',
    },

    /* Loading */
    loadingWrap: {
      alignItems: 'center',
      paddingVertical: 60,
      gap: SPACING.md,
    },
    loadingText: {
      ...TYPOGRAPHY.Caption,
      color: C.subtext,
    },
    inlineLoadingWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      paddingBottom: SPACING.lg,
    },
    inlineLoadingText: {
      ...TYPOGRAPHY.Caption,
      color: C.subtext,
    },

    /* Error */
    errorWrap: {
      alignItems: 'center',
      paddingVertical: 48,
      gap: SPACING.md,
    },
    errorText: {
      ...TYPOGRAPHY.Body,
      color: C.subtext,
      textAlign: 'center',
      maxWidth: 280,
    },
    retryBtn: {
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.smMd,
      borderRadius: RADIUS.full,
      borderWidth: 1.5,
      borderColor: accent,
    },
    retryBtnText: {
      ...TYPOGRAPHY.SmallBold,
      color: accent,
    },

    /* Cards */
    cardsWrap: {
      gap: SPACING.md,
    },
    card: {
      padding: SPACING.lgXl,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148,163,184,0.12)' : C.border,
      backgroundColor: isDark ? 'rgba(30,41,59,0.55)' : C.surface,
      gap: SPACING.smMd,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.smMd,
    },
    cardIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: {
      ...TYPOGRAPHY.BodyBold,
      letterSpacing: 0.2,
    },
    cardHeadline: {
      ...TYPOGRAPHY.BodyLarge,
      color: C.text,
      lineHeight: 24,
    },
    cardSubtext: {
      ...TYPOGRAPHY.Body,
      color: C.subtext,
      lineHeight: 20,
    },
    tipRow: {
      flexDirection: 'row',
      gap: SPACING.sm,
      borderLeftWidth: 2,
      paddingLeft: SPACING.smMd,
      paddingVertical: SPACING.xs,
      marginTop: SPACING.xs,
    },
    tipText: {
      ...TYPOGRAPHY.Caption,
      color: C.subtext,
      lineHeight: 18,
      fontStyle: 'italic',
      flex: 1,
    },
  });
}
