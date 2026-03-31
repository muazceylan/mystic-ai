import { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { AppText, Button, SafeScreen, TextField } from '../../components/ui';
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
      fontWeight: Platform.OS === 'ios' ? '700' : '600',
      marginBottom: 8,
    },
    sub: {
      marginBottom: 32,
    },
    buttonColumn: {
      gap: 8,
      marginTop: 8,
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
      if (name) {
        setFirstName(name);
        updateProfile({ firstName: name }).then((res) => setUser(res.data as any)).catch(() => {});
      }
      router.push('/(auth)/birth-date');
      return;
    }

    const { accessToken, refreshToken, user } = session;
    const updatedUser = name ? { ...user, firstName: name } : user;
    storeLogin(accessToken, refreshToken, updatedUser);

    if (name) {
      setFirstName(name);
      updateProfile({ firstName: name }).then((res) => {
        setUser(res.data as any);
      }).catch(() => {});
    }

    clearPending();
    trackEvent('guest_name_set', { has_name: name.length > 0 });
    router.push('/(auth)/birth-date');
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
                      accessibilityLabel={t('appBrand.logoA11y')}
                      accessibilityRole="image"
                    />
                  </View>
                </View>
              </LinearGradient>
            </View>
          </View>

          <AppText variant="Display" align="center" style={styles.heading}>
            {t('guestName.heading')}
          </AppText>
          <AppText variant="Body" color="secondary" align="center" style={styles.sub}>
            {t('guestName.sub')}
          </AppText>

          <TextField
            value={firstName}
            onChangeText={setFirstNameLocal}
            placeholder={t('guestName.placeholder')}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleContinue}
          />

          <View style={styles.buttonColumn}>
            <Button
              title={t('guestName.continue')}
              onPress={handleContinue}
              disabled={!trimmed}
              fullWidth
              size="lg"
            />
            <Button
              title={t('guestName.skip')}
              onPress={handleSkip}
              variant="ghost"
              fullWidth
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}
