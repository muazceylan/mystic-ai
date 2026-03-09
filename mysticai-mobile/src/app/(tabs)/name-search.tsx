import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../context/ThemeContext';
import { SafeScreen } from '../../components/ui';
import {
  EmptyState,
  NameCard,
  NameTagChip,
} from '../../components/NameModule';
import { searchNames, type NameGender } from '../../services/name.service';
import { useNameFavorites } from '../../hooks/useNameFavorites';
import { trackEvent } from '../../services/analytics';

type SearchFilters = {
  gender: NameGender | '';
  origin: string;
  quranFlag: boolean | undefined;
  startsWith: string;
  tag: string;
};

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
    searchBar: {
      marginHorizontal: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      paddingVertical: 12,
      fontSize: 15,
    },
    filtersRow: {
      paddingHorizontal: 16,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    filterButton: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    filterButtonText: {
      color: colors.textSoft,
      fontSize: 13,
      fontWeight: '700',
    },
    countText: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '600',
    },
    listWrap: {
      flex: 1,
      paddingHorizontal: 16,
    },
    listContent: {
      paddingBottom: 28,
      gap: 10,
    },
    stateWrap: {
      paddingHorizontal: 16,
      paddingTop: 10,
    },
    pager: {
      marginTop: 10,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    pagerButton: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    pagerButtonText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(7,7,10,0.45)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderBottomWidth: 0,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
    input: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
    },
    groupTitle: {
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      fontWeight: '700',
    },
    chipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },
    modalActionButton: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalActionText: {
      fontSize: 14,
      fontWeight: '800',
    },
  });
}

const TAG_OPTIONS = ['modern', 'classic', 'timeless', 'minimalist', 'quranic', 'nature', 'light', 'wisdom'];

