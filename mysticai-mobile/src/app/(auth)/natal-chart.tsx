import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios/dist/browser/axios.cjs';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../../components/OnboardingBackground';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { useAuthStore } from '../../store/useAuthStore';
import { COUNTRIES } from '../../constants/index';
import { login as loginApi, register, updateProfile } from '../../services/auth';
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
      gap: 24,
    },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: C.primarySoftBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: C.text,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: C.subtext,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 16,
    },
    stepsContainer: {
      width: '100%',
      gap: 12,
      marginTop: 8,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 8,
    },
    stepDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepDotActive: {
      backgroundColor: C.primary,
    },
    stepDotPending: {
      backgroundColor: C.surfaceAlt,
      borderWidth: 1,
      borderColor: C.border,
    },
    stepDotDone: {
      backgroundColor: C.success,
    },
    stepText: {
      fontSize: 14,
      color: C.subtext,
      flex: 1,
    },
    stepTextActive: {
      color: C.text,
      fontWeight: '600',
    },
    stepTextDone: {
      color: C.success,
      fontWeight: '600',
    },
    errorContainer: {
      width: '100%',
      backgroundColor: C.redBg,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      gap: 8,
    },
    errorText: {
      color: C.error,
      fontSize: 13,
      textAlign: 'center',
    },
    retryButton: {
      backgroundColor: C.primary,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 24,
      marginTop: 4,
    },
    retryText: {
      color: C.white,
      fontSize: 14,
      fontWeight: '600',
    },
    backButton: {
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 24,
    },
    backText: {
      color: C.subtext,
      fontSize: 14,
      fontWeight: '500',
    },
  });
}

type Step = 'register' | 'chart' | 'done';

