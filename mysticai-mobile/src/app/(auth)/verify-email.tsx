import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../../components/OnboardingBackground';
import { AppText, SafeScreen, TextField } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { PrimaryButton, SecondaryButton, StatusBanner } from '../../components/auth';
import { resendVerification } from '../../services/auth';
import { useAuthStore } from '../../store/useAuthStore';
import { trackEvent } from '../../services/analytics';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ResultToken = 'success' | 'expired' | 'invalid';

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: C.bg,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingTop: 36,
      paddingBottom: 48,
      justifyContent: 'center',
    },
    card: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      backgroundColor: C.surfaceGlass,
      padding: 20,
      gap: 12,
      shadowColor: C.shadow,
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 18,
      elevation: 4,
    },
    iconWrap: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: C.primarySoftBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      color: C.text,
      fontSize: 25,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    subtitle: {
      color: C.subtext,
      fontSize: 14,
      lineHeight: 21,
    },
    actionGroup: {
      marginTop: 6,
      gap: 10,
    },
  });
}

function normalizeResult(value: unknown): ResultToken {
  const tokenCandidate = Array.isArray(value) ? value[0] : value;
  const token = String(tokenCandidate ?? '').trim().toLowerCase();
  if (token === 'success' || token === 'expired' || token === 'invalid') {
    return token;
  }
  return 'invalid';
}

export default function VerifyEmailResultScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const params = useLocalSearchParams<{ result?: string | string[]; email?: string | string[] }>();

  const pendingEmail = useAuthStore((s) => s.pendingEmail);
  const setPendingEmail = useAuthStore((s) => s.setPendingEmail);
  const setLastResendAt = useAuthStore((s) => s.setLastResendAt);

  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'info' | 'success' | 'error'; message: string } | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const result = useMemo(() => normalizeResult(params.result), [params.result]);
  const initialEmail = useMemo(() => {
    const fromParam = firstParam(params.email || undefined).trim().toLowerCase();
    if (fromParam) return fromParam;
    return String(pendingEmail ?? '').trim().toLowerCase();
  }, [params.email, pendingEmail]);

  useEffect(() => {
    trackEvent('auth_verify_result_view', { result });
  }, [result]);

  useEffect(() => {
    if (initialEmail) {
      setEmailInput(initialEmail);
      setPendingEmail(initialEmail);
    }
  }, [initialEmail]);

  const resultConfig = useMemo(() => {
    if (result === 'success') {
      return {
        icon: 'checkmark-circle',
        title: t('auth.verifyResult.successTitle'),
        description: t('auth.verifyResult.successDescription'),
        tone: 'success' as const,
      };
    }
    if (result === 'expired') {
      return {
        icon: 'time',
        title: t('auth.verifyResult.expiredTitle'),
        description: t('auth.verifyResult.expiredDescription'),
        tone: 'info' as const,
      };
    }
    return {
      icon: 'alert-circle',
      title: t('auth.verifyResult.invalidTitle'),
      description: t('auth.verifyResult.invalidDescription'),
      tone: 'error' as const,
    };
  }, [result, t]);

  const handleResend = async () => {
    const normalizedEmail = emailInput.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setEmailError(t('auth.verifyResult.invalidEmailForResend'));
      return;
    }

    setEmailError(null);
    setBanner(null);
    setLoading(true);
    trackEvent('auth_resend_click', { source: 'verify_result', result });

    try {
      await resendVerification(normalizedEmail);
      setPendingEmail(normalizedEmail);
      setLastResendAt(Date.now());
      trackEvent('auth_resend_success', { source: 'verify_result', result });
      router.replace({
        pathname: '/(auth)/verify-email-pending',
        params: { email: normalizedEmail, source: 'result' },
      });
    } catch {
      setBanner({ tone: 'error', message: t('auth.verifyResult.resendError') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeScreen>
      <OnboardingBackground />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 16}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeIn.duration(260)} style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name={resultConfig.icon as any} size={28} color={colors.primary} />
            </View>

            <AppText variant="H1" style={styles.title}>
              {resultConfig.title}
            </AppText>
            <AppText variant="Body" color="secondary" style={styles.subtitle}>
              {resultConfig.description}
            </AppText>

            {banner && <StatusBanner tone={banner.tone} message={banner.message} />}

            <View style={styles.actionGroup}>
              {result === 'success' ? (
                <>
                  <PrimaryButton
                    title={t('auth.verifyResult.goToLogin')}
                    onPress={() => router.replace({ pathname: '/(auth)/welcome', params: { email: emailInput } })}
                  />
                </>
              ) : (
                <>
                  <TextField
                    label={t('auth.email')}
                    value={emailInput}
                    onChangeText={setEmailInput}
                    placeholder={t('auth.signup.emailPlaceholder')}
                    keyboardType="email-address"
                    error={emailError}
                  />
                  <PrimaryButton
                    title={t('auth.verifyResult.resendVerification')}
                    onPress={handleResend}
                    loading={loading}
                  />
                  <SecondaryButton
                    title={t('auth.verifyResult.goToLogin')}
                    onPress={() => router.replace({ pathname: '/(auth)/welcome', params: { email: emailInput } })}
                  />
                </>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}