export default function NameSearchScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const tabBarHeight = useBottomTabBarHeight();
  const params = useLocalSearchParams<{ q?: string; tag?: string }>();
  const initialQuery = typeof params.q === 'string' ? params.q : '';
  const initialTag = typeof params.tag === 'string' ? params.tag : '';

  const [queryInput, setQueryInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    gender: '',
    origin: '',
    quranFlag: undefined,
    startsWith: '',
    tag: initialTag,
  });

  const favorites = useNameFavorites();

  const searchQuery = useQuery({
    queryKey: ['names', 'search', query, page, filters],
    queryFn: () => searchNames({
      q: query || undefined,
      page,
      size: 20,
      gender: filters.gender,
      origin: filters.origin || undefined,
      quranFlag: filters.quranFlag,
      startsWith: filters.startsWith || undefined,
    }),
  });

  const content = useMemo(() => {
    const tagToken = filters.tag.trim().toLocaleLowerCase('tr-TR');
    if (!tagToken) return searchQuery.data?.content ?? [];
    return (searchQuery.data?.content ?? []).filter((item) =>
      (item.tags ?? []).some((tag) => tag.tagValue.toLocaleLowerCase('tr-TR') === tagToken)
    );
  }, [searchQuery.data?.content, filters.tag]);

  useEffect(() => {
    trackEvent('name_module_opened', {
      entry_point: 'name_landing',
      screen: 'name_search',
    });
  }, []);

  useEffect(() => {
    if (!query && !filters.tag) return;
    trackEvent('name_search_performed', {
      query,
      query_length: query.length,
      active_filter_count: Number(Boolean(filters.gender)) + Number(Boolean(filters.origin)) + Number(filters.quranFlag !== undefined) + Number(Boolean(filters.startsWith)) + Number(Boolean(filters.tag)),
      result_count: content.length,
    });
  }, [query, filters, content.length]);

  const activeFilterLabels = [
    filters.gender ? `gender:${filters.gender}` : null,
    filters.origin ? `origin:${filters.origin}` : null,
    filters.quranFlag === true ? 'quran:true' : filters.quranFlag === false ? 'quran:false' : null,
    filters.startsWith ? `starts:${filters.startsWith}` : null,
    filters.tag ? `tag:${filters.tag}` : null,
  ].filter((item): item is string => !!item);

  const resetFilters = () => {
    setFilters({
      gender: '',
      origin: '',
      quranFlag: undefined,
      startsWith: '',
      tag: '',
    });
    setPage(0);
  };

  return (
    <SafeScreen edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>İsim Arama</Text>
          <Pressable style={styles.backButton} onPress={() => router.push('/(tabs)/name-favorites')}>
            <Ionicons name="heart-outline" size={20} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.subtext} />
          <TextInput
            value={queryInput}
            onChangeText={setQueryInput}
            onSubmitEditing={() => {
              setQuery(queryInput.trim());
              setPage(0);
            }}
            placeholder="İsim ara"
            placeholderTextColor={colors.subtext}
            style={styles.searchInput}
          />
          <Pressable
            onPress={() => {
              setQuery(queryInput.trim());
              setPage(0);
            }}
          >
            <Ionicons name="arrow-forward-circle" size={22} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.filtersRow}>
          <Pressable style={styles.filterButton} onPress={() => setShowFilters(true)}>
            <Ionicons name="options-outline" size={16} color={colors.textSoft} />
            <Text style={styles.filterButtonText}>Filtreler</Text>
          </Pressable>
          {activeFilterLabels.map((label) => <NameTagChip key={label} label={label} />)}
          <Text style={styles.countText}>{searchQuery.data?.totalElements ?? 0} sonuç</Text>
        </View>

        <View style={styles.listWrap}>
          {searchQuery.isLoading ? (
            <View style={styles.stateWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : searchQuery.isError ? (
            <View style={styles.stateWrap}>
              <EmptyState
                title="Veri alınamadı"
                description="Bağlantıyı kontrol edip tekrar deneyin."
                actionLabel="Tekrar Dene"
                onAction={() => void searchQuery.refetch()}
              />
            </View>
          ) : content.length === 0 ? (
            <View style={styles.stateWrap}>
              <EmptyState
                title="Sonuç bulunamadı"
                description="Aramayı değiştirin veya filtreleri sıfırlayın."
                actionLabel="Filtreleri Temizle"
                onAction={resetFilters}
              />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 16 }]}
              showsVerticalScrollIndicator={false}
            >
              {content.map((item, index) => (
                <NameCard
                  key={item.id}
                  item={item}
                  isFavorite={favorites.isFavorite(item.id)}
                  onToggleFavorite={() => {
                    favorites.toggleFavorite(item);
                    trackEvent(favorites.isFavorite(item.id) ? 'name_unfavorited' : 'name_favorited', {
                      name_id: item.id,
                      name: item.name,
                      source_screen: 'name_search',
                      position: index,
                    });
                  }}
                  onPress={() => {
                    router.push({ pathname: '/(tabs)/name-detail/[id]', params: { id: String(item.id), source: 'search' } });
                  }}
                />
              ))}

              {searchQuery.data && searchQuery.data.totalPages > 1 ? (
                <View style={styles.pager}>
                  <Pressable
                    style={styles.pagerButton}
                    disabled={page === 0}
                    onPress={() => setPage((prev) => Math.max(0, prev - 1))}
                  >
                    <Text style={styles.pagerButtonText}>Önceki</Text>
                  </Pressable>
                  <Text style={styles.countText}>
                    Sayfa {page + 1}/{Math.max(1, searchQuery.data.totalPages)}
                  </Text>
                  <Pressable
                    style={styles.pagerButton}
                    disabled={page >= searchQuery.data.totalPages - 1}
                    onPress={() => setPage((prev) => prev + 1)}
                  >
                    <Text style={styles.pagerButtonText}>Sonraki</Text>
                  </Pressable>
                </View>
              ) : null}
            </ScrollView>
          )}
        </View>

        <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Filtreler</Text>

              <Text style={[styles.groupTitle, { color: colors.subtext }]}>Cinsiyet</Text>
              <View style={styles.chipsWrap}>
                {(['', 'MALE', 'FEMALE', 'UNISEX'] as const).map((gender) => (
                  <NameTagChip
                    key={gender || 'all'}
                    label={gender || 'Tümü'}
                    selected={filters.gender === gender}
                    onPress={() => setFilters((prev) => ({ ...prev, gender }))}
                  />
                ))}
              </View>

              <Text style={[styles.groupTitle, { color: colors.subtext }]}>Köken</Text>
              <TextInput
                value={filters.origin}
                onChangeText={(origin) => setFilters((prev) => ({ ...prev, origin }))}
                placeholder="örn: Arapça"
                placeholderTextColor={colors.subtext}
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
              />

              <Text style={[styles.groupTitle, { color: colors.subtext }]}>Harfle Başlama</Text>
              <TextInput
                value={filters.startsWith}
                onChangeText={(startsWith) => setFilters((prev) => ({ ...prev, startsWith }))}
                placeholder="örn: E"
                placeholderTextColor={colors.subtext}
                autoCapitalize="characters"
                maxLength={1}
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
              />

              <Text style={[styles.groupTitle, { color: colors.subtext }]}>Tag</Text>
              <View style={styles.chipsWrap}>
                {TAG_OPTIONS.map((tag) => (
                  <NameTagChip
                    key={tag}
                    label={tag}
                    selected={filters.tag === tag}
                    onPress={() => setFilters((prev) => ({ ...prev, tag: prev.tag === tag ? '' : tag }))}
                  />
                ))}
              </View>

              <View style={styles.switchRow}>
                <Text style={{ color: colors.textSoft, fontSize: 14, fontWeight: '600' }}>Kur&apos;an&apos;da geçiyor</Text>
                <Switch
                  value={filters.quranFlag === true}
                  onValueChange={(enabled) => setFilters((prev) => ({ ...prev, quranFlag: enabled ? true : undefined }))}
                />
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalActionButton, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }]}
                  onPress={() => {
                    resetFilters();
                    setShowFilters(false);
                  }}
                >
                  <Text style={[styles.modalActionText, { color: colors.text }]}>Sıfırla</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalActionButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setPage(0);
                    setShowFilters(false);
                    trackEvent('filter_applied', {
                      filters: activeFilterLabels.join(','),
                      filter_count: activeFilterLabels.length,
                      query_present: Boolean(query),
                      result_count: content.length,
                    });
                  }}
                >
                  <Text style={[styles.modalActionText, { color: colors.white }]}>Uygula</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeScreen>
  );
}
