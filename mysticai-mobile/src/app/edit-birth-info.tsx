import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../utils/haptics';
import { parseLocalDate, toLocalDateString } from '../utils/localDate';
import { useAuthStore } from '../store/useAuthStore';
import { useNatalChartStore } from '../store/useNatalChartStore';
import { useLuckyDatesStore } from '../store/useLuckyDatesStore';
import { useCompanionStore } from '../store/useCompanionStore';
import { useHoroscopeStore } from '../features/horoscope/store/useHoroscopeStore';
import CalendarPicker from '../components/CalendarPicker';
import WheelPicker from '../components/WheelPicker';
import { updateProfile } from '../services/auth';
import { calculateNatalChart } from '../services/astrology.service';
import { clearPlannerFullDistributionCache } from '../services/lucky-dates.service';
import { clearHoroscopeCache } from '../features/horoscope/services/horoscope.service';
import { COUNTRIES, DISTRICTS, getZodiacSign } from '../constants/index';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { SafeScreen, TabHeader } from '../components/ui';
import { useLocationCities, useLocationCountries } from '../hooks/useLocationCatalog';
import {
  normalizeLocationSearchText,
  resolveCountryNameByCode,
} from '../services/locationCatalog.service';
import {
  ProductEventName,
  buildBirthDetailsProperties,
  setProductUserProperties,
  trackProductEvent,
} from '../services/productAnalytics';

