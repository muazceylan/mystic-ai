import { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../../components/OnboardingBackground';
import WheelPicker from '../../components/WheelPicker';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { getZodiacSign } from '../../constants/index';
import { useTheme } from '../../context/ThemeContext';
import { SafeScreen } from '../../components/ui';

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];
const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
      paddingHorizontal: 24,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: C.text,
      marginBottom: 6,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: C.subtext,
      textAlign: 'center',
      marginBottom: 28,
      lineHeight: 20,
    },
    pickerCard: {
      width: '100%',
      borderRadius: 20,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
      paddingVertical: 4,
    },
    pickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    selectedDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 16,
      paddingVertical: 10,
    },
    selectedDateText: {
      fontSize: 15,
      color: C.primary,
      fontWeight: '600',
    },
    zodiacBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: C.primarySoftBg,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    zodiacText: {
      fontSize: 13,
      color: C.primary,
      fontWeight: '600',
    },
    footer: {
      flexDirection: 'row',
      gap: 12,
      paddingBottom: 32,
    },
    outlineButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: C.primary,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: C.surface,
    },
    outlineText: {
      color: C.primary,
      fontSize: 15,
      fontWeight: '600',
    },
    primaryButton: {
      flex: 1,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: C.primary,
    },
    primaryText: {
      color: C.white,
      fontSize: 15,
      fontWeight: '600',
    },
  });
}

export default function BirthDateScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const store = useOnboardingStore();
  const s = makeStyles(colors);

  const now = new Date();
  const initial = store.birthDate || new Date(1995, 0, 1);
  const [day, setDay] = useState(initial.getDate());
  const [month, setMonth] = useState(initial.getMonth() + 1);
  const [year, setYear] = useState(initial.getFullYear());

  const months = i18n.language === 'tr' ? MONTHS_TR : MONTHS_EN;
  const maxDay = getDaysInMonth(month, year);

  useEffect(() => {
    if (day > maxDay) setDay(maxDay);
  }, [month, year, maxDay, day]);

  const safeDay = Math.min(day, maxDay);

  useEffect(() => {
    const date = new Date(year, month - 1, safeDay);
    store.setBirthDate(date);
    store.setZodiacSign(getZodiacSign(month, safeDay));
  }, [safeDay, month, year]);

  const dayItems = useMemo(
    () => Array.from({ length: maxDay }, (_, i) => ({ value: i + 1, label: String(i + 1) })),
    [maxDay],
  );
  const monthItems = useMemo(
    () => months.map((m, i) => ({ value: i + 1, label: m })),
    [months],
  );
  const yearItems = useMemo(
    () =>
      Array.from({ length: now.getFullYear() - 1920 + 1 }, (_, i) => ({
        value: 1920 + i,
        label: String(1920 + i),
      })),
    [],
  );

  const zodiac = getZodiacSign(month, safeDay);
  const formattedDate = `${safeDay} ${months[month - 1]} ${year}`;

  return (
    <SafeScreen>
      <View style={s.container}>
        <OnboardingBackground />

        <View style={s.content}>
          <Text style={s.title}>{t('auth.birthDateTitle')}</Text>
          <Text style={s.subtitle}>{t('auth.birthDateSubtitle')}</Text>

          <Animated.View entering={FadeInDown.duration(500).delay(100)} style={s.pickerCard}>
            <View style={s.pickerRow}>
              <WheelPicker
                items={dayItems}
                selectedValue={day}
                onValueChange={(v) => setDay(v as number)}
                width={70}
              />
              <WheelPicker
                items={monthItems}
                selectedValue={month}
                onValueChange={(v) => setMonth(v as number)}
                width={130}
              />
              <WheelPicker
                items={yearItems}
                selectedValue={year}
                onValueChange={(v) => setYear(v as number)}
                width={90}
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeIn.duration(400).delay(300)} style={s.selectedDateRow}>
            <Ionicons name="calendar" size={16} color={colors.primary} />
            <Text style={s.selectedDateText}>{formattedDate}</Text>
            {zodiac && (
              <View style={s.zodiacBadge}>
                <Text style={s.zodiacText}>{zodiac}</Text>
              </View>
            )}
          </Animated.View>
        </View>

        <View style={s.footer}>
          <TouchableOpacity
            style={s.outlineButton}
            onPress={() => router.back()}
            accessibilityLabel={t('editBirthInfo.accessibilityBack')}
            accessibilityRole="button"
          >
            <Text style={s.outlineText}>{t('common.back')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.primaryButton}
            accessibilityLabel={t('common.continue')}
            accessibilityRole="button"
            onPress={() => router.push('/(auth)/birth-time')}
          >
            <Text style={s.primaryText}>{t('common.continue')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeScreen>
  );
}
