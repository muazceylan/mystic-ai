import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppText } from '../../../components/ui';
import { useTheme, type ThemeColors } from '../../../context/ThemeContext';
import { spacing, radius } from '../../../theme';
import type { PlacementLesson } from '../types';

interface Props {
  lesson: PlacementLesson;
}

/**
 * Teaches how to read a placement, using one of the reader's own.
 *
 * Astrology is usually taught with abstractions — "the Moon represents emotions" — which a
 * beginner cannot connect to anything. Here the three questions are answered with the reader's
 * actual Moon, actual sign and actual house, and then joined into a single sentence about them.
 * Once someone has read this card, every other placement in the app becomes decodable.
 *
 * Deliberately a reusable component: the same three-part structure is the teaching model for
 * planets, houses and aspects everywhere in Haritam.
 */
export default function LearnPlacementCard({ lesson }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = createStyles(colors);

  const rows: Array<{ key: string; question: string; term: string; meaning: string }> = [
    {
      key: 'planet',
      question: t('natalPortrait.learnPlanetQuestion'),
      term: lesson.planetName,
      meaning: lesson.planetMeaning,
    },
    {
      key: 'sign',
      question: t('natalPortrait.learnSignQuestion'),
      term: lesson.signName,
      meaning: lesson.signMeaning,
    },
  ];

  // The house row is omitted rather than guessed when the birth time is unknown.
  if (lesson.houseName && lesson.houseMeaning) {
    rows.push({
      key: 'house',
      question: t('natalPortrait.learnHouseQuestion'),
      term: lesson.houseName,
      meaning: lesson.houseMeaning,
    });
  }

  return (
    <View style={s.card}>
      <View style={s.header}>
        <Ionicons name="school-outline" size={16} color={colors.birthChart.primaryAccent} />
        <AppText variant="CaptionBold" style={s.headerText}>
          {t('natalPortrait.learnCardTitle')}
        </AppText>
      </View>

      <AppText variant="Small" style={s.intro}>
        {t('natalPortrait.learnCardIntro')}
      </AppText>

      <View style={s.rows}>
        {rows.map((row, index) => (
          <View key={row.key} style={s.row}>
            <View style={s.rowHeader}>
              <AppText variant="CaptionSmall" style={s.question}>
                {row.question}
              </AppText>
              <AppText variant="SmallBold" style={s.term}>
                {row.term}
              </AppText>
            </View>
            <AppText variant="Small" style={s.meaning}>
              {row.meaning}
            </AppText>
            {index < rows.length - 1 ? (
              <Ionicons
                name="add"
                size={14}
                color={colors.birthChart.textMuted}
                style={s.connector}
              />
            ) : null}
          </View>
        ))}
      </View>

      <View style={s.synthesisBox}>
        <AppText variant="CaptionBold" style={s.synthesisLabel}>
          {t('natalPortrait.learnSynthesisLabel')}
        </AppText>
        <AppText variant="Body" style={s.synthesisText}>
          {lesson.synthesis}
        </AppText>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.birthChart.cardBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.birthChart.cardBorder,
      borderRadius: radius.card,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
    },
    headerText: {
      color: colors.birthChart.primaryAccent,
      textTransform: 'uppercase',
      letterSpacing: 0.9,
    },
    intro: {
      color: colors.birthChart.textSecondary,
      lineHeight: 20,
    },
    rows: {
      gap: spacing.sm,
      marginTop: spacing.xxs,
    },
    row: {
      backgroundColor: colors.birthChart.cardSoft,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: spacing.xxs,
    },
    rowHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: spacing.xs,
    },
    question: {
      color: colors.birthChart.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      flex: 1,
    },
    term: {
      color: colors.birthChart.textPrimary,
    },
    meaning: {
      color: colors.birthChart.textSecondary,
      lineHeight: 19,
    },
    connector: {
      position: 'absolute',
      bottom: -13,
      alignSelf: 'center',
      left: '50%',
    },
    synthesisBox: {
      marginTop: spacing.xs,
      backgroundColor: colors.birthChart.iconBadgeBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.birthChart.iconBadgeBorder,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: spacing.xxs,
    },
    synthesisLabel: {
      color: colors.birthChart.primaryAccent,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    synthesisText: {
      color: colors.birthChart.textPrimary,
      lineHeight: 22,
    },
  });

export type { PlacementLesson };
