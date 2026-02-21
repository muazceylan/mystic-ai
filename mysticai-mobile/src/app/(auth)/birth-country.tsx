import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { COUNTRIES } from '../../constants/index';
import { useTheme } from '../../context/ThemeContext';
import { SafeScreen } from '../../components/ui';

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
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
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: C.text,
    },
    listItem: {
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
}

export default function BirthCountryScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const store = useOnboardingStore();
  const [search, setSearch] = useState('');
  const styles = makeStyles(colors);

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
        <Text style={styles.headerTitle}>{t('auth.selectLocation')}</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel="Geri dön"
          accessibilityRole="button"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={22} color={colors.subtext} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.disabledText} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('auth.selectCountry')}
          placeholderTextColor={colors.disabledText}
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
