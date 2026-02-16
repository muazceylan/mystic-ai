import { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import OnboardingBackground from '../../components/OnboardingBackground';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { CITIES, COUNTRIES } from '../../constants/index';

const COLORS = {
  background: '#F9F7FB',
  text: '#1E1E1E',
  subtext: '#7A7A7A',
  border: '#E6E1EA',
  primary: '#9D4EDD',
  disabled: '#E5E5E5',
  disabledText: '#B5B5B5',
};

export default function BirthCityScreen() {
  const store = useOnboardingStore();
  const [search, setSearch] = useState('');
  const [showList, setShowList] = useState(!store.birthCity && !store.birthCityManual);

  const cities = CITIES[store.birthCountry] || CITIES.default;
  const countryName = useMemo(() => {
    return COUNTRIES.find((c) => c.code === store.birthCountry)?.name || 'Ülke';
  }, [store.birthCountry]);

  const filteredCities = cities.filter((city) =>
    city.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (city: typeof cities[0]) => {
    store.setBirthCity(city.name);
    store.setTimezone(city.timezone);
    setShowList(false);
  };

  const handleCloseList = () => {
    if (store.birthCity || store.birthCityManual) {
      setShowList(false);
      return;
    }
    router.back();
  };

  if (showList) {
    return (
      <View style={listStyles.container}>
        <View style={listStyles.header}>
          <Text style={listStyles.headerTitle}>Lokasyon seç</Text>
          <TouchableOpacity onPress={handleCloseList}>
            <Ionicons name="close" size={22} color={COLORS.subtext} />
          </TouchableOpacity>
        </View>

        <View style={listStyles.searchContainer}>
          <Ionicons name="search" size={18} color={COLORS.disabledText} />
          <Text style={listStyles.countryPrefix}>{countryName}</Text>
          <Text style={listStyles.separator}>|</Text>
          <TextInput
            style={listStyles.searchInput}
            placeholder="Şehir Seç"
            placeholderTextColor={COLORS.disabledText}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close" size={18} color={COLORS.disabledText} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={filteredCities}
          keyExtractor={(item) => item.name}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={listStyles.listItem} onPress={() => handleSelect(item)}>
              <Text style={listStyles.listItemText}>{item.name}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={listStyles.emptyText}>Şehir bulunamadı</Text>}
        />
      </View>
    );
  }

  const locationLabel = store.birthCity || store.birthCityManual
    ? `${countryName}, ${store.birthCity || store.birthCityManual}`
    : 'Ülke, Şehir';
  const canContinue = Boolean(store.birthCity || store.birthCityManual);

  return (
    <View style={styles.container}>
      <OnboardingBackground />

      <View style={styles.content}>
        <Text style={styles.title}>Doğum Yeriniz?</Text>
        <Text style={styles.subtitle}>
          Doğduğunuz ülke, il ve ilçeyi seçebilirsiniz.
        </Text>

        <TouchableOpacity style={styles.input} onPress={() => setShowList(true)}>
          <Text style={[styles.inputText, !canContinue && styles.placeholder]}>{locationLabel}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.outlineButton} onPress={() => router.back()}>
          <Text style={styles.outlineText}>Geri</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, !canContinue && styles.primaryDisabled]}
          disabled={!canContinue}
          onPress={() => router.push('/gender')}
        >
          <Text style={[styles.primaryText, !canContinue && styles.primaryTextDisabled]}>
            Devam Et
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const listStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    color: COLORS.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 8,
  },
  countryPrefix: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  separator: {
    color: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  listItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  listItemText: {
    fontSize: 15,
    color: COLORS.text,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.subtext,
    marginTop: 20,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.subtext,
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  inputText: {
    fontSize: 16,
    color: COLORS.text,
  },
  placeholder: {
    color: COLORS.disabledText,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 32,
  },
  outlineButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  outlineText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  primaryDisabled: {
    backgroundColor: COLORS.disabled,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  primaryTextDisabled: {
    color: COLORS.disabledText,
  },
});
