import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import OnboardingBackground from '../../components/OnboardingBackground';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { checkEmailGet } from '../../services/auth';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { SafeScreen } from '../../components/ui';
import { isStrongPassword } from '../../utils/passwordPolicy';

/** Ad/soyad için geçerli karakterler: harfler (Türkçe dahil), boşluk, tire, kesme */
function maskNameInput(value: string): string {
  return value.replace(/[^\p{L}\s\-']/gu, '');
}

interface FormValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

type EmailStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: C.bg,
    },
    flex1: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 100,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
    },
    backButton: {
      paddingRight: 12,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: C.text,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: C.subtext,
      marginBottom: 20,
    },
    inputGroup: {
      marginBottom: 18,
    },
    label: {
      fontSize: 13,
      color: C.subtext,
      marginBottom: 6,
    },
    input: {
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      color: C.text,
      fontSize: 15,
    },
    inputError: {
      borderColor: C.error,
    },
    errorText: {
      color: C.error,
      fontSize: 12,
      marginTop: 4,
    },
    emailFeedback: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
    },
    emailFeedbackText: {
      fontSize: 12,
      color: C.subtext,
    },
    buttonWrapper: {
      marginTop: 20,
      marginBottom: 16,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 40,
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
    continueButton: {
      backgroundColor: C.primary,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: 'center',
    },
    continueButtonDisabled: {
      backgroundColor: C.disabled,
    },
    continueButtonText: {
      color: C.white,
      fontSize: 15,
      fontWeight: '600',
    },
  });
}

export default function EmailRegisterScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const store = useOnboardingStore();
  const params = useLocalSearchParams<{ error?: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const styles = makeStyles(colors);

  const {
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      firstName: store.firstName,
      lastName: store.lastName,
      email: store.email,
      password: store.password,
      confirmPassword: store.confirmPassword,
    },
  });

  const watchedEmail = watch('email');
  const watchedPassword = watch('password');

  useEffect(() => {
    if (params.error) {
      setError('email', { message: decodeURIComponent(params.error) });
    }
  }, [params.error]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const email = watchedEmail?.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailStatus('idle');
      return;
    }

    setEmailStatus('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await checkEmailGet(email);
        const { available } = response.data || {};
        setEmailStatus(available ? 'available' : 'taken');
      } catch {
        setEmailStatus('error');
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [watchedEmail]);

  const onSubmit = async (data: FormValues) => {
    if (isSubmitting) return;

    store.setFirstName(data.firstName.trim());
    store.setLastName(data.lastName.trim());
    store.setEmail(data.email.trim());
    store.setPassword(data.password);
    store.setConfirmPassword(data.confirmPassword);

    setIsSubmitting(true);

    try {
      if (emailStatus === 'taken') {
        setError('email', {
          message: t('emailRegister.emailTaken'),
        });
        return;
      }

      router.push('/(auth)/birth-date');
    } catch {
      setError('email', {
        message: t('emailRegister.emailCheckFailed'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderEmailFeedback = () => {
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
    if (emailStatus === 'taken') {
      return (
        <View style={styles.emailFeedback}>
          <Ionicons name="close-circle" size={16} color={colors.error} />
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/welcome')}
            accessibilityLabel={t('auth.goToLogin')}
            accessibilityRole="link"
          >
            <Text style={[styles.emailFeedbackText, { color: colors.error }]}>
              {t('emailRegister.emailTakenQuestion')}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeScreen>
      <OnboardingBackground />
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityLabel={t('addPerson.accessibilityBack')}
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>{t('emailRegister.title')}</Text>
          </View>

          <Text style={styles.sectionTitle}>{t('emailRegister.personalInfo')}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.firstName')}</Text>
            <Controller
              control={control}
              name="firstName"
              rules={{
                required: t('emailRegister.firstNameRequired'),
                validate: (v) => v.trim().length > 0 || t('emailRegister.firstNameRequired'),
              }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, errors.firstName && styles.inputError]}
                  placeholder={t('emailRegister.firstNamePlaceholder')}
                  placeholderTextColor={colors.disabledText}
                  value={value}
                  onChangeText={(text) => {
                    const masked = maskNameInput(text);
                    onChange(masked);
                    store.setFirstName(masked);
                  }}
                />
              )}
            />
            {errors.firstName && (
              <Text style={styles.errorText}>{errors.firstName.message}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.lastName')}</Text>
            <Controller
              control={control}
              name="lastName"
              rules={{
                required: t('emailRegister.lastNameRequired'),
                validate: (v) => v.trim().length > 0 || t('emailRegister.lastNameRequired'),
              }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, errors.lastName && styles.inputError]}
                  placeholder={t('emailRegister.lastNamePlaceholder')}
                  placeholderTextColor={colors.disabledText}
                  value={value}
                  onChangeText={(text) => {
                    const masked = maskNameInput(text);
                    onChange(masked);
                    store.setLastName(masked);
                  }}
                />
              )}
            />
            {errors.lastName && (
              <Text style={styles.errorText}>{errors.lastName.message}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.email')}</Text>
            <Controller
              control={control}
              name="email"
              rules={{
                required: t('emailRegister.emailRequired'),
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: t('auth.invalidEmail'),
                },
              }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder={t('emailRegister.emailPlaceholder')}
                  placeholderTextColor={colors.disabledText}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={value}
                  onChangeText={(text) => {
                    onChange(text);
                    store.setEmail(text);
                  }}
                />
              )}
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email.message}</Text>
            )}
            {!errors.email && renderEmailFeedback()}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.password')}</Text>
            <Controller
              control={control}
              name="password"
              rules={{
                required: t('auth.passwordRequired'),
                validate: (value) =>
                  isStrongPassword(value) || t('auth.passwordPolicy'),
              }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  placeholder={t('emailRegister.passwordPlaceholder')}
                  placeholderTextColor={colors.disabledText}
                  secureTextEntry
                  value={value}
                  onChangeText={(text) => {
                    onChange(text);
                    store.setPassword(text);
                  }}
                />
              )}
            />
            {errors.password && (
              <Text style={styles.errorText}>{errors.password.message}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.confirmPassword')}</Text>
            <Controller
              control={control}
              name="confirmPassword"
              rules={{
                required: t('emailRegister.confirmPasswordRequired'),
                validate: (value) =>
                  value === watchedPassword || t('auth.passwordsMatch'),
              }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, errors.confirmPassword && styles.inputError]}
                  placeholder={t('emailRegister.confirmPasswordPlaceholder')}
                  placeholderTextColor={colors.disabledText}
                  secureTextEntry
                  value={value}
                  onChangeText={(text) => {
                    onChange(text);
                    store.setConfirmPassword(text);
                  }}
                />
              )}
            />
            {errors.confirmPassword && (
              <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>
            )}
          </View>

          {/* Button INSIDE ScrollView so it scrolls into view above keyboard */}
          <View style={styles.buttonWrapper}>
            <TouchableOpacity
              style={[styles.continueButton, isSubmitting && styles.continueButtonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              accessibilityLabel={t('auth.signUp')}
              accessibilityRole="button"
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.continueButtonText}>{t('auth.signUp')}</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.alreadyHaveAccount')}</Text>
            <TouchableOpacity
              onPress={() => router.replace('/(auth)/welcome')}
              disabled={isSubmitting}
              accessibilityLabel={t('auth.loginTitle')}
              accessibilityRole="button"
            >
              <Text style={styles.footerLink}>{t('auth.loginTitle')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}
