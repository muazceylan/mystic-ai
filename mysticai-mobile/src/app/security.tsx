import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../utils/haptics';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { setPassword, changePassword, updateProfile } from '../services/auth';
import OnboardingBackground from '../components/OnboardingBackground';
import { SafeScreen } from '../components/ui';
import { TextField, PrimaryButton, StatusBanner } from '../components/auth';
import { AxiosError } from 'axios';
import { isStrongPassword } from '../utils/passwordPolicy';

export default function SecurityScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [profileLoading, setProfileLoading] = useState(user?.hasPassword === undefined);

  // Fetch fresh profile to get hasPassword field (may be missing from old sessions)
  useEffect(() => {
    if (user?.hasPassword !== undefined) return;
    updateProfile({})
      .then((res) => { setUser({ ...user!, ...res.data }); })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, []);

  const isSetMode = user?.hasPassword === false;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const canSubmit = isSetMode
    ? isStrongPassword(newPassword) && confirmPassword.length > 0
    : currentPassword.length > 0 && isStrongPassword(newPassword) && confirmPassword.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || loading || !user) return;
    setBanner(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      let res;
      if (isSetMode) {
        res = await setPassword({ newPassword, confirmPassword });
      } else {
        res = await changePassword({ currentPassword, newPassword, confirmPassword });
      }

      setUser({ ...user, ...res.data });
      setBanner({
        tone: 'success',
        message: t(isSetMode ? 'security.setPassword.success' : 'security.changePassword.success'),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      const msg = axiosErr.response?.data?.message ?? '';
      let errorMsg: string;

      if (msg.includes('PASSWORDS_DO_NOT_MATCH')) {
        errorMsg = t(isSetMode ? 'security.setPassword.mismatchError' : 'security.changePassword.mismatchError');
      } else if (msg.includes('PASSWORD_ALREADY_SET')) {
        errorMsg = t('security.setPassword.alreadySetError');
      } else if (msg.includes('PASSWORD_WEAK')) {
        errorMsg = t('security.passwordPolicyError');
      } else if (msg.includes('WRONG_CURRENT_PASSWORD')) {
        errorMsg = t('security.changePassword.wrongCurrentError');
      } else if (msg.includes('different from current')) {
        errorMsg = t('security.changePassword.samePasswordError');
      } else if (msg.includes('No local password set')) {
        errorMsg = t('security.setPassword.description');
      } else {
        errorMsg = msg || t('common.error');
      }

      setBanner({ tone: 'error', message: errorMsg });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const S = makeStyles(colors);
  const description = t(isSetMode ? 'security.setPassword.description' : 'security.changePassword.description');
  const passwordPolicyText = t('auth.passwordPolicy');
  const submitLabel = t(isSetMode ? 'security.setPassword.submitBtn' : 'security.changePassword.submitBtn');

  if (profileLoading) {
    return (
      <SafeScreen>
        <View style={[S.container, { alignItems: 'center', justifyContent: 'center' }]}>
          <OnboardingBackground />
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <View style={S.container}>
        <OnboardingBackground />
        <View style={S.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={S.backBtn}
            accessibilityLabel={t('common.back')}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={S.headerTitle}>{t('security.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={S.scroll} contentContainerStyle={S.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={S.hint}>{`${description}\n${passwordPolicyText}`}</Text>

          {banner && (
            <StatusBanner tone={banner.tone} message={banner.message} />
          )}

          <View style={S.form}>
            {!isSetMode && (
              <TextField
                label={t('security.changePassword.currentPassword')}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrent}
                autoCapitalize="none"
                passwordToggle={{ visible: showCurrent, onToggle: () => setShowCurrent(!showCurrent) }}
              />
            )}

            <TextField
              label={t(isSetMode ? 'security.setPassword.newPassword' : 'security.changePassword.newPassword')}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNew}
              autoCapitalize="none"
              passwordToggle={{ visible: showNew, onToggle: () => setShowNew(!showNew) }}
            />

            <TextField
              label={t(isSetMode ? 'security.setPassword.confirmPassword' : 'security.changePassword.confirmPassword')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              passwordToggle={{ visible: showConfirm, onToggle: () => setShowConfirm(!showConfirm) }}
            />

            <PrimaryButton
              title={submitLabel}
              onPress={handleSubmit}
              disabled={!canSubmit}
              loading={loading}
              style={{ marginTop: 8 }}
            />
          </View>
        </ScrollView>
      </View>
    </SafeScreen>
  );
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 12,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: C.surface,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: C.border,
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 16 },
    hint: {
      fontSize: 13, color: C.subtext, marginBottom: 20,
      backgroundColor: C.primarySoft, padding: 12, borderRadius: 10,
    },
    form: { gap: 16 },
  });
}
