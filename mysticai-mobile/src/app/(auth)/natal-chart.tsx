import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios/dist/browser/axios.cjs';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../../components/OnboardingBackground';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { useAuthStore } from '../../store/useAuthStore';
import { COUNTRIES } from '../../constants/index';
import { login as loginApi, register, updateProfile } from '../../services/auth';
import { useTheme } from '../../context/ThemeContext';
import { SafeScreen } from '../../components/ui';

type Choice = 'analyze' | 'skip' | null;

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
      gap: 16,
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 16,
      gap: 12,
    },
    optionSelected: {
      borderColor: C.primary,
      backgroundColor: C.primarySoft,
    },
    optionTextContainer: {
      flex: 1,
    },
    optionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: C.text,
    },
    optionTitleSelected: {
      color: C.primary,
    },
    optionSubtitle: {
      marginTop: 4,
      fontSize: 12,
      color: C.subtext,
    },
    checkBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: C.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorText: {
      color: C.error,
      fontSize: 12,
      textAlign: 'center',
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
    syncOverlay: {
      position: 'absolute',
      left: 24,
      right: 24,
      bottom: 100,
      backgroundColor: C.surface,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: C.border,
      shadowColor: C.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    syncText: {
      fontSize: 12,
      color: C.subtext,
    },
  });
}

export default function NatalChartScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const onboarding = useOnboardingStore();
  const storeLogin = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setUser = useAuthStore((state) => state.setUser);
  const [choice, setChoice] = useState<Choice>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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

  const handleContinue = async () => {
    if (!choice || isGenerating) return;

    setErrorMessage(null);
    setIsGenerating(true);

    try {
      if (isAuthenticated) {
        // Social login user — already authenticated, just update profile
        await handleProfileUpdate();
      } else {
        // Email registration user — register then login
        await handleRegisterAndLogin();
      }
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
            params: {
              error: t('auth.emailAlreadyExists'),
            },
          });
          return;
        }
      }

      setErrorMessage(t('natalChart.onboardingRegisterError'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <SafeScreen>
      <View style={styles.container}>
        <OnboardingBackground />

        <View style={styles.content}>
        <TouchableOpacity
          style={[styles.optionCard, choice === 'analyze' && styles.optionSelected]}
          onPress={() => setChoice('analyze')}
          accessibilityLabel={t('natalChart.accessibilityAnalyzeChart')}
          accessibilityRole="button"
        >
          <Ionicons
            name="chatbubble-ellipses"
            size={20}
            color={choice === 'analyze' ? colors.primary : colors.subtext}
          />
          <View style={styles.optionTextContainer}>
            <Text style={[styles.optionTitle, choice === 'analyze' && styles.optionTitleSelected]}>
              {t('natalChart.onboardingAnalyzeTitle')}
            </Text>
            <Text style={styles.optionSubtitle}>
              {t('natalChart.onboardingAnalyzeDesc')}
            </Text>
          </View>
          {choice === 'analyze' && (
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark" size={12} color={colors.white} />
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionCard, choice === 'skip' && styles.optionSelected]}
          onPress={() => setChoice('skip')}
          accessibilityLabel={t('natalChart.accessibilityGoToApp')}
          accessibilityRole="button"
        >
          <Ionicons name="home" size={20} color={choice === 'skip' ? colors.primary : colors.subtext} />
          <View style={styles.optionTextContainer}>
            <Text style={[styles.optionTitle, choice === 'skip' && styles.optionTitleSelected]}>
              {t('natalChart.onboardingSkipTitle')}
            </Text>
            <Text style={styles.optionSubtitle}>
              {t('natalChart.onboardingSkipDesc')}
            </Text>
          </View>
          {choice === 'skip' && (
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark" size={12} color={colors.white} />
            </View>
          )}
        </TouchableOpacity>

        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.outlineButton}
          onPress={() => router.back()}
          accessibilityLabel={t('editBirthInfo.accessibilityBack')}
          accessibilityRole="button"
        >
          <Text style={styles.outlineText}>{t('common.back')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, (!choice || isGenerating) && styles.primaryDisabled]}
          disabled={!choice || isGenerating}
          onPress={handleContinue}
          accessibilityLabel={t('common.continue')}
          accessibilityRole="button"
        >
          {isGenerating ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={[styles.primaryText, (!choice || isGenerating) && styles.primaryTextDisabled]}>
              {t('common.continue')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {isGenerating && (
        <View style={styles.syncOverlay}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.syncText}>{t('natalChart.onboardingSyncMessage')}</Text>
        </View>
      )}
      </View>
    </SafeScreen>
  );
}
