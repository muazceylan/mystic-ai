import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../../components/OnboardingBackground';
import { AppText, Button, SafeScreen, TextField } from '../../components/ui';
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
      marginTop: 2,
    },
    successText: {
      color: C.success,
    },
    buttonColumn: {
      gap: 10,
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
          <AppText variant="H1" style={styles.title}>
            {t('auth.passwordReset.title')}
          </AppText>
          <AppText variant="Body" color="secondary" style={styles.subtitle}>
            {t('auth.passwordReset.subtitle')}
          </AppText>

          {!isSubmitted ? (
            <View style={styles.buttonColumn}>
              <TextField
                value={email}
                onChangeText={setEmail}
                label={t('auth.email')}
                placeholder={t('auth.email')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                error={error}
              />
              <Button
                title={t('auth.passwordReset.sendButton')}
                onPress={handleSubmit}
                disabled={!canSubmit}
                loading={loading}
                fullWidth
                size="lg"
              />
            </View>
          ) : (
            <AppText variant="Body" color="success" style={styles.successText}>
              {t('auth.passwordReset.requestSent')}
            </AppText>
          )}

          <Button
            title={t('auth.passwordReset.backToLogin')}
            onPress={handleBack}
            variant="outline"
            fullWidth
          />
        </View>
      </View>
    </SafeScreen>
  );
}
