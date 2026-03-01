import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
} from '../utils/zodiacData';
import type { ZodiacSign } from '../types/horoscope.types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function HomeHoroscopeSection() {
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const chart = useNatalChartStore((s) => s.chart);
  const user = useAuthStore((s) => s.user);
  const S = makeStyles(colors, isDark);
  const lang = (i18n.resolvedLanguage ?? i18n.language ?? 'tr').toLowerCase();

  const userSign = useMemo<ZodiacSign | null>(() => {
    if (chart?.sunSign) return chart.sunSign.toLowerCase() as ZodiacSign;
    if (user?.birthDate) return getSignFromBirthDate(user.birthDate);
    return null;
  }, [chart?.sunSign, user?.birthDate]);

  const signData = userSign ? ZODIAC_MAP.get(userSign) : null;

  if (!signData) return null;

  const signName = lang.startsWith('en') ? signData.nameEn : signData.nameTr;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(200)} style={S.wrapper}>
      <View style={S.headerRow}>
        <AccessibleText style={S.sectionTitle}>
          {t('horoscope.title')}
        </AccessibleText>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(tabs)/horoscope' as any);
          }}
          hitSlop={8}
        >
          <AccessibleText style={S.seeAll}>
            {t('horoscope.allSigns')} →
          </AccessibleText>
        </Pressable>
      </View>

      <View style={S.cardsRow}>
        <HoroscopeCard
          emoji={signData.emoji}
          title={`${t('horoscope.today')} · ${signName}`}
          subtitle={t('horoscope.dailyForecast')}
          colors={colors}
          isDark={isDark}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/horoscope/${userSign}` as any);
          }}
        />
        <HoroscopeCard
          emoji="📅"
          title={`${t('horoscope.thisWeek')} · ${signName}`}
          subtitle={t('horoscope.weeklyForecast')}
          colors={colors}
          isDark={isDark}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push({ pathname: `/horoscope/${userSign}` as any, params: { period: 'weekly' } });
          }}
        />
      </View>
    </Animated.View>
  );
}

interface HoroscopeCardProps {
  emoji: string;
  title: string;
  subtitle: string;
  colors: ThemeColors;
  isDark: boolean;
  onPress: () => void;
}

function HoroscopeCard({ emoji, title, subtitle, colors, isDark, onPress }: HoroscopeCardProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  return (
    <AnimatedPressable
      style={[
        cardStyles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isDark ? colors.border : colors.borderLight,
        },
        animStyle,
      ]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      accessibilityRole="button"
    >
      <AccessibleText style={cardStyles.emoji}>{emoji}</AccessibleText>
      <AccessibleText
        style={[cardStyles.title, { color: colors.text }]}
        numberOfLines={1}
      >
        {title}
      </AccessibleText>
      <AccessibleText
        style={[cardStyles.subtitle, { color: colors.horoscopeAccent }]}
        numberOfLines={1}
      >
        {subtitle} →
      </AccessibleText>
    </AnimatedPressable>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    marginHorizontal: SPACING.xs,
  },
  emoji: {
    fontSize: 24,
    marginBottom: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.SmallBold,
  },
  subtitle: {
    ...TYPOGRAPHY.CaptionBold,
    marginTop: 4,
  },
});

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    wrapper: {
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.lg,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACING.md,
    },
    sectionTitle: {
      ...TYPOGRAPHY.H3,
      color: C.text,
    },
    seeAll: {
      ...TYPOGRAPHY.CaptionBold,
      color: C.horoscopeAccent,
    },
    cardsRow: {
      flexDirection: 'row',
      marginHorizontal: -SPACING.xs,
    },
  });
}
