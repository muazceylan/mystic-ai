import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { SafeScreen } from '../../../components/ui';
import { useTheme } from '../../../context/ThemeContext';
import {
  CharacterInsightCard,
  EmptyState,
  FavoriteButton,
  MeaningBlock,
  MetadataRow,
  NameTagChip,
  QuranBadge,
  SectionCard,
  SimilarNamesRow,
} from '../../../components/NameModule';
import { getNameDetail, getSimilarNames, type NameListItem } from '../../../services/name.service';
import { useNameFavorites } from '../../../hooks/useNameFavorites';
import { trackEvent } from '../../../services/analytics';

const TURKISH_COMPARE_MAP: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
};

function compactText(value?: string | null): string | null {
  if (!value) return null;
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length > 0 ? compact : null;
}

function normalizeForCompare(value: string): string {
  const lowered = value.toLocaleLowerCase('tr-TR');
  const mapped = lowered
    .split('')
    .map((char) => TURKISH_COMPARE_MAP[char] ?? char)
    .join('');

  return mapped
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasDistinctLongMeaning(meaningShort?: string | null, meaningLong?: string | null): boolean {
  const shortText = compactText(meaningShort);
  const longText = compactText(meaningLong);
  if (!shortText || !longText) return false;

  const shortNormalized = normalizeForCompare(shortText);
  const longNormalized = normalizeForCompare(longText);
  if (!shortNormalized || !longNormalized) return false;

  return shortNormalized !== longNormalized;
}

function isDuplicateText(first?: string | null, second?: string | null): boolean {
  const firstText = compactText(first);
  const secondText = compactText(second);
  if (!firstText || !secondText) return false;

  const firstNormalized = normalizeForCompare(firstText);
  const secondNormalized = normalizeForCompare(secondText);
  if (!firstNormalized || !secondNormalized) return false;

  return (
    firstNormalized === secondNormalized ||
    firstNormalized.startsWith(secondNormalized) ||
    secondNormalized.startsWith(firstNormalized)
  );
}

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
    body: {
      paddingHorizontal: 16,
      paddingBottom: 32,
      gap: 12,
    },
    hero: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: colors.surface,
      padding: 16,
      gap: 10,
    },
    heroTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
    },
    name: {
      color: colors.text,
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '900',
    },
    subtitle: {
      color: colors.subtext,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '600',
    },
    metadata: {
      gap: 8,
      marginTop: 2,
    },
    tagsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    stateWrap: {
      marginTop: 12,
      paddingHorizontal: 16,
    },
    similarTitle: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 4,
    },
  });
}

function detailToListItem(detail: Awaited<ReturnType<typeof getNameDetail>>): NameListItem {
  return {
    id: detail.id,
    name: detail.name,
    normalizedName: detail.normalizedName,
    gender: detail.gender,
    origin: detail.origin,
    meaningShort: detail.meaningShort,
    quranFlag: detail.quranFlag,
    status: detail.status,
    tags: detail.tags,
  };
}

