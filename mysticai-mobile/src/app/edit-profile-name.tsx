import { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from '../utils/haptics';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { AppText, Button, SafeScreen, TabHeader, TextField } from '../components/ui';
import { useAuthStore } from '../store/useAuthStore';
import { updateProfile } from '../services/auth';

function splitStoredName(name?: string | null) {
  const parts = (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return {
    firstName: parts[0] ?? '',
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : '',
  };
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
    hint: {
      marginBottom: 20,
      backgroundColor: C.primarySoft,
      padding: 12,
      borderRadius: 12,
    },
    saveRow: { marginTop: 32 },
  });
}

export default function EditProfileNameScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  const derivedName = useMemo(() => splitStoredName(user?.name), [user?.name]);
  const [firstName, setFirstName] = useState(user?.firstName ?? derivedName.firstName);
  const [lastName, setLastName] = useState(user?.lastName ?? derivedName.lastName);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedFirstName) {
      Alert.alert(t('common.error'), t('profileName.firstNameRequired'));
      return;
    }

    setSaving(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const response = await updateProfile({
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
      });

      setUser({
        ...(user ?? {}),
        ...response.data,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        name: [trimmedFirstName, trimmedLastName].filter(Boolean).join(' '),
      });

      queryClient.invalidateQueries({ queryKey: ['numerology'] });
      queryClient.invalidateQueries({ queryKey: ['oracle', 'home-dashboard'] });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert(t('common.error'), t('profileName.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeScreen>
      <View style={styles.container}>
        <TabHeader title={t('profileName.title')} />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <AppText variant="Small" color="secondary" style={styles.hint}>
            {t('profileName.hint')}
          </AppText>

          <TextField
            label={t('profileName.firstName')}
            value={firstName}
            onChangeText={setFirstName}
            placeholder={t('profileName.firstNamePlaceholder')}
            autoCapitalize="words"
            leftIcon="person-outline"
          />

          <TextField
            label={t('profileName.lastName')}
            value={lastName}
            onChangeText={setLastName}
            placeholder={t('profileName.lastNamePlaceholder')}
            autoCapitalize="words"
            leftIcon="create-outline"
            style={{ marginTop: 16 }}
          />

          <View style={styles.saveRow}>
            <Button
              title={saving ? t('common.loading') : t('common.save')}
              onPress={handleSave}
              disabled={saving}
              fullWidth
              size="lg"
            />
          </View>
        </ScrollView>
      </View>
    </SafeScreen>
  );
}
