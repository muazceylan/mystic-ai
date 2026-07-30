import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';
import { RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../constants/tokens';
import type {
  PersonalizationLevel,
  PlanCaution,
  PlanFeedbackReason,
  PlanLifeArea,
  PlanLifeAreaCard,
  PlanMainTheme,
  PlanPrimaryAction,
  PlanTimeSlot,
  PlanTimeWindow,
} from '../../types/daily.types';

const MAX_FONT_SCALE = 1.3;

/** Keeps the icon language consistent with the backend's LifeArea enum. */
const AREA_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  relationship: 'heart-outline',
  family: 'home-outline',
  social: 'people-outline',
  money: 'wallet-outline',
  work: 'briefcase-outline',
  boundaries: 'shield-checkmark-outline',
  emotional_balance: 'pulse-outline',
  communication: 'chatbubble-ellipses-outline',
  decision: 'git-compare-outline',
  rest: 'moon-outline',
  creativity: 'color-palette-outline',
};

function areaIcon(category?: PlanLifeArea | string): keyof typeof Ionicons.glyphMap {
  return (category && AREA_ICONS[category]) || 'sparkles-outline';
}

function formatWindow(window?: PlanTimeWindow | null): string | null {
  if (!window) return null;
  if (window.start && window.end) {
    return `${window.label} · ${window.start}–${window.end}`;
  }
  return window.label || null;
}

// ─────────────────────────────────────────────────────────────────────────────

export function PersonalizationBadge({ level }: { level?: PersonalizationLevel }) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  if (!level) return null;

  return (
    <View style={styles.badge} testID="personal-plan-personalization-badge">
      <Ionicons name="sparkles" size={13} color={colors.primary} />
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.badgeText}>
        {t(`personalPlan.personalization.${level}`)}
      </Text>
    </View>
  );
}

/**
 * Collapsible plain-language justification. The technical `astrologicalBasis` payload is never
 * rendered — only the human-readable `why` the backend derives from it.
 */
export function WhyDisclosure({ why, testID }: { why?: string | null; testID?: string }) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const [expanded, setExpanded] = useState(false);

  if (!why) return null;

  return (
    <View style={styles.whyWrap}>
      <Pressable
        onPress={() => setExpanded((current) => !current)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={t('personalPlan.whyLabel')}
        hitSlop={6}
        testID={testID}
        style={({ pressed }) => [styles.whyToggle, pressed && styles.pressed]}
      >
        <Ionicons name="help-circle-outline" size={15} color={colors.primary} />
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.whyToggleText}>
          {t('personalPlan.whyLabel')}
        </Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
      </Pressable>
      {expanded ? (
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.whyBody}>
          {why}
        </Text>
      ) : null}
    </View>
  );
}

export function MainThemeCard({
  theme,
  level,
}: {
  theme: PlanMainTheme;
  level?: PersonalizationLevel;
}) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.card, styles.themeCard]} testID="personal-plan-main-theme">
      <PersonalizationBadge level={level} />
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.eyebrow}>
        {t('personalPlan.mainThemeEyebrow')}
      </Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.themeTitle}>
        {theme.title}
      </Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.themeBody}>
        {theme.description}
      </Text>
      <WhyDisclosure why={theme.why} testID="personal-plan-theme-why" />
    </View>
  );
}

