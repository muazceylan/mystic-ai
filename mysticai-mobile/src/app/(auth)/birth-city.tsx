import { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../../components/OnboardingBackground';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { CITIES, COUNTRIES, DISTRICTS } from '../../constants/index';
import { useTheme } from '../../context/ThemeContext';
import { SafeScreen } from '../../components/ui';

type ScreenView = 'city-list' | 'district-list' | 'summary';

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  const listStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.surface,
      paddingHorizontal: 20,
      paddingTop: 18,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: C.text,
    },
    skipText: {
      fontSize: 14,
      fontWeight: '600',
      color: C.primary,
      paddingHorizontal: 4,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
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
      gap: 8,
    },
    countryPrefix: {
      fontSize: 14,
      color: C.text,
      fontWeight: '600',
    },
    separator: {
      color: C.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: C.text,
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    listItemText: {
      fontSize: 15,
      color: C.text,
    },
    emptyText: {
      textAlign: 'center',
      color: C.subtext,
      marginTop: 20,
    },
  });

  const summaryStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
      paddingHorizontal: 24,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: C.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: C.subtext,
      textAlign: 'center',
      marginBottom: 24,
    },
    input: {
      width: '100%',
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    inputText: {
      fontSize: 16,
      color: C.text,
    },
    placeholder: {
      color: C.disabledText,
    },
    districtHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
      paddingVertical: 6,
    },
    districtHintText: {
      fontSize: 13,
      color: C.primary,
      fontWeight: '500',
    },
    footer: {
      flexDirection: 'row',
      gap: 12,
      paddingBottom: 32,
    },
    outlineButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: C.primary,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: C.surface,
    },
    outlineText: {
      color: C.primary,
      fontSize: 15,
      fontWeight: '600',
    },
    primaryButton: {
      flex: 1,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: C.primary,
    },
    primaryDisabled: {
      backgroundColor: C.disabled,
    },
    primaryText: {
      color: C.white,
      fontSize: 15,
      fontWeight: '600',
    },
    primaryTextDisabled: {
      color: C.disabledText,
    },
  });

  return { listStyles, styles: summaryStyles };
}

