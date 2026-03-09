import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';

interface TutorialStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function TutorialStepIndicator({ currentStep, totalSteps }: TutorialStepIndicatorProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.wrapper}>
      <View style={styles.dotsRow}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const active = index === currentStep;
          return (
            <View
              key={`tutorial-dot-${index + 1}`}
              style={[
                styles.dot,
                {
                  backgroundColor: active
                    ? (isDark ? '#F7D990' : '#FFD976')
                    : (isDark ? 'rgba(255,255,255,0.26)' : 'rgba(95,77,147,0.25)'),
                  width: active ? 10 : 8,
                  height: active ? 10 : 8,
                },
              ]}
            />
          );
        })}
      </View>
      <Text style={[styles.text, { color: colors.text }]}>{`${currentStep + 1} / ${totalSteps}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    borderRadius: 8,
  },
  text: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
  },
});
