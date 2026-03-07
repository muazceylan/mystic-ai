import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import axios from 'axios/dist/browser/axios.cjs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../../components/OnboardingBackground';
import { SafeScreen } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { ActionModal, PrimaryButton, SecondaryButton, StatusBanner, TextField } from '../../components/auth';
import { register, resendVerification } from '../../services/auth';
import { useAuthStore } from '../../store/useAuthStore';
import { trackEvent } from '../../services/analytics';
import { isStrongPassword } from '../../utils/passwordPolicy';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      paddingTop: 26,
      paddingBottom: 48,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.surfaceGlass,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
    },
    brandBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: C.primarySoftBg,
      borderColor: C.surfaceGlassBorder,
      borderWidth: 1,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    brandText: {
      color: C.primary,
      fontWeight: '700',
      fontSize: 12,
    },
    hero: {
      marginBottom: 16,
      gap: 8,
    },
    title: {
      fontSize: 29,
      lineHeight: 36,
      color: C.text,
      fontWeight: '800',
      letterSpacing: -0.4,
    },
    subtitle: {
      color: C.subtext,
      fontSize: 15,
      lineHeight: 22,
    },
    card: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      backgroundColor: C.surfaceGlass,
      padding: 16,
      gap: 12,
      shadowColor: C.shadow,
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 18,
      elevation: 4,
    },
    passwordHint: {
      color: C.subtext,
      fontSize: 12,
      marginTop: -2,
    },
    buttonRow: {
      marginTop: 8,
      gap: 10,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
      gap: 4,
    },
    footerText: {
      color: C.subtext,
      fontSize: 13,
    },
    footerLink: {
      color: C.primary,
      fontSize: 13,
      fontWeight: '700',
    },
  });
}

export default function SignupScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const pendingEmail = useAuthStore((s) => s.pendingEmail);
  const setPendingEmail = useAuthStore((s) => s.setPendingEmail);
  const setLastResendAt = useAuthStore((s) => s.setLastResendAt);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'info' | 'success' | 'error'; message: string } | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [resendFromModalLoading, setResendFromModalLoading] = useState(false);

  useEffect(() => {
    const prefill = firstParam(params.email || undefined) || pendingEmail || '';
    const normalizedPrefill = prefill.trim().toLowerCase();
    if (!normalizedPrefill) {
      return;
    }
    if (normalizedPrefill) {
      setEmail((prev) => prev || normalizedPrefill);
    }
  }, [params.email, pendingEmail]);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const validateForm = () => {
    let valid = true;

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setEmailError(t('auth.invalidEmail'));
      valid = false;
    } else {
      setEmailError(null);
    }

    if (!isStrongPassword(password)) {
      setPasswordError(t('auth.passwordPolicy'));
      valid = false;
    } else {
      setPasswordError(null);
    }

    return valid;
  };

  const navigateToPending = (source: 'register' | 'resend') => {
    setPendingEmail(normalizedEmail);
    router.replace({
      pathname: '/(auth)/verify-email-pending',
      params: { email: normalizedEmail, source },
    });
  };

  const handleSignup = async () => {
    if (loading) return;
    setBanner(null);

    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await register(normalizedEmail, password, name);
      if (response.data?.status === 'PENDING_VERIFICATION') {
        trackEvent('auth_register_success', { source: 'signup', has_name: Boolean(name.trim()) });
        navigateToPending('register');
        return;
      }
      setBanner({ tone: 'error', message: t('auth.signup.unexpectedResponse') });
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        trackEvent('auth_register_conflict', { source: 'signup' });
        setShowConflictModal(true);
      } else {
        setBanner({ tone: 'error', message: t('auth.signup.registerError') });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConflictResend = async () => {
    if (resendFromModalLoading) return;
    setResendFromModalLoading(true);
    setBanner(null);
    trackEvent('auth_resend_click', { source: 'signup_conflict_modal' });

    try {
      await resendVerification(normalizedEmail);
      setLastResendAt(Date.now());
      trackEvent('auth_resend_success', { source: 'signup_conflict_modal' });
      setShowConflictModal(false);
      navigateToPending('resend');
    } catch {
      setBanner({
        tone: 'error',
        message: t('auth.signup.resendError'),
      });
      setShowConflictModal(false);
    } finally {
      setResendFromModalLoading(false);
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
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.replace('/(auth)/welcome')}
              style={styles.backButton}
              accessibilityLabel={t('auth.signup.backToLoginA11y')}
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={18} color={colors.text} />
            </TouchableOpacity>

            <View style={styles.brandBadge}>
              <Ionicons name="sparkles" size={12} color={colors.primary} />
              <Text style={styles.brandText}>MYSTIC AI</Text>
            </View>
          </View>

          <View style={styles.hero}>
            <Text style={styles.title}>{t('auth.signup.title')}</Text>
            <Text style={styles.subtitle}>
              {t('auth.signup.subtitle')}
            </Text>
          </View>

          <View style={styles.card}>
            {banner && <StatusBanner tone={banner.tone} message={banner.message} />}

            <TextField
              label={t('auth.signup.nameOptional')}
              value={name}
              onChangeText={setName}
              placeholder={t('auth.signup.namePlaceholder')}
              autoCapitalize="words"
            />

            <TextField
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.signup.emailPlaceholder')}
              keyboardType="email-address"
              error={emailError}
            />

            <TextField
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.signup.passwordPlaceholder')}
              secureTextEntry={!passwordVisible}
              passwordToggle={{ visible: passwordVisible, onToggle: () => setPasswordVisible((v) => !v) }}
              error={passwordError}
            />

            <Text style={styles.passwordHint}>{t('auth.passwordPolicy')}</Text>

            <View style={styles.buttonRow}>
              <PrimaryButton title={t('auth.signup.createAccount')} onPress={handleSignup} loading={loading} />
              <SecondaryButton
                title={t('auth.signup.loginCta')}
                onPress={() => router.replace({ pathname: '/(auth)/welcome', params: { email: normalizedEmail } })}
              />
            </View>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>{t('auth.signup.footer')}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ActionModal
        visible={showConflictModal}
        onRequestClose={() => setShowConflictModal(false)}
        title={t('auth.signup.conflictTitle')}
        description={t('auth.signup.conflictDescription')}
        actions={[
          {
            label: t('auth.signup.conflictLogin'),
            onPress: () => {
              setShowConflictModal(false);
              router.replace({ pathname: '/(auth)/welcome', params: { email: normalizedEmail } });
            },
          },
          {
            label: t('auth.signup.conflictResend'),
            onPress: handleConflictResend,
            loading: resendFromModalLoading,
            variant: 'secondary',
          },
          {
            label: t('auth.signup.conflictChangeEmail'),
            onPress: () => setShowConflictModal(false),
            variant: 'secondary',
          },
        ]}
      />
    </SafeScreen>
  );
}
