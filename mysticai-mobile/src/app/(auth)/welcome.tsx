import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as Crypto from 'expo-crypto';
import { makeRedirectUri } from 'expo-auth-session';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../../components/OnboardingBackground';
import { useAuthStore } from '../../store/useAuthStore';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { socialLogin, login as loginApi } from '../../services/auth';
import { useTheme } from '../../context/ThemeContext';
import { SafeScreen } from '../../components/ui';
import { trackEvent } from '../../services/analytics';

const WEB_GOOGLE_POPUP_MESSAGE_TYPE = 'mystic-google-auth';

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

function needsOnboarding(user: {
  birthDate?: string;
  birthCountry?: string;
  birthCity?: string;
  gender?: string;
  focusPoint?: string;
}): boolean {
  const isBlank = (value?: string) => !value || value.trim().length === 0;
  return (
    isBlank(user.birthDate) ||
    isBlank(user.birthCountry) ||
    isBlank(user.birthCity) ||
    isBlank(user.gender) ||
    isBlank(user.focusPoint)
  );
}

type GoogleAuthLikeResult = {
  type?: string;
  params?: Record<string, string | undefined>;
  authentication?: { idToken?: string | null } | null;
};

function extractGoogleIdToken(result: GoogleAuthLikeResult | null | undefined): string | undefined {
  if (!result || result.type !== 'success') return undefined;
  return result.params?.id_token ?? result.authentication?.idToken ?? undefined;
}

function extractIdTokenFromHash(hash: string): string | undefined {
  const normalized = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!normalized) return undefined;
  const params = new URLSearchParams(normalized);
  return params.get('id_token') ?? undefined;
}

function extractIdTokenFromPopupMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const data = payload as Record<string, unknown>;
  if (data.type !== WEB_GOOGLE_POPUP_MESSAGE_TYPE) return undefined;
  const idToken = data.idToken;
  return typeof idToken === 'string' && idToken.trim().length > 0 ? idToken : undefined;
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
      paddingHorizontal: 24,
    },
    scrollContent: {
      flexGrow: 1,
      paddingTop: 56,
      paddingBottom: 100,
    },
    titleArea: {
      alignItems: 'center',
      marginBottom: 28,
    },
    heading: {
      fontSize: 28,
      fontWeight: '700',
      color: C.text,
      marginBottom: 8,
    },
    subheading: {
      fontSize: 16,
      color: C.subtext,
      textAlign: 'center',
    },
    form: {
      width: '100%',
      gap: 14,
      marginBottom: 24,
    },
    inputContainer: {
      backgroundColor: C.inputBg,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
    },
    input: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 16,
      color: C.text,
    },
    eyeButton: {
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    forgotRow: {
      alignItems: 'flex-end',
      marginTop: -4,
      marginBottom: 2,
    },
    forgotLink: {
      color: C.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    errorText: {
      color: C.error,
      fontSize: 13,
      textAlign: 'center',
    },
    loginButton: {
      backgroundColor: C.primary,
      borderRadius: 28,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 6,
    },
    loginButtonDisabled: {
      backgroundColor: C.disabled,
    },
    loginButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: C.white,
    },
    loginButtonTextDisabled: {
      color: C.disabledText,
    },
    socialSection: {
      width: '100%',
      gap: 14,
    },
    socialButton: {
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    appleButton: {
      backgroundColor: C.appleBlack,
      borderColor: C.appleBlack,
    },
    icon: {
      position: 'absolute',
      left: 20,
    },
    socialText: {
      fontSize: 16,
      fontWeight: '600',
      color: C.text,
    },
    appleText: {
      color: C.white,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 20,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: C.border,
    },
    dividerText: {
      marginHorizontal: 12,
      fontSize: 13,
      color: C.subtext,
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: C.dim,
      justifyContent: 'center',
      alignItems: 'center',
    },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 48,
      paddingHorizontal: 24,
    },
    footerText: {
      fontSize: 14,
      color: C.subtext,
    },
    footerLink: {
      fontSize: 14,
      fontWeight: '600',
      color: C.primary,
    },
  });
}

