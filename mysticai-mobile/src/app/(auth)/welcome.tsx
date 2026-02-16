import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as Crypto from 'expo-crypto';
import OnboardingBackground from '../../components/OnboardingBackground';
import { useAuthStore } from '../../store/useAuthStore';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { socialLogin } from '../../services/auth';

const COLORS = {
  background: '#F9F7FB',
  text: '#1E1E1E',
  subtext: '#7A7A7A',
  border: '#E6E1EA',
  primary: '#9D4EDD',
  white: '#FFFFFF',
};

export default function WelcomeScreen() {
  const storeLogin = useAuthStore((s) => s.login);
  const onboarding = useOnboardingStore();
  const [loading, setLoading] = useState(false);

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
      const message = error?.response?.data?.message || 'Giriş yapılamadı. Lütfen tekrar deneyin.';
      Alert.alert('Hata', message);
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
      Alert.alert('Hata', 'Google ile giriş yapılamadı.');
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
        Alert.alert('Hata', 'Apple ile giriş yapılamadı.');
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
    <View style={styles.container}>
      <OnboardingBackground />

      <View style={styles.titleArea}>
        <Text style={styles.heading}>Hoş Geldiniz</Text>
        <Text style={styles.subheading}>Yıldızlarınızla tanışmaya hazır mısınız?</Text>
      </View>

      <View style={styles.buttons}>
        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[styles.socialButton, styles.appleButton]}
            onPress={handleAppleLogin}
            disabled={loading}
          >
            <Ionicons name="logo-apple" size={22} color="#FFFFFF" style={styles.icon} />
            <Text style={[styles.socialText, styles.appleText]}>Apple ile Giriş Yap</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.socialButton}
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          <Ionicons name="logo-google" size={22} color="#EA4335" style={styles.icon} />
          <Text style={styles.socialText}>Google ile Giriş Yap</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>veya</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.emailButton}
          onPress={handleEmailLogin}
          disabled={loading}
        >
          <Ionicons name="mail-outline" size={20} color={COLORS.primary} style={styles.icon} />
          <Text style={styles.emailButtonText}>E-posta ile Giriş Yap</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Hesabın yok mu? </Text>
        <TouchableOpacity onPress={handleRegister} disabled={loading}>
          <Text style={styles.footerLink}>Kayıt Ol</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    color: COLORS.text,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 16,
    color: COLORS.subtext,
  },
  buttons: {
    width: '100%',
    gap: 14,
  },
  socialButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  appleButton: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },
  icon: {
    position: 'absolute',
    left: 20,
  },
  socialText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  appleText: {
    color: COLORS.white,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: COLORS.subtext,
  },
  emailButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(249,247,251,0.7)',
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
    color: COLORS.subtext,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
