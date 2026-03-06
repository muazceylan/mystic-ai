import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../../components/OnboardingBackground';
import { SafeScreen } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { PrimaryButton, SecondaryButton, StatusBanner } from '../../components/auth';
import { resendVerification } from '../../services/auth';
import { useAuthStore } from '../../store/useAuthStore';
import { trackEvent } from '../../services/analytics';

const COOLDOWN_SECONDS = 60;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: C.bg,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingTop: 26,
      paddingBottom: 48,
      gap: 16,
    },
    heroCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      backgroundColor: C.surfaceGlass,
      padding: 18,
      gap: 10,
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: C.primarySoftBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      color: C.text,
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: -0.25,
    },
    subtitle: {
      color: C.subtext,
      fontSize: 14,
      lineHeight: 20,
    },
    emailPill: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      backgroundColor: C.primarySoftBg,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    emailText: {
      color: C.primary,
      fontWeight: '700',
      fontSize: 12,
      letterSpacing: 0.2,
    },
    checklistCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      padding: 16,
      gap: 10,
    },
    checklistTitle: {
      color: C.text,
      fontWeight: '700',
      fontSize: 15,
    },
    checklistRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    checklistText: {
      color: C.subtext,
      fontSize: 13,
      lineHeight: 18,
      flex: 1,
    },
    actionGroup: {
      gap: 10,
    },
    cooldownText: {
      color: C.subtext,
      fontSize: 12,
      textAlign: 'center',
    },
    links: {
      marginTop: 6,
      gap: 10,
      alignItems: 'center',
    },
    linkButton: {
      paddingVertical: 6,
    },
    linkText: {
      color: C.primary,
      fontWeight: '700',
      fontSize: 13,
    },
  });
}

export default function VerifyEmailPendingScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const params = useLocalSearchParams<{ email?: string | string[]; source?: string | string[] }>();

  const pendingEmail = useAuthStore((s) => s.pendingEmail);
  const lastResendAt = useAuthStore((s) => s.lastResendAt);
  const setPendingEmail = useAuthStore((s) => s.setPendingEmail);
  const setLastResendAt = useAuthStore((s) => s.setLastResendAt);

  const [loadingResend, setLoadingResend] = useState(false);
  const [loadingMailApp, setLoadingMailApp] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'info' | 'success' | 'error'; message: string } | null>(null);
  const [now, setNow] = useState(Date.now());
  const source = firstParam(params.source || undefined) || 'pending';

  const email = useMemo(() => {
    const fromParams = firstParam(params.email || undefined).trim().toLowerCase();
    if (fromParams) return fromParams;
    return String(pendingEmail ?? '').trim().toLowerCase();
  }, [params.email, pendingEmail]);

  useEffect(() => {
    if (email) {
      setPendingEmail(email);
    }
  }, [email]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remainingCooldown = useMemo(() => {
    if (!lastResendAt) return 0;
    const elapsedSeconds = Math.floor((now - lastResendAt) / 1000);
    return Math.max(0, COOLDOWN_SECONDS - elapsedSeconds);
  }, [lastResendAt, now]);

  const resendDisabled = !email || loadingResend || remainingCooldown > 0;
  const effectiveBanner = banner ?? (!email
    ? {
        tone: 'info' as const,
        message: t('auth.verifyPending.missingEmail'),
      }
    : null);

  const handleResend = async () => {
    if (resendDisabled) return;
    setBanner(null);
    setLoadingResend(true);
    trackEvent('auth_resend_click', { source });

    try {
      await resendVerification(email);
      setLastResendAt(Date.now());
      trackEvent('auth_resend_success', { source });
      setBanner({
        tone: 'success',
        message: t('auth.verifyPending.resendSuccess'),
      });
    } catch {
      setBanner({
        tone: 'error',
        message: t('auth.verifyPending.resendError'),
      });
    } finally {
      setLoadingResend(false);
    }
  };

  const handleOpenMailApp = async () => {
    if (loadingMailApp) return;
    setLoadingMailApp(true);

    const urls = Platform.OS === 'ios' ? ['message://', 'mailto:'] : ['mailto:'];

    try {
      for (const url of urls) {
        try {
          const supported = await Linking.canOpenURL(url);
          if (supported) {
            await Linking.openURL(url);
            return;
          }
        } catch {
          continue;
        }
      }
      setBanner({ tone: 'info', message: t('auth.verifyPending.openMailError') });
    } finally {
      setLoadingMailApp(false);
    }
  };

  return (
    <SafeScreen>
      <OnboardingBackground />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 16}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.heroCard}>
            <View style={styles.iconWrap}>
              <Ionicons name="mail-unread-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.title}>{t('auth.verifyPending.title')}</Text>
            <Text style={styles.subtitle}>
              {t('auth.verifyPending.subtitle')}
            </Text>
            {!!email && (
              <View style={styles.emailPill}>
                <Text style={styles.emailText}>{email}</Text>
              </View>
            )}
          </View>

          {effectiveBanner && <StatusBanner tone={effectiveBanner.tone} message={effectiveBanner.message} />}

          <View style={styles.checklistCard}>
            <Text style={styles.checklistTitle}>{t('auth.verifyPending.checklistTitle')}</Text>
            <View style={styles.checklistRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.checklistText}>{t('auth.verifyPending.checklistSpam')}</Text>
            </View>
            <View style={styles.checklistRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.checklistText}>{t('auth.verifyPending.checklistWait')}</Text>
            </View>
            <View style={styles.checklistRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.checklistText}>{t('auth.verifyPending.checklistLatest')}</Text>
            </View>
          </View>

          <View style={styles.actionGroup}>
            <PrimaryButton
              title={
                remainingCooldown > 0
                  ? t('auth.verifyPending.resendIn', { seconds: remainingCooldown })
                  : t('auth.verifyPending.resendButton')
              }
              onPress={handleResend}
              loading={loadingResend}
              disabled={resendDisabled}
              accessibilityHint={
                remainingCooldown > 0
                  ? t('auth.verifyPending.resendDisabledHint', { seconds: remainingCooldown })
                  : !email
                    ? t('auth.verifyPending.resendDisabledMissingEmail')
                    : undefined
              }
            />
            {remainingCooldown > 0 && (
              <Text style={styles.cooldownText}>
                {t('auth.verifyPending.cooldownText', { seconds: remainingCooldown })}
              </Text>
            )}

            <SecondaryButton
              title={t('auth.verifyPending.openMailApp')}
              onPress={handleOpenMailApp}
              loading={loadingMailApp}
              accessibilityHint={t('auth.verifyPending.openMailHint')}
            />
          </View>

          <View style={styles.links}>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.replace({ pathname: '/(auth)/signup', params: { email } })}
            >
              <Text style={styles.linkText}>{t('auth.verifyPending.changeEmail')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.replace({ pathname: '/(auth)/welcome', params: { email } })}
            >
              <Text style={styles.linkText}>{t('auth.verifyPending.goToLogin')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}
