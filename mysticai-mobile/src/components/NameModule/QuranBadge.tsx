import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

type QuranBadgeProps = {
  isQuranic?: boolean | null;
};

export function QuranBadge({ isQuranic }: QuranBadgeProps) {
  const { colors } = useTheme();
  if (!isQuranic) return null;

  return (
    <View style={[styles.badge, { backgroundColor: colors.violetBg, borderColor: colors.violet }]}>
      <Text style={[styles.text, { color: colors.violet }]}>Kur&apos;an</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
});
