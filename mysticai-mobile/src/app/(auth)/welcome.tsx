import { useState } from 'react';
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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as Crypto from 'expo-crypto';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../../components/OnboardingBackground';
import { useAuthStore } from '../../store/useAuthStore';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { socialLogin, login as loginApi } from '../../services/auth';
import { useTheme } from '../../context/ThemeContext';
import { SafeScreen } from '../../components/ui';

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
      backgroundColor: C.white,
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
      backgroundColor: C.white,
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

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const storeLogin = useAuthStore((s) => s.login);
  const onboarding = useOnboardingStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const styles = makeStyles(colors);
  const isFormValid = email.trim().length > 0 && password.length > 0;

  const [, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    iosClientId: "607073022009-t0nujj22fr6k33tuhdg1eka9n9eq36t5.apps.googleusercontent.com",
    androidClientId: "607073022009-a1r82mu51cetqtsknk5fjf34kau393g9.apps.googleusercontent.com",
    webClientId: "607073022009-a1r82mu51cetqtsknk5fjf34kau393g9.apps.googleusercontent.com",
  });

  const handleSocialLoginResult = async (provider: string, idToken: string) => {
    setLoading(true);
    try {
      const res = await socialLogin(provider, idToken);
      const { accessToken, refreshToken, user, isNewUser } = res.data;

      if (isNewUser) {
        // Pre-fill onboarding with data from social provider
        if (user.firstName) onboarding.setFirstName(user.firstName);
        if (user.lastName) onboarding.setLastName(user.lastName);
        if (user.email) onboarding.setEmail(user.email);
        // Save token — user is authenticated but needs to complete onboarding
        storeLogin(accessToken, refreshToken, user);
        router.replace('/birth-date');
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
      if (result?.type === 'success' && result.authentication?.idToken) {
        await handleSocialLoginResult('google', result.authentication.idToken);
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('auth.googleLoginError'));
    }
  };

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
      storeLogin(accessToken, refreshToken, user);
      router.replace('/(tabs)/home');
    } catch (error: any) {
      const status = error?.response?.status;
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
    router.push('/email-register');
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
