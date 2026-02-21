import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as Crypto from 'expo-crypto';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../../components/OnboardingBackground';
import { useAuthStore } from '../../store/useAuthStore';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { socialLogin } from '../../services/auth';
import { useTheme } from '../../context/ThemeContext';
import { SafeScreen } from '../../components/ui';

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
      paddingHorizontal: 24,
      paddingTop: 80,
      alignItems: 'center',
    },
    titleArea: {
      alignItems: 'center',
      marginBottom: 40,
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
    },
    buttons: {
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
      marginVertical: 4,
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
    emailButton: {
      backgroundColor: C.white,
      borderWidth: 1,
      borderColor: C.primary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    emailButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: C.primary,
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
      bottom: 48,
      flexDirection: 'row',
      alignItems: 'center',
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
  const [loading, setLoading] = useState(false);
  const styles = makeStyles(colors);

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

  const handleEmailLogin = () => {
    router.push('/login');
  };

  const handleRegister = () => {
    router.push('/email-register');
  };

  return (
    <SafeScreen>
      <View style={styles.container}>
        <OnboardingBackground />

        <View style={styles.titleArea}>
        <Text style={styles.heading}>{t('auth.welcomeTitle')}</Text>
        <Text style={styles.subheading}>{t('auth.welcomeSubtitle')}</Text>
      </View>

      <View style={styles.buttons}>
        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[styles.socialButton, styles.appleButton]}
            onPress={handleAppleLogin}
            disabled={loading}
            accessibilityLabel="Apple ile giriş yap"
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
          accessibilityLabel="Google ile giriş yap"
          accessibilityRole="button"
        >
          <Ionicons name="logo-google" size={22} color={colors.googleRed} style={styles.icon} />
          <Text style={styles.socialText}>{t('auth.loginWithGoogle')}</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('common.or')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.emailButton}
          onPress={handleEmailLogin}
          disabled={loading}
          accessibilityLabel="E-posta ile giriş yap"
          accessibilityRole="button"
        >
          <Ionicons name="mail-outline" size={20} color={colors.primary} style={styles.icon} />
          <Text style={styles.emailButtonText}>{t('auth.loginWithEmail')}</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('auth.noAccount')}</Text>
        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading}
          accessibilityLabel="Kayıt ol"
          accessibilityRole="button"
        >
          <Text style={styles.footerLink}>{t('auth.signUp')}</Text>
        </TouchableOpacity>
      </View>
      </View>
    </SafeScreen>
  );
}
