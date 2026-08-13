import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader, SafeScreen, Skeleton } from '../../components/ui';
import {
  ActionCard,
  CautionCard,
  EveningReflectionCard,
  LifeAreaCardView,
  MainThemeCard,
  MiniPlanCard,
  PlanFeedbackSection,
  PrimaryActionCard,
  SectionCard,
  TimelineSection,
} from '../../components/daily';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants/tokens';
import { queryKeys } from '../../lib/queryKeys';
import { getDailyActions, getTodayIsoDate, markActionDone, sendFeedback } from '../../services/daily.service';
import type {
  DailyActionsDTO,
  DailyFeedbackPayload,
  PlanFeedbackReason,
} from '../../types/daily.types';
import { trackEvent } from '../../services/analytics';
import { useSmartBackNavigation } from '../../hooks/useSmartBackNavigation';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { resolveUserScopeKey } from '../../store/userScopedPersist';

const SIX_HOURS = 1000 * 60 * 60 * 6;
const ONE_DAY = 1000 * 60 * 60 * 24;

function formatDateLabel(dateIso: string, locale: string) {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return dateIso;
  return date.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' });
}

/**
 * Applies a completion toggle across every place an item can appear: the legacy `actions`
 * list plus the premium primary action and life-area cards.
 */
function patchPlanDoneState(
  current: DailyActionsDTO | undefined,
  actionId: string,
  isDone: boolean,
  doneAt?: string | null,
): DailyActionsDTO | undefined {
  if (!current) return current;
  const patch = <T extends { id: string; isDone: boolean; doneAt?: string | null }>(item: T): T =>
    item.id === actionId ? { ...item, isDone, doneAt: isDone ? doneAt : undefined } : item;

  return {
    ...current,
    actions: current.actions.map(patch),
    primaryAction: current.primaryAction ? patch(current.primaryAction) : undefined,
    lifeAreaCards: current.lifeAreaCards?.map(patch),
  };
}

function LoadingState() {
  return (
    <View style={styles.loadingWrap}>
      <Skeleton height={92} borderRadius={RADIUS.lg} />
      <Skeleton height={148} borderRadius={RADIUS.lg} />
      <Skeleton height={148} borderRadius={RADIUS.lg} />
      <Skeleton height={148} borderRadius={RADIUS.lg} />
      <Skeleton height={140} borderRadius={RADIUS.lg} />
    </View>
  );
}

