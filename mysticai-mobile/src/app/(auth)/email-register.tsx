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
import { COLORS } from '../../constants/colors';
import { SafeScreen } from '../../components/ui';

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

export default function EmailRegisterScreen() {
  const store = useOnboardingStore();
  const params = useLocalSearchParams<{ error?: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          message: 'Bu e-posta zaten kayitli. Lutfen giris yapin.',
        });
        return;
      }

      router.push('/birth-date');
    } catch {
      setError('email', {
        message: 'E-posta kontrolu yapilamadi. Lutfen tekrar deneyin.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderEmailFeedback = () => {
    if (emailStatus === 'checking') {
      return (
        <View style={styles.emailFeedback}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.emailFeedbackText}>Kontrol ediliyor...</Text>
        </View>
      );
    }
    if (emailStatus === 'available') {
      return (
        <View style={styles.emailFeedback}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
          <Text style={[styles.emailFeedbackText, { color: COLORS.success }]}>
            Kullanilabilir
          </Text>
        </View>
      );
    }
    if (emailStatus === 'taken') {
      return (
        <View style={styles.emailFeedback}>
          <Ionicons name="close-circle" size={16} color={COLORS.error} />
          <TouchableOpacity
            onPress={() => router.replace('/login')}
            accessibilityLabel="Giriş ekranına git"
            accessibilityRole="link"
          >
            <Text style={[styles.emailFeedbackText, { color: COLORS.error }]}>
              Bu e-posta zaten kayitli, giris yapmak ister misin?
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
              accessibilityLabel="Geri dön"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={22} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Kayit Ol</Text>
          </View>

          <Text style={styles.sectionTitle}>Kisisel Bilgiler</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ad</Text>
            <Controller
              control={control}
              name="firstName"
              rules={{
                required: 'Ad gereklidir',
                validate: (v) => v.trim().length > 0 || 'Ad gereklidir',
              }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, errors.firstName && styles.inputError]}
                  placeholder="Adiniz"
                  placeholderTextColor={COLORS.disabledText}
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
            <Text style={styles.label}>Soyad</Text>
            <Controller
              control={control}
              name="lastName"
              rules={{
                required: 'Soyad gereklidir',
                validate: (v) => v.trim().length > 0 || 'Soyad gereklidir',
              }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, errors.lastName && styles.inputError]}
                  placeholder="Soyadiniz"
                  placeholderTextColor={COLORS.disabledText}
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
            <Text style={styles.label}>E-posta</Text>
            <Controller
              control={control}
              name="email"
              rules={{
                required: 'E-posta gereklidir',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Gecerli bir e-posta adresi giriniz',
                },
              }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="E-posta adresiniz"
                  placeholderTextColor={COLORS.disabledText}
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
            <Text style={styles.label}>Sifre</Text>
            <Controller
              control={control}
              name="password"
              rules={{
                required: 'Sifre gereklidir',
                minLength: {
                  value: 8,
                  message: 'Sifre en az 8 karakter olmalidir',
                },
              }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  placeholder="Sifreniz (en az 8 karakter)"
                  placeholderTextColor={COLORS.disabledText}
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
            <Text style={styles.label}>Sifre Tekrar</Text>
            <Controller
              control={control}
              name="confirmPassword"
              rules={{
                required: 'Sifre tekrari gereklidir',
                validate: (value) =>
                  value === watchedPassword || 'Sifreler eslesmiyor',
              }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, errors.confirmPassword && styles.inputError]}
                  placeholder="Sifrenizi tekrar girin"
                  placeholderTextColor={COLORS.disabledText}
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
              accessibilityLabel="Kayıt ol"
              accessibilityRole="button"
            >
              {isSubmitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.continueButtonText}>Kayit Ol</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    color: COLORS.text,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.subtext,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    color: COLORS.subtext,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: COLORS.text,
    fontSize: 15,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
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
    color: COLORS.subtext,
  },
  buttonWrapper: {
    marginTop: 20,
    marginBottom: 40,
  },
  continueButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  continueButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
