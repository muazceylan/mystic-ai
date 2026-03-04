import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

interface OracleStatusChipProps {
  label: string;
  enabled?: boolean;
}

export function OracleStatusChip({ label, enabled = true }: OracleStatusChipProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.chip}>
        <View style={[styles.dot, !enabled && styles.dotPassive]} />
        <Text style={styles.text}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  chip: {
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
  },
  dotPassive: {
    backgroundColor: colors.textMuted,
  },
  text: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
  },
});