const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ??
  '607073022009-t0nujj22fr6k33tuhdg1eka9n9eq36t5.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ??
  '607073022009-a1r82mu51cetqtsknk5fjf34kau393g9.apps.googleusercontent.com';
const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  '607073022009-a1r82mu51cetqtsknk5fjf34kau393g9.apps.googleusercontent.com';

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const storeLogin = useAuthStore((s) => s.login);
  const pendingEmail = useAuthStore((s) => s.pendingEmail);
  const setPendingEmail = useAuthStore((s) => s.setPendingEmail);
  const onboarding = useOnboardingStore();
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handledGoogleTokenRef = useRef<string | null>(null);
  const styles = makeStyles(colors);
  const isFormValid = email.trim().length > 0 && password.length > 0;

  useEffect(() => {
    const prefilledEmail = (firstParam(params.email || undefined) || pendingEmail || '').trim().toLowerCase();
    if (prefilledEmail) {
      setEmail((prev) => prev || prefilledEmail);
    }
  }, [params.email, pendingEmail]);

  const redirectUri = makeRedirectUri({
    path: 'oauth2/callback',
    scheme: 'mystic-ai',
  });

  const [, googleResponse, googlePromptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
    selectAccount: true,
  });

  const handleSocialLoginResult = async (provider: string, idToken: string) => {
    setLoading(true);
    try {
      const res = await socialLogin(provider, idToken);
      const { accessToken, refreshToken, user, isNewUser } = res.data;
      const shouldStartOnboarding = isNewUser || needsOnboarding(user);

      if (shouldStartOnboarding) {
        // Pre-fill onboarding with data from social provider
        if (user.firstName) onboarding.setFirstName(user.firstName);
        if (user.lastName) onboarding.setLastName(user.lastName);
        if (user.email) onboarding.setEmail(user.email);
        // Save token — user is authenticated but needs to complete onboarding
        storeLogin(accessToken, refreshToken, user);
        router.replace('/(auth)/birth-date');
      } else {
        storeLogin(accessToken, refreshToken, user);
        router.replace('/(tabs)/home');
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || t('auth.loginError');
      Alert.alert(t('common.error'), message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await googlePromptAsync();
      const idToken = extractGoogleIdToken(result) ?? extractGoogleIdToken(googleResponse);

      if (result?.type === 'success' && idToken) {
        handledGoogleTokenRef.current = idToken;
        await handleSocialLoginResult('google', idToken);
      } else if (result?.type === 'success') {
        Alert.alert(t('common.error'), t('auth.googleLoginError'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('auth.googleLoginError'));
    }
  };

  useEffect(() => {
    const idToken = extractGoogleIdToken(googleResponse);
    if (!idToken) return;
    if (handledGoogleTokenRef.current === idToken) return;

    handledGoogleTokenRef.current = idToken;
    void handleSocialLoginResult('google', idToken);
  }, [googleResponse]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const idToken = extractIdTokenFromHash(window.location.hash);
    if (!idToken) return;

    if (window.opener && window.opener !== window) {
      try {
        window.opener.postMessage(
          { type: WEB_GOOGLE_POPUP_MESSAGE_TYPE, idToken },
          window.location.origin
        );
      } finally {
        window.close();
      }
      return;
    }

    if (handledGoogleTokenRef.current === idToken) return;

    handledGoogleTokenRef.current = idToken;
    void handleSocialLoginResult('google', idToken);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handlePopupMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const idToken = extractIdTokenFromPopupMessage(event.data);
      if (!idToken) return;
      if (handledGoogleTokenRef.current === idToken) return;

      handledGoogleTokenRef.current = idToken;
      void handleSocialLoginResult('google', idToken);
    };

    window.addEventListener('message', handlePopupMessage);
    return () => {
      window.removeEventListener('message', handlePopupMessage);
    };
  }, [handleSocialLoginResult]);

  const handleAppleLogin = async () => {
    try {
      const nonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Math.random().toString(36)
      );
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce,
      });

      if (credential.identityToken) {
        await handleSocialLoginResult('apple', credential.identityToken);
      }
    } catch (error: any) {
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert(t('common.error'), t('auth.appleLoginError'));
      }
    }
  };

  const handleEmailLogin = async () => {
    if (!isFormValid || loading) return;
    setErrorMessage(null);
    setLoading(true);
    try {
      const res = await loginApi({ username: email.trim().toLowerCase(), password });
      const { accessToken, refreshToken, user } = res.data;
      const shouldStartOnboarding = needsOnboarding(user);
      storeLogin(accessToken, refreshToken, user);
      if (shouldStartOnboarding) {
        router.replace('/(auth)/birth-date');
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (error: any) {
      const status = error?.response?.status;
      const message = String(error?.response?.data?.message ?? '');
      const code = String(error?.response?.data?.code ?? '');
      const isEmailNotVerified =
        status === 401 &&
        (message === 'EMAIL_NOT_VERIFIED' ||
          code === 'EMAIL_NOT_VERIFIED' ||
          message.includes('EMAIL_NOT_VERIFIED'));

      if (isEmailNotVerified) {
        trackEvent('auth_login_email_not_verified', { source: 'login' });
        setPendingEmail(email.trim().toLowerCase());
        router.replace({
          pathname: '/(auth)/verify-email-pending',
          params: { email: email.trim().toLowerCase(), source: 'login' },
        });
        return;
      }
      if (status === 401) {
        setErrorMessage(t('auth.invalidCredentials'));
      } else {
        setErrorMessage(t('auth.loginError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    router.push({
      pathname: '/(auth)/signup',
      params: { email: email.trim().toLowerCase() },
    });
  };

  const handleForgotPassword = () => {
    router.push({
      pathname: '/(auth)/forgot-password',
      params: { email: email.trim().toLowerCase() },
    });
  };

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <OnboardingBackground />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.titleArea}>
            <Text style={styles.heading}>{t('auth.welcomeTitle')}</Text>
            <Text style={styles.subheading}>{t('auth.welcomeSubtitle')}</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={t('auth.email')}
                placeholderTextColor={colors.subtext}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={t('auth.password')}
                placeholderTextColor={colors.subtext}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                accessibilityLabel={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
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

            <View style={styles.forgotRow}>
              <TouchableOpacity
                onPress={handleForgotPassword}
                disabled={loading}
                accessibilityLabel={t('auth.forgotPassword')}
                accessibilityRole="button"
              >
                <Text style={styles.forgotLink}>{t('auth.forgotPassword')}</Text>
              </TouchableOpacity>
            </View>

            {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

            <TouchableOpacity
              style={[styles.loginButton, (!isFormValid || loading) && styles.loginButtonDisabled]}
              disabled={!isFormValid || loading}
              onPress={handleEmailLogin}
              accessibilityLabel={t('auth.loginTitle')}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text
                  style={[
                    styles.loginButtonText,
                    (!isFormValid || loading) && styles.loginButtonTextDisabled,
                  ]}
                >
                  {t('auth.loginTitle')}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('common.or')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialSection}>
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.socialButton, styles.appleButton]}
                onPress={handleAppleLogin}
                disabled={loading}
                accessibilityLabel={t('auth.loginWithApple')}
                accessibilityRole="button"
              >
                <Ionicons name="logo-apple" size={22} color={colors.white} style={styles.icon} />
                <Text style={[styles.socialText, styles.appleText]}>{t('auth.loginWithApple')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleGoogleLogin}
              disabled={loading}
              accessibilityLabel={t('auth.loginWithGoogle')}
              accessibilityRole="button"
            >
              <Ionicons name="logo-google" size={22} color={colors.googleRed} style={styles.icon} />
              <Text style={styles.socialText}>{t('auth.loginWithGoogle')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      <View style={styles.footer} pointerEvents={loading ? 'none' : 'auto'}>
        <Text style={styles.footerText}>{t('auth.noAccount')}</Text>
        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading}
          accessibilityLabel={t('auth.signUp')}
          accessibilityRole="button"
        >
          <Text style={styles.footerLink}>{t('auth.signUp')}</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}
