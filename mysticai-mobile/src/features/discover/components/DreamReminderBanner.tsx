import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../context/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../../constants/tokens';
import { AccessibleText } from '../../../components/ui/AccessibleText';
import { useTranslation } from 'react-i18next';

export function DreamReminderBanner() {
  const hour = new Date().getHours();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  if (hour < 6 || hour >= 10) return null;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/(tabs)/dreams' as any);
      }}
      style={styles.wrapper}
      accessibilityRole="button"
      accessibilityLabel={t('discover.dreamReminder')}
    >
      <LinearGradient
        colors={isDark ? ['#2A1A4A', '#1A0A3A'] : ['#DDD6FE', '#C4B5FD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Ionicons name="moon" size={20} color={isDark ? '#C4B5FD' : '#7C3AED'} />
        <View style={styles.textCol}>
          <AccessibleText
            style={[TYPOGRAPHY.SmallBold, { color: isDark ? '#E9D5FF' : '#5B21B6' }]}
          >
            {t('discover.dreamReminder')}
          </AccessibleText>
          <AccessibleText
            style={[TYPOGRAPHY.CaptionXS, { color: isDark ? '#C4B5FD' : '#7C3AED' }]}
          >
            {t('discover.dreamReminderHint')}
          </AccessibleText>
        </View>
        <Ionicons name="chevron-forward" size={16} color={isDark ? '#C4B5FD' : '#7C3AED'} />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  textCol: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
});