export default function BirthCityScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const store = useOnboardingStore();
  const { listStyles, styles } = makeStyles(colors);

  const hasCity = Boolean(store.birthCity || store.birthCityManual);
  const [view, setView] = useState<ScreenView>(hasCity ? 'summary' : 'city-list');
  const [citySearch, setCitySearch] = useState('');
  const [districtSearch, setDistrictSearch] = useState('');
  const [pendingCity, setPendingCity] = useState<{ name: string; timezone: string } | null>(null);

  const cities = CITIES[store.birthCountry] || CITIES.default;
  const countryName = useMemo(
    () => COUNTRIES.find((c) => c.code === store.birthCountry)?.name || t('auth.country'),
    [store.birthCountry, t]
  );

  const filteredCities = cities.filter((c) =>
    c.name.toLowerCase().includes(citySearch.toLowerCase())
  );

  const districtList = pendingCity ? (DISTRICTS[pendingCity.name] ?? []) : [];
  const filteredDistricts = districtList.filter((d) =>
    d.toLowerCase().includes(districtSearch.toLowerCase())
  );

  // City selected → save it, then open district list if available
  const handleCitySelect = (city: typeof cities[0]) => {
    store.setBirthCity(city.name);
    store.setTimezone(city.timezone);
    store.setBirthDistrict(''); // reset district when city changes
    const districts = DISTRICTS[city.name];
    if (districts && districts.length > 0) {
      setPendingCity(city);
      setDistrictSearch('');
      setView('district-list');
    } else {
      setPendingCity(null);
      setView('summary');
    }
  };

  // District selected
  const handleDistrictSelect = (district: string) => {
    store.setBirthDistrict(district);
    setView('summary');
  };

  // Skip district
  const handleSkipDistrict = () => {
    store.setBirthDistrict('');
    setView('summary');
  };

  const handleCloseCityList = () => {
    if (hasCity) { setView('summary'); return; }
    router.back();
  };

  // ─── City list view ──────────────────────────────────────────────────────────
  if (view === 'city-list') {
    return (
      <SafeScreen>
        <View style={listStyles.container}>
        <View style={listStyles.header}>
          <Text style={listStyles.headerTitle}>{t('auth.selectCity')}</Text>
          <TouchableOpacity
            onPress={handleCloseCityList}
            accessibilityLabel="Kapat"
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={22} color={colors.subtext} />
          </TouchableOpacity>
        </View>

        <View style={listStyles.searchContainer}>
          <Ionicons name="search" size={18} color={colors.disabledText} />
          <Text style={listStyles.countryPrefix}>{countryName}</Text>
          <Text style={listStyles.separator}>|</Text>
          <TextInput
            style={listStyles.searchInput}
            placeholder={t('auth.citySearch')}
            placeholderTextColor={colors.disabledText}
            value={citySearch}
            onChangeText={setCitySearch}
            autoFocus
          />
          {citySearch.length > 0 && (
            <TouchableOpacity
              onPress={() => setCitySearch('')}
              accessibilityLabel="Aramayı temizle"
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={18} color={colors.disabledText} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={filteredCities}
          keyExtractor={(item) => item.name}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={listStyles.listItem}
              onPress={() => handleCitySelect(item)}
              accessibilityLabel={`${item.name} şehrini seç`}
              accessibilityRole="button"
            >
              <Text style={listStyles.listItemText}>{item.name}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.disabledText} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={listStyles.emptyText}>{t('auth.noCityFound')}</Text>}
        />
        </View>
      </SafeScreen>
    );
  }

  // ─── District list view ──────────────────────────────────────────────────────
  if (view === 'district-list') {
    return (
      <SafeScreen>
        <View style={listStyles.container}>
        <View style={listStyles.header}>
          <TouchableOpacity
            onPress={() => setView('city-list')}
            style={{ padding: 2 }}
            accessibilityLabel="Şehir listesine dön"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[listStyles.headerTitle, { flex: 1, marginLeft: 8 }]}>
            {pendingCity?.name} — {t('auth.districtSelect')}
          </Text>
            <TouchableOpacity
              onPress={handleSkipDistrict}
              accessibilityLabel="İlçe seçmeden atla"
              accessibilityRole="button"
            >
            <Text style={listStyles.skipText}>{t('auth.skip')}</Text>
          </TouchableOpacity>
        </View>

        <View style={listStyles.searchContainer}>
          <Ionicons name="search" size={18} color={colors.disabledText} />
          <TextInput
            style={listStyles.searchInput}
            placeholder={t('auth.districtSearch')}
            placeholderTextColor={colors.disabledText}
            value={districtSearch}
            onChangeText={setDistrictSearch}
            autoFocus
          />
          {districtSearch.length > 0 && (
            <TouchableOpacity
              onPress={() => setDistrictSearch('')}
              accessibilityLabel="Aramayı temizle"
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={18} color={colors.disabledText} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={filteredDistricts}
          keyExtractor={(item) => item}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={listStyles.listItem}
              onPress={() => handleDistrictSelect(item)}
              accessibilityLabel={`${item} ilçesini seç`}
              accessibilityRole="button"
            >
              <Text style={listStyles.listItemText}>{item}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={listStyles.emptyText}>{t('auth.noDistrictFound')}</Text>}
        />
        </View>
      </SafeScreen>
    );
  }

  // ─── Summary view ────────────────────────────────────────────────────────────
  const cityLabel = store.birthCity || store.birthCityManual || '';
  const locationLabel = cityLabel
    ? `${countryName}, ${cityLabel}${store.birthDistrict ? `, ${store.birthDistrict}` : ''}`
    : t('auth.countryCityPlaceholder');
  const canContinue = Boolean(store.birthCity || store.birthCityManual);

  return (
    <SafeScreen>
      <View style={styles.container}>
        <OnboardingBackground />

        <View style={styles.content}>
          <Text style={styles.title}>{t('auth.birthLocationTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.birthLocationSubtitle')}
        </Text>

        <TouchableOpacity style={styles.input} onPress={() => { setCitySearch(''); setView('city-list'); }}>
          <Text style={[styles.inputText, !canContinue && styles.placeholder]}>{locationLabel}</Text>
        </TouchableOpacity>

        {canContinue && !store.birthDistrict && (DISTRICTS[store.birthCity] ?? []).length > 0 && (
          <TouchableOpacity
            style={styles.districtHint}
            onPress={() => {
              const city = cities.find(c => c.name === store.birthCity);
              if (city) {
                setPendingCity(city);
                setDistrictSearch('');
                setView('district-list');
              }
            }}
          >
            <Ionicons name="location-outline" size={14} color={colors.primary} />
            <Text style={styles.districtHintText}>{t('auth.districtOptional')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.outlineButton} onPress={() => router.back()}>
          <Text style={styles.outlineText}>{t('common.back')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, !canContinue && styles.primaryDisabled]}
          disabled={!canContinue}
          onPress={() => router.push('/gender')}
        >
          <Text style={[styles.primaryText, !canContinue && styles.primaryTextDisabled]}>
            {t('common.continue')}
          </Text>
        </TouchableOpacity>
      </View>
      </View>
    </SafeScreen>
  );
}
