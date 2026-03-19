import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Linking,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from '../utils/haptics';
import { SafeScreen, TabHeader } from '../components/ui';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useNotificationStore } from '../store/useNotificationStore';
import { useAuthStore } from '../store/useAuthStore';

type ToggleKey =
  | 'dailyEnabled'
  | 'intradayEnabled'
  | 'weeklyEnabled'
  | 'plannerReminderEnabled'
  | 'prayerReminderEnabled'
  | 'meditationReminderEnabled'
  | 'dreamReminderEnabled'
  | 'eveningCheckinEnabled'
  | 'productUpdatesEnabled'
  | 'pushEnabled';

interface ToggleItem {
  id: ToggleKey;
  titleKey: string;
  subKey: string;
  icon: string;
  section: 'main' | 'reminder' | 'other';
}

const TOGGLE_ITEMS: ToggleItem[] = [
  // Main notifications
  {
    id: 'dailyEnabled',
    titleKey: 'notifSettings.dailyEnabled',
    subKey: 'notifSettings.dailyEnabledSub',
    icon: 'sunny-outline',
    section: 'main',
  },
  {
    id: 'intradayEnabled',
    titleKey: 'notifSettings.intradayEnabled',
    subKey: 'notifSettings.intradayEnabledSub',
    icon: 'time-outline',
    section: 'main',
  },
  {
    id: 'weeklyEnabled',
    titleKey: 'notifSettings.weeklyEnabled',
    subKey: 'notifSettings.weeklyEnabledSub',
    icon: 'calendar-outline',
    section: 'main',
  },
  // Reminders
  {
    id: 'dreamReminderEnabled',
    titleKey: 'notifSettings.dreamReminder',
    subKey: 'notifSettings.dreamReminderSub',
    icon: 'moon-outline',
    section: 'reminder',
  },
  {
    id: 'prayerReminderEnabled',
    titleKey: 'notifSettings.prayerReminder',
    subKey: 'notifSettings.prayerReminderSub',
    icon: 'heart-outline',
    section: 'reminder',
  },
  {
    id: 'meditationReminderEnabled',
    titleKey: 'notifSettings.meditationReminder',
    subKey: 'notifSettings.meditationReminderSub',
    icon: 'leaf-outline',
    section: 'reminder',
  },
  {
    id: 'plannerReminderEnabled',
    titleKey: 'notifSettings.plannerReminder',
    subKey: 'notifSettings.plannerReminderSub',
    icon: 'calendar-outline',
    section: 'reminder',
  },
  {
    id: 'eveningCheckinEnabled',
    titleKey: 'notifSettings.eveningCheckin',
    subKey: 'notifSettings.eveningCheckinSub',
    icon: 'cloudy-night-outline',
    section: 'reminder',
  },
  // Other
  {
    id: 'productUpdatesEnabled',
    titleKey: 'notifSettings.productUpdates',
    subKey: 'notifSettings.productUpdatesSub',
    icon: 'sparkles-outline',
    section: 'other',
  },
  {
    id: 'pushEnabled',
    titleKey: 'notifSettings.pushEnabled',
    subKey: 'notifSettings.pushEnabledSub',
    icon: 'notifications-outline',
    section: 'other',
  },
];

const FREQUENCY_OPTIONS = [
  { value: 'LOW', labelKey: 'notifSettings.freqLow' },
  { value: 'BALANCED', labelKey: 'notifSettings.freqBalanced' },
  { value: 'FREQUENT', labelKey: 'notifSettings.freqFrequent' },
] as const;

const TIME_SLOT_OPTIONS = [
  { value: 'MORNING', labelKey: 'notifSettings.slotMorning' },
  { value: 'NOON', labelKey: 'notifSettings.slotNoon' },
  { value: 'EVENING', labelKey: 'notifSettings.slotEvening' },
] as const;

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: C.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: C.border,
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: C.subtext,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 20,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    card: {
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 13,
      paddingHorizontal: 14,
    },
    rowBorder: { borderTopWidth: 1, borderTopColor: C.border },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
      marginRight: 12,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: C.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: { flex: 1 },
    rowTitle: { fontSize: 14, fontWeight: '600', color: C.text },
    rowSub: { fontSize: 12, color: C.subtext, marginTop: 2, lineHeight: 16 },

    // Frequency / Time slot selector
    optionGroup: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    optionBtn: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      alignItems: 'center',
    },
    optionBtnSelected: {
      borderColor: C.primary,
      backgroundColor: C.primarySoftBg,
    },
    optionText: { fontSize: 12, fontWeight: '500', color: C.subtext },
    optionTextSelected: { color: C.primary, fontWeight: '600' },

    // Quiet hours
    quietRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 13,
      paddingHorizontal: 14,
    },
    quietLabel: { fontSize: 14, fontWeight: '600', color: C.text },
    quietValue: { fontSize: 13, color: C.subtext },

    hint: {
      fontSize: 13,
      color: C.subtext,
      lineHeight: 19,
      marginTop: 12,
      backgroundColor: C.primarySoft,
      padding: 12,
      borderRadius: 10,
    },
    footnote: {
      fontSize: 12,
      color: C.subtext,
      textAlign: 'center',
      marginTop: 16,
      lineHeight: 18,
    },
    systemSettingsBtn: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
    },
    systemSettingsText: { fontSize: 13, fontWeight: '500', color: C.primary },

    loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    // Time picker modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalContent: {
      width: 280,
      backgroundColor: C.surface,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
    },
    modalTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: C.text,
      marginBottom: 20,
    },
    pickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 24,
    },
    pickerColumn: {
      alignItems: 'center',
      gap: 8,
    },
    pickerArrow: {
      width: 44,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      backgroundColor: C.primarySoft,
    },
    pickerValue: {
      fontSize: 32,
      fontWeight: '700',
      color: C.text,
      fontVariant: ['tabular-nums'],
    },
    pickerSep: {
      fontSize: 28,
      fontWeight: '700',
      color: C.subtext,
      marginTop: 4,
    },
    modalSaveBtn: {
      paddingVertical: 10,
      paddingHorizontal: 40,
      borderRadius: 10,
      backgroundColor: C.primary,
    },
    modalSaveText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
  });
}

