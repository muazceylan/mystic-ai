import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import OnboardingBackground from '../../components/OnboardingBackground';
import ServiceStatus from '../../components/ServiceStatus';
import CollectivePulseWidget from '../../components/CollectivePulseWidget';
import {
  TransitCard,
  WisdomCard,
  SwotSection,
  ServiceSlider,
  SERVICE_SLIDE_IDS,
} from '../../components/Home';
import {
  normalizeFocus,
  normalizeAiCopy,
  toSingleSentence,
  dedupeLines,
  buildCuriousSecret,
  buildTransitDigest,
  getDailyVibeFallback,
  getMoonPhaseIcon,
} from '../../components/Home/homeUtils';
import { useAuthStore } from '../../store/useAuthStore';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import {
  useDailySecret,
  useSkyPulse,
  useWeeklySwot,
  useNatalChart,
} from '../../hooks/useHomeQueries';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING } from '../../constants/tokens';
import { ErrorStateCard, SafeScreen } from '../../components/ui';
import { announceForAccessibility } from '../../utils/accessibility';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
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
    [user, onboardingMaritalStatus, onboardingFocusPoints]
  );

  const dailySecretQuery = useDailySecret(dailySecretParams);
  const skyPulseQuery = useSkyPulse();
  const weeklySwotQuery = useWeeklySwot(user?.id);
  const natalChartQuery = useNatalChart(user?.id);

  const dailySecret = dailySecretQuery.data ?? null;
  const secretLoading = dailySecretQuery.isLoading;
  const secretError = dailySecretQuery.isError;
  const skyPulse = skyPulseQuery.data ?? null;
  const skyPulseLoading = skyPulseQuery.isLoading;
  const skyPulseError = skyPulseQuery.isError;
  const weeklySwot = weeklySwotQuery.data ?? null;
  const weeklyLoading = weeklySwotQuery.isLoading;
  const weeklyError = weeklySwotQuery.isError;
  const natalChart = natalChartQuery.data ?? null;

  const loadDailySecret = useCallback(() => dailySecretQuery.refetch(), [dailySecretQuery.refetch]);
  const loadSkyPulse = useCallback(() => skyPulseQuery.refetch(), [skyPulseQuery.refetch]);
  const loadWeeklySwot = useCallback(() => weeklySwotQuery.refetch(), [weeklySwotQuery.refetch]);
  const loadNatalChart = useCallback(() => natalChartQuery.refetch(), [natalChartQuery.refetch]);

  const SERVICE_SLIDES = useMemo(() => SERVICE_SLIDE_IDS.map((s) => ({ ...s, title: t(s.key) })), [t]);

  const [expandedSwotId, setExpandedSwotId] = useState<string | null>(null);
  const [transitExpanded, setTransitExpanded] = useState(false);
  const [wisdomExpanded, setWisdomExpanded] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const swotYRef = useRef(0);

  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const moonGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(moonGlow, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(moonGlow, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [moonGlow]);

  useEffect(() => {
    if (dailySecretQuery.isSuccess && dailySecretQuery.data) {
      announceForAccessibility(t('accessibility.contentLoaded'));
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [dailySecretQuery.isSuccess, dailySecretQuery.data, fadeAnim, t]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      dailySecretQuery.refetch(),
      skyPulseQuery.refetch(),
      weeklySwotQuery.refetch(),
      natalChartQuery.refetch(),
    ]);
    setRefreshing(false);
  }, [
    dailySecretQuery.refetch,
    skyPulseQuery.refetch,
    weeklySwotQuery.refetch,
    natalChartQuery.refetch,
  ]);

  const firstName = user?.firstName || '';
  const lastName = user?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim() || user?.name || 'Misafir';
  const name = firstName || fullName;
  const daySeed = new Date().getDay() + new Date().getDate();
  const selectedFocus = user?.focusPoint?.split(',')[0] ?? onboardingFocusPoints[0] ?? '';
  const focusKey = normalizeFocus(selectedFocus);
  const activeMaritalStatus = user?.maritalStatus || onboardingMaritalStatus || '';

  const aiInsightLines = useMemo(() => {
    return dedupeLines(
      [
        normalizeAiCopy(dailySecret?.message),
        normalizeAiCopy(dailySecret?.astrologyInsight),
        normalizeAiCopy(dailySecret?.dreamInsight),
        normalizeAiCopy(dailySecret?.numerologyInsight),
        normalizeAiCopy(dailySecret?.secret),
      ].filter(Boolean)
    );
  }, [
    dailySecret?.astrologyInsight,
    dailySecret?.dreamInsight,
    dailySecret?.message,
    dailySecret?.numerologyInsight,
    dailySecret?.secret,
  ]);

  const secretText = useMemo(() => {
    if (secretError) {
      return toSingleSentence(
        buildCuriousSecret(name, daySeed, focusKey, activeMaritalStatus, t, null),
        t('home.secretFallbackWithName', { name }),
        110
      );
    }
    return toSingleSentence(
      dailySecret?.secret || dailySecret?.message || '',
      buildCuriousSecret(name, daySeed, focusKey, activeMaritalStatus, t, dailySecret?.secret ?? null),
      110
    );
  }, [activeMaritalStatus, dailySecret?.message, dailySecret?.secret, daySeed, focusKey, name, secretError, t]);

  const dailyVibeText = useMemo(() => {
    if (dailySecret?.dailyVibe) return dailySecret.dailyVibe;
    return getDailyVibeFallback(daySeed, focusKey, activeMaritalStatus, t);
  }, [activeMaritalStatus, dailySecret?.dailyVibe, daySeed, focusKey, t]);

  const transitDigest = useMemo(
    () =>
      buildTransitDigest(
        skyPulse,
        natalChart,
        focusKey,
        aiInsightLines,
        dailyVibeText,
        t
      ),
    [aiInsightLines, dailyVibeText, focusKey, natalChart, skyPulse, t]
  );

  const S = makeStyles(colors);

  const scrollToSwot = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: swotYRef.current, animated: true });
  }, []);

  return (
    <SafeScreen edges={['top', 'left', 'right']}>
      <View style={S.container}>
        <OnboardingBackground />

        <ScrollView
        ref={scrollViewRef}
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
        <View style={S.headerRow}>
          <TouchableOpacity
            style={S.profileBlock}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.7}
            accessibilityLabel={t('home.profileBlock')}
            accessibilityRole="button"
          >
            <View style={S.avatar}>
              <Ionicons name="person" size={16} color={colors.subtext} />
            </View>
          </TouchableOpacity>
          <View style={S.headerIcons}>
            <TouchableOpacity
              style={S.iconButton}
              onPress={() => router.push('/premium')}
              accessibilityLabel={t('home.features')}
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="sparkles" size={18} color={colors.subtext} />
            </TouchableOpacity>
            <TouchableOpacity
              style={S.iconButton}
              onPress={() => router.push('/notifications-settings')}
              accessibilityLabel={t('home.notifications')}
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="notifications" size={18} color={colors.subtext} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={S.greetingText}>{t('home.greetingFull', { name: fullName })}</Text>

        <TransitCard
          transitDigest={transitDigest}
          dailyVibeText={dailyVibeText}
          expanded={transitExpanded}
          onToggleExpand={() => setTransitExpanded((e) => !e)}
        />

        <ServiceSlider slides={SERVICE_SLIDES} onScrollToSwot={scrollToSwot} />

        <WisdomCard
          secretText={secretText}
          loading={secretLoading}
          error={secretError}
          onRetry={loadDailySecret}
          expanded={wisdomExpanded}
          onToggleExpand={() => setWisdomExpanded((e) => !e)}
          fadeAnim={fadeAnim}
        />

        {skyPulseLoading ? (
          <View style={[S.skyPulseCard, S.skyPulseCenter]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={S.skyPulseLoadingText}>{t('home.skyPulseLoading')}</Text>
          </View>
        ) : skyPulseError || !skyPulse ? (
          <View style={[S.skyPulseCard, S.skyPulseCenter]}>
            <ErrorStateCard
              message={t('home.skyPulseError')}
              onRetry={loadSkyPulse}
              variant="compact"
              accessibilityLabel={t('home.skyPulseRetry')}
            />
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/calendar')}
            style={S.skyPulseCard}
            accessibilityLabel="Takvim ve ay fazı detayları"
            accessibilityRole="button"
            accessibilityHint={t('accessibility.doubleTapToActivate')}
          >
            <View style={S.skyPulseLeft}>
              <Animated.Text
                style={[
                  S.skyPulseMoonIcon,
                  {
                    opacity: moonGlow.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }),
                    transform: [{ scale: moonGlow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
                  },
                ]}
              >
                {getMoonPhaseIcon(skyPulse.moonPhase)}
              </Animated.Text>
            </View>
            <View style={S.skyPulseRight}>
              <Text style={S.skyPulseSign}>
                {skyPulse.moonSignSymbol} {skyPulse.moonSignTurkish}
              </Text>
              <Text style={S.skyPulsePhase}>{skyPulse.moonPhase}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} style={{ opacity: 0.6 }} />
          </TouchableOpacity>
        )}

        {/* Collective Dream Pulse Widget */}
        <CollectivePulseWidget onPress={() => router.push('/(tabs)/dreams')} />

        <ServiceStatus />

        <SwotSection
          weeklySwot={weeklySwot}
          loading={weeklyLoading}
          error={weeklyError}
          onRetry={loadWeeklySwot}
          expandedId={expandedSwotId}
          onToggleExpand={setExpandedSwotId}
          onLayout={(y) => { swotYRef.current = y; }}
        />
      </ScrollView>
    </View>
    </SafeScreen>
  );
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: SPACING.xl - 2,
    paddingBottom: SPACING.xxl,
  },
  headerRow: {
    paddingHorizontal: SPACING.lgXl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  profileBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.smMd,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: SPACING.lg,
    backgroundColor: C.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: SPACING.smMd,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingText: {
    marginHorizontal: SPACING.lgXl,
    marginBottom: SPACING.xsSm,
    ...TYPOGRAPHY.SmallBold,
    color: C.text,
  },
  skyPulseCard: {
    marginHorizontal: SPACING.lgXl,
    marginTop: SPACING.smMd,
    marginBottom: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.mdLg,
    borderRadius: SPACING.lg,
    backgroundColor: C.surfaceGlass,
    borderWidth: 1,
    borderColor: C.surfaceGlassBorder,
    gap: SPACING.md,
  },
  skyPulseLeft: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skyPulseMoonIcon: {
    ...TYPOGRAPHY.Display,
  },
  skyPulseRight: {
    flex: 1,
    gap: SPACING.xs,
  },
  skyPulseSign: {
    ...TYPOGRAPHY.SmallAlt,
    color: C.text,
  },
  skyPulsePhase: {
    ...TYPOGRAPHY.CaptionSmall,
    color: C.subtext,
    fontStyle: 'italic',
  },
  skyPulseCenter: {
    justifyContent: 'center',
  },
  skyPulseLoadingText: {
    ...TYPOGRAPHY.Caption,
    color: C.subtext,
    fontStyle: 'italic',
  },
});
}
