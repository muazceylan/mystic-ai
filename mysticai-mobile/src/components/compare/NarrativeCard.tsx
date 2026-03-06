import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AccessibleText } from '../ui';
import { ACCESSIBILITY } from '../../constants/tokens';

interface NarrativeCardProps {
  headline: string;
  narrative: string;
}

export default function NarrativeCard({ headline, narrative }: NarrativeCardProps) {
  const safeHeadline = headline?.trim() || 'Uyum ritmi dengede';
  const safeNarrative =
    narrative?.trim() ||
    'Bu modülde temel akış korunuyor. Günlük iletişim tonu ve beklenti netliği sonuç üzerinde belirleyici olabilir.';

  return (
    <View style={styles.card}>
      <AccessibleText style={styles.headline} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
        {safeHeadline}
      </AccessibleText>
      <AccessibleText style={styles.body} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
        {safeNarrative}
      </AccessibleText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7E0F1',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 8,
  },
  headline: {
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '800',
    color: '#241D37',
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4C4262',
    fontWeight: '600',
  },
});
