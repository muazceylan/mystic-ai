import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '../ui';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';
import { radius, shadowSubtle, spacing, typography } from '../../theme';
import type {
  DailyActionsDTO,
  PersonalizationLevel,
  PlanHomeTeaser,
  PlanMainTheme,
  PlanPrimaryAction,
} from '../../types/daily.types';

type PersonalPlanAction = DailyActionsDTO['actions'][number];

interface PersonalPlanCardProps {
  dateLabel: string;
  actions: PersonalPlanAction[];
  theme?: string;
  /** v2 plan sections; when present the card leads with the day's theme and single key move. */
  mainTheme?: PlanMainTheme;
  homeTeaser?: PlanHomeTeaser;
  primaryAction?: PlanPrimaryAction;
  personalizationLevel?: PersonalizationLevel;
  isLoading?: boolean;
  isError?: boolean;
  pendingActionId?: string | null;
  journeyPreview?: React.ReactNode;
  onOpenPlan: () => void;
  onOpenPlanner: () => void;
  onRetry: () => void;
  onToggleAction: (actionId: string, nextValue: boolean) => void;
  onExpandedChange?: (expanded: boolean) => void;
  onWhyOpened?: () => void;
}

const MAX_FONT_SCALE = 1.3;

export function PersonalPlanCard({
  dateLabel,
  actions,
  theme,
  mainTheme,
  homeTeaser,
  primaryAction,
  personalizationLevel,
  isLoading = false,
  isError = false,
  pendingActionId,
  journeyPreview,
  onOpenPlan,
  onOpenPlanner,
  onRetry,
  onToggleAction,
  onExpandedChange,
  onWhyOpened,
}: PersonalPlanCardProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const completedCount = actions.filter((action) => action.isDone).length;
  const progress = actions.length > 0 ? completedCount / actions.length : 0;
  const visibleActions = actions.slice(0, 3);
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [isWhyExpanded, setIsWhyExpanded] = React.useState(false);
  const canCollapse = !isLoading && !isError && actions.length > 0;
  const showPlanBody = !canCollapse || isExpanded;

  const handleToggleExpanded = React.useCallback(() => {
    if (!canCollapse) return;
    const next = !isExpanded;
    setIsExpanded(next);
    onExpandedChange?.(next);
  }, [canCollapse, isExpanded, onExpandedChange]);

  return (
    <View
      style={styles.card}
      testID="home-personal-plan-card"
      accessibilityLabel={t('homePersonalPlan.accessibilityLabel')}
    >
      <Pressable
        onPress={handleToggleExpanded}
        disabled={!canCollapse}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canCollapse, expanded: showPlanBody }}
        accessibilityLabel={t(
          showPlanBody ? 'homePersonalPlan.collapse' : 'homePersonalPlan.expand',
        )}
        testID="home-personal-plan-toggle"
        style={({ pressed }) => [styles.headerRow, pressed && canCollapse && styles.pressed]}
      >
        <View style={styles.headerCopy}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.eyebrow}>
            {dateLabel}
          </Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>
            {t('homePersonalPlan.title')}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.iconShell}>
            <Ionicons name="checkmark-done-outline" size={22} color={colors.primary} />
          </View>
          {canCollapse ? (
            <View style={styles.toggleShell}>
              <Ionicons
                name={showPlanBody ? 'chevron-up' : 'chevron-down'}
                size={19}
                color={colors.primary}
              />
            </View>
          ) : null}
        </View>
      </Pressable>

      {showPlanBody ? (
        isLoading ? (
          <View style={styles.loadingWrap} testID="home-personal-plan-loading">
            <Skeleton height={20} borderRadius={radius.sm} />
            <Skeleton height={9} borderRadius={radius.pill} />
            <Skeleton height={58} borderRadius={radius.md} />
            <Skeleton height={58} borderRadius={radius.md} />
          </View>
        ) : isError ? (
          <View style={styles.statusWrap} testID="home-personal-plan-error">
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.statusTitle}>
              {t('homePersonalPlan.errorTitle')}
            </Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.statusBody}>
              {t('homePersonalPlan.errorBody')}
            </Text>
            <Pressable
              onPress={onRetry}
              accessibilityRole="button"
              accessibilityLabel={t('homePersonalPlan.retry')}
              style={({ pressed }) => [styles.inlineButton, pressed && styles.pressed]}
            >
              <Ionicons name="refresh-outline" size={16} color={colors.primary} />
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.inlineButtonText}>
                {t('homePersonalPlan.retry')}
              </Text>
            </Pressable>
          </View>
        ) : actions.length === 0 ? (
        <View style={styles.statusWrap} testID="home-personal-plan-empty">
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.statusTitle}>
            {t('homePersonalPlan.preparingTitle')}
          </Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.statusBody}>
            {t('homePersonalPlan.preparingBody')}
          </Text>
        </View>
      ) : mainTheme ? (
        // Premium plan: lead with the day's theme and the single most important move rather
        // than a list of interchangeable checkboxes.
        <>
          {personalizationLevel ? (
            <View style={styles.levelBadge}>
              <Ionicons name="sparkles" size={12} color={colors.primary} />
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.levelBadgeText}>
                {t(`personalPlan.personalization.${personalizationLevel}`)}
              </Text>
            </View>
          ) : null}

          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.planThemeTitle}>
            {homeTeaser?.headline ?? mainTheme.title}
          </Text>

          {primaryAction ? (
            <View style={styles.primaryBlock} testID="home-personal-plan-primary">
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.primaryEyebrow}>
                {t('personalPlan.primaryActionEyebrow')}
              </Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.primaryText}>
                {homeTeaser?.body ?? primaryAction.title}
              </Text>
              <Pressable
                onPress={() => onToggleAction(primaryAction.id, !primaryAction.isDone)}
                disabled={pendingActionId === primaryAction.id}
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked: primaryAction.isDone,
                  disabled: pendingActionId === primaryAction.id,
                }}
                accessibilityLabel={
                  primaryAction.isDone
                    ? t('homePersonalPlan.markIncompleteAccessibility', { title: primaryAction.title })
                    : t('homePersonalPlan.markCompleteAccessibility', { title: primaryAction.title })
                }
                style={({ pressed }) => [
                  styles.actionToggle,
                  primaryAction.isDone && styles.actionToggleDone,
                  (pressed || pendingActionId === primaryAction.id) && styles.pressed,
                ]}
              >
                <Text
                  maxFontSizeMultiplier={MAX_FONT_SCALE}
                  style={[styles.actionToggleText, primaryAction.isDone && styles.actionToggleTextDone]}
                >
                  {primaryAction.isDone ? t('todayActions.markedDone') : t('todayActions.markDone')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.themeText}>
              {homeTeaser?.body ?? mainTheme.description}
            </Text>
          )}
          {primaryAction?.why ? (
            <View style={styles.homeWhyWrap}>
              <Pressable
                onPress={() => {
                  const next = !isWhyExpanded;
                  setIsWhyExpanded(next);
                  if (next) onWhyOpened?.();
                }}
                accessibilityRole="button"
                accessibilityState={{ expanded: isWhyExpanded }}
                accessibilityLabel={t('personalPlan.whyLabel')}
                style={({ pressed }) => [styles.homeWhyToggle, pressed && styles.pressed]}
              >
                <Ionicons name="planet-outline" size={15} color={colors.primary} />
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.homeWhyLabel}>
                  {t('personalPlan.whyLabel')}
                </Text>
                <Ionicons
                  name={isWhyExpanded ? 'chevron-up' : 'chevron-down'}
                  size={15}
                  color={colors.primary}
                />
              </Pressable>
              {isWhyExpanded ? (
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.homeWhyBody}>
                  {primaryAction.why}
                </Text>
              ) : null}
            </View>
          ) : null}
        </>
      ) : (
        <>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.themeText}>
            {theme?.trim() || t('homePersonalPlan.fallbackTheme')}
          </Text>

          <View style={styles.progressHeader}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.progressLabel}>
              {t('homePersonalPlan.progress', { completed: completedCount, total: actions.length })}
            </Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.progressPercent}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
          <View
            style={styles.progressTrack}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: actions.length, now: completedCount }}
          >
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>

          <View style={styles.actionList}>
            {visibleActions.map((action) => {
              const pending = pendingActionId === action.id;
              return (
                <View key={action.id} style={styles.actionRow} testID={`home-plan-action-${action.id}`}>
                  <View style={[styles.actionIcon, action.isDone && styles.actionIconDone]}>
                    <Ionicons
                      name={action.isDone ? 'checkmark' : 'arrow-forward'}
                      size={14}
                      color={action.isDone ? colors.white : colors.primary}
                    />
                  </View>
                  <View style={styles.actionCopy}>
                    <Text
                      maxFontSizeMultiplier={MAX_FONT_SCALE}
                      style={[styles.actionTitle, action.isDone && styles.actionTitleDone]}
                    >
                      {action.title}
                    </Text>
                    {typeof action.etaMin === 'number' ? (
                      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.actionMeta}>
                        {t('todayActions.etaMinutes', { count: action.etaMin })}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => onToggleAction(action.id, !action.isDone)}
                    disabled={pending}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: action.isDone, disabled: pending }}
                    accessibilityLabel={
                      action.isDone
                        ? t('homePersonalPlan.markIncompleteAccessibility', { title: action.title })
                        : t('homePersonalPlan.markCompleteAccessibility', { title: action.title })
                    }
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.actionToggle,
                      action.isDone && styles.actionToggleDone,
                      (pressed || pending) && styles.pressed,
                    ]}
                  >
                    <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[
                      styles.actionToggleText,
                      action.isDone && styles.actionToggleTextDone,
                    ]}>
                      {action.isDone ? t('todayActions.markedDone') : t('todayActions.markDone')}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </>
        )
      ) : (
        <View style={styles.collapsedSummary} testID="home-personal-plan-collapsed">
          <View style={styles.progressHeader}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.progressLabel}>
              {t('homePersonalPlan.progress', { completed: completedCount, total: actions.length })}
            </Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.progressPercent}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
          <View
            style={styles.progressTrack}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: actions.length, now: completedCount }}
          >
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        </View>
      )}

      {showPlanBody ? (
        <View style={styles.ctaRow}>
          <Pressable
            onPress={onOpenPlan}
            accessibilityRole="button"
            accessibilityLabel={t('homePersonalPlan.openPlan')}
            testID="home-personal-plan-open"
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.primaryButtonText}>
              {t('homePersonalPlan.openPlan')}
            </Text>
            <Ionicons name="arrow-forward" size={17} color={colors.white} />
          </Pressable>
          <Pressable
            onPress={onOpenPlanner}
            accessibilityRole="button"
            accessibilityLabel={t('homePersonalPlan.planDay')}
            testID="home-personal-plan-planner"
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Ionicons name="calendar-outline" size={17} color={colors.primary} />
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.secondaryButtonText}>
              {t('homePersonalPlan.planDay')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {journeyPreview ? (
        <View style={styles.journeySection}>
          <View style={styles.sectionDivider} />
          {journeyPreview}
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    card: {
      marginTop: spacing.cardGap,
      borderRadius: radius.hero,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      padding: spacing.lg,
      gap: spacing.md,
      ...shadowSubtle,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    headerCopy: {
      flex: 1,
      gap: spacing.xxs,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    eyebrow: {
      ...typography.Caption,
      fontWeight: '700',
      color: C.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },
    title: {
      ...typography.H2,
      color: C.text,
      fontSize: 23,
      lineHeight: 29,
    },
    iconShell: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(168,85,247,0.16)' : C.primarySoftBg,
      borderWidth: 1,
      borderColor: C.border,
    },
    toggleShell: {
      width: 36,
      height: 36,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(168,85,247,0.12)' : C.primarySoftBg,
    },
    loadingWrap: {
      gap: spacing.sm,
    },
    themeText: {
      ...typography.Body,
      color: C.subtext,
      lineHeight: 22,
    },
    levelBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: isDark ? 'rgba(168,85,247,0.16)' : C.primarySoftBg,
    },
    levelBadgeText: {
      ...typography.Caption,
      fontWeight: '700',
      color: C.primary,
    },
    planThemeTitle: {
      ...typography.Body,
      fontWeight: '700',
      fontSize: 17,
      lineHeight: 24,
      color: C.text,
    },
    primaryBlock: {
      gap: spacing.xs,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: C.surfaceAlt,
      borderWidth: 1,
      borderColor: C.border,
    },
    homeWhyWrap: {
      gap: spacing.xs,
      paddingTop: spacing.xxs,
    },
    homeWhyToggle: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    homeWhyLabel: {
      ...typography.Caption,
      flex: 1,
      fontWeight: '700',
      color: C.primary,
    },
    homeWhyBody: {
      ...typography.Body,
      fontSize: 14,
      lineHeight: 20,
      color: C.subtext,
    },
    primaryEyebrow: {
      ...typography.Caption,
      fontWeight: '700',
      color: C.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    primaryText: {
      ...typography.Body,
      fontWeight: '700',
      fontSize: 15,
      lineHeight: 22,
      color: C.text,
    },
    progressHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    progressLabel: {
      ...typography.Caption,
      fontWeight: '700',
      fontSize: 13,
      color: C.text,
      flex: 1,
    },
    progressPercent: {
      ...typography.Caption,
      fontWeight: '700',
      color: C.primary,
    },
    progressTrack: {
      height: 8,
      borderRadius: radius.pill,
      backgroundColor: C.surfaceAlt,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: radius.pill,
      backgroundColor: C.primary,
    },
    collapsedSummary: {
      gap: spacing.xs,
      paddingTop: spacing.xxs,
    },
    actionList: {
      gap: spacing.sm,
    },
    actionRow: {
      minHeight: 58,
      borderRadius: radius.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: C.surfaceAlt,
      borderWidth: 1,
      borderColor: C.border,
    },
    actionIcon: {
      width: 28,
      height: 28,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(168,85,247,0.18)' : C.primarySoftBg,
    },
    actionIconDone: {
      backgroundColor: C.success,
    },
    actionCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    actionTitle: {
      ...typography.Caption,
      fontWeight: '700',
      fontSize: 13,
      color: C.text,
      lineHeight: 18,
    },
    actionTitleDone: {
      color: C.subtext,
      textDecorationLine: 'line-through',
    },
    actionMeta: {
      ...typography.Caption,
      color: C.subtext,
    },
    actionToggle: {
      minHeight: 44,
      minWidth: 66,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: C.primary,
      backgroundColor: C.surface,
    },
    actionToggleDone: {
      borderColor: C.success,
      backgroundColor: C.successBg,
    },
    actionToggleText: {
      ...typography.Caption,
      fontWeight: '700',
      color: C.primary,
    },
    actionToggleTextDone: {
      color: C.success,
    },
    statusWrap: {
      gap: spacing.xs,
      paddingVertical: spacing.xs,
    },
    statusTitle: {
      ...typography.Body,
      fontWeight: '700',
      color: C.text,
    },
    statusBody: {
      ...typography.Body,
      fontSize: 14,
      color: C.subtext,
      lineHeight: 20,
    },
    inlineButton: {
      minHeight: 44,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: C.primarySoftBg,
    },
    inlineButtonText: {
      ...typography.Caption,
      fontWeight: '700',
      fontSize: 13,
      color: C.primary,
    },
    ctaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    primaryButton: {
      minHeight: 48,
      flexGrow: 1,
      flexBasis: 150,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: C.primary,
    },
    primaryButtonText: {
      ...typography.Button,
      fontSize: 14,
      color: C.white,
    },
    secondaryButton: {
      minHeight: 48,
      flexGrow: 1,
      flexBasis: 140,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
    },
    secondaryButtonText: {
      ...typography.Button,
      fontSize: 14,
      color: C.primary,
    },
    journeySection: {
      gap: spacing.md,
    },
    sectionDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: C.border,
    },
    pressed: {
      opacity: 0.78,
    },
  });
}
