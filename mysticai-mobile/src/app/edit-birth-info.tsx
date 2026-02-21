import { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../store/useAuthStore';
import { useNatalChartStore } from '../store/useNatalChartStore';
import { useLuckyDatesStore } from '../store/useLuckyDatesStore';
import OnboardingBackground from '../components/OnboardingBackground';
import CalendarPicker from '../components/CalendarPicker';
import { updateProfile } from '../services/auth';
import { calculateNatalChart } from '../services/astrology.service';
import { getZodiacSign } from '../constants/index';
import { COLORS } from '../constants/colors';

const TURKISH_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

function formatDateDisplay(date: Date): string {
  return `${date.getDate()} ${TURKISH_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export default function EditBirthInfoScreen() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
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
  const [tempHour, setTempHour] = useState(
    birthTime ? birthTime.split(':')[0] : '12'
  );
  const [tempMinute, setTempMinute] = useState(
    birthTime ? birthTime.split(':')[1] : '00'
  );
  const [saving, setSaving] = useState(false);

  const isTimeValid = () => {
    const h = parseInt(tempHour, 10);
    const m = parseInt(tempMinute, 10);
    return !isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59;
  };

  const handleSave = async () => {
    if (!birthDate || !birthLocation.trim()) {
      Alert.alert('Eksik Bilgi', 'Doğum tarihi ve konum zorunludur.');
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
      clearNatalChart();
      clearLuckyDates();
      router.replace('/(tabs)/home');
    } catch (err) {
      Alert.alert('Hata', 'Bilgiler kaydedilemedi. Lütfen tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <OnboardingBackground />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Geri dön"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Doğum Bilgileri</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.hint}>
          Doğum bilgileriniz natal haritanızın hesaplanmasında kullanılır. Değişiklikler haritanızı etkiler.
        </Text>

        {/* Birth Date */}
        <Text style={styles.label}>Doğum Tarihi</Text>
        <TouchableOpacity
          style={styles.inputRow}
          onPress={() => setShowDatePicker(true)}
          accessibilityLabel="Doğum tarihi seç"
          accessibilityRole="button"
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={birthDate ? COLORS.primary : COLORS.disabledText}
          />
          <Text style={[styles.inputText, !birthDate && styles.placeholderText]}>
            {birthDate ? formatDateDisplay(birthDate) : 'Tarih seçin'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.subtext} />
        </TouchableOpacity>

        {/* Birth Time */}
        <Text style={styles.label}>Doğum Saati</Text>
        <TouchableOpacity
          style={[styles.inputRow, birthTimeUnknown && styles.inputRowDisabled]}
          onPress={() => !birthTimeUnknown && setShowTimePicker(true)}
          accessibilityLabel="Doğum saati seç"
          accessibilityRole="button"
        >
          <Ionicons
            name="time-outline"
            size={20}
            color={birthTime && !birthTimeUnknown ? COLORS.primary : COLORS.disabledText}
          />
          <Text style={[styles.inputText, (!birthTime || birthTimeUnknown) && styles.placeholderText]}>
            {birthTimeUnknown ? 'Bilinmiyor' : birthTime || 'SS:DD seçin'}
          </Text>
          {!birthTimeUnknown && (
            <Ionicons name="chevron-forward" size={16} color={COLORS.subtext} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setBirthTimeUnknown((v) => !v)}
          accessibilityLabel="Doğum saatimi bilmiyorum"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: birthTimeUnknown }}
        >
          <Ionicons
            name={birthTimeUnknown ? 'checkbox' : 'square-outline'}
            size={20}
            color={birthTimeUnknown ? COLORS.primary : COLORS.subtext}
          />
          <Text style={styles.checkLabel}>Doğum saatimi bilmiyorum</Text>
        </TouchableOpacity>

        {/* Birth Location */}
        <Text style={styles.label}>Doğum Yeri</Text>
        <View style={styles.inputRow}>
          <Ionicons
            name="location-outline"
            size={20}
            color={birthLocation ? COLORS.primary : COLORS.disabledText}
          />
          <TextInput
            style={styles.textInputInline}
            value={birthLocation}
            onChangeText={setBirthLocation}
            placeholder="Şehir, Ülke (örn. İstanbul, TR)"
            placeholderTextColor={COLORS.disabledText}
            returnKeyType="done"
          />
        </View>

        <View style={styles.saveRow}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            accessibilityLabel="Değişiklikleri kaydet"
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Değişiklikleri Kaydet</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalLabel}>Doğum tarihinizi seçin</Text>
              <Text style={styles.modalSelected}>
                {tempDate ? formatDateDisplay(tempDate) : 'Henüz seçilmedi'}
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
                accessibilityLabel="İptal"
                accessibilityRole="button"
              >
                <Text style={styles.modalTextBtnLabel}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalTextBtn, !tempDate && { opacity: 0.4 }]}
                disabled={!tempDate}
                accessibilityLabel="Tarihi onayla"
                accessibilityRole="button"
                onPress={() => {
                  if (tempDate) setBirthDate(tempDate);
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.modalTextBtnLabel}>Tamam</Text>
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
              <Text style={styles.modalLabel}>Saat seçin</Text>
              <Text style={styles.modalSelected}>
                {isTimeValid() ? `${tempHour}:${tempMinute}` : '--:--'}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.timeRow}>
              <View style={styles.timeGroup}>
                <Text style={styles.timeGroupLabel}>Saat</Text>
                <TextInput
                  style={styles.timeInput}
                  value={tempHour}
                  onChangeText={(t) => setTempHour(t.replace(/[^0-9]/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="00"
                  placeholderTextColor={COLORS.disabledText}
                  selectTextOnFocus
                />
              </View>
              <Text style={styles.timeColon}>:</Text>
              <View style={styles.timeGroup}>
                <Text style={styles.timeGroupLabel}>Dakika</Text>
                <TextInput
                  style={styles.timeInput}
                  value={tempMinute}
                  onChangeText={(t) => setTempMinute(t.replace(/[^0-9]/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="00"
                  placeholderTextColor={COLORS.disabledText}
                  selectTextOnFocus
                />
              </View>
            </View>
            <Text style={styles.timeHint}>24 saat formatı (00:00 – 23:59)</Text>
            <View style={styles.divider} />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalTextBtn}
                onPress={() => setShowTimePicker(false)}
                accessibilityLabel="İptal"
                accessibilityRole="button"
              >
                <Text style={styles.modalTextBtnLabel}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalTextBtn, !isTimeValid() && { opacity: 0.4 }]}
                disabled={!isTimeValid()}
                accessibilityLabel="Saati onayla"
                accessibilityRole="button"
                onPress={() => {
                  const h = parseInt(tempHour, 10);
                  const m = parseInt(tempMinute, 10);
                  setBirthTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
                  setShowTimePicker(false);
                }}
              >
                <Text style={styles.modalTextBtnLabel}>Tamam</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  hint: {
    fontSize: 13,
    color: COLORS.subtext,
    lineHeight: 19,
    marginBottom: 20,
    backgroundColor: COLORS.primarySoft,
    padding: 12,
    borderRadius: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  inputRowDisabled: { opacity: 0.5 },
  inputText: { flex: 1, fontSize: 15, color: COLORS.text },
  placeholderText: { color: COLORS.disabledText },
  textInputInline: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    padding: 0,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  checkLabel: { fontSize: 13, color: COLORS.text },
  saveRow: { marginTop: 32 },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    overflow: 'hidden',
    maxHeight: '85%',
    elevation: 8,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  modalHeader: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  modalLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalSelected: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  divider: { height: 1, backgroundColor: COLORS.border },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  modalTextBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 },
  modalTextBtnLabel: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  timeGroup: { alignItems: 'center' },
  timeGroupLabel: { fontSize: 12, color: COLORS.subtext, marginBottom: 8 },
  timeInput: {
    width: 80,
    height: 64,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  timeColon: { fontSize: 32, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  timeHint: { fontSize: 12, color: COLORS.subtext, textAlign: 'center', paddingBottom: 20, paddingTop: 8 },
});
