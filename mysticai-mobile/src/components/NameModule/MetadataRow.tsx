import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

type MetadataRowProps = {
  label: string;
  value?: string | null;
};

export function MetadataRow({ label, value }: MetadataRowProps) {
  const { colors } = useTheme();
  if (!value) return null;

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.subtext }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
});
