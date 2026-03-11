import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

type QuranBadgeProps = {
  isQuranic?: boolean | null;
};

export function QuranBadge({ isQuranic }: QuranBadgeProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (!isQuranic) return null;

  return (
    <View style={[styles.badge, { backgroundColor: colors.violetBg, borderColor: colors.violet }]}>
      <Text style={[styles.text, { color: colors.violet }]}>{t('nameAnalysis.quranBadge')}</Text>
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
