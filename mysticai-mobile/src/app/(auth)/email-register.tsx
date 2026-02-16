import { useEffect, useState } from 'react';
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
import axios from 'axios/dist/browser/axios.cjs';
import OnboardingBackground from '../../components/OnboardingBackground';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { checkEmail } from '../../services/auth';

const COLORS = {
  background: '#F9F7FB',
  text: '#1E1E1E',
  subtext: '#7A7A7A',
  border: '#E6E1EA',
  primary: '#9D4EDD',
  disabled: '#E5E5E5',
  disabledText: '#B5B5B5',
  error: '#E54B4B',
};

export default function EmailRegisterScreen() {
  const store = useOnboardingStore();
  const params = useLocalSearchParams<{ error?: string }>();
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (params.error) {
      setErrors((prev) => ({
        ...prev,
        email: decodeURIComponent(params.error),
      }));
    }
  }, [params.error]);

  const validateFields = () => {
    const newErrors: { [key: string]: string } = {};

    if (!store.firstName.trim()) {
      newErrors.firstName = 'Ad gereklidir';
    }
    if (!store.lastName.trim()) {
      newErrors.lastName = 'Soyad gereklidir';
    }
    if (!store.email.trim()) {
      newErrors.email = 'E-posta gereklidir';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(store.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi giriniz';
    }
    if (!store.password.trim()) {
      newErrors.password = 'Şifre gereklidir';
    } else if (store.password.length < 8) {
      newErrors.password = 'Şifre en az 8 karakter olmalıdır';
    }
    if (store.password !== store.confirmPassword) {
      newErrors.confirmPassword = 'Şifreler eşleşmiyor';
    }

    setErrors(newErrors);
    return newErrors;
  };

  const checkEmailAvailability = async (email: string) => {
    try {
      const response = await checkEmail(email);
      const { available, exists } = response.data || {};

      if (available === false || exists === true) {
        return false;
      }
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message =
          typeof error.response?.data?.message === 'string'
            ? error.response?.data?.message.toLowerCase()
            : '';

        if (status === 409 || message.includes('email already exists')) {
          return false;
        }

        if (status === 404) {
          return true;
        }
      }
      throw error;
    }
  };

  const validateAndSubmit = async () => {
    if (isChecking) return;

    const validationErrors = validateFields();
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsChecking(true);

    try {
 /*     const isAvailable = await checkEmailAvailability(store.email.trim());
      if (!isAvailable) {
        setErrors((prev) => ({
          ...prev,
          email: 'Bu e-posta zaten kayıtlı. Lütfen giriş yapın.',
        }));
        return;
      } */

      router.push('/birth-date');
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        email: 'E-posta kontrolü yapılamadı. Lütfen tekrar deneyin.',
      }));
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <OnboardingBackground />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Kayıt Ol</Text>
        </View>

        <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Ad</Text>
          <TextInput
            style={[styles.input, errors.firstName && styles.inputError]}
            placeholder="Adınız"
            placeholderTextColor={COLORS.disabledText}
            value={store.firstName}
            onChangeText={store.setFirstName}
          />
          {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Soyad</Text>
          <TextInput
            style={[styles.input, errors.lastName && styles.inputError]}
            placeholder="Soyadınız"
            placeholderTextColor={COLORS.disabledText}
            value={store.lastName}
            onChangeText={store.setLastName}
          />
          {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>E-posta</Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            placeholder="E-posta adresiniz"
            placeholderTextColor={COLORS.disabledText}
            keyboardType="email-address"
            autoCapitalize="none"
            value={store.email}
            onChangeText={store.setEmail}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Şifre</Text>
          <TextInput
            style={[styles.input, errors.password && styles.inputError]}
            placeholder="Şifreniz (en az 8 karakter)"
            placeholderTextColor={COLORS.disabledText}
            secureTextEntry
            value={store.password}
            onChangeText={store.setPassword}
          />
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Şifre Tekrar</Text>
          <TextInput
            style={[styles.input, errors.confirmPassword && styles.inputError]}
            placeholder="Şifrenizi tekrar girin"
            placeholderTextColor={COLORS.disabledText}
            secureTextEntry
            value={store.confirmPassword}
            onChangeText={store.setConfirmPassword}
          />
          {errors.confirmPassword && (
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.continueButton, isChecking && styles.continueButtonDisabled]}
          onPress={validateAndSubmit}
          disabled={isChecking}
        >
          {isChecking ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.continueButtonText}>Kayıt Ol</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
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
    backgroundColor: '#FFFFFF',
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
  continueButton: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