export function PrimaryActionCard({
  action,
  pending,
  onToggle,
}: {
  action: PlanPrimaryAction;
  pending?: boolean;
  onToggle: (actionId: string, nextValue: boolean) => void;
}) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const windowLabel = formatWindow(action.timeWindow);

  return (
    <View style={[styles.card, styles.primaryCard]} testID="personal-plan-primary-action">
      <View style={styles.rowBetween}>
        <View style={styles.chip}>
          <Ionicons name={areaIcon(action.category)} size={13} color={colors.primary} />
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.chipText}>
            {action.categoryLabel}
          </Text>
        </View>
        {windowLabel ? (
          <View style={styles.timeChip}>
            <Ionicons name="time-outline" size={13} color={colors.subtext} />
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.timeChipText}>
              {windowLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.eyebrow}>
        {t('personalPlan.primaryActionEyebrow')}
      </Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.primaryTitle}>
        {action.title}
      </Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.bodyText}>
        {action.description}
      </Text>

      <WhyDisclosure why={action.why} testID="personal-plan-primary-why" />

      <Pressable
        onPress={() => onToggle(action.id, !action.isDone)}
        disabled={pending}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: action.isDone, disabled: pending }}
        accessibilityLabel={
          action.isDone
            ? t('personalPlan.markIncompleteAccessibility', { title: action.title })
            : t('personalPlan.markCompleteAccessibility', { title: action.title })
        }
        testID="personal-plan-primary-toggle"
        style={({ pressed }) => [
          styles.doneButton,
          action.isDone && styles.doneButtonActive,
          (pressed || pending) && styles.pressed,
        ]}
      >
        <Ionicons
          name={action.isDone ? 'checkmark-circle' : 'ellipse-outline'}
          size={18}
          color={action.isDone ? colors.success : colors.primary}
        />
        <Text
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          style={[styles.doneButtonText, action.isDone && styles.doneButtonTextActive]}
        >
          {action.isDone ? t('todayActions.markedDone') : t('todayActions.markDone')}
        </Text>
      </Pressable>
    </View>
  );
}

export function TimelineSection({ slots }: { slots: PlanTimeSlot[] }) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  // Empty is a valid state: the backend only emits slots backed by a real intraday signal.
  if (!slots.length) return null;

  return (
    <View style={styles.card} testID="personal-plan-timeline">
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.sectionTitle}>
        {t('personalPlan.timelineTitle')}
      </Text>
      {slots.map((slot, index) => (
        <View key={slot.id} style={styles.slotRow}>
          <View style={styles.slotRail}>
            <View style={styles.slotDot} />
            {index < slots.length - 1 ? <View style={styles.slotLine} /> : null}
          </View>
          <View style={styles.slotBody}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.slotLabel}>
              {slot.startTime && slot.endTime
                ? `${slot.label} · ${slot.startTime}–${slot.endTime}`
                : slot.label}
            </Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.slotTitle}>
              {slot.title}
            </Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.bodyText}>
              {slot.description}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export function LifeAreaCardView({
  card,
  pending,
  onToggle,
}: {
  card: PlanLifeAreaCard;
  pending?: boolean;
  onToggle: (actionId: string, nextValue: boolean) => void;
}) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={styles.card} testID={`personal-plan-area-${card.category}`}>
      <View style={styles.chip}>
        <Ionicons name={areaIcon(card.category)} size={13} color={colors.primary} />
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.chipText}>
          {card.categoryLabel}
        </Text>
      </View>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.cardTitle}>
        {card.title}
      </Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.bodyText}>
        {card.description}
      </Text>
      <WhyDisclosure why={card.why} testID={`personal-plan-area-why-${card.category}`} />
      <Pressable
        onPress={() => onToggle(card.id, !card.isDone)}
        disabled={pending}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: card.isDone, disabled: pending }}
        accessibilityLabel={
          card.isDone
            ? t('personalPlan.markIncompleteAccessibility', { title: card.title })
            : t('personalPlan.markCompleteAccessibility', { title: card.title })
        }
        style={({ pressed }) => [
          styles.doneButton,
          card.isDone && styles.doneButtonActive,
          (pressed || pending) && styles.pressed,
        ]}
      >
        <Ionicons
          name={card.isDone ? 'checkmark-circle' : 'ellipse-outline'}
          size={17}
          color={card.isDone ? colors.success : colors.primary}
        />
        <Text
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          style={[styles.doneButtonText, card.isDone && styles.doneButtonTextActive]}
        >
          {card.isDone ? t('todayActions.markedDone') : t('todayActions.markDone')}
        </Text>
      </Pressable>
    </View>
  );
}