export default function NameDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const tabBarHeight = useBottomTabBarHeight();
  const params = useLocalSearchParams<{ id?: string; source?: string; position?: string }>();
  const nameId = Number(params.id);
  const sourceScreen = typeof params.source === 'string' ? params.source : 'search';

  const favorites = useNameFavorites();

  const detailQuery = useQuery({
    queryKey: ['names', 'detail', nameId],
    queryFn: () => getNameDetail(nameId),
    enabled: Number.isFinite(nameId) && nameId > 0,
  });

  const similarQuery = useQuery({
    queryKey: ['names', 'similar', nameId],
    queryFn: () => getSimilarNames(detailQuery.data!, 10),
    enabled: !!detailQuery.data,
  });

  useEffect(() => {
    if (!detailQuery.data) return;
    trackEvent('name_detail_viewed', {
      name_id: detailQuery.data.id,
      name: detailQuery.data.name,
      origin: detailQuery.data.origin ?? '',
      gender: detailQuery.data.gender ?? '',
      quran_flag: detailQuery.data.quranFlag === true,
      source_screen: sourceScreen,
    });
  }, [detailQuery.data, sourceScreen]);

  const heroMeaning = useMemo(() => {
    if (!detailQuery.data) return null;
    return compactText(detailQuery.data.meaningShort) ?? compactText(detailQuery.data.meaningLong);
  }, [detailQuery.data]);

  const detailedMeaning = useMemo(() => {
    if (!detailQuery.data) return null;
    return hasDistinctLongMeaning(detailQuery.data.meaningShort, detailQuery.data.meaningLong)
      ? compactText(detailQuery.data.meaningLong)
      : null;
  }, [detailQuery.data]);

  const characterTraitsText = useMemo(() => {
    if (!detailQuery.data) return null;
    const candidate = compactText(detailQuery.data.characterTraitsText);
    if (!candidate) return null;
    if (isDuplicateText(candidate, heroMeaning) || isDuplicateText(candidate, detailedMeaning)) {
      return null;
    }
    return candidate;
  }, [detailQuery.data, detailedMeaning, heroMeaning]);

  const letterAnalysisText = useMemo(() => {
    if (!detailQuery.data) return null;
    const candidate = compactText(detailQuery.data.letterAnalysisText);
    if (!candidate) return null;
    if (
      isDuplicateText(candidate, heroMeaning) ||
      isDuplicateText(candidate, detailedMeaning) ||
      isDuplicateText(candidate, characterTraitsText)
    ) {
      return null;
    }
    return candidate;
  }, [characterTraitsText, detailQuery.data, detailedMeaning, heroMeaning]);

  if (!Number.isFinite(nameId) || nameId <= 0) {
    return (
      <SafeScreen edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <View style={styles.stateWrap}>
            <EmptyState title="Geçersiz kayıt" description="İsim detayı açılamadı." actionLabel="Geri Dön" onAction={() => router.back()} />
          </View>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>İsim Detayı</Text>
          <Pressable style={styles.backButton} onPress={() => router.push('/(tabs)/name-favorites')}>
            <Ionicons name="bookmark-outline" size={20} color={colors.text} />
          </Pressable>
        </View>

        {detailQuery.isLoading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : detailQuery.isError || !detailQuery.data ? (
          <View style={styles.stateWrap}>
            <EmptyState
              title="Detay yüklenemedi"
              description="Bağlantı veya servis hatası nedeniyle isim bilgisi alınamadı."
              actionLabel="Tekrar Dene"
              onAction={() => void detailQuery.refetch()}
            />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.body, { paddingBottom: tabBarHeight + 20 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <View style={styles.heroTop}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={styles.name}>{detailQuery.data.name}</Text>
                  <Text style={styles.subtitle}>{detailQuery.data.normalizedName}</Text>
                </View>
                <FavoriteButton
                  isFavorite={favorites.isFavorite(detailQuery.data.id)}
                  onPress={() => {
                    favorites.toggleFavorite(detailToListItem(detailQuery.data));
                    trackEvent(
                      favorites.isFavorite(detailQuery.data.id) ? 'name_unfavorited' : 'name_favorited',
                      {
                        name_id: detailQuery.data.id,
                        name: detailQuery.data.name,
                        source_screen: 'name_detail',
                      }
                    );
                  }}
                />
              </View>

              <MeaningBlock meaningShort={heroMeaning} />

              <View style={styles.metadata}>
                <MetadataRow label="Köken" value={detailQuery.data.origin} />
                <MetadataRow label="Cinsiyet" value={detailQuery.data.gender ?? null} />
                <QuranBadge isQuranic={detailQuery.data.quranFlag} />
              </View>
            </View>

            {detailQuery.data.tags.length > 0 ? (
              <SectionCard title="Etiketler">
                <View style={styles.tagsWrap}>
                  {detailQuery.data.tags.map((tag) => (
                    <NameTagChip key={`${tag.id}-${tag.tagValue}`} label={tag.tagValue} />
                  ))}
                </View>
              </SectionCard>
            ) : null}

            {detailedMeaning ? (
              <SectionCard title="Anlam & Açıklama" collapsible defaultExpanded>
                <MeaningBlock meaningLong={detailedMeaning} />
              </SectionCard>
            ) : null}

            <SectionCard title="Karakter Analizi" collapsible defaultExpanded>
              <CharacterInsightCard
                characterTraitsText={characterTraitsText}
                letterAnalysisText={letterAnalysisText}
              />
            </SectionCard>

            {similarQuery.data && similarQuery.data.length > 0 ? (
              <SectionCard title="Benzer İsimler">
                <Text style={styles.similarTitle}>Öneriler</Text>
                <SimilarNamesRow
                  items={similarQuery.data}
                  onItemPress={(item, index) => {
                    trackEvent('similar_name_clicked', {
                      from_name_id: detailQuery.data.id,
                      to_name_id: item.id,
                      position: index,
                    });
                    router.push({
                      pathname: '/(tabs)/name-detail/[id]',
                      params: { id: String(item.id), source: 'similar' },
                    });
                  }}
                />
              </SectionCard>
            ) : null}
          </ScrollView>
        )}
      </View>
    </SafeScreen>
  );
}
