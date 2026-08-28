import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppText } from '../../../components/ui';
import { useTheme, type ThemeColors } from '../../../context/ThemeContext';
import { spacing, radius } from '../../../theme';
import type { NatalAspectStory, NatalAspectTheme } from '../../../services/natalPortrait.service';
import EvidenceDisclosure from './EvidenceDisclosure';

interface Props {
  story: NatalAspectStory | null | undefined;
  locale: string;
}

/**
 * Aspects, translated into lived experience.
 *
 * The old surface opened with "Sun square North Node 0.13°", which tells a beginner nothing and an
 * expert nothing they could not read off the table. Here each aspect leads with what it feels like
 * from the inside, grouped into what flows and what strains, with the technical name kept in the
 * evidence chip for anyone who wants it. The full aspect data still lives in Advanced Astrology.
 */
export default function AspectStorySection({ story, locale }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = createStyles(colors);

  const supportive = story?.supportive ?? [];
  const tension = story?.tension ?? [];

  if (!supportive.length && !tension.length) return null;

  return (
    <View style={s.wrapper}>
      {supportive.length ? (
        <Group
          title={t('natalPortrait.aspectSupportiveTitle')}
          icon="water-outline"
          tone="positive"
          themes={supportive}
          locale={locale}
          colors={colors}
        />
      ) : null}

      {tension.length ? (
        <Group
          title={t('natalPortrait.aspectTensionTitle')}
          icon="flash-outline"
          tone="caution"
          themes={tension}
          locale={locale}
          colors={colors}
        />
      ) : null}
    </View>
  );
}

function Group({
  title,
  icon,
  tone,
  themes,
  locale,
  colors,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tone: 'positive' | 'caution';
  themes: NatalAspectTheme[];
  locale: string;
  colors: ThemeColors;
}) {
  const s = createStyles(colors);
  const accent =
    tone === 'positive' ? colors.birthChart.successAccent : colors.birthChart.goldAccent;

  return (
    <View style={s.group}>
      <View style={s.groupHeader}>
        <Ionicons name={icon} size={15} color={accent} />
        <AppText variant="CaptionBold" style={[s.groupTitle, { color: accent }]}>
          {title}
        </AppText>
      </View>

      {themes.map((theme, index) => (
        <View key={`${theme.title}-${index}`} style={s.theme}>
          <AppText variant="BodyBold" style={s.themeTitle}>
            {theme.title}
          </AppText>
          <AppText variant="Small" style={s.themeBody}>
            {theme.description}
          </AppText>
          <EvidenceDisclosure
            evidence={theme.evidence}
            context={`aspect_${tone}`}
            locale={locale}
          />
        </View>
      ))}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      gap: spacing.md,
    },
    group: {
      gap: spacing.sm,
    },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
    },
    groupTitle: {
      textTransform: 'uppercase',
      letterSpacing: 0.9,
    },
    theme: {
      backgroundColor: colors.birthChart.cardBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.birthChart.cardBorder,
      borderRadius: radius.card,
      padding: spacing.md,
      gap: spacing.xxs,
    },
    themeTitle: {
      color: colors.birthChart.textPrimary,
    },
    themeBody: {
      color: colors.birthChart.textSecondary,
      lineHeight: 20,
    },
  });
