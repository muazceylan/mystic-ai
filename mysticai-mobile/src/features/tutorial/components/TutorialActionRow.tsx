import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';

interface TutorialActionRowProps {
  isLastStep: boolean;
  onSkip: () => void;
  onNext: () => void;
  children?: React.ReactNode;
}

export function TutorialActionRow({ isLastStep, onSkip, onNext, children }: TutorialActionRowProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Rehberi geç"
        onPress={onSkip}
        style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
      >
        <Text style={[styles.skipText, { color: colors.text }]}>Geç</Text>
      </Pressable>

      <View style={styles.centerSlot}>{children}</View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isLastStep ? 'Rehberi bitir' : 'Sonraki adıma geç'}
        onPress={onNext}
        style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
      >
        <Text style={[styles.nextText, { color: colors.primary }]}>{isLastStep ? 'Bitir' : 'İleri'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  actionButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  centerSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '500',
  },
  nextText: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.74,
  },
});
