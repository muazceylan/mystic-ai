import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppText, BottomSheet } from '../../../components/ui';
import { useTheme, type ThemeColors } from '../../../context/ThemeContext';
import { spacing, radius } from '../../../theme';
import type { NatalBigThreeEntry } from '../../../services/natalPortrait.service';
import EvidenceDisclosure from './EvidenceDisclosure';
import QualitativeLevels, { type QualitativeLevel } from './QualitativeLevels';

interface Props {
  visible: boolean;
  onClose: () => void;
  entry: NatalBigThreeEntry | null;
  locale: string;
  levels: QualitativeLevel[];
}

/**
 * The redesigned Big Three detail.
 *
 * Reads top to bottom as: what this piece of the chart means, how it actually works in you, what
 * it makes easy, what it makes hard, what the house adds — and only then the receipts. A reader
 * who has never heard the word "house" can finish it without looking anything up.
 */
export default function BigThreeDetailSheet({ visible, onClose, entry, locale, levels }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = createStyles(colors);

  return (
    <BottomSheet visible={visible} onClose={onClose} title={entry?.title} dragHandleOnly>
      {entry ? (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
        >
          <AppText variant="CaptionBold" style={s.roleLabel}>
            {entry.roleLabel}
          </AppText>

          <AppText variant="BodyLarge" style={s.meaning}>
            {entry.meaning}
          </AppText>

          <Block title={t('natalPortrait.howItWorks')} colors={colors}>
            <AppText variant="Body" style={s.body}>
              {entry.howItWorksInYou}
            </AppText>
          </Block>

          {levels.length ? (
            <Block title={t('natalPortrait.profileTitle')} colors={colors}>
              <QualitativeLevels levels={levels} />
            </Block>
          ) : null}

          {entry.strengths?.length ? (
            <Block title={t('natalPortrait.strengthsTitle')} colors={colors}>
              <BulletList items={entry.strengths} icon="sparkles" tone="positive" colors={colors} />
            </Block>
          ) : null}

          {entry.challenges?.length ? (
            <Block title={t('natalPortrait.challengesTitle')} colors={colors}>
              <BulletList items={entry.challenges} icon="alert-circle-outline" tone="caution" colors={colors} />
            </Block>
          ) : null}

          {entry.houseInfluence ? (
            <Block title={t('natalPortrait.houseInfluenceTitle')} colors={colors}>
              <AppText variant="Body" style={s.body}>
                {entry.houseInfluence}
              </AppText>
            </Block>
          ) : null}

          {entry.keyAspects?.length ? (
            <Block title={t('natalPortrait.keyAspectsTitle')} colors={colors}>
              <BulletList
                items={entry.keyAspects}
                icon="git-network-outline"
                tone="neutral"
                colors={colors}
              />
            </Block>
          ) : null}

          <EvidenceDisclosure
            evidence={entry.evidence}
            context="big_three_detail"
            locale={locale}
          />
        </ScrollView>
      ) : null}
    </BottomSheet>
  );
}

function Block({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: ThemeColors;
}) {
  const s = createStyles(colors);
  return (
    <View style={s.block}>
      <AppText variant="CaptionBold" style={s.blockTitle}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

export function BulletList({
  items,
  icon,
  tone,
  colors,
}: {
  items: string[];
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tone: 'positive' | 'caution' | 'neutral';
  colors: ThemeColors;
}) {
  const s = createStyles(colors);
  const color =
    tone === 'positive'
      ? colors.birthChart.successAccent
      : tone === 'caution'
        ? colors.birthChart.goldAccent
        : colors.birthChart.infoAccent;
  return (
    <View style={s.bullets}>
      {items.map((item, index) => (
        <View key={`${item}-${index}`} style={s.bulletRow}>
          <Ionicons name={icon} size={14} color={color} style={s.bulletIcon} />
          <AppText variant="Small" style={s.bulletText}>
            {item}
          </AppText>
        </View>
      ))}
    </View>
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
    roleLabel: {
      color: colors.birthChart.primaryAccent,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    meaning: {
      color: colors.birthChart.textPrimary,
      lineHeight: 24,
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
    body: {
      color: colors.birthChart.textSecondary,
      lineHeight: 22,
    },
    bullets: {
      gap: spacing.xs,
    },
    bulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.xs,
    },
    bulletIcon: {
      marginTop: 2,
    },
    bulletText: {
      color: colors.birthChart.textSecondary,
      flex: 1,
      lineHeight: 20,
    },
  });