export function CautionCard({ caution }: { caution: PlanCaution }) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const windowLabel = formatWindow(caution.timeWindow);

  return (
    <View style={[styles.card, styles.cautionCard]} testID="personal-plan-caution">
      <View style={styles.rowBetween}>
        <View style={styles.cautionChip}>
          <Ionicons name="alert-circle-outline" size={13} color={colors.warning} />
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.cautionChipText}>
            {t('personalPlan.cautionTitle')}
          </Text>
        </View>
        {windowLabel ? (
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.timeChipText}>
            {windowLabel}
          </Text>
        ) : null}
      </View>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.cardTitle}>
        {caution.title}
      </Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.bodyText}>
        {caution.description}
      </Text>
      <WhyDisclosure why={caution.why} testID="personal-plan-caution-why" />
    </View>
  );
}

export function EveningReflectionCard({ question }: { question: string }) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.card, styles.reflectionCard]} testID="personal-plan-reflection">
      <View style={styles.chip}>
        <Ionicons name="moon-outline" size={13} color={colors.primary} />
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.chipText}>
          {t('personalPlan.reflectionTitle')}
        </Text>
      </View>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.reflectionText}>
        {question}
      </Text>
    </View>
  );
}

const FEEDBACK_OPTIONS: Array<{ reason: PlanFeedbackReason; icon: keyof typeof Ionicons.glyphMap }> = [
  { reason: 'HELPFUL', icon: 'thumbs-up-outline' },
  { reason: 'TOO_GENERIC', icon: 'contract-outline' },
  { reason: 'REPETITIVE', icon: 'repeat-outline' },
  { reason: 'NOT_RELEVANT', icon: 'close-circle-outline' },
  { reason: 'NOT_USEFUL', icon: 'help-buoy-outline' },
];

/**
 * TOO_GENERIC and REPETITIVE ask the backend to rebuild today's plan, so the copy tells the
 * user that will happen rather than leaving the tap feeling inert.
 */
