import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, RefreshControl, Pressable, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import OnboardingBackground from '../../components/OnboardingBackground';
import ServiceStatus from '../../components/ServiceStatus';
import {
  TransitCard,
  WisdomCard,
  SwotSection,
  ServiceSlider,
  CosmicSnapshotHero,
  QuickActionsRow,
  CollectiveTicker,
  DailyGuideWidget,
  SERVICE_SLIDE_IDS,
} from '../../components/Home';
import {
  normalizeFocus,
  buildCuriousSecret,
  getDailyVibeFallback,
} from '../../components/Home/homeUtils';
import { useAuthStore } from '../../store/useAuthStore';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import {
  useHomeBrief,
  useSkyPulse,
  useCosmicSummary,
} from '../../hooks/useHomeQueries';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING } from '../../constants/tokens';
import { SafeScreen } from '../../components/ui';
import { announceForAccessibility } from '../../utils/accessibility';

const STICKY_APPEAR_START = 80;
const STICKY_APPEAR_END = 130;

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const onboardingMaritalStatus = useOnboardingStore((s) => s.maritalStatus);
  const onboardingFocusPoints = useOnboardingStore((s) => s.focusPoints);
  const router = useRouter();

  const dailySecretParams = useMemo(
    () =>
      user
        ? {
            name: user.name ?? (`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined),
            birthDate: user.birthDate ?? undefined,
            maritalStatus: user.maritalStatus ?? onboardingMaritalStatus ?? undefined,
            focusPoint: user.focusPoint?.split(',')[0] ?? onboardingFocusPoints[0] ?? undefined,
          }
        : null,
    [user, onboardingMaritalStatus, onboardingFocusPoints],
  );

  const homeBriefQuery = useHomeBrief(dailySecretParams);
  const skyPulseQuery = useSkyPulse();
  const dailyLifeGuideQuery = useCosmicSummary(
    user?.id
      ? {
          userId: user.id,
          locale: user.preferredLanguage ?? i18n.language,
          userGender: user.gender,
          maritalStatus: user.maritalStatus,
        }
      : null,
  );

  const homeBrief = homeBriefQuery.data ?? null;
  const secretLoading = homeBriefQuery.isLoading;
  const secretError = homeBriefQuery.isError;
  const skyPulse = skyPulseQuery.data ?? null;
  const skyPulseLoading = skyPulseQuery.isLoading;
  const weeklyLoading = homeBriefQuery.isLoading;
  const weeklyError = homeBriefQuery.isError;

  const refetchHomeBrief = useCallback(() => homeBriefQuery.refetch(), [homeBriefQuery.refetch]);
  const refetchDailyGuide = useCallback(() => dailyLifeGuideQuery.refetch(), [dailyLifeGuideQuery.refetch]);

  const SERVICE_SLIDES = useMemo(
    () => SERVICE_SLIDE_IDS.map((s) => ({ ...s, title: t(s.key) })),
    [t],
  );

  const [expandedSwotId, setExpandedSwotId] = useState<string | null>(null);
  const [wisdomExpanded, setWisdomExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const swotYRef = useRef(0);
  const scrollRef = useRef<Animated.ScrollView>(null);

  // Scroll-driven sticky header
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      scrollY.value = event.contentOffset.y;
    },
  });
  const stickyHeaderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [STICKY_APPEAR_START, STICKY_APPEAR_END], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [STICKY_APPEAR_START, STICKY_APPEAR_END],
          [-14, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // Track whether daily secret has loaded (for WisdomCard fade)
  const [secretLoaded, setSecretLoaded] = useState(false);
  useEffect(() => {
    if (homeBriefQuery.isSuccess && homeBriefQuery.data?.secret) {
      announceForAccessibility(t('accessibility.contentLoaded'));
      setSecretLoaded(true);
    }
  }, [homeBriefQuery.isSuccess, homeBriefQuery.data, t]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Gökyüzü verisi saatlik değişir — her zaman yenile.
    await skyPulseQuery.refetch();
    if (homeBriefQuery.isStale) await homeBriefQuery.refetch();
    setRefreshing(false);
  }, [
    skyPulseQuery,
    homeBriefQuery,
  ]);

  const firstName = user?.firstName || '';
  const lastName = user?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim() || user?.name || 'Misafir';
  const name = firstName || fullName;
  const daySeed = new Date().getDay() + new Date().getDate();
  const selectedFocus = user?.focusPoint?.split(',')[0] ?? onboardingFocusPoints[0] ?? '';
  const focusKey = normalizeFocus(selectedFocus);
  const activeMaritalStatus = user?.maritalStatus || onboardingMaritalStatus || '';

  const secretText = useMemo(() => {
    if (secretError) {
      return buildCuriousSecret(name, daySeed, focusKey, activeMaritalStatus, t, null);
    }
    return homeBrief?.secret || buildCuriousSecret(name, daySeed, focusKey, activeMaritalStatus, t, null);
  }, [activeMaritalStatus, daySeed, focusKey, homeBrief?.secret, name, secretError, t]);

  const dailyVibeText = useMemo(() => {
    if (homeBrief?.dailyEnergy) return homeBrief.dailyEnergy;
    return getDailyVibeFallback(daySeed, focusKey, activeMaritalStatus, t);
  }, [activeMaritalStatus, daySeed, focusKey, homeBrief?.dailyEnergy, t]);

  const transitDigest = useMemo(() => {
    const impact = homeBrief?.meta?.impactScore ?? 60;
    const energyType: 'lucky' | 'mixed' | 'caution' = impact >= 72 ? 'lucky' : impact <= 42 ? 'caution' : 'mixed';
    const points = homeBrief?.transitPoints ?? [];
    const prioritized = [
      homeBrief?.actionMessage?.trim(),
      ...points,
    ].filter((line): line is string => !!line && line.length > 0);
    return {
      title: homeBrief?.transitHeadline ?? dailyVibeText,
      energyType,
      energyLabel: homeBrief?.transitSummary ?? dailyVibeText,
      actionItems: prioritized.slice(0, 2),
      cautionItems: prioritized.slice(2, 3),
    };
  }, [
    dailyVibeText,
    homeBrief?.actionMessage,
    homeBrief?.meta?.impactScore,
    homeBrief?.transitHeadline,
    homeBrief?.transitPoints,
    homeBrief?.transitSummary,
  ]);

  const weeklySwot = useMemo(() => {
    if (!homeBrief?.weeklyCards?.length) return null;
    const find = (key: string) => homeBrief.weeklyCards.find((c: { key: string }) => c.key === key);
    const toPoint = (key: string) => {
      const card = find(key);
      return {
        category: key.toUpperCase(),
        headline: card?.headline ?? 'Bu alan bu hafta aktif.',
        subtext: card?.subtext ?? 'Detaylari acmak icin karta dokun.',
        intensity: 70,
        quickTip: card?.quickTip ?? 'Ritmini koru ve odagini dagitma.',
      };
    };
    return {
      strength: toPoint('strength'),
      weakness: toPoint('weakness'),
      opportunity: toPoint('opportunity'),
      threat: toPoint('threat'),
      flashInsight: {
        type: 'FORTUNE' as const,
        headline: homeBrief.transitHeadline ?? 'Haftalik akista destekleyici bir dalga var.',
        detail: homeBrief.transitSummary ?? dailyVibeText,
      },
      weekStart: new Date().toISOString(),
      weekEnd: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }, [dailyVibeText, homeBrief]);

  // ☀️Aslan · 🌙Balık · ⬆️Terazi
  const zodiacLine = useMemo(() => {
    const parts: string[] = [];
    if (user?.zodiacSign) parts.push(`☀️${user.zodiacSign}`);
    if (skyPulse?.moonSignTurkish) parts.push(`🌙${skyPulse.moonSignTurkish}`);
    return parts.join(' · ');
  }, [user?.zodiacSign, skyPulse?.moonSignTurkish]);

  const scrollToSwot = useCallback(() => {
    (scrollRef.current as any)?.scrollTo({ y: swotYRef.current, animated: true });
  }, []);

  const S = makeStyles(colors, isDark);

  return (
    <SafeScreen edges={['top', 'left', 'right']}>
      <View style={S.container}>
        <OnboardingBackground />

        {/* ── Sticky compact header — floats over content on scroll ── */}
        <Animated.View style={[S.stickyHeader, stickyHeaderStyle]} pointerEvents="none">
          <LinearGradient
            colors={
              isDark
                ? ['rgba(12,8,34,0.97)', 'rgba(8,14,38,0.97)']
                : ['rgba(250,248,255,0.97)', 'rgba(242,246,255,0.97)']
            }
            style={S.stickyGradient}
          >
            <Text style={[S.stickyName, { color: colors.text }]} numberOfLines={1}>
              ✨ {name}
            </Text>
            {zodiacLine ? (
              <Text style={[S.stickyZodiac, { color: colors.subtext }]} numberOfLines={1}>
                {zodiacLine}
              </Text>
            ) : null}
          </LinearGradient>
        </Animated.View>

        {/* ── Main scrollable content ── */}
        <Animated.ScrollView
          ref={scrollRef}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          style={S.scroll}
          contentContainerStyle={S.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >

          {/* ═══════════════════════════════════════════
              § 1. HEADER — Personal greeting + zodiac
          ═══════════════════════════════════════════ */}
          <Animated.View entering={FadeIn.duration(350)} style={S.headerRow}>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile')}
              activeOpacity={0.72}
              accessibilityLabel={t('home.profileBlock')}
              accessibilityRole="button"
            >
              <View style={[S.avatar, { backgroundColor: colors.surfaceMuted, borderColor: colors.surfaceGlassBorder }]}>
                <Ionicons name="person" size={15} color={colors.subtext} />
              </View>
            </TouchableOpacity>

            <View style={S.greetingBlock}>
              <Text style={[S.greetingName, { color: colors.text }]} numberOfLines={2}>
                {homeBrief?.greeting ?? `Merhaba ${name}, bugün haritanda neler var bakalım.`}
              </Text>
              {zodiacLine ? (
                <Text style={[S.greetingZodiac, { color: colors.subtext }]} numberOfLines={1}>
                  {zodiacLine}
                </Text>
              ) : null}
            </View>

            <View style={S.headerIcons}>
              <Pressable
                onPress={() => router.push('/premium')}
                style={[S.iconBtn, { backgroundColor: colors.surfaceMuted }]}
                accessibilityLabel={t('home.features')}
                accessibilityRole="button"
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              >
                <Ionicons name="sparkles" size={16} color={colors.primary} />
              </Pressable>
              <Pressable
                onPress={() => router.push('/notifications-settings')}
                style={[S.iconBtn, { backgroundColor: colors.surfaceMuted }]}
                accessibilityLabel={t('home.notifications')}
                accessibilityRole="button"
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              >
                <Ionicons name="notifications-outline" size={16} color={colors.subtext} />
              </Pressable>
            </View>
          </Animated.View>

          {/* ═══════════════════════════════════════════
              § 2. HERO — Cosmic Snapshot (LOW text density)
          ═══════════════════════════════════════════ */}
          <CosmicSnapshotHero
            moonPhase={skyPulse?.moonPhase ?? ''}
            moonSignSymbol={skyPulse?.moonSignSymbol ?? ''}
            moonSignTurkish={skyPulse?.moonSignTurkish ?? ''}
            loading={skyPulseLoading}
            dailyVibeText={dailyVibeText}
            onPress={() => router.push('/(tabs)/calendar')}
          />

          <DailyGuideWidget
            data={dailyLifeGuideQuery.data?.dailyGuide ?? null}
            focusCards={dailyLifeGuideQuery.data?.focusCards ?? null}
            loading={dailyLifeGuideQuery.isLoading}
            error={dailyLifeGuideQuery.isError}
            onRetry={refetchDailyGuide}
            onOpenPlanner={() => router.push('/(tabs)/calendar')}
          />

          {/* ═══════════════════════════════════════════
              § 3. QUICK ACTIONS (MEDIUM density)
          ═══════════════════════════════════════════ */}
          <QuickActionsRow />

          {/* ═══════════════════════════════════════════
              § 4. COLLECTIVE DREAM TICKER (MEDIUM density)
          ═══════════════════════════════════════════ */}
          <CollectiveTicker onPress={() => router.push('/(tabs)/dreams')} />

          {/* ═══════════════════════════════════════════
              ▼ DENSE SECTION — lives below the fold ▼
          ═══════════════════════════════════════════ */}

          {/* § 6. GÜNÜN SIRRI */}
          <WisdomCard
            secretText={secretText}
            loading={secretLoading}
            error={secretError}
            onRetry={refetchHomeBrief}
            expanded={wisdomExpanded}
            onToggleExpand={() => setWisdomExpanded((e) => !e)}
            loaded={secretLoaded}
          />

          {/* § 7. TRANSIT CAROUSEL */}
          <TransitCard
            transitDigest={transitDigest}
          />

          {/* ═══════════════════════════════════════════
              § 5. SERVICE DISCOVERY STRIP
          ═══════════════════════════════════════════ */}
          <Animated.View entering={FadeInDown.delay(360).duration(480)}>
            <ServiceSlider slides={SERVICE_SLIDES} onScrollToSwot={scrollToSwot} />
          </Animated.View>

          {/* § 8. SWOT ACCORDION */}
          <SwotSection
            weeklySwot={weeklySwot}
            loading={weeklyLoading}
            error={weeklyError}
            onRetry={refetchHomeBrief}
            expandedId={expandedSwotId}
            onToggleExpand={setExpandedSwotId}
            onLayout={(y) => { swotYRef.current = y; }}
          />

          <ServiceStatus />

        </Animated.ScrollView>
      </View>
    </SafeScreen>
  );
}

function makeStyles(C: ReturnType<typeof useTheme>['colors'], isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: SPACING.sm,
      paddingBottom: SPACING.xxl + SPACING.lg,
    },

    // Sticky header
    stickyHeader: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
    },
    stickyGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.smMd,
      paddingHorizontal: SPACING.lgXl,
      paddingVertical: SPACING.smMd,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(139,92,246,0.12)' : 'rgba(99,102,241,0.08)',
    },
    stickyName: {
      ...TYPOGRAPHY.SmallBold,
    },
    stickyZodiac: {
      ...TYPOGRAPHY.CaptionXS,
      letterSpacing: 0.3,
    },

    // Full header row
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lgXl,
      paddingTop: SPACING.smMd,
      paddingBottom: SPACING.xsSm,
      gap: SPACING.smMd,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    greetingBlock: {
      flex: 1,
      gap: 2,
    },
    greetingName: {
      ...TYPOGRAPHY.SmallBold,
      lineHeight: 20,
    },
    greetingZodiac: {
      ...TYPOGRAPHY.CaptionXS,
      letterSpacing: 0.4,
    },
    headerIcons: {
      flexDirection: 'row',
      gap: SPACING.xsSm,
    },
    iconBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
