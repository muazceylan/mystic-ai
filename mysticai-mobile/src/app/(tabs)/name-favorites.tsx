import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { SafeScreen } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { EmptyState, NameCard } from '../../components/NameModule';
import { useNameFavorites } from '../../hooks/useNameFavorites';
import { trackEvent } from '../../services/analytics';

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 18,
      paddingBottom: 10,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    count: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '700',
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    listContent: {
      gap: 10,
      paddingBottom: 14,
    },
    stateWrap: {
      marginTop: 12,
    },
  });
}

export default function NameFavoritesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const tabBarHeight = useBottomTabBarHeight();
  const favorites = useNameFavorites();

  useEffect(() => {
    trackEvent('name_module_opened', {
      entry_point: 'name_landing',
      screen: 'name_favorites',
    });
  }, []);

  return (
    <SafeScreen edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Favorilerim</Text>
          <Text style={styles.count}>{favorites.favorites.length}</Text>
        </View>

        <View style={styles.content}>
          {favorites.isLoading ? (
            <View style={styles.stateWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : favorites.favorites.length === 0 ? (
            <View style={styles.stateWrap}>
              <EmptyState
                title="Henüz favori yok"
                description="Beğendiğin isimleri kaydedip burada hızlıca tekrar açabilirsin."
                actionLabel="İsim Ara"
                onAction={() => router.push('/(tabs)/name-search')}
              />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 16 }]}
              showsVerticalScrollIndicator={false}
            >
              {favorites.favorites.map((item, index) => (
                <NameCard
                  key={item.id}
                  item={item}
                  isFavorite
                  onToggleFavorite={() => {
                    favorites.removeFavorite(item.id);
                    trackEvent('name_unfavorited', {
                      name_id: item.id,
                      name: item.name,
                      source_screen: 'name_favorites',
                    });
                  }}
                  onPress={() => {
                    trackEvent('name_detail_viewed', {
                      name_id: item.id,
                      name: item.name,
                      origin: item.origin ?? '',
                      gender: item.gender ?? '',
                      quran_flag: item.quranFlag === true,
                      source_screen: 'name_favorites',
                    });
                    router.push({
                      pathname: '/(tabs)/name-detail/[id]',
                      params: { id: String(item.id), source: 'favorites', position: String(index) },
                    });
                  }}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </SafeScreen>
  );
}
