import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { TUTORIAL_DEFAULTS } from '../domain/tutorial.constants';
import type { TutorialStep } from '../domain/tutorial.types';
import { TutorialActionRow } from './TutorialActionRow';
import { TutorialStepIndicator } from './TutorialStepIndicator';
import { TutorialToggleRow } from './TutorialToggleRow';

interface TutorialTooltipCardProps {
  step: TutorialStep;
  currentStep: number;
  totalSteps: number;
  isLastStep: boolean;
  variant?: 'spotlight' | 'fullscreen' | 'fallback';
  dontShowAgain: boolean;
  onNext: () => void;
  onSkip: () => void;
  onReplay: () => void;
  onToggleDontShowAgain: (value: boolean) => void;
}

export function TutorialTooltipCard({
  step,
  currentStep,
  totalSteps,
  isLastStep,
  variant = 'spotlight',
  dontShowAgain,
  onNext,
  onSkip,
  onReplay,
  onToggleDontShowAgain,
}: TutorialTooltipCardProps) {
  const { colors, isDark } = useTheme();
  const iconName = (step.iconKey ?? 'sparkles-outline') as React.ComponentProps<typeof Ionicons>['name'];
  const bodyLineCount = variant === 'fullscreen' ? TUTORIAL_DEFAULTS.CARD_MAX_BODY_LINES + 1 : TUTORIAL_DEFAULTS.CARD_MAX_BODY_LINES;

  return (
    <LinearGradient
      colors={
        isDark
          ? ['rgba(49,36,82,0.97)', 'rgba(40,28,70,0.96)', 'rgba(31,22,57,0.96)']
          : ['rgba(255,255,255,0.98)', 'rgba(248,243,255,0.97)', 'rgba(243,235,255,0.96)']
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.card,
        variant === 'fullscreen' && styles.cardFullscreen,
        {
          borderColor: isDark ? 'rgba(226,212,255,0.34)' : 'rgba(174,142,244,0.34)',
          shadowColor: isDark ? '#08040F' : '#9A6EFF',
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(130,96,229,0.12)' },
            ]}
          >
            <Ionicons name={iconName} size={20} color={isDark ? '#F9DFA0' : '#7B4DFF'} />
          </View>
          <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
            {step.title}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip"
          onPress={onSkip}
          style={({ pressed }) => [styles.skipChip, pressed && styles.pressed]}
        >
          <Text style={[styles.skipChipText, { color: colors.textMuted }]}>Skip</Text>
        </Pressable>
      </View>

      <Text
        numberOfLines={bodyLineCount}
        style={[styles.body, { color: colors.subtext }]}
      >
        {step.body}
      </Text>

      <View
        style={[
          styles.innerPanel,
          {
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(156,129,229,0.2)',
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.45)',
          },
        ]}
      >
        <TutorialActionRow isLastStep={isLastStep} onSkip={onSkip} onNext={onNext}>
          <TutorialStepIndicator currentStep={currentStep} totalSteps={totalSteps} />
        </TutorialActionRow>
      </View>

      <TutorialToggleRow
        dontShowAgain={dontShowAgain}
        onReplay={onReplay}
        onToggleDontShowAgain={onToggleDontShowAgain}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.26,
    shadowRadius: 26,
    elevation: 14,
  },
  cardFullscreen: {
    borderRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flexShrink: 1,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700',
  },
  skipChip: {
    minHeight: 32,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  skipChipText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  body: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  innerPanel: {
    marginTop: 14,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pressed: {
    opacity: 0.74,
  },
});
