import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

type NameTagChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function NameTagChip({ label, selected, onPress }: NameTagChipProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.chip,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.primarySoftBg : colors.surfaceAlt,
        },
      ]}
    >
      <Text style={[styles.text, { color: selected ? colors.primary : colors.textSoft }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
