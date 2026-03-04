import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AccessibleText } from '../ui';
import { useTheme } from '../../context/ThemeContext';
import { ACCESSIBILITY } from '../../constants/tokens';

export interface FilterOption<T extends string> {
  id: T;
  label: string;
}

interface MatchFilterChipsProps<T extends string> {
  options: Array<FilterOption<T>>;
  value: T;
  onChange: (next: T) => void;
}

export default function MatchFilterChips<T extends string>({
  options,
  value,
  onChange,
}: MatchFilterChipsProps<T>) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const active = option.id === value;
        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.violetBg : colors.surface,
                borderColor: active ? colors.violetLight : colors.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <AccessibleText
              style={[styles.chipText, { color: active ? colors.violet : colors.subtext }]}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              {option.label}
            </AccessibleText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
