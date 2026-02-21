import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../../components/OnboardingBackground';
import { useAuthStore } from '../../store/useAuthStore';
import { login as loginApi } from '../../services/auth';
import { useTheme } from '../../context/ThemeContext';
import { SafeScreen } from '../../components/ui';

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
      paddingHorizontal: 24,
    },
    backButton: {
      marginTop: 56,
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: C.white,
      borderWidth: 1,
      borderColor: C.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      marginTop: -40,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: C.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      color: C.subtext,
      marginBottom: 32,
    },
    form: {
      gap: 14,
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
    forgotPassword: {
      alignSelf: 'flex-end',
      opacity: 0.4,
    },
    forgotPasswordText: {
      fontSize: 13,
      color: C.primary,
    },
    loginButton: {
      backgroundColor: C.primary,
      borderRadius: 28,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
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
  });
}

export default function LoginScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const storeLogin = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const styles = makeStyles(colors);

  const isFormValid = email.trim().length > 0 && password.length > 0;

  const handleLogin = async () => {
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

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <OnboardingBackground />

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        accessibilityLabel="Geri dön"
        accessibilityRole="button"
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>{t('auth.loginTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.loginSubtitle')}</Text>

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
            style={styles.forgotPassword}
            disabled
            accessibilityLabel="Şifreni mi unuttun?"
            accessibilityRole="button"
          >
            <Text style={styles.forgotPasswordText}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, (!isFormValid || loading) && styles.loginButtonDisabled]}
            disabled={!isFormValid || loading}
            onPress={handleLogin}
            accessibilityLabel="Giriş yap"
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color={colors.surface} />
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
      </View>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}
