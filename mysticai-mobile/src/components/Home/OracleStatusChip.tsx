import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { radius, spacing, typography } from '../../theme';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';

interface OracleStatusChipProps {
  label: string;
  enabled?: boolean;
}

export function OracleStatusChip({ label, enabled = true }: OracleStatusChipProps) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={styles.wrap}>
      <View style={styles.chip}>
        <View style={[styles.dot, !enabled && styles.dotPassive]} />
        <Text style={styles.text}>{label}</Text>
      </View>
    </View>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
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
      borderColor: C.border,
      backgroundColor: isDark ? 'rgba(28,28,40,0.88)' : 'rgba(255,255,255,0.92)',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    dot: {
      width: 9,
      height: 9,
      borderRadius: radius.pill,
      backgroundColor: C.success,
    },
    dotPassive: {
      backgroundColor: C.textMuted,
    },
    text: {
      ...typography.caption,
      color: C.text,
      fontWeight: '700',
    },
  });
}
