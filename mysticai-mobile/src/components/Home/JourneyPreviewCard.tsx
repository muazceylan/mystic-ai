import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';
import { radius, shadowSubtle, spacing, typography } from '../../theme';

interface JourneyPreviewCardProps {
  completedToday: number;
  practiceRecordCount: number;
  streakDays: number;
  onPress: () => void;
  embedded?: boolean;
}

const MAX_FONT_SCALE = 1.3;

export function JourneyPreviewCard({
  completedToday,
  practiceRecordCount,
  streakDays,
  onPress,
  embedded = false,
}: JourneyPreviewCardProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const hasActivity = completedToday > 0 || practiceRecordCount > 0 || streakDays > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('homeJourney.openAccessibility')}
      testID="home-journey-preview"
      style={({ pressed }) => [
        styles.card,
        embedded && styles.embeddedCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.iconShell}>
        <Ionicons name="trail-sign-outline" size={22} color={colors.primary} />
      </View>
      <View style={styles.copy}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>
          {t('homeJourney.title')}
        </Text>
        {hasActivity ? (
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.subtitle}>
            {t('homeJourney.summary', {
              actions: completedToday,
              practices: practiceRecordCount,
              streak: streakDays,
            })}
          </Text>
        ) : (
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.subtitle}>
            {t('homeJourney.empty')}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={19} color={colors.primary} />
    </Pressable>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    card: {
      marginTop: spacing.cardGap,
      minHeight: 76,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      ...shadowSubtle,
    },
    embeddedCard: {
      marginTop: 0,
      borderRadius: radius.md,
      backgroundColor: C.surfaceAlt,
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    iconShell: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(168,85,247,0.16)' : C.primarySoftBg,
      borderWidth: 1,
      borderColor: C.border,
    },
    copy: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    title: {
      ...typography.H2,
      color: C.text,
      fontSize: 17,
      lineHeight: 22,
    },
    subtitle: {
      ...typography.Caption,
      color: C.subtext,
      lineHeight: 18,
    },
    pressed: {
      opacity: 0.78,
    },
  });
}
