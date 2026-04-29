import { useMemo, useState } from 'react';
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
import CalendarPicker from '../components/CalendarPicker';
import WheelPicker from '../components/WheelPicker';
import { useAuthStore } from '../store/useAuthStore';
import { useSynastryStore } from '../store/useSynastryStore';
import { COUNTRIES, CITIES, DISTRICTS } from '../constants/index';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { AppHeader, SafeScreen } from '../components/ui';
import { useSmartBackNavigation } from '../hooks/useSmartBackNavigation';
import {
  ActionUnlockSheet,
  FEATURE_ACTION_KEYS,
  FEATURE_MODULE_KEYS,
  useModuleMonetization,
} from '../features/monetization';

function formatDateDisplay(date: Date, months: string[]): string {
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AddPersonScreen() {
  const { t } = useTranslation();
  const months = (t('calendar.months') || '').split(',');
  const { user } = useAuthStore();
  const { addPerson } = useSynastryStore();
  const monetization = useModuleMonetization(FEATURE_MODULE_KEYS.COMPATIBILITY);
  const addPersonUnlockState = monetization.getActionUnlockState(FEATURE_ACTION_KEYS.PERSON_ADD);
  const [showUnlockSheet, setShowUnlockSheet] = useState(false);
  const [featureUnlocked, setFeatureUnlocked] = useState(false);
  const goBack = useSmartBackNavigation({ fallbackRoute: '/(tabs)/compatibility' });

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
  const [tempHour, setTempHour] = useState(12);
  const [tempMinute, setTempMinute] = useState(0);
  const [showTimeModal, setShowTimeModal] = useState(false);

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

  const countryName = COUNTRIES.find(c => c.code === countryCode)?.name ?? t('addPerson.defaultCountry');
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

  const displayTime = birthTimeUnknown
    ? t('common.unknown')
    : birthTimeConfirmed
    ? birthTime
    : 'SS:DD';

  const displayPickerTime = `${String(tempHour).padStart(2, '0')}:${String(tempMinute).padStart(2, '0')}`;

  const hourItems = useMemo(
    () => Array.from({ length: 24 }, (_, index) => ({ value: index, label: String(index).padStart(2, '0') })),
    [],
  );
  const minuteItems = useMemo(
    () => Array.from({ length: 60 }, (_, index) => ({ value: index, label: String(index).padStart(2, '0') })),
    [],
  );

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
      const parsedHour = Number.parseInt(h ?? '12', 10);
      const parsedMinute = Number.parseInt(m ?? '00', 10);
      setTempHour(Number.isNaN(parsedHour) ? 12 : parsedHour);
      setTempMinute(Number.isNaN(parsedMinute) ? 0 : parsedMinute);
    }
    setShowTimeModal(true);
  };
  const confirmTime = () => {
    setBirthTime(displayPickerTime);
    setBirthTimeUnknown(false);
    setBirthTimeConfirmed(true);
    setShowTimeModal(false);
  };

  // ─── Save ──────────────────────────────────────────────────────────────────

  const performSave = async () => {
    if (!user?.id || !birthDate) return;

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
      Alert.alert(t('common.error'), e?.response?.data?.message ?? t('natalChart.addPersonError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    if (!name.trim()) {
      Alert.alert(t('birthInfo.missingInfo'), t('birthInfo.nameRequired'));
      return;
    }
    if (!birthDate) {
      Alert.alert(t('birthInfo.missingInfo'), t('birthInfo.birthDateRequired'));
      return;
    }
    if (!city) {
      Alert.alert(t('birthInfo.missingInfo'), t('birthInfo.birthLocationRequired'));
      return;
    }

    if (addPersonUnlockState.usesMonetization && !featureUnlocked) {
      setShowUnlockSheet(true);
      return;
    }

    await performSave();
  };

  const canSave = !isSaving && !!name.trim() && !!birthDate && !!city;
  const { colors } = useTheme();
  const { styles, modalS, pickerS } = makeStyles(colors);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <AppHeader title={t('addPerson.title')} subtitle={t('addPerson.subtitle')} onBack={goBack} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

        {/* ── İsim ─────────────────────────────────────────────── */}
        <Text style={styles.label}>{t('addPerson.nameLabel')}</Text>
        <View style={styles.inputRow}>
          <Ionicons name="person-outline" size={18} color={colors.subtext} />
          <TextInput
            style={styles.textInput}
            placeholder={t('addPerson.namePlaceholder')}
            placeholderTextColor={colors.disabledText}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        {/* ── Doğum Tarihi ─────────────────────────────────────── */}
        <Text style={[styles.label, { marginTop: 20 }]}>{t('addPerson.birthDateLabel')}</Text>
        <TouchableOpacity
          style={styles.inputRow}
          onPress={openDateModal}
          accessibilityLabel={t('addPerson.accessibilitySelectDate')}
          accessibilityRole="button"
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={birthDate ? colors.primary : colors.subtext}
          />
          <Text style={[styles.inputText, !birthDate && styles.placeholder]}>
            {birthDate ? formatDateDisplay(birthDate, months) : t('common.selectDate')}
          </Text>
          {birthDate && (
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
          )}
        </TouchableOpacity>

        {/* ── Doğum Saati ──────────────────────────────────────── */}
        <Text style={[styles.label, { marginTop: 20 }]}>{t('addPerson.birthTimeLabel')}</Text>
        <TouchableOpacity
          style={[styles.inputRow, birthTimeUnknown && { opacity: 0.5 }]}
          onPress={() => { if (!birthTimeUnknown) openTimeModal(); }}
          accessibilityLabel={t('addPerson.accessibilitySelectTime')}
          accessibilityRole="button"
        >
          <Ionicons name="time-outline" size={18} color={colors.subtext} />
          <Text style={[styles.inputText, !birthTimeConfirmed && !birthTimeUnknown && styles.placeholder]}>
            {displayTime}
          </Text>
          {birthTimeConfirmed && !birthTimeUnknown && (
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => {
            const next = !birthTimeUnknown;
            setBirthTimeUnknown(next);
            if (next) setBirthTimeConfirmed(false);
          }}
          accessibilityLabel={t('addPerson.accessibilityBirthTimeUnknown')}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: birthTimeUnknown }}
        >
          <Ionicons
            name={birthTimeUnknown ? 'checkbox' : 'square-outline'}
            size={20}
            color={birthTimeUnknown ? colors.primary : colors.subtext}
          />
          <Text style={styles.checkLabel}>{t('addPerson.accessibilityBirthTimeUnknown')}</Text>
        </TouchableOpacity>

        {/* ── Doğum Ülkesi ─────────────────────────────────────── */}
        <Text style={[styles.label, { marginTop: 20 }]}>{t('addPerson.birthCountryLabel')}</Text>
        <TouchableOpacity
          style={styles.inputRow}
          onPress={() => { setCountrySearch(''); setShowCountryModal(true); }}
          accessibilityLabel={t('addPerson.accessibilitySelectCountry')}
          accessibilityRole="button"
        >
          <Ionicons name="globe-outline" size={18} color={colors.subtext} />
          <Text style={styles.inputText}>{countryName}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.subtext} />
        </TouchableOpacity>

        {/* ── Doğum Şehri ──────────────────────────────────────── */}
        <Text style={[styles.label, { marginTop: 16 }]}>{t('addPerson.birthCityLabel')}</Text>
        <TouchableOpacity
          style={styles.inputRow}
          onPress={() => { setCitySearch(''); setShowCityModal(true); }}
          accessibilityLabel={t('addPerson.accessibilitySelectCity')}
          accessibilityRole="button"
        >
          <Ionicons name="location-outline" size={18} color={city ? colors.primary : colors.subtext} />
          <Text style={[styles.inputText, !city && styles.placeholder]}>
            {city || t('addPerson.citySelect')}
          </Text>
          {city
            ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            : <Ionicons name="chevron-down" size={16} color={colors.subtext} />
          }
        </TouchableOpacity>

        {/* ── Doğum İlçesi ─────────────────────────────────────── */}
        {city && districtList.length > 0 && (
          <>
            <Text style={[styles.label, { marginTop: 16 }]}>{t('addPerson.birthDistrictLabel')}</Text>
            <TouchableOpacity
              style={styles.inputRow}
              onPress={() => { setDistrictSearch(''); setShowDistrictModal(true); }}
              accessibilityLabel={t('addPerson.accessibilitySelectDistrict')}
              accessibilityRole="button"
            >
              <Ionicons name="map-outline" size={18} color={district ? colors.primary : colors.subtext} />
              <Text style={[styles.inputText, !district && styles.placeholder]}>
                {district || t('addPerson.districtOptional')}
              </Text>
              {district
                ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                : <Ionicons name="chevron-down" size={16} color={colors.subtext} />
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
            accessibilityLabel={t('addPerson.accessibilitySavePerson')}
            accessibilityRole="button"
          >
            {isSaving
              ? <ActivityIndicator color={colors.white} />
              : <Ionicons name="planet-outline" size={20} color={colors.white} />
            }
            <Text style={styles.saveBtnText}>
              {isSaving ? t('addPerson.calculatingChart') : t('common.save')}
            </Text>
          </TouchableOpacity>
        </View>
        </ScrollView>

      {/* ── DATE MODAL ──────────────────────────────────────────── */}
        <Modal visible={showDateModal} transparent animationType="fade">
        <View style={modalS.overlay}>
          <View style={modalS.card}>
            <View style={modalS.header}>
              <Text style={modalS.headerLabel}>{t('addPerson.selectDateModal')}</Text>
              <Text style={modalS.headerValue}>
                {tempDate ? formatDateDisplay(tempDate, months) : t('editBirthInfo.notSelectedYet')}
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
                accessibilityLabel={t('common.cancel')}
                accessibilityRole="button"
              >
                <Text style={modalS.textBtnLabel}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalS.textBtn, !tempDate && modalS.textBtnDisabled]}
                accessibilityLabel={t('editBirthInfo.confirmDate')}
                accessibilityRole="button"
                onPress={confirmDate}
                disabled={!tempDate}
              >
                <Text style={[modalS.textBtnLabel, !tempDate && modalS.textBtnLabelDisabled]}>
                  {t('common.ok')}
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
              <Text style={modalS.headerLabel}>{t('addPerson.selectTime')}</Text>
              <Text style={modalS.headerValue}>
                {displayPickerTime}
              </Text>
            </View>
            <View style={modalS.divider} />
            <View style={modalS.pickerHeaderRow}>
              <View style={modalS.pickerMeta}>
                <Ionicons name="time-outline" size={14} color={colors.primary} />
                <Text style={modalS.pickerMetaText}>{t('auth.selectTimeLabel')}</Text>
              </View>
              <Text style={modalS.pickerFormatText}>{t('birthInfo.timeFormat')}</Text>
            </View>
            <View style={modalS.timeRow}>
              <WheelPicker
                items={hourItems}
                selectedValue={tempHour}
                onValueChange={(value) => setTempHour(value as number)}
                width={108}
              />
              <Text style={modalS.timeColon}>:</Text>
              <WheelPicker
                items={minuteItems}
                selectedValue={tempMinute}
                onValueChange={(value) => setTempMinute(value as number)}
                width={108}
              />
            </View>
            <View style={modalS.divider} />
            <View style={modalS.actions}>
              <TouchableOpacity
                style={modalS.textBtn}
                onPress={() => setShowTimeModal(false)}
                accessibilityLabel={t('common.cancel')}
                accessibilityRole="button"
              >
                <Text style={modalS.textBtnLabel}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={modalS.textBtn}
                accessibilityLabel={t('editBirthInfo.confirmTime')}
                accessibilityRole="button"
                onPress={confirmTime}
              >
                <Text style={modalS.textBtnLabel}>{t('common.ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </Modal>

      {/* ── COUNTRY MODAL ───────────────────────────────────────── */}
        <Modal visible={showCountryModal} transparent animationType="slide">
        <View style={pickerS.container}>
          <View style={pickerS.header}>
            <Text style={pickerS.headerTitle}>{t('addPerson.selectCountry')}</Text>
            <TouchableOpacity
              onPress={() => setShowCountryModal(false)}
              accessibilityLabel={t('addPerson.accessibilityCloseCountry')}
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={22} color={colors.subtext} />
            </TouchableOpacity>
          </View>
          <View style={pickerS.searchBox}>
            <Ionicons name="search" size={17} color={colors.disabledText} />
            <TextInput
              style={pickerS.searchInput}
              placeholder={t('addPerson.countrySearch')}
              placeholderTextColor={colors.disabledText}
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
                accessibilityLabel={t('addPerson.countryItemLabel', { name: item.name })}
                accessibilityRole="button"
              >
                <Text style={[
                  pickerS.listItemText,
                  item.code === countryCode && { color: colors.primary, fontWeight: '700' },
                ]}>
                  {item.name}
                </Text>
                {item.code === countryCode && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={pickerS.emptyText}>{t('addPerson.noCountriesFound')}</Text>}
          />
        </View>
      </Modal>

      {/* ── CITY MODAL ──────────────────────────────────────────── */}
      <Modal visible={showCityModal} transparent animationType="slide">
        <View style={pickerS.container}>
          <View style={pickerS.header}>
            <Text style={pickerS.headerTitle}>{t('addPerson.selectCity')}</Text>
            <TouchableOpacity
              onPress={() => setShowCityModal(false)}
              accessibilityLabel={t('addPerson.accessibilityCloseCity')}
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={22} color={colors.subtext} />
            </TouchableOpacity>
          </View>
          <View style={pickerS.searchBox}>
            <Ionicons name="search" size={17} color={colors.disabledText} />
            <Text style={pickerS.countryPrefix}>{countryName}</Text>
            <Text style={{ color: colors.border }}>|</Text>
            <TextInput
              style={pickerS.searchInput}
              placeholder={t('addPerson.citySearch')}
              placeholderTextColor={colors.disabledText}
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
                accessibilityLabel={t('addPerson.cityItemLabel', { name: item.name })}
                accessibilityRole="button"
              >
                <Text style={[
                  pickerS.listItemText,
                  item.name === city && { color: colors.primary, fontWeight: '700' },
                ]}>
                  {item.name}
                </Text>
                {item.name === city && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
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
            <Text style={pickerS.headerTitle}>{city} — {t('addPerson.selectDistrict')}</Text>
            <TouchableOpacity
              onPress={() => setShowDistrictModal(false)}
              accessibilityLabel={t('addPerson.accessibilityCloseDistrict')}
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={22} color={colors.subtext} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={pickerS.skipRow}
            onPress={() => { setDistrict(''); setShowDistrictModal(false); }}
            accessibilityLabel={t('addPerson.accessibilityDistrictSkip')}
            accessibilityRole="button"
          >
            <Text style={pickerS.skipText}>{t('addPerson.districtSkip')}</Text>
          </TouchableOpacity>
          <View style={pickerS.searchBox}>
            <Ionicons name="search" size={17} color={colors.disabledText} />
            <TextInput
              style={pickerS.searchInput}
              placeholder={t('addPerson.districtSearch')}
              placeholderTextColor={colors.disabledText}
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
                accessibilityLabel={t('addPerson.districtItemLabel', { name: item })}
                accessibilityRole="button"
              >
                <Text style={[
                  pickerS.listItemText,
                  item === district && { color: colors.primary, fontWeight: '700' },
                ]}>
                  {item}
                </Text>
                {item === district && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={pickerS.emptyText}>{t('addPerson.noDistrictsFound')}</Text>}
          />
        </View>
      </Modal>
      </KeyboardAvoidingView>

      <ActionUnlockSheet
        visible={showUnlockSheet}
        moduleKey={FEATURE_MODULE_KEYS.COMPATIBILITY}
        actionKey={FEATURE_ACTION_KEYS.PERSON_ADD}
        title={t('addPerson.title')}
        onClose={() => setShowUnlockSheet(false)}
        onUnlocked={async () => {
          setFeatureUnlocked(true);
          await performSave();
        }}
      />
    </SafeScreen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingTop: Platform.OS === 'ios' ? 56 : 32,
      paddingHorizontal: 24,
      paddingBottom: 16,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: C.text },
    headerSub: { fontSize: 12, color: C.subtext, marginTop: 1 },
    scroll: { flex: 1 },
    label: { fontSize: 13, fontWeight: '600', color: C.subtext, marginBottom: 8 },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    textInput: { flex: 1, fontSize: 15, color: C.text },
    inputText: { flex: 1, fontSize: 15, color: C.text },
    placeholder: { color: C.disabledText },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
    checkLabel: { fontSize: 14, color: C.text },
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: C.primary,
      borderRadius: 999,
      paddingVertical: 16,
    },
    saveBtnDisabled: { backgroundColor: C.disabled },
    saveBtnText: { fontSize: 16, fontWeight: '700', color: C.white },
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
    header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
    headerLabel: {
      fontSize: 12, fontWeight: '500', color: C.subtext,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
    },
    headerValue: { fontSize: 22, fontWeight: '700', color: C.text },
    divider: { height: 1, backgroundColor: C.border },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', padding: 12, gap: 8 },
    textBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 },
    textBtnDisabled: { opacity: 0.4 },
    textBtnLabel: { fontSize: 14, fontWeight: '600', color: C.primary },
    textBtnLabelDisabled: { color: C.disabledText },
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
      paddingVertical: 12,
    },
    timeColon: { fontSize: 28, fontWeight: '700', color: C.primary, marginHorizontal: 10 },
  });

  const pickerS = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.surface,
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'ios' ? 56 : 24,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerTitle: { fontSize: 18, fontWeight: '600', color: C.text },
    skipRow: { paddingVertical: 10, marginBottom: 8, alignItems: 'center' },
    skipText: { fontSize: 13, color: C.subtext, fontWeight: '500' },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: C.surface,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 8,
      shadowColor: C.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    countryPrefix: { fontSize: 14, color: C.text, fontWeight: '600' },
    searchInput: { flex: 1, fontSize: 15, color: C.text },
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    listItemText: { fontSize: 15, color: C.text },
    emptyText: { textAlign: 'center', color: C.subtext, marginTop: 20 },
  });

  return { styles, modalS, pickerS };
}
