import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../../components/OnboardingBackground';
import CalendarPicker from '../../components/CalendarPicker';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { getZodiacSign } from '../../constants/index';
import { useTheme } from '../../context/ThemeContext';
import { SafeScreen } from '../../components/ui';
import { useAuthStore, isGuestUser } from '../../store/useAuthStore';

const FALLBACK_BIRTH_DATE = new Date(1995, 0, 1);
const MINIMUM_BIRTH_DATE = new Date(1920, 0, 1);

function calculateAge(date: Date): number {
  const now = new Date();
  let years = now.getFullYear() - date.getFullYear();
  const monthDelta = now.getMonth() - date.getMonth();

  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < date.getDate())) {
    years -= 1;
  }

  return Math.max(0, years);
}

function formatBirthDate(date: Date, months: string[], isTurkish: boolean) {
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  if (isTurkish) {
    return `${day} ${month} ${year}`;
  }

  return `${month} ${day}, ${year}`;
}

function makeStyles(
  C: ReturnType<typeof useTheme>['colors'],
  isDark: boolean,
) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
    },
    scrollContent: {
      paddingHorizontal: 12,
      paddingTop: 6,
      paddingBottom: 112,
      gap: 6,
    },
    selectionCard: {
      borderRadius: 26,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 12,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      shadowColor: C.shadow,
      shadowOpacity: isDark ? 0.16 : 0.06,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 24,
      elevation: 4,
    },
    selectionAccent: {
      height: 3,
      width: 68,
      borderRadius: 999,
      marginBottom: 8,
    },
    selectionLabel: {
      color: C.primary,
      fontSize: 11,
      letterSpacing: 1,
      textTransform: 'uppercase',
      fontFamily: 'MysticInter-SemiBold',
    },
    selectionDate: {
      marginTop: 4,
      color: C.text,
      fontSize: 22,
      lineHeight: 28,
      fontFamily: 'MysticInter-SemiBold',
    },
    selectionHint: {
      marginTop: 4,
      color: C.subtext,
      fontSize: 11,
      lineHeight: 16,
      fontFamily: 'MysticInter-Regular',
    },
    statRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 8,
    },
    statPill: {
      flex: 1,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 7,
      backgroundColor: isDark ? C.surfaceAlt : C.primarySoftBg,
      borderWidth: 1,
      borderColor: C.border,
    },
    statLabel: {
      color: C.subtext,
      fontSize: 9,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      fontFamily: 'MysticInter-SemiBold',
    },
    statValue: {
      marginTop: 3,
      color: C.text,
      fontSize: 14,
      lineHeight: 17,
      fontFamily: 'MysticInter-SemiBold',
    },
    calendarCard: {
      borderRadius: 28,
      paddingHorizontal: 10,
      paddingTop: 10,
      paddingBottom: 8,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      shadowColor: C.shadow,
      shadowOpacity: isDark ? 0.16 : 0.06,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 24,
      elevation: 4,
    },
    calendarSurface: {
      borderRadius: 18,
      backgroundColor: C.surface,
    },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 16,
      backgroundColor: isDark ? 'rgba(2, 6, 23, 0.9)' : 'rgba(248, 250, 252, 0.98)',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: C.border,
    },
    outlineButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      borderRadius: 999,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.surface,
    },
    outlineText: {
      color: C.text,
      fontSize: 15,
      fontFamily: 'MysticInter-SemiBold',
    },
    primaryButton: {
      flex: 1.12,
      borderRadius: 999,
      overflow: 'hidden',
    },
    primaryFill: {
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    primaryText: {
      color: C.white,
      fontSize: 15,
      fontFamily: 'MysticInter-SemiBold',
    },
  });
}

export default function BirthDateScreen() {
  const { t, i18n } = useTranslation();
  const { colors, activeTheme } = useTheme();
  const initialBirthDate = useOnboardingStore((s) => s.birthDate);
  const setBirthDate = useOnboardingStore((s) => s.setBirthDate);
  const setZodiacSign = useOnboardingStore((s) => s.setZodiacSign);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [selectedDate, setSelectedDate] = useState<Date>(initialBirthDate ?? FALLBACK_BIRTH_DATE);

  const isDark = activeTheme === 'dark';
  const isTurkish = i18n.language.toLocaleLowerCase().startsWith('tr');
  const s = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const months = useMemo(() => t('calendar.months').split(','), [t, i18n.language]);
  const maximumBirthDate = useMemo(() => new Date(), []);
  const zodiac = useMemo(
    () => getZodiacSign(selectedDate.getMonth() + 1, selectedDate.getDate()),
    [selectedDate],
  );
  const age = useMemo(() => calculateAge(selectedDate), [selectedDate]);
  const formattedDate = useMemo(
    () => formatBirthDate(selectedDate, months, isTurkish),
    [selectedDate, months, isTurkish],
  );
  const accentGradient = useMemo<[string, string]>(
    () => [colors.primary, colors.primary700],
    [colors.primary, colors.primary700],
  );

  const handleContinue = () => {
    setBirthDate(selectedDate);
    setZodiacSign(zodiac);
    router.push('/(auth)/birth-time');
  };

  return (
    <SafeScreen>
      <View style={s.container}>
        <OnboardingBackground />

        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeIn.duration(320)} style={s.selectionCard}>
            <LinearGradient colors={accentGradient} style={s.selectionAccent} />
            <Text style={s.selectionLabel}>{t('auth.birthDateSelectionLabel')}</Text>
            <Text style={s.selectionDate}>{formattedDate}</Text>
            <Text style={s.selectionHint}>{t('auth.birthDateHeroHint')}</Text>

            <View style={s.statRow}>
              <View style={s.statPill}>
                <Text style={s.statLabel}>{t('auth.birthDateAgeLabel')}</Text>
                <Text style={s.statValue}>{t('auth.birthDateAgeValue', { age })}</Text>
              </View>

              <View style={s.statPill}>
                <Text style={s.statLabel}>{t('auth.birthDateSunSignLabel')}</Text>
                <Text style={s.statValue}>{zodiac}</Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeIn.duration(360).delay(60)} style={s.calendarCard}>
            <View style={s.calendarSurface}>
              <CalendarPicker
                selectedDate={selectedDate}
                onSelect={setSelectedDate}
                maximumDate={maximumBirthDate}
                minimumDate={MINIMUM_BIRTH_DATE}
              />
            </View>
          </Animated.View>
        </ScrollView>

        <View style={s.footer}>
          <TouchableOpacity
            style={s.outlineButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                if (isGuestUser(user)) logout();
                router.replace('/(auth)/welcome');
              }
            }}
            accessibilityLabel={t('editBirthInfo.accessibilityBack')}
            accessibilityRole="button"
          >
            <Text style={s.outlineText}>{t('common.back')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.primaryButton}
            accessibilityLabel={t('common.continue')}
            accessibilityRole="button"
            onPress={handleContinue}
            activeOpacity={0.92}
          >
            <LinearGradient colors={accentGradient} style={s.primaryFill}>
              <Text style={s.primaryText}>{t('common.continue')}</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.white} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeScreen>
  );
}
