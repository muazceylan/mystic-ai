import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../../components/OnboardingBackground';
import { SafeScreen } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { forgotPassword } from '../../services/auth';

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
      paddingHorizontal: 24,
      justifyContent: 'center',
    },
    card: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      padding: 20,
      gap: 14,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: C.text,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: C.subtext,
    },
    inputContainer: {
      backgroundColor: C.inputBg,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
    },
    input: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: C.text,
      fontSize: 16,
    },
    button: {
      marginTop: 4,
      borderRadius: 24,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: C.primary,
    },
    buttonDisabled: {
      backgroundColor: C.disabled,
    },
    buttonText: {
      color: C.white,
      fontWeight: '700',
      fontSize: 15,
    },
    secondaryButton: {
      marginTop: 4,
      borderRadius: 24,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.bg,
    },
    secondaryButtonText: {
      color: C.text,
      fontWeight: '600',
      fontSize: 15,
    },
    successText: {
      color: C.success,
      fontSize: 14,
      lineHeight: 20,
    },
    errorText: {
      color: C.error,
      fontSize: 13,
    },
  });
}

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const styles = makeStyles(colors);

  useEffect(() => {
    const prefilled = firstParam(params.email).trim().toLowerCase();
    if (prefilled) {
      setEmail(prefilled);
    }
  }, [params.email]);

  const canSubmit = isValidEmail(email.trim()) && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setIsSubmitted(true);
    } catch {
      setError(t('auth.passwordReset.requestError'));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.replace({
      pathname: '/(auth)/welcome',
      params: { email: email.trim().toLowerCase() },
    });
  };

  return (
    <SafeScreen>
      <View style={styles.container}>
        <OnboardingBackground />
        <View style={styles.card}>
          <Text style={styles.title}>{t('auth.passwordReset.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.passwordReset.subtitle')}</Text>

          {!isSubmitted ? (
            <>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.email')}
                  placeholderTextColor={colors.subtext}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                  editable={!loading}
                />
              </View>
              {!!error && <Text style={styles.errorText}>{error}</Text>}
              <TouchableOpacity
                style={[styles.button, !canSubmit && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={!canSubmit}
                accessibilityRole="button"
                accessibilityLabel={t('auth.passwordReset.sendButton')}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.buttonText}>{t('auth.passwordReset.sendButton')}</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.successText}>{t('auth.passwordReset.requestSent')}</Text>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel={t('auth.passwordReset.backToLogin')}
          >
            <Text style={styles.secondaryButtonText}>{t('auth.passwordReset.backToLogin')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeScreen>
  );
}
