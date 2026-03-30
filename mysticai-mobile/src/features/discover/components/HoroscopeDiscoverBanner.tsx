import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../../../utils/haptics';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, ThemeColors } from '../../../context/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../../constants/tokens';
import { AccessibleText } from '../../../components/ui/AccessibleText';
import { useNatalChartStore } from '../../../store/useNatalChartStore';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  ZODIAC_MAP,
  getSignFromBirthDate,
  resolveZodiacSign,
} from '../../horoscope/utils/zodiacData';
import type { ZodiacSign } from '../../horoscope/types/horoscope.types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function HoroscopeDiscoverBanner() {
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const chart = useNatalChartStore((s) => s.chart);
  const user = useAuthStore((s) => s.user);
  const S = makeStyles(colors, isDark);
  const lang = (i18n.resolvedLanguage ?? i18n.language ?? 'tr').toLowerCase();

  const userSign = useMemo<ZodiacSign | null>(() => {
    if (chart?.sunSign) return resolveZodiacSign(chart.sunSign);
    if (user?.birthDate) return getSignFromBirthDate(user.birthDate);
    return null;
  }, [chart?.sunSign, user?.birthDate]);

  const signData = userSign ? ZODIAC_MAP.get(userSign) : null;

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (userSign) {
      router.push(`/horoscope/${userSign}` as any);
    } else {
      router.push('/(tabs)/horoscope' as any);
    }
  }, [router, userSign]);

  const handleSeeAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/horoscope' as any);
  }, [router]);

  if (!signData) return null;

  const signName = lang.startsWith('en') ? signData.nameEn : signData.nameTr;
  const dateRange = lang.startsWith('en') ? signData.dateRange : signData.dateRangeTr;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(100)} style={S.wrapper}>
      <AnimatedPressable
        style={[S.banner, animStyle]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`${signName} ${t('horoscope.dailyForecast')}`}
      >
        <LinearGradient
          colors={isDark
            ? ['rgba(168,85,247,0.15)', 'rgba(168,85,247,0.04)']
            : ['rgba(157,78,221,0.08)', 'rgba(157,78,221,0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={S.gradient}
        >
          <View style={S.leftCol}>
            <AccessibleText style={S.emoji}>{signData.emoji}</AccessibleText>
          </View>

          <View style={S.centerCol}>
            <AccessibleText style={S.signName}>{signName}</AccessibleText>
            <AccessibleText style={S.dateRange}>{dateRange}</AccessibleText>
            <AccessibleText style={S.cta} numberOfLines={1}>
              {t('horoscope.dailyForecast')} →
            </AccessibleText>
          </View>

          <Pressable onPress={handleSeeAll} style={S.seeAllBtn} hitSlop={8}>
            <AccessibleText style={S.seeAllText}>
              {t('horoscope.allSigns')}
            </AccessibleText>
            <Ionicons name="grid-outline" size={14} color={colors.horoscopeAccent} />
          </Pressable>
        </LinearGradient>
      </AnimatedPressable>
    </Animated.View>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    wrapper: {
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.sm,
      paddingBottom: SPACING.xs,
    },
    banner: {
      borderRadius: RADIUS.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(168,85,247,0.18)' : 'rgba(157,78,221,0.12)',
    },
    gradient: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
    },
    leftCol: {
      marginRight: SPACING.md,
    },
    emoji: {
      fontSize: 36,
    },
    centerCol: {
      flex: 1,
    },
    signName: {
      ...TYPOGRAPHY.BodyBold,
      color: C.text,
    },
    dateRange: {
      ...TYPOGRAPHY.CaptionSmall,
      color: C.subtext,
      marginTop: 1,
    },
    cta: {
      ...TYPOGRAPHY.CaptionBold,
      color: C.horoscopeAccent,
      marginTop: 4,
    },
    seeAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(168,85,247,0.12)' : 'rgba(157,78,221,0.08)',
      borderRadius: RADIUS.full,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
    },
    seeAllText: {
      ...TYPOGRAPHY.CaptionSmall,
      color: C.horoscopeAccent,
    },
  });
}
