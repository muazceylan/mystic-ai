import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme, ThemeColors } from '../../../context/ThemeContext';
import { useNatalChartStore } from '../../../store/useNatalChartStore';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../../constants/tokens';
import { AccessibleText } from '../../../components/ui/AccessibleText';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useTranslation } from 'react-i18next';
import { localizeSignName } from '../../../utils/matchAstroLabels';

interface ChipProps {
  label: string;
  value: string | undefined;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  colors: ThemeColors;
}

function SignChip({ label, value, icon, colors }: ChipProps) {
  return (
    <View style={[chipStyles.chip, { backgroundColor: colors.primarySoftBg }]}>
      <Ionicons name={icon} size={14} color={colors.primary} />
      <AccessibleText style={[TYPOGRAPHY.CaptionBold, { color: colors.primary, marginLeft: 4 }]}>
        {label}
      </AccessibleText>
      <AccessibleText style={[TYPOGRAPHY.Caption, { color: colors.textSoft, marginLeft: 4 }]}>
        {value ?? '—'}
      </AccessibleText>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xsSm,
    marginRight: SPACING.sm,
  },
});

export function QuickLookWidget() {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const chart = useNatalChartStore((s) => s.chart);
  const lang = (i18n.resolvedLanguage ?? i18n.language ?? 'tr').toLowerCase();

  const formatSign = (value: string | null | undefined) => {
    if (!value) return '—';
    if (lang.startsWith('tr')) {
      return localizeSignName(value, value);
    }
    return value;
  };

  if (!chart) {
    return (
      <View style={styles.row}>
        <Skeleton width={100} height={28} borderRadius={RADIUS.full} />
        <Skeleton width={90} height={28} borderRadius={RADIUS.full} style={{ marginLeft: SPACING.sm }} />
        <Skeleton width={110} height={28} borderRadius={RADIUS.full} style={{ marginLeft: SPACING.sm }} />
      </View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.row}>
      <SignChip
        label={t('natalChart.sun')}
        value={formatSign(chart.sunSign)}
        icon="sunny-outline"
        colors={colors}
      />
      <SignChip
        label={t('natalChart.moon')}
        value={formatSign(chart.moonSign)}
        icon="moon-outline"
        colors={colors}
      />
      <SignChip
        label={t('natalChart.rising')}
        value={formatSign(chart.risingSign)}
        icon="arrow-up-outline"
        colors={colors}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
});