export default function NatalChartScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const onboarding = useOnboardingStore();
  const storeLogin = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setUser = useAuthStore((state) => state.setUser);
  const [currentStep, setCurrentStep] = useState<Step>('register');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const started = useRef(false);
  const styles = makeStyles(colors);

  const birthLocation = useMemo(() => {
    const countryName =
      COUNTRIES.find((country) => country.code === onboarding.birthCountry)?.name ||
      onboarding.birthCountry;
    const cityName = onboarding.birthCity || onboarding.birthCityManual;
    return [countryName, cityName].filter(Boolean).join(', ');
  }, [onboarding.birthCountry, onboarding.birthCity, onboarding.birthCityManual]);

  const buildRegisterPayload = () => {
    const birthDate = onboarding.birthDate
      ? [
          onboarding.birthDate.getFullYear(),
          String(onboarding.birthDate.getMonth() + 1).padStart(2, '0'),
          String(onboarding.birthDate.getDate()).padStart(2, '0'),
        ].join('-')
      : null;

    const email = onboarding.email.trim();

    return {
      username: email.toLowerCase(),
      email,
      password: onboarding.password,
      firstName: onboarding.firstName,
      lastName: onboarding.lastName,
      birthDate,
      birthTime: onboarding.birthTimeUnknown ? null : onboarding.birthTime,
      birthLocation,
      birthCountry: onboarding.birthCountry,
      birthCity: onboarding.birthCity || onboarding.birthCityManual,
      birthTimeUnknown: onboarding.birthTimeUnknown,
      timezone: onboarding.timezone,
      gender: onboarding.gender,
      maritalStatus: onboarding.maritalStatus,
      focusPoint: onboarding.focusPoints.join(','),
      zodiacSign: onboarding.zodiacSign,
    };
  };

  const handleRegisterAndLogin = async () => {
    const payload = buildRegisterPayload();
    await register(payload);
    const loginResponse = await loginApi({
      username: payload.username,
      password: payload.password,
    });
    const { accessToken, refreshToken, user } = loginResponse.data;
    storeLogin(accessToken, refreshToken, user);
  };

  const handleProfileUpdate = async () => {
    const birthDate = onboarding.birthDate
      ? [
          onboarding.birthDate.getFullYear(),
          String(onboarding.birthDate.getMonth() + 1).padStart(2, '0'),
          String(onboarding.birthDate.getDate()).padStart(2, '0'),
        ].join('-')
      : undefined;

    const profileData = {
      firstName: onboarding.firstName || undefined,
      lastName: onboarding.lastName || undefined,
      birthDate: birthDate || undefined,
      birthTime: onboarding.birthTimeUnknown ? null : onboarding.birthTime || undefined,
      birthLocation,
      birthCountry: onboarding.birthCountry || undefined,
      birthCity: onboarding.birthCity || onboarding.birthCityManual || undefined,
      birthTimeUnknown: onboarding.birthTimeUnknown,
      timezone: onboarding.timezone || undefined,
      gender: onboarding.gender || undefined,
      maritalStatus: onboarding.maritalStatus || undefined,
      focusPoint: onboarding.focusPoints.length > 0 ? onboarding.focusPoints.join(',') : undefined,
      zodiacSign: onboarding.zodiacSign || undefined,
    };

    const res = await updateProfile(profileData);
    setUser(res.data);
  };

  const runSetup = async () => {
    setErrorMessage(null);

    try {
      // Step 1: Register or update profile
      setCurrentStep('register');
      if (isAuthenticated) {
        await handleProfileUpdate();
      } else {
        await handleRegisterAndLogin();
      }

      // Step 2: Chart will be created automatically when user visits the tab
      setCurrentStep('chart');

      // Brief pause so user sees progress
      await new Promise((r) => setTimeout(r, 800));

      // Done
      setCurrentStep('done');
      await new Promise((r) => setTimeout(r, 400));

      router.replace('/(tabs)/home');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message =
          typeof error.response?.data?.message === 'string'
            ? error.response?.data?.message.toLowerCase()
            : '';

        if (status === 409 || message.includes('already exists')) {
          router.replace({
            pathname: '/(auth)/email-register',
            params: { error: t('auth.emailAlreadyExists') },
          });
          return;
        }
      }
      setErrorMessage(t('natalChart.onboardingRegisterError'));
    }
  };

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      runSetup();
    }
  }, []);

  const stepIcon = (step: Step, label: string, index: number) => {
    const steps: Step[] = ['register', 'chart', 'done'];
    const currentIdx = steps.indexOf(currentStep);
    const stepIdx = steps.indexOf(step);
    const isDone = stepIdx < currentIdx || currentStep === 'done';
    const isActive = stepIdx === currentIdx && !errorMessage;

    return (
      <Animated.View
        entering={FadeInDown.duration(400).delay(index * 150)}
        style={styles.stepRow}
      >
        <View
          style={[
            styles.stepDot,
            isDone && styles.stepDotDone,
            isActive && styles.stepDotActive,
            !isDone && !isActive && styles.stepDotPending,
          ]}
        >
          {isDone ? (
            <Ionicons name="checkmark" size={16} color={colors.white} />
          ) : isActive ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={{ color: colors.disabledText, fontSize: 13, fontWeight: '600' }}>
              {index + 1}
            </Text>
          )}
        </View>
        <Text
          style={[
            styles.stepText,
            isDone && styles.stepTextDone,
            isActive && styles.stepTextActive,
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    );
  };

  return (
    <SafeScreen>
      <View style={styles.container}>
        <OnboardingBackground />

        <View style={styles.content}>
          <Animated.View entering={FadeIn.duration(500)} style={styles.iconCircle}>
            <Ionicons name="planet" size={36} color={colors.primary} />
          </Animated.View>

          <Animated.Text entering={FadeIn.duration(500).delay(100)} style={styles.title}>
            {t('natalChart.onboardingSetupTitle')}
          </Animated.Text>
          <Animated.Text entering={FadeIn.duration(500).delay(200)} style={styles.subtitle}>
            {t('natalChart.onboardingSetupSubtitle')}
          </Animated.Text>

          <View style={styles.stepsContainer}>
            {stepIcon('register', t('natalChart.onboardingStepRegister'), 0)}
            {stepIcon('chart', t('natalChart.onboardingStepChart'), 1)}
            {stepIcon('done', t('natalChart.onboardingStepReady'), 2)}
          </View>

          {errorMessage && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={24} color={colors.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={runSetup}>
                <Text style={styles.retryText}>{t('common.retry')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backText}>{t('common.back')}</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </View>
    </SafeScreen>
  );
}
