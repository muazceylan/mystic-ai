import { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import OnboardingBackground from '../components/OnboardingBackground';
import CalendarPicker from '../components/CalendarPicker';
import { useAuthStore } from '../store/useAuthStore';
import { useSynastryStore } from '../store/useSynastryStore';
import { COUNTRIES, CITIES, DISTRICTS } from '../constants/index';
import { COLORS } from '../constants/colors';
import { SafeScreen } from '../components/ui';

const TURKISH_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

function formatDateDisplay(date: Date): string {
  return `${date.getDate()} ${TURKISH_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AddPersonScreen() {
  const { user } = useAuthStore();
  const { addPerson } = useSynastryStore();

  // Form state
  const [name, setName] = useState('');

  // Birth date
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [tempDate, setTempDate] = useState<Date | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);

  // Birth time
  const [birthTime, setBirthTime] = useState('');
  const [birthTimeUnknown, setBirthTimeUnknown] = useState(false);
  const [birthTimeConfirmed, setBirthTimeConfirmed] = useState(false);
  const [tempHour, setTempHour] = useState('12');
  const [tempMinute, setTempMinute] = useState('00');
  const [showTimeModal, setShowTimeModal] = useState(false);
  const minuteRef = useRef<TextInput>(null);

  // Country + City + District
  const [countryCode, setCountryCode] = useState('TR');
  const [countrySearch, setCountrySearch] = useState('');
  const [city, setCity] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [district, setDistrict] = useState('');
  const [districtSearch, setDistrictSearch] = useState('');
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showDistrictModal, setShowDistrictModal] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const countryName = COUNTRIES.find(c => c.code === countryCode)?.name ?? 'Türkiye';
  const cityList = CITIES[countryCode] ?? CITIES['TR'] ?? [];
  const districtList = DISTRICTS[city] ?? [];

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );
  const filteredCities = cityList.filter(c =>
    c.name.toLowerCase().includes(citySearch.toLowerCase())
  );
  const filteredDistricts = districtList.filter(d =>
    d.toLowerCase().includes(districtSearch.toLowerCase())
  );

  const isTimeValid = () => {
    const h = parseInt(tempHour, 10);
    const m = parseInt(tempMinute, 10);
    return !isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59;
  };

  const displayTime = birthTimeUnknown
    ? 'Bilinmiyor'
    : birthTimeConfirmed
    ? birthTime
    : 'SS:DD';

  const locationDisplay = city
    ? `${city}${district ? `, ${district}` : ''}`
    : '';

  // ─── Date modal ────────────────────────────────────────────────────────────

  const openDateModal = () => {
    setTempDate(birthDate);
    setShowDateModal(true);
  };
  const confirmDate = () => {
    if (tempDate) setBirthDate(tempDate);
    setShowDateModal(false);
  };

  // ─── Time modal ────────────────────────────────────────────────────────────

  const openTimeModal = () => {
    if (birthTime) {
      const [h, m] = birthTime.split(':');
      setTempHour(h ?? '12');
      setTempMinute(m ?? '00');
    }
    setShowTimeModal(true);
  };
  const confirmTime = () => {
    const h = parseInt(tempHour, 10);
    const m = parseInt(tempMinute, 10);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return;
    setBirthTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    setBirthTimeUnknown(false);
    setBirthTimeConfirmed(true);
    setShowTimeModal(false);
  };

  // ─── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!user?.id) return;

    if (!name.trim()) {
      Alert.alert('Eksik Bilgi', 'İsim zorunludur.');
      return;
    }
    if (!birthDate) {
      Alert.alert('Eksik Bilgi', 'Doğum tarihi zorunludur.');
      return;
    }
    if (!city) {
      Alert.alert('Eksik Bilgi', 'Doğum yeri (şehir) zorunludur.');
      return;
    }

    const birthDateStr = `${birthDate.getFullYear()}-${
      String(birthDate.getMonth() + 1).padStart(2, '0')
    }-${String(birthDate.getDate()).padStart(2, '0')}`;

    const birthTimeStr =
      !birthTimeUnknown && birthTimeConfirmed ? `${birthTime}:00` : undefined;

    const birthLocation = district ? `${city}, ${district}` : city;

    setIsSaving(true);
    try {
      await addPerson({
        userId: user.id,
        name: name.trim(),
        birthDate: birthDateStr,
        birthTime: birthTimeStr,
        birthLocation,
      });
      router.replace('/(tabs)/compatibility');
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message ?? 'Kişi eklenemedi');
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = !isSaving && !!name.trim() && !!birthDate && !!city;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <OnboardingBackground />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Geri dön"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Kişi Ekle</Text>
          <Text style={styles.headerSub}>Doğum haritası hesaplanacak</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── İsim ─────────────────────────────────────────────── */}
        <Text style={styles.label}>İsim *</Text>
        <View style={styles.inputRow}>
          <Ionicons name="person-outline" size={18} color={COLORS.subtext} />
          <TextInput
            style={styles.textInput}
            placeholder="Örn: Ahmet, Hilal..."
            placeholderTextColor={COLORS.disabledText}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        {/* ── Doğum Tarihi ─────────────────────────────────────── */}
        <Text style={[styles.label, { marginTop: 20 }]}>Doğum Tarihi *</Text>
        <TouchableOpacity
          style={styles.inputRow}
          onPress={openDateModal}
          accessibilityLabel="Doğum tarihi seç"
          accessibilityRole="button"
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={birthDate ? COLORS.primary : COLORS.subtext}
          />
          <Text style={[styles.inputText, !birthDate && styles.placeholder]}>
            {birthDate ? formatDateDisplay(birthDate) : 'Tarih seçin'}
          </Text>
          {birthDate && (
            <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
          )}
        </TouchableOpacity>

        {/* ── Doğum Saati ──────────────────────────────────────── */}
        <Text style={[styles.label, { marginTop: 20 }]}>Doğum Saati</Text>
        <TouchableOpacity
          style={[styles.inputRow, birthTimeUnknown && { opacity: 0.5 }]}
          onPress={() => { if (!birthTimeUnknown) openTimeModal(); }}
          accessibilityLabel="Doğum saati seç"
          accessibilityRole="button"
        >
          <Ionicons name="time-outline" size={18} color={COLORS.subtext} />
          <Text style={[styles.inputText, !birthTimeConfirmed && !birthTimeUnknown && styles.placeholder]}>
            {displayTime}
          </Text>
          {birthTimeConfirmed && !birthTimeUnknown && (
            <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => {
            const next = !birthTimeUnknown;
            setBirthTimeUnknown(next);
            if (next) setBirthTimeConfirmed(false);
          }}
          accessibilityLabel="Doğum saatini bilmiyorum"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: birthTimeUnknown }}
        >
          <Ionicons
            name={birthTimeUnknown ? 'checkbox' : 'square-outline'}
            size={20}
            color={birthTimeUnknown ? COLORS.primary : COLORS.subtext}
          />
          <Text style={styles.checkLabel}>Doğum saatini bilmiyorum</Text>
        </TouchableOpacity>

        {/* ── Doğum Ülkesi ─────────────────────────────────────── */}
        <Text style={[styles.label, { marginTop: 20 }]}>Doğum Ülkesi *</Text>
        <TouchableOpacity
          style={styles.inputRow}
          onPress={() => { setCountrySearch(''); setShowCountryModal(true); }}
          accessibilityLabel="Doğum ülkesi seç"
          accessibilityRole="button"
        >
          <Ionicons name="globe-outline" size={18} color={COLORS.subtext} />
          <Text style={styles.inputText}>{countryName}</Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.subtext} />
        </TouchableOpacity>

        {/* ── Doğum Şehri ──────────────────────────────────────── */}
        <Text style={[styles.label, { marginTop: 16 }]}>Doğum Şehri *</Text>
        <TouchableOpacity
          style={styles.inputRow}
          onPress={() => { setCitySearch(''); setShowCityModal(true); }}
          accessibilityLabel="Doğum şehri seç"
          accessibilityRole="button"
        >
          <Ionicons name="location-outline" size={18} color={city ? COLORS.primary : COLORS.subtext} />
          <Text style={[styles.inputText, !city && styles.placeholder]}>
            {city || 'Şehir seçin'}
          </Text>
          {city
            ? <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
            : <Ionicons name="chevron-down" size={16} color={COLORS.subtext} />
          }
        </TouchableOpacity>

        {/* ── Doğum İlçesi ─────────────────────────────────────── */}
        {city && districtList.length > 0 && (
          <>
            <Text style={[styles.label, { marginTop: 16 }]}>Doğum İlçesi</Text>
            <TouchableOpacity
              style={styles.inputRow}
              onPress={() => { setDistrictSearch(''); setShowDistrictModal(true); }}
              accessibilityLabel="Doğum ilçesi seç"
              accessibilityRole="button"
            >
              <Ionicons name="map-outline" size={18} color={district ? COLORS.primary : COLORS.subtext} />
              <Text style={[styles.inputText, !district && styles.placeholder]}>
                {district || 'İlçe seçin (isteğe bağlı)'}
              </Text>
              {district
                ? <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                : <Ionicons name="chevron-down" size={16} color={COLORS.subtext} />
              }
            </TouchableOpacity>
          </>
        )}

        {/* ── Kaydet ───────────────────────────────────────────── */}
        <View style={{ marginTop: 36 }}>
          <TouchableOpacity
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            accessibilityLabel="Kişiyi kaydet"
            accessibilityRole="button"
          >
            {isSaving
              ? <ActivityIndicator color={COLORS.white} />
              : <Ionicons name="planet-outline" size={20} color={COLORS.white} />
            }
            <Text style={styles.saveBtnText}>
              {isSaving ? 'Harita hesaplanıyor...' : 'Kaydet'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── DATE MODAL ──────────────────────────────────────────── */}
      <Modal visible={showDateModal} transparent animationType="fade">
        <View style={modalS.overlay}>
          <View style={modalS.card}>
            <View style={modalS.header}>
              <Text style={modalS.headerLabel}>Tarih seçin</Text>
              <Text style={modalS.headerValue}>
                {tempDate ? formatDateDisplay(tempDate) : 'Henüz seçilmedi'}
              </Text>
            </View>
            <View style={modalS.divider} />
            <ScrollView style={{ paddingHorizontal: 16, paddingVertical: 12 }} nestedScrollEnabled>
              <CalendarPicker
                selectedDate={tempDate}
                onSelect={setTempDate}
                maximumDate={new Date()}
                minimumDate={new Date(1920, 0, 1)}
              />
            </ScrollView>
            <View style={modalS.divider} />
            <View style={modalS.actions}>
              <TouchableOpacity
                style={modalS.textBtn}
                onPress={() => setShowDateModal(false)}
                accessibilityLabel="İptal"
                accessibilityRole="button"
              >
                <Text style={modalS.textBtnLabel}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalS.textBtn, !tempDate && modalS.textBtnDisabled]}
                accessibilityLabel="Tarihi onayla"
                accessibilityRole="button"
                onPress={confirmDate}
                disabled={!tempDate}
              >
                <Text style={[modalS.textBtnLabel, !tempDate && modalS.textBtnLabelDisabled]}>
                  Tamam
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── TIME MODAL ──────────────────────────────────────────── */}
      <Modal visible={showTimeModal} transparent animationType="fade">
        <View style={modalS.overlay}>
          <View style={modalS.card}>
            <View style={modalS.header}>
              <Text style={modalS.headerLabel}>Saat seçin</Text>
              <Text style={modalS.headerValue}>
                {isTimeValid() ? `${tempHour}:${tempMinute}` : '--:--'}
              </Text>
            </View>
            <View style={modalS.divider} />
            <View style={modalS.timeRow}>
              <View style={modalS.timeGroup}>
                <Text style={modalS.timeGroupLabel}>Saat</Text>
                <TextInput
                  style={modalS.timeInput}
                  value={tempHour}
                  onChangeText={t => {
                    const v = t.replace(/[^0-9]/g, '').slice(0, 2);
                    setTempHour(v);
                    if (v.length === 2) minuteRef.current?.focus();
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="00"
                  placeholderTextColor={COLORS.disabledText}
                  selectTextOnFocus
                />
              </View>
              <Text style={modalS.timeColon}>:</Text>
              <View style={modalS.timeGroup}>
                <Text style={modalS.timeGroupLabel}>Dakika</Text>
                <TextInput
                  ref={minuteRef}
                  style={modalS.timeInput}
                  value={tempMinute}
                  onChangeText={t => setTempMinute(t.replace(/[^0-9]/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="00"
                  placeholderTextColor={COLORS.disabledText}
                  selectTextOnFocus
                />
              </View>
            </View>
            <Text style={modalS.timeHint}>24 saat formatı (00:00 – 23:59)</Text>
            <View style={modalS.divider} />
            <View style={modalS.actions}>
              <TouchableOpacity
                style={modalS.textBtn}
                onPress={() => setShowTimeModal(false)}
                accessibilityLabel="İptal"
                accessibilityRole="button"
              >
                <Text style={modalS.textBtnLabel}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalS.textBtn, !isTimeValid() && modalS.textBtnDisabled]}
                accessibilityLabel="Saati onayla"
                accessibilityRole="button"
                onPress={confirmTime}
                disabled={!isTimeValid()}
              >
                <Text style={[modalS.textBtnLabel, !isTimeValid() && modalS.textBtnLabelDisabled]}>
                  Tamam
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── COUNTRY MODAL ───────────────────────────────────────── */}
      <Modal visible={showCountryModal} transparent animationType="slide">
        <View style={pickerS.container}>
          <View style={pickerS.header}>
            <Text style={pickerS.headerTitle}>Ülke Seç</Text>
            <TouchableOpacity
              onPress={() => setShowCountryModal(false)}
              accessibilityLabel="Ülke seçimini kapat"
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={22} color={COLORS.subtext} />
            </TouchableOpacity>
          </View>
          <View style={pickerS.searchBox}>
            <Ionicons name="search" size={17} color={COLORS.disabledText} />
            <TextInput
              style={pickerS.searchInput}
              placeholder="Ülke ara..."
              placeholderTextColor={COLORS.disabledText}
              value={countrySearch}
              onChangeText={setCountrySearch}
            />
          </View>
          <FlatList
            data={filteredCountries}
            keyExtractor={item => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={pickerS.listItem}
                onPress={() => {
                  setCountryCode(item.code);
                  setCity('');
                  setDistrict('');
                  setShowCountryModal(false);
                }}
                accessibilityLabel={`${item.name} ülkesini seç`}
                accessibilityRole="button"
              >
                <Text style={[
                  pickerS.listItemText,
                  item.code === countryCode && { color: COLORS.primary, fontWeight: '700' },
                ]}>
                  {item.name}
                </Text>
                {item.code === countryCode && (
                  <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={pickerS.emptyText}>Ülke bulunamadı</Text>}
          />
        </View>
      </Modal>

      {/* ── CITY MODAL ──────────────────────────────────────────── */}
      <Modal visible={showCityModal} transparent animationType="slide">
        <View style={pickerS.container}>
          <View style={pickerS.header}>
            <Text style={pickerS.headerTitle}>Şehir Seç</Text>
            <TouchableOpacity
              onPress={() => setShowCityModal(false)}
              accessibilityLabel="Şehir seçimini kapat"
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={22} color={COLORS.subtext} />
            </TouchableOpacity>
          </View>
          <View style={pickerS.searchBox}>
            <Ionicons name="search" size={17} color={COLORS.disabledText} />
            <Text style={pickerS.countryPrefix}>{countryName}</Text>
            <Text style={{ color: COLORS.border }}>|</Text>
            <TextInput
              style={pickerS.searchInput}
              placeholder="Şehir ara..."
              placeholderTextColor={COLORS.disabledText}
              value={citySearch}
              onChangeText={setCitySearch}
            />
          </View>
          <FlatList
            data={filteredCities}
            keyExtractor={item => item.name}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={pickerS.listItem}
                onPress={() => {
                  setCity(item.name);
                  setDistrict(''); // reset district when city changes
                  setShowCityModal(false);
                  // Auto-open district modal if districts exist
                  const dists = DISTRICTS[item.name];
                  if (dists && dists.length > 0) {
                    setDistrictSearch('');
                    setTimeout(() => setShowDistrictModal(true), 300);
                  }
                }}
                accessibilityLabel={`${item.name} şehrini seç`}
                accessibilityRole="button"
              >
                <Text style={[
                  pickerS.listItemText,
                  item.name === city && { color: COLORS.primary, fontWeight: '700' },
                ]}>
                  {item.name}
                </Text>
                {item.name === city && (
                  <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={pickerS.emptyText}>Şehir bulunamadı</Text>}
          />
        </View>
      </Modal>

      {/* ── DISTRICT MODAL ──────────────────────────────────────── */}
      <Modal visible={showDistrictModal} transparent animationType="slide">
        <View style={pickerS.container}>
          <View style={pickerS.header}>
            <Text style={pickerS.headerTitle}>{city} — İlçe Seç</Text>
            <TouchableOpacity
              onPress={() => setShowDistrictModal(false)}
              accessibilityLabel="İlçe seçimini kapat"
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={22} color={COLORS.subtext} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={pickerS.skipRow}
            onPress={() => { setDistrict(''); setShowDistrictModal(false); }}
            accessibilityLabel="İlçe seçmeden devam et"
            accessibilityRole="button"
          >
            <Text style={pickerS.skipText}>İlçe seçmeden devam et</Text>
          </TouchableOpacity>
          <View style={pickerS.searchBox}>
            <Ionicons name="search" size={17} color={COLORS.disabledText} />
            <TextInput
              style={pickerS.searchInput}
              placeholder="İlçe ara..."
              placeholderTextColor={COLORS.disabledText}
              value={districtSearch}
              onChangeText={setDistrictSearch}
            />
          </View>
          <FlatList
            data={filteredDistricts}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={pickerS.listItem}
                onPress={() => { setDistrict(item); setShowDistrictModal(false); }}
                accessibilityLabel={`${item} ilçesini seç`}
                accessibilityRole="button"
              >
                <Text style={[
                  pickerS.listItemText,
                  item === district && { color: COLORS.primary, fontWeight: '700' },
                ]}>
                  {item}
                </Text>
                {item === district && (
                  <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={pickerS.emptyText}>İlçe bulunamadı</Text>}
          />
        </View>
      </Modal>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: Platform.OS === 'ios' ? 56 : 32,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.subtext, marginTop: 1 },

  scroll: { flex: 1 },

  label: { fontSize: 13, fontWeight: '600', color: COLORS.subtext, marginBottom: 8 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  textInput: { flex: 1, fontSize: 15, color: COLORS.text },
  inputText: { flex: 1, fontSize: 15, color: COLORS.text },
  placeholder: { color: COLORS.disabledText },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  checkLabel: { fontSize: 14, color: COLORS.text },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: 16,
  },
  saveBtnDisabled: { backgroundColor: COLORS.disabled },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
});

const modalS = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
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
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  headerLabel: {
    fontSize: 12, fontWeight: '500', color: COLORS.subtext,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  headerValue: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  divider: { height: 1, backgroundColor: COLORS.border },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', padding: 12, gap: 8 },
  textBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 },
  textBtnDisabled: { opacity: 0.4 },
  textBtnLabel: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  textBtnLabelDisabled: { color: COLORS.disabledText },

  // Time picker
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
    width: 80, height: 64,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    fontSize: 32, fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  timeColon: { fontSize: 32, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  timeHint: {
    fontSize: 12, color: COLORS.subtext,
    textAlign: 'center', paddingVertical: 12,
  },
});

const pickerS = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  skipRow: {
    paddingVertical: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 13,
    color: COLORS.subtext,
    fontWeight: '500',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  countryPrefix: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  listItemText: { fontSize: 15, color: COLORS.text },
  emptyText: { textAlign: 'center', color: COLORS.subtext, marginTop: 20 },
});
