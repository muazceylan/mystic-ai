import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../../components/OnboardingBackground';
import WheelPicker from '../../components/WheelPicker';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { useTheme } from '../../context/ThemeContext';
import { SafeScreen } from '../../components/ui';

function makeStyles(C: ReturnType<typeof useTheme>['colors'], isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
    },
    scrollContent: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 156,
      gap: 16,
      justifyContent: 'center',
    },
    hero: {
      gap: 8,
      paddingHorizontal: 4,
    },
    title: {
      fontSize: 28,
      lineHeight: 34,
      color: C.text,
      fontFamily: 'MysticInter-SemiBold',
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: C.subtext,
      fontFamily: 'MysticInter-Regular',
      maxWidth: 320,
    },
    summaryCard: {
      borderRadius: 28,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      paddingHorizontal: 18,
      paddingVertical: 18,
      shadowColor: C.shadow,
      shadowOpacity: isDark ? 0.16 : 0.06,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 20,
      elevation: 4,
    },
    summaryAccent: {
      width: 84,
      height: 4,
      borderRadius: 999,
      marginBottom: 16,
    },
    summaryLabel: {
      color: C.primary,
      fontSize: 11,
      letterSpacing: 1,
      textTransform: 'uppercase',
      fontFamily: 'MysticInter-SemiBold',
    },
    summaryTime: {
      marginTop: 10,
      color: C.text,
      fontSize: 34,
      lineHeight: 40,
      fontFamily: 'MysticInter-SemiBold',
    },
    summaryHint: {
      marginTop: 8,
      color: C.subtext,
      fontSize: 13,
      lineHeight: 19,
      fontFamily: 'MysticInter-Regular',
    },
    pickerShell: {
      marginTop: 16,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: isDark ? C.surfaceAlt : C.primarySoftBg,
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    pickerDisabled: {
      opacity: 0.45,
    },
    pickerHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 10,
      marginBottom: 8,
    },
    pickerMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    pickerMetaText: {
      color: C.subtext,
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      fontFamily: 'MysticInter-SemiBold',
    },
    pickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    colonContainer: {
      width: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colon: {
      color: C.primary,
      fontSize: 28,
      lineHeight: 32,
      fontFamily: 'MysticInter-SemiBold',
    },
    unknownButton: {
      marginTop: 16,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      paddingHorizontal: 14,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    unknownCopy: {
      flex: 1,
      gap: 4,
    },
    unknownTitle: {
      color: C.text,
      fontSize: 14,
      lineHeight: 18,
      fontFamily: 'MysticInter-SemiBold',
    },
    unknownHint: {
      color: C.subtext,
      fontSize: 12,
      lineHeight: 17,
      fontFamily: 'MysticInter-Regular',
    },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 28,
      backgroundColor: isDark ? 'rgba(2, 6, 23, 0.9)' : 'rgba(248, 250, 252, 0.98)',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: C.border,
    },
    outlineButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      borderRadius: 999,
      paddingVertical: 16,
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
      flex: 1.08,
      borderRadius: 999,
      overflow: 'hidden',
    },
    primaryFill: {
      paddingVertical: 16,
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

export default function BirthTimeScreen() {
  const { t } = useTranslation();
  const { colors, activeTheme } = useTheme();
  const initialBirthTime = useOnboardingStore((s) => s.birthTime);
  const initialBirthTimeUnknown = useOnboardingStore((s) => s.birthTimeUnknown);
  const setBirthTime = useOnboardingStore((s) => s.setBirthTime);
  const setBirthTimeUnknown = useOnboardingStore((s) => s.setBirthTimeUnknown);

  const [initialHour, initialMinute] = initialBirthTime.split(':').map(Number);
  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);
  const [timeUnknown, setTimeUnknown] = useState(initialBirthTimeUnknown);

  const isDark = activeTheme === 'dark';
  const s = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const accentGradient = useMemo<[string, string]>(
    () => [colors.primary, colors.primary700],
    [colors.primary, colors.primary700],
  );
  const displayTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const hourItems = useMemo(
    () => Array.from({ length: 24 }, (_, index) => ({ value: index, label: String(index).padStart(2, '0') })),
    [],
  );
  const minuteItems = useMemo(
    () => Array.from({ length: 60 }, (_, index) => ({ value: index, label: String(index).padStart(2, '0') })),
    [],
  );

  const handleContinue = () => {
    setBirthTimeUnknown(timeUnknown);
    if (!timeUnknown) {
      setBirthTime(displayTime);
    }
    router.push('/(auth)/birth-country');
  };

  return (
    <SafeScreen>
      <View style={s.container}>
        <OnboardingBackground />

        <View style={s.scrollContent}>
          <Animated.View entering={FadeInDown.duration(360)} style={s.hero}>
            <Text style={s.title}>{t('auth.birthTimeTitle')}</Text>
            <Text style={s.subtitle}>{t('auth.birthTimeSubtitle')}</Text>
          </Animated.View>

          <Animated.View entering={FadeIn.duration(360).delay(60)} style={s.summaryCard}>
            <LinearGradient colors={accentGradient} style={s.summaryAccent} />
            <Text style={s.summaryLabel}>{t('auth.selectTimeLabel')}</Text>
            <Text style={s.summaryTime}>{timeUnknown ? '--:--' : displayTime}</Text>
            <Text style={s.summaryHint}>{t('birthInfo.timeFormat')}</Text>

            <View style={[s.pickerShell, timeUnknown && s.pickerDisabled]} pointerEvents={timeUnknown ? 'none' : 'auto'}>
              <View style={s.pickerHeaderRow}>
                <View style={s.pickerMeta}>
                  <Ionicons name="time-outline" size={14} color={colors.primary} />
                  <Text style={s.pickerMetaText}>{t('auth.selectTimeLabel')}</Text>
                </View>
                <Text style={s.pickerMetaText}>{t('birthInfo.timeFormat')}</Text>
              </View>

              <View style={s.pickerRow}>
                <WheelPicker
                  items={hourItems}
                  selectedValue={hour}
                  onValueChange={(value) => setHour(value as number)}
                  width={108}
                />
                <View style={s.colonContainer}>
                  <Text style={s.colon}>:</Text>
                </View>
                <WheelPicker
                  items={minuteItems}
                  selectedValue={minute}
                  onValueChange={(value) => setMinute(value as number)}
                  width={108}
                />
              </View>
            </View>

            <TouchableOpacity
              style={s.unknownButton}
              accessibilityLabel={t('birthInfo.unknownTime')}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: timeUnknown }}
              onPress={() => setTimeUnknown((current) => !current)}
            >
              <Ionicons
                name={timeUnknown ? 'checkbox' : 'square-outline'}
                size={22}
                color={timeUnknown ? colors.primary : colors.subtext}
              />
              <View style={s.unknownCopy}>
                <Text style={s.unknownTitle}>{t('birthInfo.unknownTime')}</Text>
                <Text style={s.unknownHint}>{t('birthInfo.timeFormat')}</Text>
              </View>
            </TouchableOpacity>
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
