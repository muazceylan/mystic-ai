import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as Crypto from 'expo-crypto';
import { makeRedirectUri } from 'expo-auth-session';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../context/ThemeContext';
import { SafeScreen } from '../components/ui';
import { ActionModal } from '../components/auth';
import { useAuthStore } from '../store/useAuthStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import {
  checkEmailGet,
  linkAccountWithSocial,
  linkAccountWithEmail,
  verifyLinkAccountOtp,
} from '../services/auth';
import { trackEvent } from '../services/analytics';
import {
  ProductEventName,
  resolveCountryCode,
  setProductUserProperties,
  trackProductEvent,
} from '../services/productAnalytics';
import { WEB_INPUT_RESET_STYLE } from '../utils/webInputReset';
import {
  isNativeGoogleSigninConfigurationError,
  signInWithNativeGoogle,
} from '../services/googleSignIn';

const GOOGLE_WEB_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '').trim();

function presentGoogleLinkError(title: string, message: string) {
  if (Platform.OS === 'android') {
    setTimeout(() => Alert.alert(title, message), 50);
    return;
  }

  Alert.alert(title, message);
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 60 },
    header: { marginBottom: 28 },
    title: { fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 8 },
    subtitle: { fontSize: 15, color: colors.subtext, lineHeight: 22 },
    section: { gap: 12, marginBottom: 24 },
    socialButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    appleButton: { backgroundColor: colors.appleBlack, borderColor: colors.appleBlack },
    icon: { position: 'absolute', left: 20 },
    socialText: { fontSize: 16, fontWeight: '600', color: colors.text },
    appleText: { color: colors.white },
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: { marginHorizontal: 12, fontSize: 13, color: colors.subtext },
    nameRow: { flexDirection: 'row', gap: 10 },
    nameInputWrap: { flex: 1 },
    emailSection: { gap: 12 },
    inputContainer: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
    },
    inputError: { borderColor: colors.error ?? '#e53935' },
    input: { flex: 1, paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, color: colors.text },
    eyeButton: { paddingHorizontal: 14, paddingVertical: 14 },
    emailFeedback: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: -2,
    },
    emailFeedbackText: {
      fontSize: 12,
      color: colors.subtext,
      flex: 1,
    },
    policyText: { fontSize: 12, color: colors.subtext, marginTop: -4 },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: 28,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 4,
    },
    submitButtonDisabled: { backgroundColor: colors.disabled },
    submitButtonText: { fontSize: 16, fontWeight: '700', color: colors.white },
    submitButtonTextDisabled: { color: colors.disabledText },
    // OTP step
    otpInputContainer: {
      backgroundColor: colors.inputBg,
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: 14,
      alignItems: 'center',
    },
    otpInput: {
      width: '100%',
      paddingVertical: 18,
      paddingHorizontal: 16,
      fontSize: 32,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      letterSpacing: 12,
    },
    resendButton: { alignItems: 'center', paddingVertical: 12 },
    resendText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
    backButton: { alignItems: 'center', paddingVertical: 10 },
    backText: { fontSize: 14, color: colors.subtext },
    loadingOverlay: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: colors.dim,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
}

// Must match PasswordPolicy.STRONG_PASSWORD_REGEX on the server
const STRONG_PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

async function fetchEmailAvailability(email: string): Promise<boolean | null> {
  try {
    const response = await checkEmailGet(email);
    return Boolean(response.data?.available);
  } catch {
    return null;
  }
}

