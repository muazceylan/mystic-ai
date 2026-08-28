import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppText } from '../../../components/ui';
import { useTheme, type ThemeColors } from '../../../context/ThemeContext';
import { spacing, radius } from '../../../theme';
import * as Haptics from '../../../utils/haptics';
import type { LevelTier, QualitativeLevel } from '../types';

interface Props {
  levels: QualitativeLevel[];
}

const TIER_FILL: Record<LevelTier, number> = {
  veryStrong: 1,
  strong: 0.75,
  balanced: 0.5,
  sensitive: 0.28,
};

/**
 * Qualitative chart emphasis, replacing the old 0-100 radar numbers.
 *
 * Those numbers looked precise but were not: they came from a fixed base per role nudged by
 * element and modality, so two people with the same rising sign got the same "Kimlik 84" no matter
 * what the rest of their chart said. Displaying that as a score implied a measurement that was
 * never taken.
 *
 * These tiers are derived from counts the reader can verify — how many planets sit in an element,
 * how many aspects are supportive versus tense — and each one carries the count it came from, so
 * "how was this determined?" has an honest answer.
 */
export default function QualitativeLevels({ levels }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = createStyles(colors);
  const [showReasons, setShowReasons] = useState(false);

  const toggle = useCallback(() => {
    setShowReasons((prev) => !prev);
    Haptics.selectionAsync();
  }, []);

  if (!levels.length) return null;

  const tierLabel = (tier: LevelTier) => t(`natalPortrait.level.${tier}`);
  const tierColor = (tier: LevelTier) => {
    switch (tier) {
      case 'veryStrong':
        return colors.birthChart.primaryAccent;
      case 'strong':
        return colors.birthChart.secondaryAccent;
      case 'balanced':
        return colors.birthChart.infoAccent;
      default:
        return colors.birthChart.textMuted;
    }
  };

  return (
    <View style={s.wrapper}>
      {levels.map((level) => (
        <View key={level.key} style={s.row}>
          <View style={s.header}>
            <AppText variant="Small" style={s.label}>
              {level.label}
            </AppText>
            <AppText variant="CaptionBold" style={[s.tier, { color: tierColor(level.tier) }]}>
              {tierLabel(level.tier)}
            </AppText>
          </View>

          <View style={s.track}>
            <View
              style={[
                s.fill,
                { width: `${TIER_FILL[level.tier] * 100}%`, backgroundColor: tierColor(level.tier) },
              ]}
            />
          </View>

          {showReasons ? (
            <AppText variant="CaptionSmall" style={s.reason}>
              {level.reason}
            </AppText>
          ) : null}
        </View>
      ))}

      <Pressable
        onPress={toggle}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityState={{ expanded: showReasons }}
        style={s.toggle}
      >
        <Ionicons
          name={showReasons ? 'chevron-up' : 'information-circle-outline'}
          size={14}
          color={colors.birthChart.primaryAccent}
        />
        <AppText variant="Caption" style={s.toggleText}>
          {t('natalPortrait.levelHowCalculated')}
        </AppText>
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      gap: spacing.sm,
    },
    row: {
      gap: spacing.xxs,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    label: {
      color: colors.birthChart.textSecondary,
      flex: 1,
    },
    tier: {
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    track: {
      height: 6,
      borderRadius: radius.pill,
      backgroundColor: colors.birthChart.cardBorder,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: radius.pill,
    },
    reason: {
      color: colors.birthChart.textMuted,
      marginTop: spacing.xxs,
    },
    toggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      alignSelf: 'flex-start',
      paddingVertical: spacing.xxs,
    },
    toggleText: {
      color: colors.birthChart.primaryAccent,
      fontWeight: '600',
    },
  });

export type { LevelTier, QualitativeLevel };
