import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants/tokens';
import type { DailyActionsDTO } from '../../types/daily.types';

interface MiniPlanCardProps {
  miniPlan: DailyActionsDTO['miniPlan'];
}

export function MiniPlanCard({ miniPlan }: MiniPlanCardProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#EAE4F8',
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>{miniPlan.title}</Text>
      <View style={styles.steps}>
        {miniPlan.steps.map((step, idx) => (
          <View key={`${idx}-${step}`} style={styles.stepRow}>
            <View style={[styles.stepDot, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepDotText}>{idx + 1}</Text>
            </View>
            <Text style={[styles.stepText, { color: colors.subtext }]}>{step}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    gap: SPACING.md,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: {
    ...TYPOGRAPHY.BodyBold,
    fontSize: 21,
    lineHeight: 27,
  },
  steps: {
    gap: SPACING.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepDotText: {
    ...TYPOGRAPHY.CaptionBold,
    color: '#FFF',
    fontSize: 11,
  },
  stepText: {
    ...TYPOGRAPHY.BodyMid,
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
});

export default MiniPlanCard;
