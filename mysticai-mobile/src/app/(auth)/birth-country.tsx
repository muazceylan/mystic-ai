import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { COUNTRIES } from '../../constants/index';

const COLORS = {
  background: '#FFFFFF',
  text: '#1E1E1E',
  subtext: '#7A7A7A',
  border: '#E6E1EA',
  placeholder: '#B5B5B5',
};

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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lokasyon seç</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={COLORS.subtext} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={COLORS.placeholder} />
        <TextInput
          style={styles.searchInput}
          placeholder="Ülke Seç"
          placeholderTextColor={COLORS.placeholder}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filteredCountries}
        keyExtractor={(item) => item.code}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.listItem} onPress={() => handleSelect(item)}>
            <Text style={styles.listItemText}>{item.name}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Ülke bulunamadı</Text>}
      />
    </View>
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