export default function TodayActionsScreen() {
  const { t, i18n } = useTranslation();
  const resolvedLocale = useMemo<'tr' | 'en'>(
    () => ((i18n.resolvedLanguage ?? i18n.language).toLowerCase().startsWith('en') ? 'en' : 'tr'),
    [i18n.language, i18n.resolvedLanguage],
  );
  const { colors, isDark } = useTheme();
  const goBack = useSmartBackNavigation({ fallbackRoute: '/(tabs)/home' });
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userScopeKey = resolveUserScopeKey(user);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [planFeedback, setPlanFeedback] = useState<PlanFeedbackReason | null>(null);
  const [planFeedbackSubmitting, setPlanFeedbackSubmitting] = useState(false);
  const date = useMemo(() => getTodayIsoDate(), []);
  const queryKey = queryKeys.dailyActions(date, resolvedLocale, userScopeKey);
  const errorEventSentRef = useRef<string | null>(null);
  const loadEventSentRef = useRef<string | null>(null);
  const reflectionEventSentRef = useRef<string | null>(null);

  const dailyActionsQuery = useQuery({
    queryKey,
    queryFn: () => getDailyActions(date, resolvedLocale, userScopeKey),
    enabled: Boolean(user?.id),
    staleTime: SIX_HOURS,
    gcTime: ONE_DAY,
  });

  useEffect(() => {
    if (!dailyActionsQuery.isError) return;
    if (errorEventSentRef.current === `${date}:${resolvedLocale}`) return;
    errorEventSentRef.current = `${date}:${resolvedLocale}`;
    trackEvent('daily_actions_load', {
      date,
      surface: 'today_actions',
      destination: 'today_actions',
      result: 'fail',
      locale: resolvedLocale,
    });
  }, [dailyActionsQuery.isError, date, resolvedLocale]);

  useEffect(() => {
    if (!dailyActionsQuery.data) return;
    const eventKey = `${dailyActionsQuery.data.date}:${resolvedLocale}`;
    if (loadEventSentRef.current === eventKey) return;
    loadEventSentRef.current = eventKey;
    const hasPlanContent =
      Boolean(dailyActionsQuery.data.primaryAction) || dailyActionsQuery.data.actions.length > 0;
    trackEvent('daily_actions_load', {
      date: dailyActionsQuery.data.date,
      surface: 'today_actions',
      destination: 'today_actions',
      result: hasPlanContent ? 'success' : 'fail',
      reason: hasPlanContent ? undefined : 'empty_payload',
      locale: resolvedLocale,
    });
    trackEvent('personal_plan_viewed', {
      date: dailyActionsQuery.data.date,
      action_count: dailyActionsQuery.data.actions.length,
      personalization_level: dailyActionsQuery.data.personalizationLevel,
      profile_signal_count: dailyActionsQuery.data.profileSignalsUsed?.length ?? 0,
      primary_category: dailyActionsQuery.data.primaryAction?.category,
      timeline_slot_count: dailyActionsQuery.data.timeline?.length ?? 0,
      plan_source: dailyActionsQuery.data.meta?.source,
      plan_version: dailyActionsQuery.data.meta?.planVersion,
      source: 'today_actions',
      surface: 'today_actions',
      locale: resolvedLocale,
    });
  }, [dailyActionsQuery.data, resolvedLocale]);

  useEffect(() => {
    const plan = dailyActionsQuery.data;
    if (!plan?.eveningReflection?.question) return;
    const eventKey = `${plan.date}:${resolvedLocale}`;
    if (reflectionEventSentRef.current === eventKey) return;
    reflectionEventSentRef.current = eventKey;
    trackEvent('personal_plan_evening_reflection_viewed', {
      date: plan.date,
      source: 'today_actions',
      surface: 'today_actions',
      locale: resolvedLocale,
    });
  }, [dailyActionsQuery.data, resolvedLocale]);

  const toggleMutation = useMutation({
    mutationFn: async (input: { actionId: string; isDone: boolean }) => {
      setPendingActionId(input.actionId);
      return markActionDone(date, input.actionId, input.isDone, resolvedLocale, userScopeKey);
    },
    onMutate: async ({ actionId, isDone }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<DailyActionsDTO>(queryKey);

      queryClient.setQueryData<DailyActionsDTO>(queryKey, (current) =>
        patchPlanDoneState(current, actionId, isDone, isDone ? new Date().toISOString() : undefined));

      trackEvent('action_done_toggled', {
        date,
        action_id: actionId,
        is_done: isDone,
        optimistic: true,
        surface: 'today_actions',
        destination: 'today_actions',
        locale: resolvedLocale,
      });
      trackEvent('personal_plan_action_opened', {
        date,
        action_id: actionId,
        next_state: isDone ? 'completed' : 'open',
        source: 'today_actions',
        surface: 'today_actions',
        locale: resolvedLocale,
      });
      return { previous };
    },
    onError: (error: any, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      trackEvent('action_done_toggled', {
        date,
        action_id: variables.actionId,
        is_done: variables.isDone,
        optimistic: false,
        surface: 'today_actions',
        destination: 'today_actions',
        result: 'fail',
        locale: resolvedLocale,
      });
      Alert.alert(t('todayActions.actionFailedTitle'), error?.message ?? t('todayActions.actionFailedMsg'));
    },
    onSuccess: (response) => {
      queryClient.setQueryData<DailyActionsDTO>(queryKey, (current) =>
        patchPlanDoneState(current, response.actionId, response.isDone, response.doneAt));
      trackEvent('action_done_toggled', {
        date: response.date,
        action_id: response.actionId,
        is_done: response.isDone,
        optimistic: false,
        surface: 'today_actions',
        destination: 'today_actions',
        result: 'success',
        locale: resolvedLocale,
      });
      if (response.isDone) {
        trackEvent('personal_plan_action_completed', {
          date: response.date,
          action_id: response.actionId,
          source: 'today_actions',
          surface: 'today_actions',
          locale: resolvedLocale,
        });
        if (dailyActionsQuery.data?.primaryAction?.id === response.actionId) {
          trackEvent('personal_plan_primary_action_completed', {
            date: response.date,
            action_id: response.actionId,
            source: 'today_actions',
            surface: 'today_actions',
            locale: resolvedLocale,
          });
        }
      }
    },
    onSettled: () => {
      setPendingActionId(null);
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const sendActionFeedback = async (payload: DailyFeedbackPayload) => {
    trackEvent('personal_plan_feedback_opened', {
      date: payload.date,
      action_id: payload.itemId,
      source: 'today_actions',
      surface: 'today_actions',
      locale: resolvedLocale,
    });
    try {
      const response = await sendFeedback(payload, resolvedLocale);
      trackEvent('feedback_sent', {
        date: payload.date,
        item_type: payload.itemType,
        item_id: payload.itemId,
        sentiment: payload.sentiment,
        reason: payload.reason,
        surface: 'today_actions',
        destination: 'today_actions',
        result: 'success',
        locale: resolvedLocale,
      });
      trackEvent('personal_plan_feedback_sent', {
        date: payload.date,
        action_id: payload.itemId,
        sentiment: payload.sentiment,
        reason: payload.reason,
        source: 'today_actions',
        surface: 'today_actions',
        result: 'success',
        locale: resolvedLocale,
      });
      trackEvent('personal_plan_feedback_submitted', {
        date: payload.date,
        action_id: payload.itemId,
        reason: payload.reason,
        regenerated: response.regenerated,
        remaining_regenerations: response.remainingRegenerations,
        source: 'today_actions',
        surface: 'today_actions',
        result: 'success',
        locale: resolvedLocale,
      });
      return response;
    } catch {
      trackEvent('feedback_sent', {
        date: payload.date,
        item_type: payload.itemType,
        item_id: payload.itemId,
        sentiment: payload.sentiment,
        surface: 'today_actions',
        destination: 'today_actions',
        result: 'fail',
        locale: resolvedLocale,
      });
      trackEvent('personal_plan_feedback_sent', {
        date: payload.date,
        action_id: payload.itemId,
        sentiment: payload.sentiment,
        source: 'today_actions',
        surface: 'today_actions',
        result: 'fail',
        locale: resolvedLocale,
      });
      trackEvent('personal_plan_feedback_submitted', {
        date: payload.date,
        action_id: payload.itemId,
        reason: payload.reason,
        source: 'today_actions',
        surface: 'today_actions',
        result: 'fail',
        locale: resolvedLocale,
      });
      return null;
    }
  };

  /**
   * Plan-level rating. TOO_GENERIC / REPETITIVE ask the backend to rebuild today's plan, so we
   * refetch once the feedback lands — the user sees a different plan rather than an inert tap.
   */
  const onPlanFeedback = async (reason: PlanFeedbackReason) => {
    if (!data) return;
    setPlanFeedback(reason);
    setPlanFeedbackSubmitting(true);
    const regenerates = reason === 'TOO_GENERIC' || reason === 'REPETITIVE';

    try {
      const response = await sendActionFeedback({
        date: data.date,
        itemType: 'action',
        itemId: data.primaryAction?.id ?? 'personal-plan',
        sentiment: reason === 'HELPFUL' ? 'up' : 'down',
        reason,
      });
      trackEvent('personal_plan_rated', {
        date: data.date,
        reason,
        personalization_level: data.personalizationLevel,
        category: data.primaryAction?.category,
        plan_version: data.meta?.planVersion,
        can_regenerate: data.meta?.canRegenerate ?? false,
        source: 'today_actions',
        surface: 'today_actions',
        locale: resolvedLocale,
      });
      if (response?.regenerated && response.replacementPlan) {
        queryClient.setQueryData<DailyActionsDTO>(queryKey, response.replacementPlan);
        trackEvent('personal_plan_regenerated', {
          date: data.date,
          reason,
          generation_number: response.generationNumber ?? undefined,
          remaining_regenerations: response.remainingRegenerations,
          source: 'today_actions',
          surface: 'today_actions',
          locale: resolvedLocale,
        });
      } else if (regenerates && (data.meta?.canRegenerate ?? true)) {
        await queryClient.invalidateQueries({ queryKey });
      }
    } finally {
      setPlanFeedbackSubmitting(false);
    }
  };

  const onRetry = () => {
    trackEvent('daily_actions_retry_tapped', {
      date,
      surface: 'today_actions',
      destination: 'today_actions',
      locale: resolvedLocale,
    });
    trackEvent('personal_plan_retry_clicked', {
      date,
      source: 'today_actions',
      surface: 'today_actions',
      locale: resolvedLocale,
    });
    void dailyActionsQuery.refetch();
  };

  const data = dailyActionsQuery.data;
  // v2 payloads carry a composed plan; older backends only send `actions`.
  const isPremiumPlan = Boolean(data?.mainTheme || data?.primaryAction);
  const isEmpty = !!data && !isPremiumPlan && data.actions.length === 0;
  const trackWhyOpened = (section: string, category?: string) => {
    trackEvent('personal_plan_why_opened', {
      date: data?.date ?? date,
      section,
      category,
      source: 'today_actions',
      surface: 'today_actions',
      locale: resolvedLocale,
    });
  };

  return (
    <SafeScreen edges={['top', 'left', 'right']} style={{ backgroundColor: colors.bg }}>
      <AppHeader
        title={data?.header.title ?? t('todayActions.headerFallback')}
        subtitle={formatDateLabel(data?.date ?? date, i18n.language)}
        onBack={goBack}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {dailyActionsQuery.isLoading ? <LoadingState /> : null}

        {dailyActionsQuery.isError ? (
          <View style={[styles.statusCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF' }]}>
            <Text style={[styles.statusTitle, { color: colors.text }]}>{t('todayActions.errorTitle')}</Text>
            <Text style={[styles.statusBody, { color: colors.subtext }]}>
              {t('todayActions.errorBody')}
            </Text>
            <Pressable
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              onPress={onRetry}
              accessibilityRole="button"
              accessibilityLabel={t('todayActions.retry')}
              testID="personal-plan-retry"
            >
              <Text style={styles.retryText}>{t('todayActions.retry')}</Text>
            </Pressable>
          </View>
        ) : null}

        {isEmpty ? (
          <View style={[styles.statusCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF' }]}>
            <Text style={[styles.statusTitle, { color: colors.text }]}>{t('todayActions.emptyTitle')}</Text>
            <Text style={[styles.statusBody, { color: colors.subtext }]}>
              {t('todayActions.emptyBody')}
            </Text>
            <Pressable
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              onPress={onRetry}
              accessibilityRole="button"
              accessibilityLabel={t('todayActions.refresh')}
              testID="personal-plan-refresh"
            >
              <Text style={styles.retryText}>{t('todayActions.refresh')}</Text>
            </Pressable>
          </View>
        ) : null}

        {data && isPremiumPlan ? (
          <>
            {data.mainTheme ? (
              <MainThemeCard
                theme={data.mainTheme}
                level={data.personalizationLevel}
                onWhyOpened={() => trackWhyOpened('main_theme')}
              />
            ) : null}

            {data.personalizationLevel === 'LOW' && (user?.birthTimeUnknown || !user?.birthTime) ? (
              <Pressable
                onPress={() => {
                  trackEvent('personal_plan_profile_completion_opened', {
                    date: data.date,
                    source: 'today_actions',
                    surface: 'today_actions',
                    locale: resolvedLocale,
                  });
                  router.push('/(tabs)/profile');
                }}
                accessibilityRole="button"
                accessibilityLabel={t('personalPlan.profileIncompleteCta')}
                style={({ pressed }) => [
                  styles.profilePrompt,
                  { backgroundColor: isDark ? 'rgba(168,85,247,0.10)' : colors.primarySoftBg },
                  pressed && styles.profilePromptPressed,
                ]}
              >
                <Ionicons name="person-circle-outline" size={24} color={colors.primary} />
                <View style={styles.profilePromptCopy}>
                  <Text style={[styles.statusTitle, { color: colors.text }]}>
                    {t('personalPlan.profileIncompleteTitle')}
                  </Text>
                  <Text style={[styles.statusBody, { color: colors.subtext }]}>
                    {t('personalPlan.profileIncompleteBody')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.primary} />
              </Pressable>
            ) : null}

            {data.primaryAction ? (
              <PrimaryActionCard
                action={data.primaryAction}
                pending={pendingActionId === data.primaryAction.id}
                onToggle={(actionId, nextValue) => toggleMutation.mutate({ actionId, isDone: nextValue })}
                onWhyOpened={() => trackWhyOpened('primary_action', data.primaryAction?.category)}
              />
            ) : null}

            <TimelineSection slots={data.timeline ?? []} />

            {(data.lifeAreaCards ?? []).map((card) => (
              <LifeAreaCardView
                key={card.id}
                card={card}
                pending={pendingActionId === card.id}
                onToggle={(actionId, nextValue) => toggleMutation.mutate({ actionId, isDone: nextValue })}
                onOpened={() => {
                  trackEvent('personal_plan_life_area_opened', {
                    date: data.date,
                    category: card.category,
                    source: 'today_actions',
                    surface: 'today_actions',
                    locale: resolvedLocale,
                  });
                }}
                onWhyOpened={() => trackWhyOpened('life_area', card.category)}
              />
            ))}

            {data.caution ? (
              <CautionCard
                caution={data.caution}
                onWhyOpened={() => trackWhyOpened('caution')}
              />
            ) : null}

            {data.eveningReflection ? (
              <EveningReflectionCard question={data.eveningReflection.question} />
            ) : null}

            <PlanFeedbackSection
              selected={planFeedback}
              submitting={planFeedbackSubmitting}
              onSelect={onPlanFeedback}
            />
          </>
        ) : null}

        {data && !isPremiumPlan && !isEmpty ? (
          <>
            <SectionCard title={data.header.title} icon="sparkles">
              <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>{data.header.subtitle}</Text>
            </SectionCard>

            <View style={styles.actionList}>
              {data.actions.map((action) => (
                <View key={action.id} style={styles.actionItemWrap}>
                  <ActionCard
                    action={action}
                    loading={pendingActionId === action.id}
                    onToggle={(actionId, nextValue) => toggleMutation.mutate({ actionId, isDone: nextValue })}
                  />
                  <View style={styles.feedbackRow}>
                    <Pressable
                      style={[styles.feedbackBtn, { borderColor: isDark ? 'rgba(255,255,255,0.18)' : '#E6DFFF' }]}
                      onPress={() => sendActionFeedback({ date: data.date, itemType: 'action', itemId: action.id, sentiment: 'up' })}
                      accessibilityRole="button"
                      accessibilityLabel={t('todayActions.feedbackHelpful')}
                      testID={`personal-plan-feedback-helpful-${action.id}`}
                    >
                      <Ionicons name="thumbs-up-outline" size={13} color={colors.primary} />
                      <Text style={[styles.feedbackText, { color: colors.primary }]}>{t('todayActions.feedbackHelpful')}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.feedbackBtn, { borderColor: isDark ? 'rgba(255,255,255,0.18)' : '#E6DFFF' }]}
                      onPress={() => sendActionFeedback({ date: data.date, itemType: 'action', itemId: action.id, sentiment: 'down' })}
                      accessibilityRole="button"
                      accessibilityLabel={t('todayActions.feedbackImprove')}
                      testID={`personal-plan-feedback-improve-${action.id}`}
                    >
                      <Ionicons name="thumbs-down-outline" size={13} color={colors.primary} />
                      <Text style={[styles.feedbackText, { color: colors.primary }]}>{t('todayActions.feedbackImprove')}</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>

            <MiniPlanCard miniPlan={data.miniPlan} />
          </>
        ) : null}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    ...TYPOGRAPHY.H2,
    fontSize: 22,
    lineHeight: 28,
  },
  headerDate: {
    ...TYPOGRAPHY.Small,
    fontSize: 15,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 120,
    gap: SPACING.md,
  },
  loadingWrap: {
    gap: SPACING.md,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.BodyMid,
    fontSize: 15,
    lineHeight: 22,
  },
  actionList: {
    gap: SPACING.md,
  },
  actionItemWrap: {
    gap: SPACING.xsSm,
  },
  feedbackRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xs,
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
  statusCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  statusTitle: {
    ...TYPOGRAPHY.BodyBold,
    fontSize: 19,
  },
  statusBody: {
    ...TYPOGRAPHY.BodyMid,
    fontSize: 15,
    lineHeight: 22,
  },
  profilePrompt: {
    minHeight: 88,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  profilePromptCopy: {
    flex: 1,
    gap: SPACING.xs,
  },
  profilePromptPressed: {
    opacity: 0.8,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.mdLg,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.xsSm,
  },
  retryText: {
    ...TYPOGRAPHY.SmallBold,
    color: '#FFF',
    fontSize: 14,
  },
});