export default function NotificationsSettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const user = useAuthStore((s) => s.user);

  const {
    preferences,
    preferencesLoading,
    fetchPreferences,
    updatePreferences,
    registerPushToken,
    deactivatePushToken,
  } = useNotificationStore();

  const [quietPickerVisible, setQuietPickerVisible] = useState(false);
  const [quietPickerField, setQuietPickerField] = useState<'start' | 'end'>('start');
  const [quietPickerHour, setQuietPickerHour] = useState(22);
  const [quietPickerMinute, setQuietPickerMinute] = useState(0);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const handleToggle = useCallback(
    async (key: ToggleKey, value: boolean) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await updatePreferences({ [key]: value });

      if (key === 'pushEnabled' && Platform.OS !== 'web') {
        try {
          const { default: Notifications } = await import('expo-notifications');
          if (value) {
            // Register push token when enabling push
            const { status } = await Notifications.requestPermissionsAsync();
            if (status === 'granted') {
              const tokenData = await Notifications.getExpoPushTokenAsync();
              await registerPushToken(tokenData.data, Platform.OS);
            }
          } else {
            // Deactivate push token when disabling push
            const tokenData = await Notifications.getExpoPushTokenAsync();
            await deactivatePushToken(tokenData.data);
          }
        } catch {
          // silently fail
        }
      }
    },
    [updatePreferences, registerPushToken, deactivatePushToken]
  );

  const handleFrequency = useCallback(
    (value: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      updatePreferences({ frequencyLevel: value });
    },
    [updatePreferences]
  );

  const handleTimeSlot = useCallback(
    (value: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      updatePreferences({ preferredTimeSlot: value });
    },
    [updatePreferences]
  );

  const openSystemSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else if (Platform.OS === 'android') {
      Linking.openSettings();
    }
  }, []);

  const renderToggleSection = (section: 'main' | 'reminder' | 'other') => {
    const items = TOGGLE_ITEMS.filter((i) => i.section === section);
    return (
      <View style={styles.card}>
        {items.map((item, index) => {
          const value = preferences?.[item.id] ?? false;
          return (
            <View
              key={item.id}
              style={[styles.row, index > 0 && styles.rowBorder]}
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconWrap}>
                  <Ionicons name={item.icon as any} size={17} color={colors.primary} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{t(item.titleKey)}</Text>
                  <Text style={styles.rowSub}>{t(item.subKey)}</Text>
                </View>
              </View>
              <Switch
                value={value}
                onValueChange={(v) => handleToggle(item.id, v)}
                trackColor={{ false: colors.switchTrack, true: colors.switchThumbActive }}
                thumbColor={value ? colors.primary : colors.white}
                ios_backgroundColor={colors.switchTrack}
              />
            </View>
          );
        })}
      </View>
    );
  };

  if (preferencesLoading && !preferences) {
    return (
      <SafeScreen>
        <View style={styles.container}>
          <TabHeader title={t('notifSettings.title')} />
          <View style={styles.loader}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <View style={styles.container}>
        <TabHeader title={t('notifSettings.title')} />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.hint}>{t('notifSettings.hint')}</Text>

          {/* Main Notifications */}
          <Text style={styles.sectionTitle}>{t('notifSettings.sectionMain')}</Text>
          {renderToggleSection('main')}

          {/* Reminders */}
          <Text style={styles.sectionTitle}>{t('notifSettings.sectionReminders')}</Text>
          {renderToggleSection('reminder')}

          {/* Other */}
          <Text style={styles.sectionTitle}>{t('notifSettings.sectionOther')}</Text>
          {renderToggleSection('other')}

          {/* Frequency */}
          <Text style={styles.sectionTitle}>{t('notifSettings.sectionFrequency')}</Text>
          <View style={styles.optionGroup}>
            {FREQUENCY_OPTIONS.map((opt) => {
              const selected = preferences?.frequencyLevel === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.optionBtn, selected && styles.optionBtnSelected]}
                  onPress={() => handleFrequency(opt.value)}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {t(opt.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Preferred Time */}
          <Text style={styles.sectionTitle}>{t('notifSettings.sectionTimeSlot')}</Text>
          <View style={styles.optionGroup}>
            {TIME_SLOT_OPTIONS.map((opt) => {
              const selected = preferences?.preferredTimeSlot === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.optionBtn, selected && styles.optionBtnSelected]}
                  onPress={() => handleTimeSlot(opt.value)}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {t(opt.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Quiet Hours */}
          <Text style={styles.sectionTitle}>{t('notifSettings.sectionQuietHours')}</Text>
          <View style={styles.card}>
            <Pressable
              style={styles.quietRow}
              onPress={() => {
                const parts = (preferences?.quietHoursStart ?? '22:30').split(':');
                setQuietPickerHour(parseInt(parts[0], 10));
                setQuietPickerMinute(parseInt(parts[1], 10));
                setQuietPickerField('start');
                setQuietPickerVisible(true);
              }}
            >
              <Text style={styles.quietLabel}>{t('notifSettings.quietStart')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.quietValue}>
                  {preferences?.quietHoursStart ?? '22:30'}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.subtext} />
              </View>
            </Pressable>
            <Pressable
              style={[styles.quietRow, styles.rowBorder]}
              onPress={() => {
                const parts = (preferences?.quietHoursEnd ?? '08:00').split(':');
                setQuietPickerHour(parseInt(parts[0], 10));
                setQuietPickerMinute(parseInt(parts[1], 10));
                setQuietPickerField('end');
                setQuietPickerVisible(true);
              }}
            >
              <Text style={styles.quietLabel}>{t('notifSettings.quietEnd')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.quietValue}>
                  {preferences?.quietHoursEnd ?? '08:00'}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.subtext} />
              </View>
            </Pressable>
          </View>

          {/* System Settings */}
          {Platform.OS !== 'web' && (
            <Pressable onPress={openSystemSettings} style={styles.systemSettingsBtn}>
              <Ionicons name="phone-portrait-outline" size={15} color={colors.primary} />
              <Text style={styles.systemSettingsText}>{t('notifSettings.systemSettings')}</Text>
            </Pressable>
          )}

          <Text style={styles.footnote}>{t('notifSettings.footnote')}</Text>
        </ScrollView>

        {/* Quiet Hours Time Picker Modal */}
        <Modal
          visible={quietPickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setQuietPickerVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setQuietPickerVisible(false)}
          >
            <Pressable style={styles.modalContent} onPress={() => {}}>
              <Text style={styles.modalTitle}>
                {quietPickerField === 'start'
                  ? t('notifSettings.quietStart')
                  : t('notifSettings.quietEnd')}
              </Text>
              <View style={styles.pickerRow}>
                <View style={styles.pickerColumn}>
                  <Pressable
                    onPress={() => setQuietPickerHour((h) => (h + 1) % 24)}
                    style={styles.pickerArrow}
                  >
                    <Ionicons name="chevron-up" size={22} color={colors.text} />
                  </Pressable>
                  <Text style={styles.pickerValue}>
                    {String(quietPickerHour).padStart(2, '0')}
                  </Text>
                  <Pressable
                    onPress={() => setQuietPickerHour((h) => (h - 1 + 24) % 24)}
                    style={styles.pickerArrow}
                  >
                    <Ionicons name="chevron-down" size={22} color={colors.text} />
                  </Pressable>
                </View>
                <Text style={styles.pickerSep}>:</Text>
                <View style={styles.pickerColumn}>
                  <Pressable
                    onPress={() => setQuietPickerMinute((m) => (m + 15) % 60)}
                    style={styles.pickerArrow}
                  >
                    <Ionicons name="chevron-up" size={22} color={colors.text} />
                  </Pressable>
                  <Text style={styles.pickerValue}>
                    {String(quietPickerMinute).padStart(2, '0')}
                  </Text>
                  <Pressable
                    onPress={() => setQuietPickerMinute((m) => (m - 15 + 60) % 60)}
                    style={styles.pickerArrow}
                  >
                    <Ionicons name="chevron-down" size={22} color={colors.text} />
                  </Pressable>
                </View>
              </View>
              <Pressable
                style={styles.modalSaveBtn}
                onPress={() => {
                  const timeStr = `${String(quietPickerHour).padStart(2, '0')}:${String(quietPickerMinute).padStart(2, '0')}`;
                  const key = quietPickerField === 'start' ? 'quietHoursStart' : 'quietHoursEnd';
                  updatePreferences({ [key]: timeStr });
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setQuietPickerVisible(false);
                }}
              >
                <Text style={styles.modalSaveText}>{t('common.save')}</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </SafeScreen>
  );
}
