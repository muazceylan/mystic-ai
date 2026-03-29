import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Lightbulb } from 'lucide-react-native';
import { AccessibleText } from '../ui';
import { ACCESSIBILITY } from '../../constants/tokens';
import { useTranslation } from 'react-i18next';

interface DailyLifeHintCardProps {
  hint: string;
}

export default function DailyLifeHintCard({ hint }: DailyLifeHintCardProps) {
  const { t } = useTranslation();
  const safeHint = hint?.trim() || t('compare.dailyLifeHint');

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Lightbulb size={14} color="#7C3AED" />
      </View>
      <AccessibleText style={styles.text} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
        {safeHint}
      </AccessibleText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7E0F1',
    backgroundColor: '#FAF7FF',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFE7FF',
    borderWidth: 1,
    borderColor: '#DFCFFF',
  },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#4C4262',
    fontWeight: '700',
  },
});
