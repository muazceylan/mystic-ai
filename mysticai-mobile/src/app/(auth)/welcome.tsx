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
  Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as Crypto from 'expo-crypto';
import { makeRedirectUri } from 'expo-auth-session';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../../components/OnboardingBackground';
import { AuthLegalNotice } from '../../components/auth';
import { useAuthStore } from '../../store/useAuthStore';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { usePendingGuestStore } from '../../store/usePendingGuestStore';
import { socialLogin, login as loginApi, quickStart as quickStartApi } from '../../services/auth';
import { useTheme } from '../../context/ThemeContext';
import { SafeScreen } from '../../components/ui';
import { trackEvent } from '../../services/analytics';
import { needsOnboarding } from '../../utils/authOnboarding';


const WEB_GOOGLE_POPUP_MESSAGE_TYPE = 'mystic-google-auth';
const HERO_PREMIUM_ICON = require('../../../assets/brand/logo/astro-guru-logo-small-optimized.png');
const HERO_DISPLAY_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia',
});

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
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
      paddingHorizontal: 20,
    },
    scrollContent: {
      flexGrow: 1,
      paddingTop: 14,
      paddingBottom: 16,
      gap: 10,
    },
    heroSection: {
      alignItems: 'center',
      gap: 10,
      paddingTop: 6,
      paddingBottom: 4,
    },
    heroMarkWrap: {
      width: 78,
      height: 78,
      shadowColor: C.primary700,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
    heroMarkFrame: {
      flex: 1,
      borderRadius: 25,
      padding: 1.5,
    },
    heroMarkCore: {
      flex: 1,
      borderRadius: 24,
      backgroundColor: 'rgba(255,255,255,0.88)',
      borderWidth: 1,
      borderColor: 'rgba(187,147,255,0.26)',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    heroMarkGlow: {
      position: 'absolute',
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: 'rgba(181,107,255,0.08)',
    },
    heroMarkViewport: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    heroMarkImage: {
      width: 62,
      height: 62,
      resizeMode: 'cover',
      transform: [{ scale: 1.04 }],
    },
    heroTextWrap: {
      alignItems: 'center',
      gap: 2,
      maxWidth: 260,
    },
    heading: {
      fontFamily: HERO_DISPLAY_FONT,
      fontSize: 30,
      lineHeight: 34,
      fontWeight: Platform.OS === 'ios' ? '700' : '600',
      color: C.text,
      letterSpacing: -0.8,
    },
    subheading: {
      fontFamily: 'MysticInter-Regular',
      fontSize: 13,
      lineHeight: 19,
      letterSpacing: 0.1,
      color: C.subtext,
      textAlign: 'center',
    },
    card: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      backgroundColor: C.surface,
      padding: 10,
      gap: 6,
    },
    form: {
      width: '100%',
      gap: 6,
    },
    fieldGroup: {
      gap: 4,
    },
    inputContainer: {
      backgroundColor: C.inputBg,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 48,
    },
    input: {
      flex: 1,
      paddingVertical: 12,
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
      marginTop: -2,
    },
    forgotLink: {
      color: C.primary,
      fontSize: 13,
      fontWeight: '600',
    },
    errorText: {
      color: C.error,
      fontSize: 13,
      textAlign: 'center',
    },
    loginButton: {
      borderRadius: 16,
      overflow: 'hidden',
      marginTop: 2,
    },
    loginButtonDisabled: {
      opacity: 0.55,
      shadowOpacity: 0,
      elevation: 0,
    },
    loginGradient: {
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
    },
    loginButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: C.white,
      letterSpacing: 0.2,
    },
    loginButtonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    loginButtonTextDisabled: {
      color: C.white,
    },
    socialSection: {
      width: '100%',
      gap: 6,
    },
    legalNotice: {
      marginTop: 2,
    },
    socialButton: {
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 14,
      minHeight: 48,
      paddingVertical: 10,
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
    quickStartButton: {
      borderRadius: 16,
      overflow: 'hidden',
    },
    quickStartGradient: {
      minHeight: 62,
      paddingVertical: 10,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    quickStartContent: {
      flex: 1,
      gap: 2,
    },
    quickStartTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: C.white,
    },
    quickStartHint: {
      fontSize: 11,
      lineHeight: 14,
      color: 'rgba(255,255,255,0.82)',
    },
    quickStartArrow: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.16)',
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 0,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: C.border,
    },
    dividerText: {
      marginHorizontal: 10,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.6,
      color: C.subtext,
      textTransform: 'uppercase',
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 0,
      paddingBottom: 2,
    },
    footerText: {
      fontSize: 13,
      color: C.subtext,
    },
    footerLink: {
      fontSize: 13,
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
  const setPendingGuest = usePendingGuestStore((s) => s.set);
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quickStartLoading, setQuickStartLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handledGoogleTokenRef = useRef<string | null>(null);
  const authTransitionRef = useRef(false);
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
    if (authTransitionRef.current) return;
    setLoading(true);
    try {
      const res = await socialLogin(provider, idToken);
      const { accessToken, refreshToken, user, isNewUser } = res.data;
      const shouldStartOnboarding = isNewUser || needsOnboarding(user);

      if (shouldStartOnboarding) {
        if (user.firstName) onboarding.setFirstName(user.firstName);
        if (user.lastName) onboarding.setLastName(user.lastName);
        if (user.email) onboarding.setEmail(user.email);
      }

      storeLogin(accessToken, refreshToken, user);
      authTransitionRef.current = true;
    } catch (error: any) {
      authTransitionRef.current = false;
      const message = error?.response?.data?.message || t('auth.loginError');
      Alert.alert(t('common.error'), message);
    } finally {
      if (authTransitionRef.current) return;
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
    if (!isFormValid || loading || authTransitionRef.current) return;
    setErrorMessage(null);
    setLoading(true);
    try {
      const res = await loginApi({ username: email.trim().toLowerCase(), password });
      const { accessToken, refreshToken, user } = res.data;
      storeLogin(accessToken, refreshToken, user);
      authTransitionRef.current = true;
    } catch (error: any) {
      authTransitionRef.current = false;
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
      if (authTransitionRef.current) return;
      setLoading(false);
    }
  };

  const handleQuickStart = async () => {
    if (loading || quickStartLoading || authTransitionRef.current) return;
    setQuickStartLoading(true);
    try {
      trackEvent('quick_start_clicked', { entry_point: 'welcome', user_type: 'GUEST', auth_provider: 'ANONYMOUS' });
      const res = await quickStartApi();
      const { accessToken, refreshToken, user } = res.data;
      trackEvent('quick_session_created', { user_type: 'GUEST', auth_provider: 'ANONYMOUS' });
      // Save session temporarily — guest-name screen will complete the login
      setPendingGuest({ accessToken, refreshToken: refreshToken ?? null, user });
      router.push('/(auth)/guest-name');
      authTransitionRef.current = true;
    } catch (error: any) {
      authTransitionRef.current = false;
      const message = error?.response?.data?.message || t('quickStart.error');
      Alert.alert(t('common.error'), message);
    } finally {
      if (authTransitionRef.current) return;
      setQuickStartLoading(false);
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
          <View style={styles.heroSection}>
            <View style={styles.heroMarkWrap}>
              <LinearGradient
                colors={['rgba(255,255,255,0.98)', 'rgba(230,218,255,0.92)', 'rgba(186,141,255,0.55)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroMarkFrame}
              >
                <View style={styles.heroMarkCore}>
                  <View style={styles.heroMarkGlow} />
                  <View style={styles.heroMarkViewport}>
                    <Image
                      source={HERO_PREMIUM_ICON}
                      style={styles.heroMarkImage}
                      accessibilityLabel={t('appBrand.logoA11y')}
                      accessibilityRole="image"
                    />
                  </View>
                </View>
              </LinearGradient>
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heading}>{t('auth.welcomeTitle')}</Text>
              <Text style={styles.subheading}>{t('auth.welcomeSubtitle')}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.form}>
              <View style={styles.fieldGroup}>
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
              </View>

              <View style={styles.fieldGroup}>
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
                <LinearGradient
                  colors={['#B56BFF', '#8E4DFF', '#6A31D8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0.9 }}
                  style={styles.loginGradient}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <View style={styles.loginButtonRow}>
                      <Text
                        style={[
                          styles.loginButtonText,
                          (!isFormValid || loading) && styles.loginButtonTextDisabled,
                        ]}
                      >
                        {t('auth.loginTitle')}
                      </Text>
                      <Ionicons name="arrow-forward" size={18} color={colors.white} />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

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
            </View>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('common.or')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.card}>
            <View style={styles.socialSection}>
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={[styles.socialButton, styles.appleButton]}
                  onPress={handleAppleLogin}
                  disabled={loading || quickStartLoading}
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
                disabled={loading || quickStartLoading}
                accessibilityLabel={t('auth.loginWithGoogle')}
                accessibilityRole="button"
              >
                <Ionicons name="logo-google" size={22} color={colors.googleRed} style={styles.icon} />
                <Text style={styles.socialText}>{t('auth.loginWithGoogle')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickStartButton}
                onPress={handleQuickStart}
                disabled={loading || quickStartLoading}
                accessibilityLabel={t('quickStart.accessibilityLabel')}
                accessibilityRole="button"
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={['#A15AF7', '#7C3AED', '#4F46E5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.quickStartGradient}
                >
                  {quickStartLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <View style={styles.quickStartContent}>
                        <Text style={styles.quickStartTitle}>{t('auth.quickStartTitle')}</Text>
                        <Text style={styles.quickStartHint}>{t('auth.quickStartHint')}</Text>
                      </View>

                      <View style={styles.quickStartArrow}>
                        <Ionicons name="arrow-forward" size={18} color="#fff" />
                      </View>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          <AuthLegalNotice variant="inline" style={styles.legalNotice} />
        </ScrollView>

      {(loading || quickStartLoading) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}
