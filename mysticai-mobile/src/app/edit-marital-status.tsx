import { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
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
import { MARITAL_STATUS_OPTIONS } from '../constants/index';
import { clearPlannerFullDistributionCache } from '../services/lucky-dates.service';

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
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 12,
    },
    card: {
      width: '48%',
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 16,
      paddingVertical: 18,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      minHeight: 112,
    },
    cardSelected: {
      borderColor: C.primary,
      backgroundColor: C.primarySoft,
    },
    cardEmoji: {
      fontSize: 24,
      marginBottom: 10,
    },
    cardText: {
      fontSize: 14,
      fontWeight: '700',
      color: C.text,
      textAlign: 'center',
    },
    cardTextSelected: {
      color: C.primary,
    },
    checkBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: C.primary,
      alignItems: 'center',
      justifyContent: 'center',
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

export default function EditMaritalStatusScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  const initialValue = useMemo(() => user?.maritalStatus ?? '', [user?.maritalStatus]);
  const [selectedStatus, setSelectedStatus] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selectedStatus) {
      Alert.alert(t('common.error'), t('relationshipStatus.required'));
      return;
    }

    setSaving(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const response = await updateProfile({ maritalStatus: selectedStatus });

      setUser({
        ...(user ?? {}),
        ...response.data,
        maritalStatus: selectedStatus,
      });

      clearPlannerFullDistributionCache();
      void queryClient.invalidateQueries({ queryKey: ['oracle'] });
      void queryClient.invalidateQueries({ queryKey: ['astrology'] });
      void queryClient.invalidateQueries({ queryKey: ['lucky-dates'] });
      void queryClient.invalidateQueries({ queryKey: ['cosmic'] });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('common.success'), t('relationshipStatus.saveSuccess'), [
        {
          text: t('common.ok'),
          onPress: () => router.back(),
        },
      ]);
    } catch {
      Alert.alert(t('common.error'), t('relationshipStatus.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeScreen>
      <View style={styles.container}>
        <TabHeader title={t('relationshipStatus.title')} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.hint}>{t('relationshipStatus.hint')}</Text>

          <View style={styles.grid}>
            {MARITAL_STATUS_OPTIONS.map((option) => {
              const selected = selectedStatus === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.card, selected && styles.cardSelected]}
                  onPress={() => setSelectedStatus(option.id)}
                  accessibilityLabel={t(`maritalStatus.${option.id}`)}
                  accessibilityRole="button"
                  activeOpacity={0.85}
                >
                  <Text style={styles.cardEmoji}>{option.emoji}</Text>
                  <Text style={[styles.cardText, selected && styles.cardTextSelected]}>
                    {t(`maritalStatus.${option.id}`)}
                  </Text>
                  {selected ? (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={14} color={colors.white} />
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.saveRow}>
            <TouchableOpacity
              style={[styles.saveButton, (saving || !selectedStatus) && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving || !selectedStatus}
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
