import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader, SafeScreen, Skeleton } from '../../components/ui';
import { ActionCard, MiniPlanCard, SectionCard } from '../../components/daily';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants/tokens';
import { queryKeys } from '../../lib/queryKeys';
import { getDailyActions, getTodayIsoDate, markActionDone, sendFeedback } from '../../services/daily.service';
import type { DailyActionsDTO, DailyFeedbackPayload } from '../../types/daily.types';
import { trackEvent } from '../../services/analytics';
import { useSmartBackNavigation } from '../../hooks/useSmartBackNavigation';
import { useTranslation } from 'react-i18next';

const SIX_HOURS = 1000 * 60 * 60 * 6;
const ONE_DAY = 1000 * 60 * 60 * 24;

function formatDateLabel(dateIso: string, locale: string) {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return dateIso;
  return date.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' });
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
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const date = useMemo(() => getTodayIsoDate(), []);
  const queryKey = queryKeys.dailyActions(date, resolvedLocale);
  const errorEventSentRef = useRef<string | null>(null);
  const loadEventSentRef = useRef<string | null>(null);

  const dailyActionsQuery = useQuery({
    queryKey,
    queryFn: () => getDailyActions(date, resolvedLocale),
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
    trackEvent('daily_actions_load', {
      date: dailyActionsQuery.data.date,
      surface: 'today_actions',
      destination: 'today_actions',
      result: dailyActionsQuery.data.actions.length > 0 ? 'success' : 'fail',
      reason: dailyActionsQuery.data.actions.length > 0 ? undefined : 'empty_payload',
      locale: resolvedLocale,
    });
  }, [dailyActionsQuery.data, resolvedLocale]);

  const toggleMutation = useMutation({
    mutationFn: async (input: { actionId: string; isDone: boolean }) => {
      setPendingActionId(input.actionId);
      return markActionDone(date, input.actionId, input.isDone, resolvedLocale);
    },
    onMutate: async ({ actionId, isDone }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<DailyActionsDTO>(queryKey);

      queryClient.setQueryData<DailyActionsDTO>(queryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          actions: current.actions.map((item) =>
            item.id === actionId
              ? {
                  ...item,
                  isDone,
                  doneAt: isDone ? new Date().toISOString() : undefined,
                }
              : item),
        };
      });

      trackEvent('action_done_toggled', {
        date,
        action_id: actionId,
        is_done: isDone,
        optimistic: true,
        surface: 'today_actions',
        destination: 'today_actions',
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
      queryClient.setQueryData<DailyActionsDTO>(queryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          actions: current.actions.map((item) =>
            item.id === response.actionId
              ? {
                  ...item,
                  isDone: response.isDone,
                  doneAt: response.doneAt,
                }
              : item),
        };
      });
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
    },
    onSettled: () => {
      setPendingActionId(null);
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const sendActionFeedback = async (payload: DailyFeedbackPayload) => {
    try {
      await sendFeedback(payload, resolvedLocale);
      trackEvent('feedback_sent', {
        date: payload.date,
        item_type: payload.itemType,
        item_id: payload.itemId,
        sentiment: payload.sentiment,
        surface: 'today_actions',
        destination: 'today_actions',
        result: 'success',
        locale: resolvedLocale,
      });
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
    }
  };

  const onRetry = () => {
    trackEvent('daily_actions_retry_tapped', {
      date,
      surface: 'today_actions',
      destination: 'today_actions',
      locale: resolvedLocale,
    });
    void dailyActionsQuery.refetch();
  };

  const data = dailyActionsQuery.data;
  const isEmpty = !!data && data.actions.length === 0;

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
            <Pressable style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={onRetry}>
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
            <Pressable style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={onRetry}>
              <Text style={styles.retryText}>{t('todayActions.refresh')}</Text>
            </Pressable>
          </View>
        ) : null}

        {data && !isEmpty ? (
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
                    >
                      <Ionicons name="thumbs-up-outline" size={13} color={colors.primary} />
                      <Text style={[styles.feedbackText, { color: colors.primary }]}>{t('todayActions.feedbackHelpful')}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.feedbackBtn, { borderColor: isDark ? 'rgba(255,255,255,0.18)' : '#E6DFFF' }]}
                      onPress={() => sendActionFeedback({ date: data.date, itemType: 'action', itemId: action.id, sentiment: 'down' })}
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
