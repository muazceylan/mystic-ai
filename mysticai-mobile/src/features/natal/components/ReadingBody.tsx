import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppText } from '../../../components/ui';
import { useTheme, type ThemeColors } from '../../../context/ThemeContext';
import { spacing, radius } from '../../../theme';
import type {
  NatalHouseReading,
  NatalPlacementReading,
} from '../../../services/natalPortrait.service';
import EvidenceDisclosure from './EvidenceDisclosure';

/**
 * The bodies of the redesigned planet and house detail sheets.
 *
 * Both read in the same fixed order — what it means, how it is shaped, where it lands, how it
 * actually shows up in you, what helps, what strains — with the technical receipt last and
 * collapsed. The synthesis block is visually emphasised because it is the one paragraph that
 * could not have been written from a textbook: it needs this reader's specific combination.
 *
 * Shared between both sheets so the planet and house surfaces cannot drift apart.
 */

interface Block {
  key: string;
  label: string;
  text: string;
}

export function PlacementReadingBody({
  reading,
  locale,
}: {
  reading: NatalPlacementReading;
  locale: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = createStyles(colors);

  const blocks: Block[] = [
    { key: 'what', label: t('natalPortrait.planetWhatItMeans'), text: reading.whatItMeans },
    { key: 'sign', label: t('natalPortrait.planetHowTheSign'), text: reading.howTheSignShapesIt },
  ];
  // Omitted rather than guessed when the birth time is unknown.
  if (reading.whereTheHouseTakesIt) {
    blocks.push({
      key: 'house',
      label: t('natalPortrait.planetWhereTheHouse'),
      text: reading.whereTheHouseTakesIt,
    });
  }

  return (
    <View style={s.wrapper}>
      <View style={s.titleBlock}>
        <AppText variant="H2" style={s.title}>{reading.title}</AppText>
        <AppText variant="Small" style={s.subtitle}>{reading.subtitle}</AppText>
      </View>

      {blocks.map((block) => (
        <TextBlock key={block.key} label={block.label} text={block.text} colors={colors} />
      ))}

      <SynthesisBlock
        label={t('natalPortrait.planetHowItShowsUp')}
        text={reading.howItShowsUpInYou}
        colors={colors}
      />

      <BulletBlock
        label={t('natalPortrait.planetWorksWell')}
        items={reading.whenItWorksWell}
        icon="sparkles"
        tone="positive"
        colors={colors}
      />
      <BulletBlock
        label={t('natalPortrait.planetStrains')}
        items={reading.whenItStrains}
        icon="alert-circle-outline"
        tone="caution"
        colors={colors}
      />
      <BulletBlock
        label={t('natalPortrait.planetConnections')}
        items={reading.connections}
        icon="git-network-outline"
        tone="neutral"
        colors={colors}
      />

      <EvidenceDisclosure
        evidence={reading.evidence}
        context={`planet_${reading.planet}`}
        locale={locale}
      />
    </View>
  );
}

export function HouseReadingBody({
  reading,
  locale,
}: {
  reading: NatalHouseReading;
  locale: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = createStyles(colors);

  const blocks: Block[] = [
    { key: 'what', label: t('natalPortrait.houseWhatItMeans'), text: reading.whatItMeans },
    { key: 'sign', label: t('natalPortrait.houseYourSign'), text: reading.yourSignHere },
  ];
  if (reading.rulerStory) {
    blocks.push({ key: 'ruler', label: t('natalPortrait.houseRuler'), text: reading.rulerStory });
  }
  if (reading.residentsStory) {
    blocks.push({
      key: 'residents',
      label: t('natalPortrait.houseResidents'),
      text: reading.residentsStory,
    });
  }

  return (
    <View style={s.wrapper}>
      <View style={s.titleBlock}>
        <AppText variant="H2" style={s.title}>{reading.title}</AppText>
      </View>

      {blocks.map((block) => (
        <TextBlock key={block.key} label={block.label} text={block.text} colors={colors} />
      ))}

      <SynthesisBlock
        label={t('natalPortrait.houseSynthesis')}
        text={reading.synthesis}
        colors={colors}
      />

      <BulletBlock
        label={t('natalPortrait.houseStrengths')}
        items={reading.strengths}
        icon="sparkles"
        tone="positive"
        colors={colors}
      />
      <BulletBlock
        label={t('natalPortrait.houseCautions')}
        items={reading.cautions}
        icon="alert-circle-outline"
        tone="caution"
        colors={colors}
      />

      <EvidenceDisclosure
        evidence={reading.evidence}
        context={`house_${reading.houseNumber}`}
        locale={locale}
      />
    </View>
  );
}

function TextBlock({
  label,
  text,
  colors,
}: {
  label: string;
  text: string;
  colors: ThemeColors;
}) {
  const s = createStyles(colors);
  if (!text) return null;
  return (
    <View style={s.block}>
      <AppText variant="CaptionBold" style={s.blockLabel}>{label}</AppText>
      <AppText variant="Small" style={s.blockText}>{text}</AppText>
    </View>
  );
}

/** The one paragraph a textbook could not have produced, so it carries the visual weight. */
function SynthesisBlock({
  label,
  text,
  colors,
}: {
  label: string;
  text: string;
  colors: ThemeColors;
}) {
  const s = createStyles(colors);
  if (!text) return null;
  return (
    <View style={s.synthesis}>
      <AppText variant="CaptionBold" style={s.synthesisLabel}>{label}</AppText>
      <AppText variant="Body" style={s.synthesisText}>{text}</AppText>
    </View>
  );
}

function BulletBlock({
  label,
  items,
  icon,
  tone,
  colors,
}: {
  label: string;
  items: string[];
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tone: 'positive' | 'caution' | 'neutral';
  colors: ThemeColors;
}) {
  const s = createStyles(colors);
  if (!items?.length) return null;

  const color =
    tone === 'positive'
      ? colors.birthChart.successAccent
      : tone === 'caution'
        ? colors.birthChart.goldAccent
        : colors.birthChart.infoAccent;

  return (
    <View style={s.block}>
      <AppText variant="CaptionBold" style={s.blockLabel}>{label}</AppText>
      <View style={s.bullets}>
        {items.map((item, index) => (
          <View key={`${item}-${index}`} style={s.bulletRow}>
            <Ionicons name={icon} size={14} color={color} style={s.bulletIcon} />
            <AppText variant="Small" style={s.bulletText}>{item}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      gap: spacing.sm,
    },
    titleBlock: {
      gap: 2,
      marginBottom: spacing.xxs,
    },
    title: {
      color: colors.birthChart.textPrimary,
    },
    subtitle: {
      color: colors.birthChart.primaryAccent,
    },
    block: {
      gap: spacing.xxs,
      backgroundColor: colors.birthChart.cardSoft,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.birthChart.cardBorder,
      borderRadius: radius.card,
      padding: spacing.md,
    },
    blockLabel: {
      color: colors.birthChart.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    blockText: {
      color: colors.birthChart.textSecondary,
      lineHeight: 20,
    },
    synthesis: {
      gap: spacing.xxs,
      backgroundColor: colors.birthChart.iconBadgeBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.birthChart.iconBadgeBorder,
      borderRadius: radius.card,
      padding: spacing.md,
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
    bullets: {
      gap: spacing.xs,
      marginTop: spacing.xxs,
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
