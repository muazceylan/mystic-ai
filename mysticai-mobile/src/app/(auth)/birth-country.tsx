import { useState } from 'react';
import { View, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../../components/OnboardingBackground';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { COUNTRIES } from '../../constants/index';
import { useTheme } from '../../context/ThemeContext';
import { AppText, SafeScreen, TextField } from '../../components/ui';

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
    searchField: {
      backgroundColor: C.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      shadowColor: C.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
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
    store.setBirthCity('');
    store.setBirthCityManual('');
    store.setBirthDistrict('');
    router.push('/(auth)/birth-city');
  };

  return (
    <SafeScreen>
      <View style={styles.container}>
        <OnboardingBackground />
        <View style={styles.header}>
          <AppText variant="H3" style={styles.headerTitle}>
            {t('auth.selectLocation')}
          </AppText>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityLabel={t('editBirthInfo.accessibilityBack')}
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={22} color={colors.subtext} />
          </TouchableOpacity>
        </View>

        <TextField
          value={search}
          onChangeText={setSearch}
          placeholder={t('auth.selectCountry')}
          leftIcon="search"
          style={{ marginBottom: 8 }}
          fieldStyle={styles.searchField}
        />

        <FlatList
          data={filteredCountries}
          keyExtractor={(item) => item.code}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.listItem}
              onPress={() => handleSelect(item)}
              accessibilityLabel={t('auth.selectCountryItem', { name: item.name })}
              accessibilityRole="button"
            >
              <AppText variant="Body" style={styles.listItemText}>
                {item.name}
              </AppText>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <AppText variant="Small" color="secondary" align="center" style={styles.emptyText}>
              {t('auth.noCountryFound')}
            </AppText>
          }
        />
      </View>
    </SafeScreen>
  );
}
