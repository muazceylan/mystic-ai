import React, { useCallback, useMemo } from 'react';
import { View, Text, RefreshControl, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, ThemeColors } from '../../../context/ThemeContext';
import { TYPOGRAPHY, SPACING } from '../../../constants/tokens';
import { SafeScreen } from '../../../components/ui/SafeScreen';
import { TabHeader } from '../../../components/ui/TabHeader';
import { useNatalChartStore } from '../../../store/useNatalChartStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { useHoroscopeStore } from '../store/useHoroscopeStore';
import { getSignFromBirthDate, resolveZodiacSign } from '../utils/zodiacData';
import { ZodiacSign } from '../types/horoscope.types';
import { UserSignCard } from '../components/UserSignCard';
import { ZodiacGrid } from '../components/ZodiacGrid';
import { HoroscopeHubSkeleton } from '../components/HoroscopeSkeleton';

export default function HoroscopeHubScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const S = makeStyles(colors, isDark);
  const lang = (i18n.resolvedLanguage ?? i18n.language ?? 'tr').toLowerCase();

  const chart = useNatalChartStore((s) => s.chart);
  const user = useAuthStore((s) => s.user);
  const { current, loading, fetch: fetchHoroscope, period } = useHoroscopeStore();

  const userSign = useMemo<ZodiacSign | null>(() => {
    if (chart?.sunSign) {
      return resolveZodiacSign(chart.sunSign);
    }
    if (user?.birthDate) {
      return getSignFromBirthDate(user.birthDate);
    }
    return null;
  }, [chart?.sunSign, user?.birthDate]);

  const handleSignSelect = useCallback((sign: ZodiacSign) => {
    router.push(`/horoscope/${sign}` as any);
  }, [router]);

  const handleUserCardPress = useCallback(() => {
    if (userSign) {
      router.push(`/horoscope/${userSign}` as any);
    }
  }, [router, userSign]);

  const handleRefresh = useCallback(() => {
    if (userSign) {
      fetchHoroscope(userSign, period);
    }
  }, [userSign, period, fetchHoroscope]);

  return (
    <SafeScreen edges={['top', 'left', 'right']}>
      <TabHeader title={t('horoscope.hubTitle')} />
      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={S.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            tintColor={colors.horoscopeAccent}
          />
        }
      >
        {userSign && (
          <UserSignCard
            sign={userSign}
            lang={lang}
            onPress={handleUserCardPress}
            summary={current?.sign === userSign ? current.sections.general?.slice(0, 120) + '...' : undefined}
          />
        )}

        <View style={S.sectionHeader}>
          <Text style={S.sectionTitle}>{t('horoscope.allSigns')}</Text>
        </View>

        <ZodiacGrid
          userSign={userSign}
          onSelect={handleSignSelect}
          lang={lang}
        />

        <View style={{ height: 120 }} />
      </Animated.ScrollView>
    </SafeScreen>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.sm,
    },
    sectionHeader: {
      marginTop: SPACING.xl,
      marginBottom: SPACING.md,
    },
    sectionTitle: {
      ...TYPOGRAPHY.H3,
      color: C.text,
    },
  });
}
