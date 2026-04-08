import { useState, useRef } from 'react';
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
import { useAuthStore } from '../store/useAuthStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { linkAccountWithSocial, linkAccountWithEmail, verifyLinkAccountOtp } from '../services/auth';
import { trackEvent } from '../services/analytics';
import { WEB_INPUT_RESET_STYLE } from '../utils/webInputReset';

const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ??
  '607073022009-t0nujj22fr6k33tuhdg1eka9n9eq36t5.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ??
  '607073022009-a1r82mu51cetqtsknk5fjf34kau393g9.apps.googleusercontent.com';
const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  '607073022009-a1r82mu51cetqtsknk5fjf34kau393g9.apps.googleusercontent.com';

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
    input: { flex: 1, paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, color: colors.text },
    eyeButton: { paddingHorizontal: 14, paddingVertical: 14 },
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

export default function LinkAccountScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const storeLogin = useAuthStore((s) => s.login);
  const queryClient = useQueryClient();
  const savedFirstName = useOnboardingStore((s) => s.firstName);

  // Form state — pre-populate firstName from guest-name screen if available
  const [firstName, setFirstName] = useState(savedFirstName || '');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // OTP step state
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otpCode, setOtpCode] = useState('');
  const otpInputRef = useRef<TextInput>(null);

  const redirectUri = makeRedirectUri({ path: 'oauth2/callback', scheme: 'mystic-ai' });
  const [, , googlePromptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
    selectAccount: true,
  });

  const isFormValid = firstName.trim().length > 0 && email.trim().length > 0 && STRONG_PASSWORD_RE.test(password);
  const isOtpValid = otpCode.length === 6;

  // ─── Social linking (unchanged) ────────────────────────────────────────────

  const handleSocialLink = async (provider: string, idToken: string) => {
    setLoading(true);
    try {
      trackEvent('link_account_started', { user_type: 'GUEST', auth_provider: provider.toUpperCase(), entry_point: 'link_account_screen' });
      const res = await linkAccountWithSocial({ provider, idToken });
      const { accessToken, refreshToken, user } = res.data;
      storeLogin(accessToken, refreshToken, user);
      void queryClient.invalidateQueries({ queryKey: ['oracle'] });
      void queryClient.invalidateQueries({ queryKey: ['astrology'] });
      trackEvent('link_account_completed', { user_type: 'REGISTERED', auth_provider: provider.toUpperCase(), linked_account: true });
      trackEvent('quick_to_registered_converted', { auth_provider: provider.toUpperCase() });
      Alert.alert(t('common.success'), t('linkAccount.success'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
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
      const result = await googlePromptAsync();
      if (result?.type === 'success') {
        const idToken = result.params?.id_token ?? result.authentication?.idToken;
        if (idToken) await handleSocialLink('google', idToken);
        else Alert.alert(t('common.error'), t('linkAccount.genericError'));
      }
    } catch {
      Alert.alert(t('common.error'), t('linkAccount.genericError'));
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
      trackEvent('link_account_started', { user_type: 'GUEST', auth_provider: 'EMAIL', entry_point: 'link_account_screen' });
      await linkAccountWithEmail({
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
      });
      setStep('otp');
      setTimeout(() => otpInputRef.current?.focus(), 300);
    } catch (error: any) {
      const message = error?.response?.data?.message ?? '';
      if (message === 'EMAIL_ALREADY_REGISTERED') Alert.alert(t('common.error'), t('linkAccount.emailConflict'));
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
      Alert.alert(t('common.success'), t('linkAccount.success'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
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

                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, WEB_INPUT_RESET_STYLE]}
                    placeholder={t('linkAccount.emailPlaceholder')}
                    placeholderTextColor={colors.subtext}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    accessibilityLabel={t('linkAccount.emailLabel')}
                  />
                </View>

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
                  <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)} accessibilityRole="button" hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.subtext} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.policyText, password.length > 0 && !STRONG_PASSWORD_RE.test(password) && { color: colors.error ?? '#e53935' }]}>
                  {t('linkAccount.passwordPolicy')}
                </Text>

                <TouchableOpacity
                  style={[styles.submitButton, (!isFormValid || loading) && styles.submitButtonDisabled]}
                  disabled={!isFormValid || loading}
                  onPress={handleEmailSubmit}
                  accessibilityRole="button"
                >
                  <Text style={[styles.submitButtonText, (!isFormValid || loading) && styles.submitButtonTextDisabled]}>
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