export function PlanFeedbackSection({
  selected,
  submitting,
  onSelect,
}: {
  selected?: PlanFeedbackReason | null;
  submitting?: boolean;
  onSelect: (reason: PlanFeedbackReason) => void;
}) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={styles.card} testID="personal-plan-feedback">
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.sectionTitle}>
        {t('personalPlan.feedbackTitle')}
      </Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.feedbackHint}>
        {t('personalPlan.feedbackHint')}
      </Text>
      <View style={styles.feedbackRow}>
        {FEEDBACK_OPTIONS.map((option) => {
          const active = selected === option.reason;
          return (
            <Pressable
              key={option.reason}
              onPress={() => onSelect(option.reason)}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled: submitting }}
              accessibilityLabel={t(`personalPlan.feedback.${option.reason}`)}
              testID={`personal-plan-feedback-${option.reason}`}
              style={({ pressed }) => [
                styles.feedbackChip,
                active && styles.feedbackChipActive,
                (pressed || submitting) && styles.pressed,
              ]}
            >
              <Ionicons
                name={option.icon}
                size={14}
                color={active ? colors.white : colors.primary}
              />
              <Text
                maxFontSizeMultiplier={MAX_FONT_SCALE}
                style={[styles.feedbackChipText, active && styles.feedbackChipTextActive]}
              >
                {t(`personalPlan.feedback.${option.reason}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {selected === 'TOO_GENERIC' || selected === 'REPETITIVE' ? (
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.feedbackHint}>
          {t('personalPlan.feedbackRegenerating')}
        </Text>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function makeStyles(C: ThemeColors, isDark: boolean) {
  const softBg = isDark ? 'rgba(168,85,247,0.16)' : C.primarySoftBg;

  return StyleSheet.create({
    card: {
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      padding: SPACING.lg,
      gap: SPACING.sm,
      ...SHADOW.sm,
    },
    themeCard: {
      borderColor: isDark ? 'rgba(168,85,247,0.36)' : C.primary,
    },
    primaryCard: {
      backgroundColor: isDark ? 'rgba(168,85,247,0.10)' : C.surface,
      borderColor: isDark ? 'rgba(168,85,247,0.30)' : C.border,
    },
    cautionCard: {
      borderColor: isDark ? 'rgba(251,191,36,0.32)' : C.warning,
    },
    reflectionCard: {
      backgroundColor: C.surfaceAlt,
    },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACING.sm,
      flexWrap: 'wrap',
    },
    badge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
      paddingHorizontal: SPACING.smMd,
      paddingVertical: SPACING.xs,
      borderRadius: RADIUS.full,
      backgroundColor: softBg,
    },
    badgeText: {
      ...TYPOGRAPHY.CaptionBold,
      color: C.primary,
    },
    eyebrow: {
      ...TYPOGRAPHY.CaptionBold,
      color: C.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },
    themeTitle: {
      ...TYPOGRAPHY.H2,
      color: C.text,
    },
    themeBody: {
      ...TYPOGRAPHY.BodyMid,
      color: C.subtext,
      lineHeight: 22,
    },
    sectionTitle: {
      ...TYPOGRAPHY.BodyBold,
      color: C.text,
    },
    primaryTitle: {
      ...TYPOGRAPHY.H3,
      color: C.text,
    },
    cardTitle: {
      ...TYPOGRAPHY.BodyBold,
      color: C.text,
    },
    bodyText: {
      ...TYPOGRAPHY.BodyMid,
      color: C.subtext,
      lineHeight: 22,
    },
    chip: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
      paddingHorizontal: SPACING.smMd,
      paddingVertical: SPACING.xs,
      borderRadius: RADIUS.full,
      backgroundColor: softBg,
    },
    chipText: {
      ...TYPOGRAPHY.CaptionBold,
      color: C.primary,
    },
    cautionChip: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
      paddingHorizontal: SPACING.smMd,
      paddingVertical: SPACING.xs,
      borderRadius: RADIUS.full,
      backgroundColor: isDark ? 'rgba(251,191,36,0.16)' : C.warningBg,
    },
    cautionChipText: {
      ...TYPOGRAPHY.CaptionBold,
      color: C.warning,
    },
    timeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
    },
    timeChipText: {
      ...TYPOGRAPHY.Caption,
      color: C.subtext,
    },
    whyWrap: {
      gap: SPACING.xs,
    },
    whyToggle: {
      alignSelf: 'flex-start',
      minHeight: 36,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
    },
    whyToggleText: {
      ...TYPOGRAPHY.CaptionBold,
      color: C.primary,
    },
    whyBody: {
      ...TYPOGRAPHY.Caption,
      color: C.subtext,
      lineHeight: 18,
    },
    doneButton: {
      minHeight: 44,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
      paddingHorizontal: SPACING.lg,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: C.primary,
      backgroundColor: C.surface,
    },
    doneButtonActive: {
      borderColor: C.success,
      backgroundColor: C.successBg,
    },
    doneButtonText: {
      ...TYPOGRAPHY.SmallBold,
      color: C.primary,
    },
    doneButtonTextActive: {
      color: C.success,
    },
    slotRow: {
      flexDirection: 'row',
      gap: SPACING.md,
    },
    slotRail: {
      width: 12,
      alignItems: 'center',
      paddingTop: 6,
    },
    slotDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: C.primary,
    },
    slotLine: {
      flex: 1,
      width: 2,
      marginTop: 4,
      backgroundColor: C.border,
    },
    slotBody: {
      flex: 1,
      gap: SPACING.xs,
      paddingBottom: SPACING.md,
    },
    slotLabel: {
      ...TYPOGRAPHY.CaptionBold,
      color: C.primary,
    },
    slotTitle: {
      ...TYPOGRAPHY.SmallBold,
      color: C.text,
    },
    reflectionText: {
      ...TYPOGRAPHY.BodyBold,
      color: C.text,
      lineHeight: 24,
    },
    feedbackHint: {
      ...TYPOGRAPHY.Caption,
      color: C.subtext,
      lineHeight: 18,
    },
    feedbackRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
    },
    feedbackChip: {
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
    },
    feedbackChipActive: {
      backgroundColor: C.primary,
      borderColor: C.primary,
    },
    feedbackChipText: {
      ...TYPOGRAPHY.CaptionBold,
      color: C.primary,
    },
    feedbackChipTextActive: {
      color: C.white,
    },
    pressed: {
      opacity: 0.78,
    },
  });
}