export default function LinkAccountScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const storeLogin = useAuthStore((s) => s.login);
  const queryClient = useQueryClient();
  const savedFirstName = useOnboardingStore((s) => s.firstName);

  // Form state — pre-populate firstName from guest-name screen if available
  const [firstName, setFirstName] = useState(savedFirstName || '');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // OTP step state
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otpCode, setOtpCode] = useState('');
  const otpInputRef = useRef<TextInput>(null);
  const emailCheckRequestIdRef = useRef(0);

  const redirectUri = makeRedirectUri({ path: 'oauth2/callback', scheme: 'mystic-ai' });
  const [, , googlePromptAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
    selectAccount: true,
  });

  const isFormValid = firstName.trim().length > 0 && email.trim().length > 0 && STRONG_PASSWORD_RE.test(password);
  const isOtpValid = otpCode.length === 6;
  const normalizedEmail = normalizeEmail(email);

  useEffect(() => {
    if (step !== 'form') return;

    const requestId = ++emailCheckRequestIdRef.current;
    if (!normalizedEmail) {
      setEmailStatus('idle');
      setEmailError(null);
      return;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setEmailStatus('idle');
      setEmailError(null);
      return;
    }

    setEmailStatus('checking');
    const timeoutId = setTimeout(async () => {
      const available = await fetchEmailAvailability(normalizedEmail);
      if (emailCheckRequestIdRef.current !== requestId) return;

      if (available === null) {
        setEmailStatus('error');
        return;
      }

      setEmailStatus(available ? 'available' : 'taken');
      setEmailError(available ? null : t('linkAccount.emailConflict'));
    }, 450);

    return () => clearTimeout(timeoutId);
  }, [normalizedEmail, step, t]);

  const navigateToHome = () => {
    setShowSuccessModal(false);
    router.replace('/(tabs)/home');
  };

  const renderEmailFeedback = () => {
    if (!normalizedEmail) return null;

    if (emailError) {
      return (
        <View style={styles.emailFeedback}>
          <Ionicons name="close-circle" size={16} color={colors.error ?? '#e53935'} />
          <Text style={[styles.emailFeedbackText, { color: colors.error ?? '#e53935' }]}>
            {emailError}
          </Text>
        </View>
      );
    }

    if (emailStatus === 'checking') {
      return (
        <View style={styles.emailFeedback}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.emailFeedbackText}>{t('emailRegister.checking')}</Text>
        </View>
      );
    }

    if (emailStatus === 'available') {
      return (
        <View style={styles.emailFeedback}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={[styles.emailFeedbackText, { color: colors.success }]}>
            {t('emailRegister.available')}
          </Text>
        </View>
      );
    }

    return null;
  };

  // ─── Social linking (unchanged) ────────────────────────────────────────────

  const handleSocialLink = async (provider: string, idToken: string) => {
    setLoading(true);
    try {
      trackEvent('link_account_started', { user_type: 'GUEST', auth_provider: provider.toUpperCase(), entry_point: 'link_account_screen' });
      trackProductEvent(ProductEventName.SIGNUP_STARTED, {
        'signup method': provider,
        'entry point': 'link_account_screen',
        'is guest upgrade': true,
        'country code': resolveCountryCode(i18n.resolvedLanguage ?? i18n.language),
      });
      const res = await linkAccountWithSocial({ provider, idToken });
      const { accessToken, refreshToken, user } = res.data;
      storeLogin(accessToken, refreshToken, user);
      void queryClient.invalidateQueries({ queryKey: ['oracle'] });
      void queryClient.invalidateQueries({ queryKey: ['astrology'] });
      trackEvent('link_account_completed', { user_type: 'REGISTERED', auth_provider: provider.toUpperCase(), linked_account: true });
      trackEvent('quick_to_registered_converted', { auth_provider: provider.toUpperCase() });
      trackProductEvent(ProductEventName.SIGNUP_COMPLETED, {
        'signup method': provider,
        'entry point': 'link_account_screen',
        'is guest upgrade': true,
        'email verification required': false,
      });
      trackProductEvent(ProductEventName.LOGIN_COMPLETED, {
        'login method': provider,
        'entry point': 'link_account_screen',
        'is returning user': false,
      });
      setProductUserProperties({
        'Signup Method': provider,
        'Login Method': provider,
      });
      setShowSuccessModal(true);
    } catch (error: any) {
      const message = error?.response?.data?.message ?? '';
      if (message === 'SOCIAL_ACCOUNT_ALREADY_LINKED') Alert.alert(t('common.error'), t('linkAccount.socialConflict'));
      else if (message === 'EMAIL_ALREADY_REGISTERED') Alert.alert(t('common.error'), t('linkAccount.emailConflict'));
      else if (message === 'ACCOUNT_ALREADY_LINKED') Alert.alert(t('common.error'), t('linkAccount.alreadyLinked'));
      else Alert.alert(t('common.error'), t('linkAccount.genericError'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLink = async () => {
    try {
      if (Platform.OS !== 'web') {
        const idToken = await signInWithNativeGoogle();
        if (!idToken) return;

        await handleSocialLink('google', idToken);
        return;
      }

      if (!GOOGLE_WEB_CLIENT_ID) {
        presentGoogleLinkError(t('common.error'), t('linkAccount.googleConfigError'));
        return;
      }

      const result = await googlePromptAsync();
      if (result?.type === 'success') {
        const idToken = result.params?.id_token ?? result.authentication?.idToken;
        if (idToken) await handleSocialLink('google', idToken);
        else presentGoogleLinkError(t('common.error'), t('linkAccount.genericError'));
      }
    } catch (error) {
      const message = isNativeGoogleSigninConfigurationError(error)
        ? t('linkAccount.googleConfigError')
        : t('linkAccount.genericError');

      presentGoogleLinkError(t('common.error'), message);
    }
  };

  const handleAppleLink = async () => {
    try {
      const nonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, Math.random().toString(36));
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
        nonce,
      });
      if (credential.identityToken) await handleSocialLink('apple', credential.identityToken);
    } catch (error: any) {
      if (error.code !== 'ERR_REQUEST_CANCELED') Alert.alert(t('common.error'), t('linkAccount.genericError'));
    }
  };

  // ─── Email step 1: send OTP ─────────────────────────────────────────────────

  const handleEmailSubmit = async () => {
    if (!isFormValid || loading) return;
    setLoading(true);
    try {
      if (!EMAIL_REGEX.test(normalizedEmail)) {
        const invalidEmailMessage = t('auth.invalidEmail');
        setEmailStatus('idle');
        setEmailError(invalidEmailMessage);
        Alert.alert(t('common.error'), invalidEmailMessage);
        return;
      }

      trackEvent('link_account_started', { user_type: 'GUEST', auth_provider: 'EMAIL', entry_point: 'link_account_screen' });
      trackProductEvent(ProductEventName.SIGNUP_STARTED, {
        'signup method': 'email',
        'entry point': 'link_account_screen',
        'is guest upgrade': true,
        'country code': resolveCountryCode(i18n.resolvedLanguage ?? i18n.language),
      });
      await linkAccountWithEmail({
        email: normalizedEmail,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
      });
      setStep('otp');
      setTimeout(() => otpInputRef.current?.focus(), 300);
    } catch (error: any) {
      const message = error?.response?.data?.message ?? '';
      if (message === 'EMAIL_ALREADY_REGISTERED') {
        setEmailStatus('taken');
        setEmailError(t('linkAccount.emailConflict'));
        Alert.alert(t('common.error'), t('linkAccount.emailConflict'));
      }
      else if (message === 'ACCOUNT_ALREADY_LINKED') Alert.alert(t('common.error'), t('linkAccount.alreadyLinked'));
      else if (message === 'PASSWORD_WEAK' || message.includes('WEAK')) Alert.alert(t('common.error'), t('security.passwordPolicyError'));
      else Alert.alert(t('common.error'), t('linkAccount.genericError'));
    } finally {
      setLoading(false);
    }
  };

  // ─── Email step 2: verify OTP ───────────────────────────────────────────────

  const handleOtpVerify = async () => {
    if (!isOtpValid || loading) return;
    setLoading(true);
    try {
      const res = await verifyLinkAccountOtp({ email: email.trim().toLowerCase(), code: otpCode });
      const { accessToken, refreshToken, user } = res.data;
      storeLogin(accessToken, refreshToken, user);
      void queryClient.invalidateQueries({ queryKey: ['oracle'] });
      void queryClient.invalidateQueries({ queryKey: ['astrology'] });
      trackEvent('link_account_completed', { user_type: 'REGISTERED', auth_provider: 'EMAIL', linked_account: true });
      trackEvent('quick_to_registered_converted', { auth_provider: 'EMAIL' });
      trackProductEvent(ProductEventName.SIGNUP_COMPLETED, {
        'signup method': 'email',
        'entry point': 'link_account_screen',
        'is guest upgrade': true,
        'email verification required': false,
      });
      trackProductEvent(ProductEventName.LOGIN_COMPLETED, {
        'login method': 'email',
        'entry point': 'link_account_screen',
        'is returning user': false,
      });
      setProductUserProperties({
        'Signup Method': 'email',
        'Login Method': 'email',
      });
      setShowSuccessModal(true);
    } catch (error: any) {
      const message = error?.response?.data?.message ?? '';
      if (message === 'OTP_EXPIRED') Alert.alert(t('common.error'), t('linkAccount.otpExpired'));
      else Alert.alert(t('common.error'), t('linkAccount.otpInvalid'));
      setOtpCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpCode('');
    setLoading(true);
    try {
      await linkAccountWithEmail({
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
      });
    } catch {
      Alert.alert(t('common.error'), t('linkAccount.genericError'));
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeScreen>
      <ActionModal
        visible={showSuccessModal}
        title={t('common.success')}
        description={t('linkAccount.success')}
        onRequestClose={navigateToHome}
        actions={[
          {
            label: t('linkAccount.goHome'),
            onPress: navigateToHome,
          },
        ]}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 'form' ? (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>{t('linkAccount.title')}</Text>
                <Text style={styles.subtitle}>{t('linkAccount.subtitle')}</Text>
              </View>

              {/* Social buttons */}
              <View style={styles.section}>
                {Platform.OS === 'ios' && (
                  <TouchableOpacity style={[styles.socialButton, styles.appleButton]} onPress={handleAppleLink} disabled={loading} accessibilityRole="button">
                    <Ionicons name="logo-apple" size={22} color={colors.white} style={styles.icon} />
                    <Text style={[styles.socialText, styles.appleText]}>{t('linkAccount.withApple')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.socialButton} onPress={handleGoogleLink} disabled={loading} accessibilityRole="button">
                  <Ionicons name="logo-google" size={22} color={colors.googleRed} style={styles.icon} />
                  <Text style={styles.socialText}>{t('linkAccount.withGoogle')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('common.or')}</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Email form with name fields */}
              <View style={styles.emailSection}>
                {/* First name + Last name row */}
                <View style={styles.nameRow}>
                  <View style={[styles.inputContainer, styles.nameInputWrap]}>
                    <TextInput
                      style={[styles.input, WEB_INPUT_RESET_STYLE]}
                      placeholder={t('linkAccount.firstNamePlaceholder')}
                      placeholderTextColor={colors.subtext}
                      value={firstName}
                      onChangeText={setFirstName}
                      autoCapitalize="words"
                      editable={!loading}
                      accessibilityLabel={t('linkAccount.firstNameLabel')}
                    />
                  </View>
                  <View style={[styles.inputContainer, styles.nameInputWrap]}>
                    <TextInput
                      style={[styles.input, WEB_INPUT_RESET_STYLE]}
                      placeholder={t('linkAccount.lastNamePlaceholder')}
                      placeholderTextColor={colors.subtext}
                      value={lastName}
                      onChangeText={setLastName}
                      autoCapitalize="words"
                      editable={!loading}
                      accessibilityLabel={t('linkAccount.lastNameLabel')}
                    />
                  </View>
                </View>

                <View style={[styles.inputContainer, emailError && styles.inputError]}>
                  <TextInput
                    style={[styles.input, WEB_INPUT_RESET_STYLE]}
                    placeholder={t('linkAccount.emailPlaceholder')}
                    placeholderTextColor={colors.subtext}
                    value={email}
                    onChangeText={(value) => {
                      setEmail(value);
                      setEmailStatus('idle');
                      if (emailError) setEmailError(null);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    accessibilityLabel={t('linkAccount.emailLabel')}
                  />
                </View>

                {renderEmailFeedback()}

                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, WEB_INPUT_RESET_STYLE]}
                    placeholder={t('linkAccount.passwordPlaceholder')}
                    placeholderTextColor={colors.subtext}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!loading}
                    accessibilityLabel={t('linkAccount.passwordLabel')}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                    accessibilityRole="button"
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.subtext}
                    />
                  </TouchableOpacity>
                </View>

                <Text
                  style={[
                    styles.policyText,
                    password.length > 0 &&
                      !STRONG_PASSWORD_RE.test(password) && { color: colors.error ?? '#e53935' },
                  ]}
                >
                  {t('linkAccount.passwordPolicy')}
                </Text>

                <TouchableOpacity
                  style={[styles.submitButton, (!isFormValid || loading) && styles.submitButtonDisabled]}
                  disabled={!isFormValid || loading}
                  onPress={handleEmailSubmit}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.submitButtonText,
                      (!isFormValid || loading) && styles.submitButtonTextDisabled,
                    ]}
                  >
                    {loading ? t('linkAccount.submitting') : t('linkAccount.submit')}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            /* ── OTP step ── */
            <>
              <View style={styles.header}>
                <Text style={styles.title}>{t('linkAccount.otpTitle')}</Text>
                <Text style={styles.subtitle}>{t('linkAccount.otpSubtitle', { email: email.trim().toLowerCase() })}</Text>
              </View>

              <View style={styles.emailSection}>
                <View style={styles.otpInputContainer}>
                  <TextInput
                    ref={otpInputRef}
                    style={[styles.otpInput, WEB_INPUT_RESET_STYLE]}
                    placeholder={t('linkAccount.otpPlaceholder')}
                    placeholderTextColor={colors.border}
                    value={otpCode}
                    onChangeText={(v) => setOtpCode(v.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!loading}
                    accessibilityLabel={t('linkAccount.otpLabel')}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, (!isOtpValid || loading) && styles.submitButtonDisabled]}
                  disabled={!isOtpValid || loading}
                  onPress={handleOtpVerify}
                  accessibilityRole="button"
                >
                  <Text style={[styles.submitButtonText, (!isOtpValid || loading) && styles.submitButtonTextDisabled]}>
                    {loading ? t('linkAccount.otpVerifying') : t('linkAccount.otpVerify')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.resendButton} onPress={handleResendOtp} disabled={loading} accessibilityRole="button">
                  <Text style={styles.resendText}>{t('linkAccount.otpResend')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.backButton} onPress={() => { setStep('form'); setOtpCode(''); }} accessibilityRole="button">
                  <Text style={styles.backText}>{t('common.back')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </SafeScreen>
  );
}
