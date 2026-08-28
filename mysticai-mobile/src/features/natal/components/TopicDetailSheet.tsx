import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, BottomSheet } from '../../../components/ui';
import { useTheme, type ThemeColors } from '../../../context/ThemeContext';
import { spacing, radius } from '../../../theme';
import type { NatalTopic } from '../../../services/natalPortrait.service';
import EvidenceDisclosure from './EvidenceDisclosure';
import { BulletList } from './BigThreeDetailSheet';

interface Props {
  visible: boolean;
  onClose: () => void;
  topic: NatalTopic | null;
  locale: string;
}

/**
 * The expanded reading for one theme.
 *
 * Order is fixed and matches every other surface in Haritam: the synthesis, then how it shows up
 * in an ordinary week, then what helps and what strains, then the receipts. Sections with no
 * content are omitted rather than rendered empty, because a card with three blank headings reads
 * as broken even when the interpretation above it is good.
 */
export default function TopicDetailSheet({ visible, onClose, topic, locale }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = createStyles(colors);

  return (
    <BottomSheet visible={visible} onClose={onClose} title={topic?.title} dragHandleOnly>
      {topic ? (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
        >
          <AppText variant="CaptionBold" style={s.subtitle}>
            {topic.subtitle}
          </AppText>

          <AppText variant="Body" style={s.summary}>
            {topic.summary}
          </AppText>

          {topic.dailyLife ? (
            <View style={s.block}>
              <AppText variant="CaptionBold" style={s.blockTitle}>
                {t('natalPortrait.dailyLifeTitle')}
              </AppText>
              <AppText variant="Small" style={s.blockBody}>
                {topic.dailyLife}
              </AppText>
            </View>
          ) : null}

          {topic.strengths?.length ? (
            <View style={s.block}>
              <AppText variant="CaptionBold" style={s.blockTitle}>
                {t('natalPortrait.goodForYouTitle')}
              </AppText>
              <BulletList items={topic.strengths} icon="sparkles" tone="positive" colors={colors} />
            </View>
          ) : null}

          {topic.challenges?.length ? (
            <View style={s.block}>
              <AppText variant="CaptionBold" style={s.blockTitle}>
                {t('natalPortrait.mayChallengeTitle')}
              </AppText>
              <BulletList
                items={topic.challenges}
                icon="alert-circle-outline"
                tone="caution"
                colors={colors}
              />
            </View>
          ) : null}

          <EvidenceDisclosure
            evidence={topic.evidence}
            context={`topic_${topic.id}`}
            locale={locale}
          />
        </ScrollView>
      ) : null}
    </BottomSheet>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: {
      maxHeight: 560,
    },
    content: {
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    subtitle: {
      color: colors.birthChart.primaryAccent,
      textTransform: 'uppercase',
      letterSpacing: 0.9,
    },
    summary: {
      color: colors.birthChart.textPrimary,
      lineHeight: 23,
    },
    block: {
      gap: spacing.xs,
      backgroundColor: colors.birthChart.cardSoft,
      borderRadius: radius.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.birthChart.cardBorder,
      padding: spacing.md,
    },
    blockTitle: {
      color: colors.birthChart.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    blockBody: {
      color: colors.birthChart.textSecondary,
      lineHeight: 20,
    },
  });
