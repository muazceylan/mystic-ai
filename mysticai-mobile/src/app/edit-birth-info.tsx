import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../utils/haptics';
import { useAuthStore } from '../store/useAuthStore';
import { useNatalChartStore } from '../store/useNatalChartStore';
import { useLuckyDatesStore } from '../store/useLuckyDatesStore';
import CalendarPicker from '../components/CalendarPicker';
import WheelPicker from '../components/WheelPicker';
import { updateProfile } from '../services/auth';
import { calculateNatalChart } from '../services/astrology.service';
import { getZodiacSign } from '../constants/index';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { SafeScreen, TabHeader } from '../components/ui';

function formatDateDisplay(date: Date, months: string[]): string {
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
    hint: {
      fontSize: 13,
      color: C.subtext,
      lineHeight: 19,
      marginBottom: 20,
      backgroundColor: C.primarySoft,
      padding: 12,
      borderRadius: 10,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
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
    inputRowDisabled: { opacity: 0.5 },
    inputText: { flex: 1, fontSize: 15, color: C.text },
    placeholderText: { color: C.disabledText },
    textInputInline: {
      flex: 1,
      fontSize: 15,
      color: C.text,
      padding: 0,
    },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
    },
    checkLabel: { fontSize: 13, color: C.text },
    saveRow: { marginTop: 32 },
    saveButton: {
      backgroundColor: C.primary,
      borderRadius: 999,
      paddingVertical: 15,
      alignItems: 'center',
    },
    saveButtonDisabled: { opacity: 0.6 },
    saveButtonText: { color: C.white, fontSize: 15, fontWeight: '700' },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    modalCard: {
      width: '100%',
      backgroundColor: C.surface,
      borderRadius: 28,
      overflow: 'hidden',
      maxHeight: '85%',
      elevation: 8,
      shadowColor: C.shadow,
      shadowOpacity: 0.15,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
    },
    modalHeader: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
    modalLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: C.subtext,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    modalSelected: { fontSize: 22, fontWeight: '700', color: C.text },
    divider: { height: 1, backgroundColor: C.border },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    modalTextBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 },
    modalTextBtnLabel: { fontSize: 14, fontWeight: '600', color: C.primary },
    pickerHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 4,
    },
    pickerMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    pickerMetaText: {
      color: C.subtext,
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    pickerFormatText: {
      color: C.subtext,
      fontSize: 11,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      textAlign: 'right',
    },
    timeRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 8,
    },
    colonContainer: {
      width: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeColon: { fontSize: 28, fontWeight: '700', color: C.primary },
  });
}