function formatDateDisplay(date: Date, months: string[]): string {
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function parseStoredBirthPlace(user: ReturnType<typeof useAuthStore.getState>['user']) {
  const cityParts = (user?.birthCity ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const locationParts = (user?.birthLocation ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (locationParts.length >= 2) {
    return {
      city: locationParts.length >= 3 ? locationParts[locationParts.length - 2] : locationParts[0],
      district: locationParts.length >= 3 ? locationParts.slice(0, -2).join(', ') : '',
    };
  }

  if (locationParts.length === 1 && locationParts[0]) {
    return { city: locationParts[0], district: '' };
  }

  return {
    city: cityParts[0] ?? '',
    district: cityParts.slice(1).join(', '),
  };
}

function parseStoredBirthCountry(user: ReturnType<typeof useAuthStore.getState>['user']): string {
  const storedCountry = user?.birthCountry?.trim() ?? '';
  if (/^[a-z]{2}$/i.test(storedCountry)) {
    return storedCountry.toUpperCase();
  }

  const locationParts = (user?.birthLocation ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const countryLabel = storedCountry || locationParts[locationParts.length - 1] || '';
  const normalizedLabel = normalizeLocationSearchText(countryLabel);
  const match = COUNTRIES.find(
    (country) => normalizeLocationSearchText(country.name) === normalizedLabel
  );
  return match?.code ?? 'TR';
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
    pickerScreen: { flex: 1, backgroundColor: C.bg },
    pickerScreenHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    pickerScreenTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: C.text },
    pickerSearchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 20,
      marginVertical: 12,
      paddingHorizontal: 14,
      minHeight: 48,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
    },
    pickerSearchInput: { flex: 1, fontSize: 15, color: C.text, paddingVertical: 0 },
    pickerPrefix: { color: C.subtext, fontSize: 13, fontWeight: '600' },
    pickerList: { paddingHorizontal: 20, paddingBottom: 28 },
    pickerListItem: {
      minHeight: 50,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    pickerListItemText: { flex: 1, fontSize: 15, color: C.text },
    pickerListItemSelected: { color: C.primary, fontWeight: '700' },
    pickerEmptyText: { textAlign: 'center', color: C.subtext, marginTop: 28 },
  });
}

export default function EditBirthInfoScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const months = (t('calendar.months') || '').split(',');
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();
  const setNatalChart = useNatalChartStore((s) => s.setChart);
  const clearLuckyDates = useLuckyDatesStore((s) => s.clear);
  const initializeCompanionForUser = useCompanionStore((s) => s.initializeForUser);
  const clearHoroscope = useHoroscopeStore((s) => s.clear);

  const parsedBirthDate = user?.birthDate ? parseLocalDate(user.birthDate) : null;
  const initialBirthPlace = useMemo(() => parseStoredBirthPlace(user), [user]);

  const [birthDate, setBirthDate] = useState<Date | null>(parsedBirthDate);
  const [birthTime, setBirthTime] = useState<string>(user?.birthTime || '');
  const [birthTimeUnknown, setBirthTimeUnknown] = useState<boolean>(
    user?.birthTimeUnknown ?? false
  );
  const [countryCode, setCountryCode] = useState<string>(() => parseStoredBirthCountry(user));
  const [city, setCity] = useState<string>(initialBirthPlace.city);
  const [district, setDistrict] = useState<string>(initialBirthPlace.district);
  const [countrySearch, setCountrySearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [districtSearch, setDistrictSearch] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
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
  const countriesQuery = useLocationCountries();
  const citiesQuery = useLocationCities(countryCode);
  const countries = countriesQuery.data ?? [];
  const cities = citiesQuery.data ?? [];
  const countryName = resolveCountryNameByCode(countryCode, countries) || countryCode;
  const selectedCity = cities.find(
    (item) => normalizeLocationSearchText(item.name) === normalizeLocationSearchText(city)
  );
  const resolvedCity = selectedCity?.name ?? city;
  const districtList = DISTRICTS[resolvedCity] ?? [];

  const normalizedCountrySearch = normalizeLocationSearchText(countrySearch);
  const filteredCountries = countries.filter((country) =>
    !normalizedCountrySearch
    || normalizeLocationSearchText(country.name).includes(normalizedCountrySearch)
    || normalizeLocationSearchText(country.code).includes(normalizedCountrySearch)
  );
  const normalizedCitySearch = normalizeLocationSearchText(citySearch);
  const filteredCities = cities.filter((item) =>
    !normalizedCitySearch || normalizeLocationSearchText(item.name).includes(normalizedCitySearch)
  );
  const normalizedDistrictSearch = normalizeLocationSearchText(districtSearch);
  const filteredDistricts = districtList.filter((item) =>
    !normalizedDistrictSearch || normalizeLocationSearchText(item).includes(normalizedDistrictSearch)
  );

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
    if (!birthDate || !countryCode || !city || (districtList.length > 0 && !district)) {
      Alert.alert(t('birthInfo.missingInfo'), t('birthInfo.missingInfoDesc'));
      return;
    }
    if (!user?.id) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    let profileSaved = false;
    try {
      const zodiacSign = getZodiacSign(birthDate.getMonth() + 1, birthDate.getDate());
      const isFirstTimeBirthDetails = !user?.birthDate;
      const birthLocation = [district, resolvedCity, countryName].filter(Boolean).join(', ');
      const payload = {
        birthDate: toLocalDateString(birthDate),
        birthTime: birthTimeUnknown ? null : birthTime || null,
        birthTimeUnknown,
        birthLocation,
        birthCountry: countryCode,
        birthCity: resolvedCity,
        birthLatitude: selectedCity?.latitude ?? null,
        birthLongitude: selectedCity?.longitude ?? null,
        timezone: selectedCity?.timezone ?? '',
        zodiacSign,
      };
      const res = await updateProfile(payload);
      profileSaved = true;
      const updatedUser = { ...user, ...res.data };
      setUser(updatedUser);
      initializeCompanionForUser(updatedUser);

      const chartResponse = await calculateNatalChart({
        userId: user.id,
        name: user.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : undefined,
        birthDate: toLocalDateString(birthDate),
        birthTime: birthTimeUnknown ? undefined : birthTime || undefined,
        birthLocation,
        timezone: selectedCity?.timezone ?? undefined,
        latitude: selectedCity?.latitude ?? undefined,
        longitude: selectedCity?.longitude ?? undefined,
        locale: (i18n.resolvedLanguage ?? i18n.language ?? 'tr').toLowerCase().startsWith('en') ? 'en' : 'tr',
      });
      setNatalChart(chartResponse.data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      trackProductEvent(ProductEventName.BIRTH_DETAILS_SAVED, buildBirthDetailsProperties({
        birthTime,
        birthTimeUnknown,
        birthLocation,
        zodiacSign,
        isFirstTime: isFirstTimeBirthDetails,
      }));
      setProductUserProperties({
        'Onboarding Status': 'completed',
        'Zodiac Sign': zodiacSign,
        'Has Birth Details': true,
      });
      clearPlannerFullDistributionCache();
      clearHoroscopeCache();
      clearHoroscope();
      clearLuckyDates();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['astrology'] }),
        queryClient.invalidateQueries({ queryKey: ['oracle'] }),
        queryClient.invalidateQueries({ queryKey: ['lucky-dates'] }),
        queryClient.invalidateQueries({ queryKey: ['cosmic'] }),
        queryClient.invalidateQueries({ queryKey: ['dailyTransits'] }),
        queryClient.invalidateQueries({ queryKey: ['dailyActions'] }),
        queryClient.invalidateQueries({ queryKey: ['numerology'] }),
      ]);
      router.replace('/(tabs)/home');
    } catch (err) {
      Alert.alert(
        t('common.error'),
        profileSaved ? t('birthInfo.chartRefreshError') : t('birthInfo.saveError')
      );
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

        {/* Birth Country */}
        <Text style={styles.label}>{t('addPerson.birthCountryLabel')}</Text>
        <TouchableOpacity
          style={styles.inputRow}
          onPress={() => {
            setCountrySearch('');
            setShowCountryPicker(true);
          }}
          accessibilityLabel={t('addPerson.accessibilitySelectCountry')}
          accessibilityRole="button"
        >
          <Ionicons name="globe-outline" size={20} color={colors.primary} />
          <Text style={styles.inputText}>{countryName || t('addPerson.selectCountry')}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.subtext} />
        </TouchableOpacity>

        {/* Birth City */}
        <Text style={styles.label}>{t('addPerson.birthCityLabel')}</Text>
        <TouchableOpacity
          style={styles.inputRow}
          onPress={() => {
            setCitySearch('');
            setShowCityPicker(true);
          }}
          accessibilityLabel={t('addPerson.accessibilitySelectCity')}
          accessibilityRole="button"
        >
          <Ionicons
            name="location-outline"
            size={20}
            color={city ? colors.primary : colors.disabledText}
          />
          <Text style={[styles.inputText, !city && styles.placeholderText]}>
            {resolvedCity || t('addPerson.citySelect')}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.subtext} />
        </TouchableOpacity>

        {/* Birth District */}
        {city && districtList.length > 0 && (
          <>
            <Text style={styles.label}>{t('addPerson.birthDistrictLabel')} *</Text>
            <TouchableOpacity
              style={styles.inputRow}
              onPress={() => {
                setDistrictSearch('');
                setShowDistrictPicker(true);
              }}
              accessibilityLabel={t('addPerson.accessibilitySelectDistrict')}
              accessibilityRole="button"
            >
              <Ionicons
                name="map-outline"
                size={20}
                color={district ? colors.primary : colors.disabledText}
              />
              <Text style={[styles.inputText, !district && styles.placeholderText]}>
                {district || t('addPerson.selectDistrict')}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.subtext} />
            </TouchableOpacity>
          </>
        )}

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

      {/* Country Picker */}
      <Modal visible={showCountryPicker} animationType="slide">
        <SafeScreen>
          <View style={styles.pickerScreen}>
            <View style={styles.pickerScreenHeader}>
              <Text style={styles.pickerScreenTitle}>{t('addPerson.selectCountry')}</Text>
              <TouchableOpacity
                onPress={() => setShowCountryPicker(false)}
                accessibilityLabel={t('addPerson.accessibilityCloseCountry')}
                accessibilityRole="button"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={22} color={colors.subtext} />
              </TouchableOpacity>
            </View>
            <View style={styles.pickerSearchBox}>
              <Ionicons name="search" size={18} color={colors.disabledText} />
              <TextInput
                style={styles.pickerSearchInput}
                value={countrySearch}
                onChangeText={setCountrySearch}
                placeholder={t('addPerson.countrySearch')}
                placeholderTextColor={colors.disabledText}
              />
            </View>
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              contentContainerStyle={styles.pickerList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = item.code === countryCode;
                return (
                  <TouchableOpacity
                    style={styles.pickerListItem}
                    onPress={() => {
                      setCountryCode(item.code);
                      setCity('');
                      setDistrict('');
                      setShowCountryPicker(false);
                      setCitySearch('');
                      setTimeout(() => setShowCityPicker(true), 250);
                    }}
                    accessibilityLabel={t('addPerson.countryItemLabel', { name: item.name })}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.pickerListItemText, selected && styles.pickerListItemSelected]}>
                      {item.name}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.pickerEmptyText}>{t('addPerson.noCountriesFound')}</Text>}
            />
          </View>
        </SafeScreen>
      </Modal>

      {/* City Picker */}
      <Modal visible={showCityPicker} animationType="slide">
        <SafeScreen>
          <View style={styles.pickerScreen}>
            <View style={styles.pickerScreenHeader}>
              <Text style={styles.pickerScreenTitle}>{t('addPerson.selectCity')}</Text>
              <TouchableOpacity
                onPress={() => setShowCityPicker(false)}
                accessibilityLabel={t('addPerson.accessibilityCloseCity')}
                accessibilityRole="button"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={22} color={colors.subtext} />
              </TouchableOpacity>
            </View>
            <View style={styles.pickerSearchBox}>
              <Ionicons name="search" size={18} color={colors.disabledText} />
              <Text style={styles.pickerPrefix}>{countryName}</Text>
              <Text style={{ color: colors.border }}>|</Text>
              <TextInput
                style={styles.pickerSearchInput}
                value={citySearch}
                onChangeText={setCitySearch}
                placeholder={t('addPerson.citySearch')}
                placeholderTextColor={colors.disabledText}
              />
            </View>
            <FlatList
              data={filteredCities}
              keyExtractor={(item) => item.name}
              contentContainerStyle={styles.pickerList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = item.name === city;
                return (
                  <TouchableOpacity
                    style={styles.pickerListItem}
                    onPress={() => {
                      setCity(item.name);
                      setDistrict('');
                      setShowCityPicker(false);
                      if ((DISTRICTS[item.name] ?? []).length > 0) {
                        setDistrictSearch('');
                        setTimeout(() => setShowDistrictPicker(true), 250);
                      }
                    }}
                    accessibilityLabel={t('addPerson.cityItemLabel', { name: item.name })}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.pickerListItemText, selected && styles.pickerListItemSelected]}>
                      {item.name}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.pickerEmptyText}>{t('auth.noCityFound')}</Text>}
            />
          </View>
        </SafeScreen>
      </Modal>

      {/* District Picker */}
      <Modal visible={showDistrictPicker} animationType="slide">
        <SafeScreen>
          <View style={styles.pickerScreen}>
            <View style={styles.pickerScreenHeader}>
              <Text style={styles.pickerScreenTitle}>{resolvedCity} — {t('addPerson.selectDistrict')}</Text>
              <TouchableOpacity
                onPress={() => setShowDistrictPicker(false)}
                accessibilityLabel={t('addPerson.accessibilityCloseDistrict')}
                accessibilityRole="button"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={22} color={colors.subtext} />
              </TouchableOpacity>
            </View>
            <View style={styles.pickerSearchBox}>
              <Ionicons name="search" size={18} color={colors.disabledText} />
              <TextInput
                style={styles.pickerSearchInput}
                value={districtSearch}
                onChangeText={setDistrictSearch}
                placeholder={t('addPerson.districtSearch')}
                placeholderTextColor={colors.disabledText}
              />
            </View>
            <FlatList
              data={filteredDistricts}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.pickerList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = item === district;
                return (
                  <TouchableOpacity
                    style={styles.pickerListItem}
                    onPress={() => {
                      setDistrict(item);
                      setShowDistrictPicker(false);
                    }}
                    accessibilityLabel={t('addPerson.districtItemLabel', { name: item })}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.pickerListItemText, selected && styles.pickerListItemSelected]}>
                      {item}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.pickerEmptyText}>{t('addPerson.noDistrictsFound')}</Text>}
            />
          </View>
        </SafeScreen>
      </Modal>
      </View>
    </SafeScreen>
  );
}
