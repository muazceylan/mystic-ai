import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppText } from '../../../components/ui';
import { useTheme, type ThemeColors } from '../../../context/ThemeContext';
import { spacing, radius } from '../../../theme';
import * as Haptics from '../../../utils/haptics';
import type { NatalAskResponse } from '../../../services/natalPortrait.service';
import EvidenceDisclosure from './EvidenceDisclosure';
import natalAnalytics from '../analytics';

interface Props {
  locale: string;
  answer: NatalAskResponse | null;
  isPending: boolean;
  isError: boolean;
  onAsk: (question: string, source: 'suggestion' | 'freeform') => void;
  disabled?: boolean;
  /** Behind the natal-detail entitlement; tapping opens the existing unlock sheet. */
  locked?: boolean;
  onRequestUnlock?: () => void;
}

const MAX_QUESTION_LENGTH = 300;

/**
 * "Haritama Sor" — questions answered from the reader's own chart.
 *
 * Not a general chat surface. The backend grounds every answer in this user's placements and is
 * required to decline anything the chart cannot speak to, which is why an unanswerable response
 * gets its own visibly different treatment rather than being dressed up as an answer. The
 * suggestion chips exist to teach the shape of a good question — chart-shaped, not fortune-shaped.
 */
export default function AskChartSection({
  locale,
  answer,
  isPending,
  isError,
  onAsk,
  disabled = false,
  locked = false,
  onRequestUnlock,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = createStyles(colors);
  const [question, setQuestion] = useState('');
  const viewedRef = useRef(false);

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    natalAnalytics.askOpened({ locale });
  }, [locale]);

  const suggestions = t('natalPortrait.askSuggestions', { returnObjects: true }) as unknown;
  const suggestionList: string[] = Array.isArray(suggestions) ? (suggestions as string[]) : [];

  const submit = useCallback(
    (value: string, source: 'suggestion' | 'freeform') => {
      if (locked) {
        onRequestUnlock?.();
        return;
      }
      const trimmed = value.trim();
      if (!trimmed || isPending || disabled) return;
      Haptics.impactAsync();
      onAsk(trimmed.slice(0, MAX_QUESTION_LENGTH), source);
      if (source === 'freeform') setQuestion('');
    },
    [isPending, disabled, locked, onRequestUnlock, onAsk],
  );

  return (
    <View style={s.wrapper}>
      {suggestionList.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chips}
        >
          {suggestionList.map((suggestion) => (
            <Pressable
              key={suggestion}
              onPress={() => submit(suggestion, 'suggestion')}
              disabled={isPending || (disabled && !locked)}
              accessibilityRole="button"
              style={({ pressed }) => [s.chip, pressed ? s.chipPressed : undefined]}
            >
              <AppText variant="CaptionSmall" style={s.chipText}>
                {suggestion}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View style={s.inputRow}>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder={t('natalPortrait.askPlaceholder')}
          placeholderTextColor={colors.birthChart.textMuted}
          style={s.input}
          maxLength={MAX_QUESTION_LENGTH}
          editable={!isPending && !disabled}
          multiline
          accessibilityLabel={t('natalPortrait.askPlaceholder')}
          onSubmitEditing={() => submit(question, 'freeform')}
        />
        <Pressable
          onPress={() => submit(question, 'freeform')}
          disabled={locked ? false : !question.trim() || isPending || disabled}
          accessibilityRole="button"
          accessibilityLabel={t('natalPortrait.askSubmitA11y')}
          style={({ pressed }) => [
            s.sendButton,
            (!locked && (!question.trim() || isPending || disabled)) ? s.sendDisabled : undefined,
            pressed ? s.sendPressed : undefined,
          ]}
        >
          {isPending ? (
            <ActivityIndicator size="small" color={colors.birthChart.ctaText} />
          ) : (
            <Ionicons
              name={locked ? 'lock-closed' : 'arrow-up'}
              size={18}
              color={colors.birthChart.ctaText}
            />
          )}
        </Pressable>
      </View>

      {isPending ? (
        <AppText variant="CaptionSmall" style={s.pendingText}>
          {t('natalPortrait.askPending')}
        </AppText>
      ) : null}

      {isError && !answer ? (
        <View style={s.answerCard}>
          <AppText variant="Small" style={s.answerText}>
            {t('natalPortrait.askError')}
          </AppText>
        </View>
      ) : null}

      {answer && !isPending ? (
        <View style={[s.answerCard, !answer.answerable ? s.answerCardMuted : undefined]}>
          {!answer.answerable ? (
            <View style={s.unanswerableHeader}>
              <Ionicons
                name="information-circle-outline"
                size={14}
                color={colors.birthChart.textMuted}
              />
              <AppText variant="CaptionBold" style={s.unanswerableLabel}>
                {t('natalPortrait.askUnanswerableLabel')}
              </AppText>
            </View>
          ) : null}

          <AppText variant="Body" style={s.answerText}>
            {answer.answer}
          </AppText>

          {answer.answerable ? (
            <EvidenceDisclosure
              evidence={answer.evidence ?? []}
              context="ask_chart"
              locale={locale}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      gap: spacing.sm,
    },
    chips: {
      gap: spacing.xs,
      paddingRight: spacing.md,
    },
    chip: {
      backgroundColor: colors.birthChart.cardSoft,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.birthChart.cardBorder,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      maxWidth: 260,
    },
    chipPressed: {
      opacity: 0.8,
    },
    chipText: {
      color: colors.birthChart.textSecondary,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.xs,
      backgroundColor: colors.birthChart.cardBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.birthChart.cardBorder,
      borderRadius: radius.card,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    input: {
      flex: 1,
      color: colors.birthChart.textPrimary,
      fontSize: 14,
      lineHeight: 20,
      maxHeight: 96,
      paddingVertical: spacing.xs,
    },
    sendButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.birthChart.ctaBackground,
      marginBottom: 2,
    },
    sendDisabled: {
      opacity: 0.45,
    },
    sendPressed: {
      opacity: 0.85,
    },
    pendingText: {
      color: colors.birthChart.textMuted,
    },
    answerCard: {
      backgroundColor: colors.birthChart.cardSoft,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.birthChart.cardBorder,
      borderRadius: radius.card,
      padding: spacing.md,
      gap: spacing.xs,
    },
    answerCardMuted: {
      opacity: 0.9,
    },
    unanswerableHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
    },
    unanswerableLabel: {
      color: colors.birthChart.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    answerText: {
      color: colors.birthChart.textSecondary,
      lineHeight: 22,
    },
  });