export default function EditBirthInfoScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const months = (t('calendar.months') || '').split(',');
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();
  const clearNatalChart = useNatalChartStore((s) => s.clear);
  const clearLuckyDates = useLuckyDatesStore((s) => s.clear);

  const parsedBirthDate = user?.birthDate ? new Date(user.birthDate) : null;

  const [birthDate, setBirthDate] = useState<Date | null>(parsedBirthDate);
  const [birthTime, setBirthTime] = useState<string>(user?.birthTime || '');
  const [birthTimeUnknown, setBirthTimeUnknown] = useState<boolean>(
    user?.birthTimeUnknown ?? false
  );
  const [birthLocation, setBirthLocation] = useState<string>(user?.birthLocation || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(birthDate);
  const [tempHour, setTempHour] = useState<number>(
    birthTime ? parseInt(birthTime.split(':')[0], 10) : 12
  );
  const [tempMinute, setTempMinute] = useState<number>(
    birthTime ? parseInt(birthTime.split(':')[1], 10) : 0
  );
  const [saving, setSaving] = useState(false);

  const hourItems = useMemo(
    () => Array.from({ length: 24 }, (_, i) => ({ value: i, label: String(i).padStart(2, '0') })),
    []
  );
  const minuteItems = useMemo(
    () => Array.from({ length: 60 }, (_, i) => ({ value: i, label: String(i).padStart(2, '0') })),
    []
  );

  const displayPickerTime = `${String(tempHour).padStart(2, '0')}:${String(tempMinute).padStart(2, '0')}`;

  const handleSave = async () => {
    if (!birthDate || !birthLocation.trim()) {
      Alert.alert(t('birthInfo.missingInfo'), t('birthInfo.missingInfoDesc'));
      return;
    }
    if (!user?.id) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      const zodiacSign = getZodiacSign(birthDate.getMonth() + 1, birthDate.getDate());
      const payload = {
        birthDate: birthDate.toISOString().split('T')[0],
        birthTime: birthTimeUnknown ? null : birthTime || null,
        birthTimeUnknown,
        birthLocation: birthLocation.trim(),
        zodiacSign,
      };
      const res = await updateProfile(payload);
      setUser({ ...user, ...res.data });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Trigger natal chart recalculation in astrology-service with the new birth data
      try {
        await calculateNatalChart({
          userId: user.id,
          name: user.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : undefined,
          birthDate: birthDate.toISOString().split('T')[0],
          birthTime: birthTimeUnknown ? undefined : birthTime || undefined,
          birthLocation: birthLocation.trim(),
        });
      } catch {
        // Non-fatal: home screen will still reload, showing loading state
      }
      // Clear cached data so Home re-fetches the newly calculated chart
      queryClient.invalidateQueries({ queryKey: ['astrology'] });
      queryClient.invalidateQueries({ queryKey: ['lucky-dates'] });
      clearNatalChart();
      clearLuckyDates();
      router.replace('/(tabs)/home');
    } catch (err) {
      Alert.alert(t('common.error'), t('birthInfo.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeScreen>
      <View style={styles.container}>
        <TabHeader title={t('birthInfo.title')} />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.hint}>
            {t('birthInfo.hint')}
          </Text>

        {/* Birth Date */}
        <Text style={styles.label}>{t('birthInfo.birthDate')}</Text>
        <TouchableOpacity
          style={styles.inputRow}
          onPress={() => setShowDatePicker(true)}
          accessibilityLabel={t('editBirthInfo.accessibilitySelectDate')}
          accessibilityRole="button"
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={birthDate ? colors.primary : colors.disabledText}
          />
          <Text style={[styles.inputText, !birthDate && styles.placeholderText]}>
            {birthDate ? formatDateDisplay(birthDate, months) : t('birthInfo.selectDate')}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
        </TouchableOpacity>

        {/* Birth Time */}
        <Text style={styles.label}>{t('birthInfo.birthTime')}</Text>
        <TouchableOpacity
          style={[styles.inputRow, birthTimeUnknown && styles.inputRowDisabled]}
          onPress={() => !birthTimeUnknown && setShowTimePicker(true)}
          accessibilityLabel={t('editBirthInfo.accessibilitySelectTime')}
          accessibilityRole="button"
        >
          <Ionicons
            name="time-outline"
            size={20}
            color={birthTime && !birthTimeUnknown ? colors.primary : colors.disabledText}
          />
          <Text style={[styles.inputText, (!birthTime || birthTimeUnknown) && styles.placeholderText]}>
            {birthTimeUnknown ? t('common.unknown') : birthTime || t('birthInfo.selectTime')}
          </Text>
          {!birthTimeUnknown && (
            <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setBirthTimeUnknown((v) => !v)}
          accessibilityLabel={t('editBirthInfo.accessibilityBirthTimeUnknown')}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: birthTimeUnknown }}
        >
          <Ionicons
            name={birthTimeUnknown ? 'checkbox' : 'square-outline'}
            size={20}
            color={birthTimeUnknown ? colors.primary : colors.subtext}
          />
          <Text style={styles.checkLabel}>{t('birthInfo.unknownTime')}</Text>
        </TouchableOpacity>

        {/* Birth Location */}
        <Text style={styles.label}>{t('birthInfo.birthLocation')}</Text>
        <View style={styles.inputRow}>
          <Ionicons
            name="location-outline"
            size={20}
            color={birthLocation ? colors.primary : colors.disabledText}
          />
          <TextInput
            style={styles.textInputInline}
            value={birthLocation}
            onChangeText={setBirthLocation}
            placeholder={t('birthInfo.locationPlaceholder')}
            placeholderTextColor={colors.disabledText}
            returnKeyType="done"
          />
        </View>

        <View style={styles.saveRow}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            accessibilityLabel={t('editBirthInfo.accessibilitySaveChanges')}
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.saveButtonText}>{t('birthInfo.saveChanges')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalLabel}>{t('editBirthInfo.selectBirthDateModal')}</Text>
              <Text style={styles.modalSelected}>
                {tempDate ? formatDateDisplay(tempDate, months) : t('editBirthInfo.notSelectedYet')}
              </Text>
            </View>
            <View style={styles.divider} />
            <ScrollView style={{ paddingHorizontal: 16, paddingVertical: 8 }} nestedScrollEnabled>
              <CalendarPicker
                selectedDate={tempDate}
                onSelect={setTempDate}
                maximumDate={new Date()}
                minimumDate={new Date(1920, 0, 1)}
              />
            </ScrollView>
            <View style={styles.divider} />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalTextBtn}
                onPress={() => setShowDatePicker(false)}
                accessibilityLabel={t('common.cancel')}
                accessibilityRole="button"
              >
                <Text style={styles.modalTextBtnLabel}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalTextBtn, !tempDate && { opacity: 0.4 }]}
                disabled={!tempDate}
                accessibilityLabel={t('editBirthInfo.confirmDate')}
                accessibilityRole="button"
                onPress={() => {
                  if (tempDate) setBirthDate(tempDate);
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.modalTextBtnLabel}>{t('common.ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal visible={showTimePicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalLabel}>{t('editBirthInfo.selectTimeModal')}</Text>
              <Text style={styles.modalSelected}>{displayPickerTime}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.pickerHeaderRow}>
              <View style={styles.pickerMeta}>
                <Ionicons name="time-outline" size={14} color={colors.primary} />
                <Text style={styles.pickerMetaText}>{t('auth.selectTimeLabel')}</Text>
              </View>
              <Text style={styles.pickerFormatText}>{t('birthInfo.timeFormat')}</Text>
            </View>
            <View style={styles.timeRow}>
              <WheelPicker
                items={hourItems}
                selectedValue={tempHour}
                onValueChange={(v) => setTempHour(v as number)}
                width={108}
              />
              <View style={styles.colonContainer}>
                <Text style={styles.timeColon}>:</Text>
              </View>
              <WheelPicker
                items={minuteItems}
                selectedValue={tempMinute}
                onValueChange={(v) => setTempMinute(v as number)}
                width={108}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalTextBtn}
                onPress={() => setShowTimePicker(false)}
                accessibilityLabel={t('common.cancel')}
                accessibilityRole="button"
              >
                <Text style={styles.modalTextBtnLabel}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalTextBtn}
                accessibilityLabel={t('editBirthInfo.confirmTime')}
                accessibilityRole="button"
                onPress={() => {
                  setBirthTime(displayPickerTime);
                  setShowTimePicker(false);
                }}
              >
                <Text style={styles.modalTextBtnLabel}>{t('common.ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </View>
    </SafeScreen>
  );
}
