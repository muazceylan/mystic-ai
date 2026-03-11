import { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../utils/haptics';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { SafeScreen, TabHeader } from '../components/ui';
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
      fontSize: 13,
      color: C.subtext,
      lineHeight: 20,
      marginBottom: 20,
      backgroundColor: C.primarySoft,
      padding: 12,
      borderRadius: 12,
    },
    label: {
      fontSize: 13,
      fontWeight: '700',
      color: C.text,
      marginBottom: 8,
      marginTop: 16,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    textInput: {
      flex: 1,
      fontSize: 15,
      color: C.text,
      padding: 0,
    },
    saveRow: { marginTop: 32 },
    saveButton: {
      backgroundColor: C.primary,
      borderRadius: 999,
      paddingVertical: 15,
      alignItems: 'center',
    },
    saveButtonDisabled: { opacity: 0.6 },
    saveButtonText: { color: C.white, fontSize: 15, fontWeight: '700' },
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
          <Text style={styles.hint}>{t('profileName.hint')}</Text>

          <Text style={styles.label}>{t('profileName.firstName')}</Text>
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={20} color={firstName ? colors.primary : colors.disabledText} />
            <TextInput
              style={styles.textInput}
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t('profileName.firstNamePlaceholder')}
              placeholderTextColor={colors.disabledText}
              autoCapitalize="words"
            />
          </View>

          <Text style={styles.label}>{t('profileName.lastName')}</Text>
          <View style={styles.inputRow}>
            <Ionicons name="create-outline" size={20} color={lastName ? colors.primary : colors.disabledText} />
            <TextInput
              style={styles.textInput}
              value={lastName}
              onChangeText={setLastName}
              placeholder={t('profileName.lastNamePlaceholder')}
              placeholderTextColor={colors.disabledText}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.saveRow}>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
              accessibilityLabel={t('common.save')}
              accessibilityRole="button"
            >
              <Text style={styles.saveButtonText}>
                {saving ? t('common.loading') : t('common.save')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeScreen>
  );
}
