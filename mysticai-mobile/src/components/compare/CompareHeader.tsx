import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { AccessibleText } from '../ui';
import { ACCESSIBILITY } from '../../constants/tokens';

interface CompareHeaderProps {
  title: string;
  onBack: () => void;
  subtitle?: string;
}

export default function CompareHeader({ title, onBack, subtitle }: CompareHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable onPress={onBack} style={styles.backBtn} accessibilityRole="button">
          <ChevronLeft size={20} color="#2A2140" />
        </Pressable>
        <AccessibleText style={styles.title} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
          {title}
        </AccessibleText>
      </View>

      {subtitle ? (
        <AccessibleText
          style={styles.subtitle}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          {subtitle}
        </AccessibleText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7E0F1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 31,
    fontWeight: '800',
    color: '#221A35',
    letterSpacing: -0.45,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5E5575',
    lineHeight: 19,
  },
});
