import { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../../components/OnboardingBackground';
import WheelPicker from '../../components/WheelPicker';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { useTheme } from '../../context/ThemeContext';
import { SafeScreen } from '../../components/ui';

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
      maxWidth: 260,
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
    colonContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      width: 20,
    },
    colon: {
      fontSize: 28,
      fontWeight: '700',
      color: C.primary,
    },
    selectedTimeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 16,
      paddingVertical: 10,
    },
    selectedTimeText: {
      fontSize: 15,
      color: C.primary,
      fontWeight: '600',
    },
    unknownRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
      paddingVertical: 8,
    },
    unknownText: {
      fontSize: 14,
      color: C.text,
    },
    hint: {
      fontSize: 12,
      color: C.subtext,
      textAlign: 'center',
      marginTop: 8,
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
    primaryDisabled: {
      backgroundColor: C.disabled,
    },
    primaryText: {
      color: C.white,
      fontSize: 15,
      fontWeight: '600',
    },
    primaryTextDisabled: {
      color: C.disabledText,
    },
    disabledOverlay: {
      opacity: 0.35,
    },
  });
}

export default function BirthTimeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const store = useOnboardingStore();
  const s = makeStyles(colors);

  const [hh, mm] = store.birthTime.split(':').map(Number);
  const [hour, setHour] = useState(hh);
  const [minute, setMinute] = useState(mm);
  const [hasPicked, setHasPicked] = useState(Boolean(store.birthDate && !store.birthTimeUnknown));

  useEffect(() => {
    if (!store.birthTimeUnknown) {
      const h = String(hour).padStart(2, '0');
      const m = String(minute).padStart(2, '0');
      store.setBirthTime(`${h}:${m}`);
      setHasPicked(true);
    }
  }, [hour, minute]);

  const hourItems = useMemo(
    () => Array.from({ length: 24 }, (_, i) => ({ value: i, label: String(i).padStart(2, '0') })),
    [],
  );
  const minuteItems = useMemo(
    () => Array.from({ length: 60 }, (_, i) => ({ value: i, label: String(i).padStart(2, '0') })),
    [],
  );

  const displayTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const canContinue = store.birthTimeUnknown || hasPicked;

  return (
    <SafeScreen>
      <View style={s.container}>
        <OnboardingBackground />

        <View style={s.content}>
          <Text style={s.title}>{t('auth.birthTimeTitle')}</Text>
          <Text style={s.subtitle}>{t('auth.birthTimeSubtitle')}</Text>

          <Animated.View
            entering={FadeInDown.duration(500).delay(100)}
            style={[s.pickerCard, store.birthTimeUnknown && s.disabledOverlay]}
            pointerEvents={store.birthTimeUnknown ? 'none' : 'auto'}
          >
            <View style={s.pickerRow}>
              <WheelPicker
                items={hourItems}
                selectedValue={hour}
                onValueChange={(v) => setHour(v as number)}
                width={90}
              />
              <View style={s.colonContainer}>
                <Text style={s.colon}>:</Text>
              </View>
              <WheelPicker
                items={minuteItems}
                selectedValue={minute}
                onValueChange={(v) => setMinute(v as number)}
                width={90}
              />
            </View>
          </Animated.View>

          {!store.birthTimeUnknown && hasPicked && (
            <Animated.View entering={FadeIn.duration(400)} style={s.selectedTimeRow}>
              <Ionicons name="time" size={16} color={colors.primary} />
              <Text style={s.selectedTimeText}>{displayTime}</Text>
            </Animated.View>
          )}

          <Text style={s.hint}>{t('birthInfo.timeFormat')}</Text>

          <TouchableOpacity
            style={s.unknownRow}
            accessibilityLabel={t('birthInfo.unknownTime')}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: store.birthTimeUnknown }}
            onPress={() => {
              const next = !store.birthTimeUnknown;
              store.setBirthTimeUnknown(next);
              if (next) setHasPicked(false);
            }}
          >
            <Ionicons
              name={store.birthTimeUnknown ? 'checkbox' : 'square-outline'}
              size={20}
              color={store.birthTimeUnknown ? colors.primary : colors.subtext}
            />
            <Text style={s.unknownText}>{t('birthInfo.unknownTime')}</Text>
          </TouchableOpacity>
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
            style={[s.primaryButton, !canContinue && s.primaryDisabled]}
            accessibilityLabel={t('common.continue')}
            accessibilityRole="button"
            disabled={!canContinue}
            onPress={() => router.push('/birth-country')}
          >
            <Text style={[s.primaryText, !canContinue && s.primaryTextDisabled]}>
              {t('common.continue')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeScreen>
  );
}
