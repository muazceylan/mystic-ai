import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants/tokens';
import type { DailyTransitsDTO } from '../../types/daily.types';

interface HeroCardProps {
  hero: DailyTransitsDTO['hero'];
}

const HERO_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  saturn: 'planet',
  moon: 'moon',
  venus: 'heart',
  mars: 'flash',
  mercury: 'chatbubble-ellipses',
  jupiter: 'sunny',
  sun: 'sunny',
};

const GRADIENTS: Record<string, [string, string, string]> = {
  purpleMist: ['#F3ECFF', '#EEE5FF', '#F7F1FF'],
  nightSky: ['#E8E4FF', '#ECEFFF', '#F6F4FF'],
  sunrise: ['#FFE8E0', '#F8E6FF', '#F3EDFF'],
};

export function HeroCard({ hero }: HeroCardProps) {
  const { colors, isDark } = useTheme();
  const iconName = HERO_ICON_MAP[hero.icon] ?? 'planet';
  const gradient = GRADIENTS[hero.gradientKey] ?? GRADIENTS.purpleMist;

  return (
    <LinearGradient
      colors={
        isDark
          ? ['rgba(132,105,238,0.34)', 'rgba(103,88,190,0.26)', 'rgba(75,70,134,0.24)']
          : gradient
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.wrap,
        {
          borderColor: isDark ? 'rgba(167,148,255,0.38)' : '#E7DFFD',
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : '#ECE4FF' }]}>
          <Ionicons name={iconName} size={20} color={isDark ? '#FFF' : '#5E3FD6'} />
        </View>
        <View style={[styles.moodPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : '#FFFFFFAA' }]}>
          <Text style={[styles.moodText, { color: colors.text }]}>{hero.moodTag}</Text>
          <Text style={[styles.moodIntensity, { color: colors.subtext }]}>{hero.intensity}%</Text>
        </View>
      </View>

      <Text style={[styles.headline, { color: colors.text }]}>
        {hero.headline}
      </Text>
      <Text style={[styles.supporting, { color: colors.subtext }]}>
        {hero.supporting}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: SPACING.lgXl,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
    minHeight: 200,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodPill: {
    borderRadius: 999,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xsSm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  moodText: {
    ...TYPOGRAPHY.SmallBold,
  },
  moodIntensity: {
    ...TYPOGRAPHY.CaptionBold,
  },
  headline: {
    ...TYPOGRAPHY.H2,
  },
  supporting: {
    ...TYPOGRAPHY.BodyMid,
  },
});

export default HeroCard;
