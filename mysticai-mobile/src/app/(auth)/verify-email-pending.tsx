import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../../components/OnboardingBackground';
import { SafeScreen } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { PrimaryButton, StatusBanner } from '../../components/auth';
import { resendVerification, verifyEmailOtp } from '../../services/auth';
import { useAuthStore } from '../../store/useAuthStore';
import { trackEvent } from '../../services/analytics';

const COOLDOWN_SECONDS = 60;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingTop: 26,
      paddingBottom: 48,
      gap: 16,
    },
    heroCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      backgroundColor: C.surfaceGlass,
      padding: 18,
      gap: 10,
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: C.primarySoftBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      color: C.text,
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: -0.25,
    },
    subtitle: { color: C.subtext, fontSize: 14, lineHeight: 20 },
    emailPill: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      backgroundColor: C.primarySoftBg,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    emailText: {
      color: C.primary,
      fontWeight: '700',
      fontSize: 12,
      letterSpacing: 0.2,
    },
    otpContainer: {
      backgroundColor: C.inputBg ?? C.surface,
      borderWidth: 2,
      borderColor: C.primary,
      borderRadius: 14,
      alignItems: 'center',
    },
    otpInput: {
      width: '100%',
      paddingVertical: 18,
      paddingHorizontal: 16,
      fontSize: 32,
      fontWeight: '700',
      color: C.text,
      textAlign: 'center',
      letterSpacing: 12,
    },
    actionGroup: { gap: 10 },
    resendButton: { alignItems: 'center', paddingVertical: 10 },
    resendText: { fontSize: 14, color: C.primary, fontWeight: '600' },
    cooldownText: { color: C.subtext, fontSize: 12, textAlign: 'center' },
    links: { marginTop: 6, gap: 10, alignItems: 'center' },
    linkButton: { paddingVertical: 6 },
    linkText: { color: C.primary, fontWeight: '700', fontSize: 13 },
  });
}

export default function VerifyEmailPendingScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const params = useLocalSearchParams<{ email?: string | string[]; source?: string | string[] }>();

  const pendingEmail = useAuthStore((s) => s.pendingEmail);
  const lastResendAt = useAuthStore((s) => s.lastResendAt);
  const setPendingEmail = useAuthStore((s) => s.setPendingEmail);
  const setLastResendAt = useAuthStore((s) => s.setLastResendAt);
  const storeLogin = useAuthStore((s) => s.login);

  const [otpCode, setOtpCode] = useState('');
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingResend, setLoadingResend] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'info' | 'success' | 'error'; message: string } | null>(null);
  const [now, setNow] = useState(Date.now());
  const otpInputRef = useRef<TextInput>(null);
  const source = firstParam(params.source || undefined) || 'pending';

  const email = useMemo(() => {
    const fromParams = firstParam(params.email || undefined).trim().toLowerCase();
    if (fromParams) return fromParams;
    return String(pendingEmail ?? '').trim().toLowerCase();
  }, [params.email, pendingEmail]);

  useEffect(() => {
    if (email) setPendingEmail(email);
  }, [email]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setTimeout(() => otpInputRef.current?.focus(), 400);
  }, []);

  const remainingCooldown = useMemo(() => {
    if (!lastResendAt) return 0;
    const elapsedSeconds = Math.floor((now - lastResendAt) / 1000);
    return Math.max(0, COOLDOWN_SECONDS - elapsedSeconds);
  }, [lastResendAt, now]);

  const isOtpValid = otpCode.length === 6;
  const resendDisabled = !email || loadingResend || remainingCooldown > 0;

  const effectiveBanner = banner ?? (!email
    ? { tone: 'info' as const, message: t('auth.verifyPending.missingEmail') }
    : null);

  const handleVerify = async () => {
    if (!isOtpValid || loadingVerify) return;
    setBanner(null);
    setLoadingVerify(true);
    trackEvent('auth_otp_verify_click', { source });

    try {
      const res = await verifyEmailOtp({ email, code: otpCode });
      const { accessToken, refreshToken, user } = res.data;
      storeLogin(accessToken, refreshToken, user);
      trackEvent('auth_otp_verify_success', { source });
      router.replace('/(tabs)/home');
    } catch (error: any) {
      const message = error?.response?.data?.message ?? '';
      if (message === 'OTP_EXPIRED') {
        setBanner({ tone: 'error', message: t('auth.verifyPending.otpExpired') });
      } else if (message === 'ALREADY_VERIFIED') {
        setBanner({ tone: 'info', message: t('auth.verifyPending.alreadyVerified') });
        router.replace('/(auth)/welcome');
      } else {
        setBanner({ tone: 'error', message: t('auth.verifyPending.otpInvalid') });
      }
      setOtpCode('');
    } finally {
      setLoadingVerify(false);
    }
  };

  const handleResend = async () => {
    if (resendDisabled) return;
    setBanner(null);
    setLoadingResend(true);
    trackEvent('auth_resend_click', { source });

    try {
      await resendVerification(email);
      setLastResendAt(Date.now());
      setOtpCode('');
      trackEvent('auth_resend_success', { source });
      setBanner({ tone: 'success', message: t('auth.verifyPending.resendSuccess') });
      setTimeout(() => otpInputRef.current?.focus(), 300);
    } catch {
      setBanner({ tone: 'error', message: t('auth.verifyPending.resendError') });
    } finally {
      setLoadingResend(false);
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
          <View style={styles.heroCard}>
            <View style={styles.iconWrap}>
              <Ionicons name="mail-unread-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.title}>{t('auth.verifyPending.title')}</Text>
            <Text style={styles.subtitle}>{t('auth.verifyPending.subtitle')}</Text>
            {!!email && (
              <View style={styles.emailPill}>
                <Text style={styles.emailText}>{email}</Text>
              </View>
            )}
          </View>

          {effectiveBanner && <StatusBanner tone={effectiveBanner.tone} message={effectiveBanner.message} />}

          <View style={styles.otpContainer}>
            <TextInput
              ref={otpInputRef}
              style={styles.otpInput}
              placeholder={t('auth.verifyPending.otpPlaceholder')}
              placeholderTextColor={colors.border}
              value={otpCode}
              onChangeText={(v) => setOtpCode(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              editable={!loadingVerify}
              accessibilityLabel={t('auth.verifyPending.otpLabel')}
            />
          </View>

          <View style={styles.actionGroup}>
            <PrimaryButton
              title={loadingVerify ? t('auth.verifyPending.verifying') : t('auth.verifyPending.verifyButton')}
              onPress={handleVerify}
              loading={loadingVerify}
              disabled={!isOtpValid || loadingVerify}
            />

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResend}
              disabled={resendDisabled}
              accessibilityRole="button"
            >
              <Text style={[styles.resendText, resendDisabled && { opacity: 0.5 }]}>
                {remainingCooldown > 0
                  ? t('auth.verifyPending.resendIn', { seconds: remainingCooldown })
                  : t('auth.verifyPending.resendButton')}
              </Text>
            </TouchableOpacity>

            {remainingCooldown > 0 && (
              <Text style={styles.cooldownText}>
                {t('auth.verifyPending.cooldownText', { seconds: remainingCooldown })}
              </Text>
            )}
          </View>

          <View style={styles.links}>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.replace({ pathname: '/(auth)/signup', params: { email } })}
            >
              <Text style={styles.linkText}>{t('auth.verifyPending.changeEmail')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.replace({ pathname: '/(auth)/welcome', params: { email } })}
            >
              <Text style={styles.linkText}>{t('auth.verifyPending.goToLogin')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}
