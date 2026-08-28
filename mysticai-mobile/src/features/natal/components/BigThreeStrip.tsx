import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Skeleton } from '../../../components/ui';
import { useTheme, type ThemeColors } from '../../../context/ThemeContext';
import { spacing, radius } from '../../../theme';
import * as Haptics from '../../../utils/haptics';

export type BigThreeRole = 'sun' | 'moon' | 'ascendant';

export interface BigThreeCardData {
  role: BigThreeRole;
  symbol: string;
  /** Localized sign name, e.g. "Balık". Null when the birth time is unknown (ascendant only). */
  sign: string | null;
  /** One line saying what this piece of the chart governs. */
  roleLabel: string;
}

interface Props {
  cards: BigThreeCardData[];
  loading: boolean;
  onSelect: (role: BigThreeRole) => void;
}

/**
 * The Big Three, reduced to three tappable cards.
 *
 * Each card answers one question in plain language — who you are, how you feel, how you are seen —
 * before any sign name is read as jargon. The detail behind each card is the redesigned sheet; the
 * strip itself stays deliberately thin so the hero above it keeps the visual weight.
 */
export default function BigThreeStrip({ cards, loading, onSelect }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = createStyles(colors);

  if (loading) {
    return (
      <View style={s.row}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={s.card}>
            <Skeleton height={72} borderRadius={radius.card} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={s.row}>
      {cards.map((card) => {
        const disabled = !card.sign;
        return (
          <Pressable
            key={card.role}
            disabled={disabled}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(card.role);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${card.roleLabel}: ${card.sign ?? t('natalPortrait.unknownSign')}`}
            style={({ pressed }) => [
              s.card,
              disabled ? s.cardDisabled : undefined,
              pressed && !disabled ? s.cardPressed : undefined,
            ]}
          >
            <AppText variant="H2" style={s.symbol}>
              {card.symbol}
            </AppText>
            <AppText variant="SmallBold" style={s.sign} numberOfLines={1}>
              {card.sign ?? t('natalPortrait.unknownSign')}
            </AppText>
            <AppText variant="CaptionSmall" style={s.roleLabel} numberOfLines={2}>
              {card.roleLabel}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: spacing.cardGap,
    },
    card: {
      flex: 1,
      alignItems: 'center',
      gap: spacing.xxs,
      backgroundColor: colors.birthChart.cardBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.birthChart.cardBorder,
      borderRadius: radius.card,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xs,
      minHeight: 108,
      justifyContent: 'center',
    },
    cardPressed: {
      opacity: 0.85,
    },
    cardDisabled: {
      opacity: 0.5,
    },
    symbol: {
      color: colors.birthChart.primaryAccent,
    },
    sign: {
      color: colors.birthChart.textPrimary,
      textAlign: 'center',
    },
    roleLabel: {
      color: colors.birthChart.textMuted,
      textAlign: 'center',
    },
  });
