import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { COUNTRIES } from '../../constants/index';
import { COLORS } from '../../constants/colors';
import { SafeScreen } from '../../components/ui';

export default function BirthCountryScreen() {
  const store = useOnboardingStore();
  const [search, setSearch] = useState('');

  const filteredCountries = COUNTRIES.filter((country) =>
    country.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (country: typeof COUNTRIES[0]) => {
    store.setBirthCountry(country.code);
    router.push('/birth-city');
  };

  return (
    <SafeScreen>
      <View style={styles.container}>
        <View style={styles.header}>
        <Text style={styles.headerTitle}>Lokasyon seç</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel="Geri dön"
          accessibilityRole="button"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={22} color={COLORS.subtext} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={COLORS.disabledText} />
        <TextInput
          style={styles.searchInput}
          placeholder="Ülke Seç"
          placeholderTextColor={COLORS.disabledText}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filteredCountries}
        keyExtractor={(item) => item.code}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => handleSelect(item)}
            accessibilityLabel={`${item.name} ülkesini seç`}
            accessibilityRole="button"
          >
            <Text style={styles.listItemText}>{item.name}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Ülke bulunamadı</Text>}
      />
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  listItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
