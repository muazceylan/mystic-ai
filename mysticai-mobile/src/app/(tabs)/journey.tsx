import React, { useEffect, useMemo, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AppHeader, SafeScreen, Skeleton } from '../../components/ui';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';
import { useSmartBackNavigation } from '../../hooks/useSmartBackNavigation';
import { queryKeys } from '../../lib/queryKeys';
import { navigateWithOrigin } from '../../navigation';
import { trackEvent } from '../../services/analytics';
import { getDailyActions, getTodayIsoDate } from '../../services/daily.service';
import { useAuthStore } from '../../store/useAuthStore';
import { useDreamStore } from '../../store/useDreamStore';
import { resolveUserScopeKey } from '../../store/userScopedPersist';
import { useJournalStore } from '../../spiritual/store/useJournalStore';
import { radius, shadowSubtle, spacing, typography } from '../../theme';

const SIX_HOURS = 1000 * 60 * 60 * 6;
const ONE_DAY = 1000 * 60 * 60 * 24;
const MAX_FONT_SCALE = 1.3;

type MetricProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
};

function Metric({ icon, label, value }: MetricProps) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>
        <Ionicons name={icon} size={19} color={colors.primary} />
      </View>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.metricValue}>{value}</Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function parseTimestamp(value?: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function JourneyScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const goBack = useSmartBackNavigation({ fallbackRoute: '/(tabs)/home' });
  const user = useAuthStore((state) => state.user);
  const userScopeKey = resolveUserScopeKey(user);
  const dreams = useDreamStore((state) => state.dreams);
  const dreamsLoading = useDreamStore((state) => state.loading);
  const dreamsError = useDreamStore((state) => state.error);
  const fetchDreams = useDreamStore((state) => state.fetchDreams);
  const entries = useJournalStore((state) => state.entries);
  const streakDays = useJournalStore((state) => state.getStreakDays());
  const viewedRef = useRef(false);
  const locale = useMemo<'tr' | 'en'>(
    () => ((i18n.resolvedLanguage ?? i18n.language).toLowerCase().startsWith('en') ? 'en' : 'tr'),
    [i18n.language, i18n.resolvedLanguage],
  );
  const date = useMemo(() => getTodayIsoDate(), []);

  const actionsQuery = useQuery({
    queryKey: queryKeys.dailyActions(date, locale, userScopeKey),
    queryFn: () => getDailyActions(date, locale, userScopeKey),
    enabled: Boolean(user?.id),
    staleTime: SIX_HOURS,
    gcTime: ONE_DAY,
  });

  useEffect(() => {
    if (!user?.id) return;
    void fetchDreams(user.id);
  }, [fetchDreams, user?.id]);

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    trackEvent('journey_summary_opened', {
      source: 'journey_screen',
      module: 'journey',
      locale,
    });
  }, [locale]);

  const completedDailyActions = actionsQuery.data?.actions.filter((action) => action.isDone).length ?? 0;
  const completedPracticeRecords = useMemo(
    () => entries.filter((entry) => entry.completed > 0).length,
    [entries],
  );
  const activeDays = useMemo(() => {
    const dates = new Set<string>();
    entries.forEach((entry) => {
      if (entry.completed > 0) dates.add(entry.dateISO);
    });
    dreams.forEach((dream) => {
      if (dream.dreamDate) dates.add(dream.dreamDate);
    });
    if (completedDailyActions > 0) dates.add(date);
    return dates.size;
  }, [completedDailyActions, date, dreams, entries]);
  const lastActivityAt = useMemo(() => {
    const timestamps: number[] = [];
    entries.forEach((entry) => {
      const parsed = parseTimestamp(entry.createdAt);
      if (parsed != null) timestamps.push(parsed);
    });
    dreams.forEach((dream) => {
      const parsed = parseTimestamp(dream.createdAt);
      if (parsed != null) timestamps.push(parsed);
    });
    actionsQuery.data?.actions.forEach((action) => {
      const parsed = parseTimestamp(action.doneAt);
      if (parsed != null) timestamps.push(parsed);
    });
    if (timestamps.length === 0) return null;
    return new Date(Math.max(...timestamps));
  }, [actionsQuery.data?.actions, dreams, entries]);
  const hasActivity = completedDailyActions > 0
    || completedPracticeRecords > 0
    || dreams.length > 0
    || activeDays > 0;
  const isLoading = actionsQuery.isLoading || dreamsLoading;

  const openRoute = (pathname: string, source: string) => {
    trackEvent('journey_module_opened', {
      source: 'journey',
      module: source,
      locale,
    });
    navigateWithOrigin({ pathname, from: '/(tabs)/journey' });
  };

  return (
    <SafeScreen edges={['top', 'left', 'right']} style={{ backgroundColor: colors.bg }}>
      <AppHeader
        title={t('journey.title')}
        subtitle={t('journey.subtitle')}
        onBack={goBack}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="trail-sign-outline" size={25} color={colors.primary} />
          </View>
          <View style={styles.heroCopy}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.heroTitle}>
              {t('journey.heroTitle')}
            </Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.heroBody}>
              {t('journey.heroBody')}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingGrid} testID="journey-loading">
            <Skeleton height={112} borderRadius={radius.card} />
            <Skeleton height={112} borderRadius={radius.card} />
            <Skeleton height={112} borderRadius={radius.card} />
            <Skeleton height={112} borderRadius={radius.card} />
          </View>
        ) : (
          <View style={styles.metricsGrid} testID={hasActivity ? 'journey-populated' : 'journey-empty'}>
            <Metric
              icon="checkmark-done-outline"
              label={t('journey.metrics.actionsToday')}
              value={String(completedDailyActions)}
            />
            <Metric
              icon="moon-outline"
              label={t('journey.metrics.dreams')}
              value={String(dreams.length)}
            />
            <Metric
              icon="leaf-outline"
              label={t('journey.metrics.practices')}
              value={String(completedPracticeRecords)}
            />
            <Metric
              icon="calendar-outline"
              label={t('journey.metrics.activeDays')}
              value={String(activeDays)}
            />
            <Metric
              icon="flame-outline"
              label={t('journey.metrics.streak')}
              value={String(streakDays)}
            />
          </View>
        )}

        {lastActivityAt ? (
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.lastActivity}>
            {t('journey.lastActivity', {
              date: lastActivityAt.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }),
            })}
          </Text>
        ) : null}

        {!isLoading && !hasActivity ? (
          <View style={styles.emptyCard}>
            <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.emptyTitle}>
              {t('journey.emptyTitle')}
            </Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.emptyBody}>
              {t('journey.emptyBody')}
            </Text>
          </View>
        ) : null}

        {dreamsError ? (
          <View style={styles.noticeCard}>
            <Ionicons name="cloud-offline-outline" size={18} color={colors.warning} />
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.noticeText}>
              {t('journey.partialData')}
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.sectionTitle}>
            {t('journey.nextStepTitle')}
          </Text>
          <Pressable
            onPress={() => openRoute('/(tabs)/today-actions', 'personal_plan')}
            accessibilityRole="button"
            accessibilityLabel={t('journey.actions.openPlan')}
            style={({ pressed }) => [styles.routeCard, pressed && styles.pressed]}
          >
            <View style={styles.routeIcon}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.routeCopy}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.routeTitle}>
                {t('journey.actions.openPlan')}
              </Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.routeSubtitle}>
                {t('journey.actions.openPlanSubtitle')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => openRoute('/(tabs)/dreams', 'dream_journal')}
            accessibilityRole="button"
            accessibilityLabel={t('journey.actions.openDreams')}
            style={({ pressed }) => [styles.routeCard, pressed && styles.pressed]}
          >
            <View style={styles.routeIcon}>
              <Ionicons name="moon-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.routeCopy}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.routeTitle}>
                {t('journey.actions.openDreams')}
              </Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.routeSubtitle}>
                {t('journey.actions.openDreamsSubtitle')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => openRoute('/(tabs)/spiritual', 'spiritual_practices')}
            accessibilityRole="button"
            accessibilityLabel={t('journey.actions.openPractices')}
            style={({ pressed }) => [styles.routeCard, pressed && styles.pressed]}
          >
            <View style={styles.routeIcon}>
              <Ionicons name="leaf-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.routeCopy}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.routeTitle}>
                {t('journey.actions.openPractices')}
              </Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.routeSubtitle}>
                {t('journey.actions.openPracticesSubtitle')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: spacing.screenPadding,
      paddingTop: spacing.sm,
      paddingBottom: 132,
      gap: spacing.md,
    },
    heroCard: {
      borderRadius: radius.hero,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      padding: spacing.lg,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      ...shadowSubtle,
    },
    heroIcon: {
      width: 48,
      height: 48,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(168,85,247,0.16)' : C.primarySoftBg,
      borderWidth: 1,
      borderColor: C.border,
    },
    heroCopy: {
      flex: 1,
      gap: spacing.xs,
    },
    heroTitle: {
      ...typography.H2,
      color: C.text,
      fontSize: 21,
      lineHeight: 27,
    },
    heroBody: {
      ...typography.Body,
      color: C.subtext,
      lineHeight: 21,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    loadingGrid: {
      gap: spacing.sm,
    },
    metricCard: {
      minHeight: 112,
      flexGrow: 1,
      flexBasis: '46%',
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      padding: spacing.md,
      gap: spacing.xs,
    },
    metricIcon: {
      width: 34,
      height: 34,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(168,85,247,0.14)' : C.primarySoftBg,
    },
    metricValue: {
      ...typography.H1,
      color: C.text,
      fontSize: 25,
      lineHeight: 29,
    },
    metricLabel: {
      ...typography.Caption,
      color: C.subtext,
      lineHeight: 17,
    },
    lastActivity: {
      ...typography.Caption,
      color: C.subtext,
      textAlign: 'center',
    },
    emptyCard: {
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      padding: spacing.lg,
      alignItems: 'center',
      gap: spacing.xs,
    },
    emptyTitle: {
      ...typography.H2,
      color: C.text,
      textAlign: 'center',
    },
    emptyBody: {
      ...typography.Body,
      color: C.subtext,
      textAlign: 'center',
    },
    noticeCard: {
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    noticeText: {
      ...typography.Caption,
      color: C.subtext,
      flex: 1,
    },
    section: {
      gap: spacing.sm,
    },
    sectionTitle: {
      ...typography.H2,
      color: C.text,
      marginBottom: spacing.xxs,
    },
    routeCard: {
      minHeight: 72,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    routeIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(168,85,247,0.14)' : C.primarySoftBg,
    },
    routeCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    routeTitle: {
      ...typography.Button,
      color: C.text,
      fontSize: 15,
      lineHeight: 20,
    },
    routeSubtitle: {
      ...typography.Caption,
      color: C.subtext,
      lineHeight: 17,
    },
    pressed: {
      opacity: 0.78,
    },
  });
}
