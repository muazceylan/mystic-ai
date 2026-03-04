import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AccessibleText } from '../ui';
import { useTheme } from '../../context/ThemeContext';
import { ACCESSIBILITY } from '../../constants/tokens';

interface MatchCategoryPillProps {
  label: string;
  value: number;
  Icon: LucideIcon;
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function MatchCategoryPill({ label, value, Icon }: MatchCategoryPillProps) {
  const { colors } = useTheme();
  const safeValue = clampScore(value);

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
      accessibilityRole="summary"
      accessibilityLabel={`${label} yüzde ${safeValue}`}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.primarySoftBg }]}> 
        <Icon size={14} color={colors.violet} strokeWidth={2.3} />
      </View>
      <AccessibleText style={[styles.label, { color: colors.subtext }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
        {label}
      </AccessibleText>
      <AccessibleText style={[styles.value, { color: colors.text }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
        %{safeValue}
      </AccessibleText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    minWidth: '47%',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
