import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { SafeScreen } from '../../components/ui';
import { useAuthStore } from '../../store/useAuthStore';
import { usePendingGuestStore } from '../../store/usePendingGuestStore';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { updateProfile } from '../../services/auth';
import { trackEvent } from '../../services/analytics';

const HERO_PREMIUM_ICON = require('../../../assets/brand/logo/astro-guru-logo-small-optimized.png');
const HERO_DISPLAY_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia',
});

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 28,
      justifyContent: 'center',
    },
    brand: {
      alignItems: 'center',
      marginBottom: 24,
    },
    brandWrap: {
      width: 84,
      height: 84,
      shadowColor: colors.primary700,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
    brandFrame: {
      flex: 1,
      borderRadius: 27,
      padding: 1.5,
    },
    brandCore: {
      flex: 1,
      borderRadius: 26,
      backgroundColor: 'rgba(255,255,255,0.9)',
      borderWidth: 1,
      borderColor: 'rgba(187,147,255,0.24)',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    brandGlow: {
      position: 'absolute',
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: 'rgba(181,107,255,0.08)',
    },
    brandViewport: {
      width: 60,
      height: 60,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    brandImage: {
      width: 66,
      height: 66,
      resizeMode: 'cover',
      transform: [{ scale: 1.04 }],
    },
    heading: {
      fontFamily: HERO_DISPLAY_FONT,
      fontSize: 30,
      lineHeight: 34,
      fontWeight: Platform.OS === 'ios' ? '700' : '600',
      letterSpacing: -0.6,
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    sub: {
      fontFamily: 'MysticInter-Regular',
      fontSize: 15,
      color: colors.subtext,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 32,
    },
    inputContainer: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      marginBottom: 12,
    },
    input: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 16,
      color: colors.text,
    },
    continueButton: {
      backgroundColor: colors.primary,
      borderRadius: 28,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 8,
    },
    continueButtonDisabled: {
      backgroundColor: colors.disabled,
    },
    continueText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.white,
    },
    continueTextDisabled: {
      color: colors.disabledText,
    },
    skipButton: {
      paddingVertical: 14,
      alignItems: 'center',
    },
    skipText: {
      fontSize: 14,
      color: colors.subtext,
    },
  });
}

export default function GuestNameScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const session = usePendingGuestStore((s) => s.session);
  const clearPending = usePendingGuestStore((s) => s.clear);
  const storeLogin = useAuthStore((s) => s.login);
  const setUser = useAuthStore((s) => s.setUser);
  const setFirstName = useOnboardingStore((s) => s.setFirstName);

  const [firstName, setFirstNameLocal] = useState('');
  const trimmed = firstName.trim();

  const completeLogin = async (name: string) => {
    if (!session) {
      // Fallback: session expired, go back to welcome
      router.replace('/(auth)/welcome');
      return;
    }

    const { accessToken, refreshToken, user } = session;

    // Update user object with entered name before logging in
    const updatedUser = name ? { ...user, firstName: name } : user;
    storeLogin(accessToken, refreshToken, updatedUser);

    // Persist name in onboarding store so link-account can read it
    if (name) {
      setFirstName(name);
      // Best-effort profile update in background — not awaited
      updateProfile({ firstName: name }).then((res) => {
        setUser(res.data as any);
      }).catch(() => {});
    }

    clearPending();
    trackEvent('guest_name_set', { has_name: name.length > 0 });
  };

  const handleContinue = () => {
    void completeLogin(trimmed);
  };

  const handleSkip = () => {
    trackEvent('guest_name_skipped', {});
    void completeLogin('');
  };

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.brand}>
            <View style={styles.brandWrap}>
              <LinearGradient
                colors={['rgba(255,255,255,0.98)', 'rgba(230,218,255,0.92)', 'rgba(186,141,255,0.55)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.brandFrame}
              >
                <View style={styles.brandCore}>
                  <View style={styles.brandGlow} />
                  <View style={styles.brandViewport}>
                    <Image
                      source={HERO_PREMIUM_ICON}
                      style={styles.brandImage}
                      accessibilityLabel="Astro Guru"
                      accessibilityRole="image"
                    />
                  </View>
                </View>
              </LinearGradient>
            </View>
          </View>

          <Text style={styles.heading}>{t('guestName.heading', 'İsminiz?')}</Text>
          <Text style={styles.sub}>
            {t('guestName.sub', 'İstersen bir isim gir, istersen anonim devam et. Her zaman değiştirebilirsin.')}
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={t('guestName.placeholder', 'Adın (isteğe bağlı)')}
              placeholderTextColor={colors.subtext}
              value={firstName}
              onChangeText={setFirstNameLocal}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>

          <TouchableOpacity
            style={[styles.continueButton, !trimmed && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={!trimmed}
            accessibilityRole="button"
            accessibilityLabel={t('guestName.continue', 'Devam Et')}
          >
            <Text style={[styles.continueText, !trimmed && styles.continueTextDisabled]}>
              {t('guestName.continue', 'Devam Et')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            accessibilityRole="button"
            accessibilityLabel={t('guestName.skip', 'Atla')}
          >
            <Text style={styles.skipText}>{t('guestName.skip', 'Atla, anonim devam et')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}
