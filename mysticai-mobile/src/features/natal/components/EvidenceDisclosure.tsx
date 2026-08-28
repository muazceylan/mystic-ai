import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppText } from '../../../components/ui';
import { useTheme, type ThemeColors } from '../../../context/ThemeContext';
import { spacing, radius } from '../../../theme';
import * as Haptics from '../../../utils/haptics';
import type { NatalEvidence } from '../../../services/natalPortrait.service';
import natalAnalytics from '../analytics';

interface Props {
  evidence: NatalEvidence[];
  /** Identifies which card the disclosure belongs to, for analytics. */
  context: string;
  locale: string;
}

/**
 * The third layer of the reading: "Bu yorumu neden yaptık?".
 *
 * Astrological vocabulary — orb, square, 8th house, North Node — is banned from the interpretation
 * text itself and lives only here, one tap away. That inversion is the point of the redesign: the
 * reader gets a statement about themselves first, and the technical justification only if they ask
 * for it. Keeping the receipts visible (rather than dropping them) is what separates this from a
 * horoscope generator.
 */
export default function EvidenceDisclosure({ evidence, context, locale }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = createStyles(colors);
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => {
    const next = !open;
    setOpen(next);
    Haptics.selectionAsync();
    if (next) {
      natalAnalytics.evidenceOpened({ context, evidence_count: evidence.length, locale });
    }
  }, [open, context, evidence.length, locale]);

  if (!evidence?.length) return null;

  return (
    <View style={s.wrapper}>
      <Pressable
        onPress={toggle}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={t('natalPortrait.evidenceToggleA11y')}
        style={s.toggle}
      >
        <Ionicons
          name={open ? 'chevron-up' : 'help-circle-outline'}
          size={14}
          color={colors.birthChart.primaryAccent}
        />
        <AppText variant="Caption" style={s.toggleLabel}>
          {t('natalPortrait.evidenceToggle')}
        </AppText>
      </Pressable>

      {open ? (
        <View style={s.chips}>
          {evidence.map((item, index) => (
            <View key={`${item.label}-${index}`} style={s.chip}>
              <AppText variant="Caption" style={s.chipText}>
                {item.label}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      marginTop: spacing.sm,
    },
    toggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      alignSelf: 'flex-start',
      paddingVertical: spacing.xxs,
    },
    toggleLabel: {
      color: colors.birthChart.primaryAccent,
      fontWeight: '600',
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    chip: {
      backgroundColor: colors.birthChart.cardSoft,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.birthChart.cardBorder,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
    },
    chipText: {
      color: colors.birthChart.textSecondary,
    },
  });
