import React, { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeScreen } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/useAuthStore';
import { useCosmicSummary } from '../../hooks/useHomeQueries';
import { fetchCosmicDayDetail } from '../../services/cosmic.service';
import { useSmartBackNavigation } from '../../hooks/useSmartBackNavigation';
import { AllCategoriesHeader } from '../../components/decision-compass/AllCategoriesHeader';
import {
  AllCategoriesFilters,
} from '../../components/decision-compass/AllCategoriesFilters';
import { AllCategoriesGrid } from '../../components/decision-compass/AllCategoriesGrid';
import { CategoryDetailBottomSheet } from '../../components/decision-compass/CategoryDetailBottomSheet';
import {
  buildAllCategoriesFilterOptions,
  buildCategoryModels,
  isMoonCategory,
  isTransitCategory,
  matchesAllCategoriesFilter,
  type AllCategoriesFilter,
  type DecisionCategoryModel,
} from '../../components/decision-compass/model';
import { getCompassTokens } from '../../components/decision-compass/tokens';

function formatDateShort(input: string | null | undefined, todayLabel: string, locale: string) {
  if (!input) return todayLabel;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return todayLabel;
  return d.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' });
}

function splitCategories(categories: DecisionCategoryModel[]) {
  const regular = categories.filter((item) => !isTransitCategory(item) && !isMoonCategory(item));
  const transit = categories.find(isTransitCategory);
  const moon = categories.find(isMoonCategory);

  const featuredSeed = [
    ...regular.slice(0, 2),
    transit ?? null,
    moon ?? null,
  ].filter(Boolean) as DecisionCategoryModel[];

  const featured: DecisionCategoryModel[] = [];
  for (const item of featuredSeed) {
    if (!featured.some((entry) => entry.id === item.id)) {
      featured.push(item);
    }
  }

  if (featured.length < Math.min(4, categories.length)) {
    for (const item of categories) {
      if (featured.some((entry) => entry.id === item.id)) continue;
      featured.push(item);
      if (featured.length >= 4) break;
    }
  }

  const compact = categories.filter((item) => !featured.some((entry) => entry.id === item.id));
  return { featured, compact };
}

export default function DecisionCompassAllCategoriesScreen() {
  const { colors, isDark } = useTheme();
  const T = getCompassTokens(colors, isDark);
  const { i18n, t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tabBarHeight = React.useContext(BottomTabBarHeightContext);
  const goBack = useSmartBackNavigation({
    fallbackRoute: '/(tabs)/home',
    preferLastTabPath: true,
  });

  const [selectedFilter, setSelectedFilter] = useState<AllCategoriesFilter>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<DecisionCategoryModel | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  const query = useCosmicSummary(
    user?.id
      ? {
          userId: user.id,
          locale: user.preferredLanguage ?? i18n.language,
          userGender: user.gender,
          maritalStatus: user.maritalStatus,
        }
      : null,
  );

  const dayDetailDate = query.data?.date ?? null;
  const dayDetailQuery = useQuery({
    queryKey: [
      'cosmic',
      'day-detail',
      user?.id ?? 0,
      dayDetailDate ?? '',
      user?.preferredLanguage ?? i18n.language,
      user?.gender ?? '',
      user?.maritalStatus ?? '',
    ],
    queryFn: async () => {
      if (!user?.id || !dayDetailDate) throw new Error('missing params');
      const res = await fetchCosmicDayDetail({
        userId: user.id,
        date: dayDetailDate,
        locale: user.preferredLanguage ?? i18n.language,
        gender: user.gender,
        maritalStatus: user.maritalStatus,
      });
      return res.data;
    },
    enabled: !!user?.id && !!dayDetailDate,
    staleTime: 1000 * 60 * 30,
  });

  const categories = useMemo(
    () => buildCategoryModels(query.data?.dailyGuide?.activities, dayDetailQuery.data?.categories),
    [dayDetailQuery.data?.categories, query.data?.dailyGuide?.activities],
  );

  const availableFilters = useMemo(
    () => buildAllCategoriesFilterOptions(categories, t),
    [categories, t],
  );

  React.useEffect(() => {
    if (!availableFilters.some((option) => option.key === selectedFilter)) {
      setSelectedFilter('ALL');
    }
  }, [availableFilters, selectedFilter]);

  const filteredCategories = useMemo(() => {
    return categories.filter((item) => matchesAllCategoriesFilter(item, selectedFilter));
  }, [categories, selectedFilter]);

  const { featured, compact } = useMemo(
    () => splitCategories(filteredCategories),
    [filteredCategories],
  );

  const effectiveTabBarHeight = tabBarHeight ?? (Platform.OS === 'ios' ? 88 : 72);
  const contentBottomPadding = Platform.OS === 'ios'
    ? effectiveTabBarHeight + Math.max(18, insets.bottom > 0 ? 12 : 18)
    : Platform.OS === 'web'
      ? 40
      : 92;
  const contentMaxWidth = Platform.OS === 'web' ? Math.min(920, width - 24) : undefined;
  const gridAvailableWidth = Math.min(contentMaxWidth ?? (width - 40), 520);
  const columnWidth = Math.max(152, Math.floor((gridAvailableWidth - 14) / 2));
  const dateLabel = formatDateShort(query.data?.date, t('decisionCompassScreen.todayLabel'), i18n.language);

  const openCategoryDetail = useCallback((category: DecisionCategoryModel) => {
    setSelectedCategory(category);
    setDetailSheetOpen(true);
  }, []);

  const openDetailScreen = useCallback((category: DecisionCategoryModel) => {
    setDetailSheetOpen(false);
    router.push({
      pathname: '/decision-compass-detail',
      params: {
        categoryKey: category.cosmicCategoryKey ?? category.id,
        label: category.title,
        activityLabel: category.activityLabel,
        score: String(Math.round(category.score)),
        date: query.data?.date ?? '',
      },
    });
  }, [query.data?.date]);

  const S = styles(colors, isDark, T);

  return (
    <SafeScreen edges={['top', 'left', 'right']}>
      <View style={S.container}>
        <LinearGradient colors={T.page.backgroundGradient as [string, string, string]} style={StyleSheet.absoluteFillObject} />
        <LinearGradient pointerEvents="none" colors={T.gradients.pageHaze as [string, string]} style={S.ambientTop} />
        <LinearGradient pointerEvents="none" colors={T.gradients.pagePinkHaze as [string, string]} style={S.ambientBottomRight} />
        <LinearGradient pointerEvents="none" colors={T.gradients.pageBlueHaze as [string, string]} style={S.ambientMidRight} />
        <View pointerEvents="none" style={S.ambientMist} />

        <AllCategoriesHeader
          onBack={goBack}
        />

        <AllCategoriesFilters
          selectedFilter={selectedFilter}
          options={availableFilters}
          onSelectFilter={setSelectedFilter}
        />

        <ScrollView
          style={S.scroll}
          contentContainerStyle={[
            S.scrollContent,
            { paddingBottom: contentBottomPadding },
            contentMaxWidth ? { width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' } : null,
          ]}
          refreshControl={(
            <RefreshControl
              refreshing={query.isRefetching || dayDetailQuery.isRefetching}
              onRefresh={() => {
                void query.refetch();
                void dayDetailQuery.refetch();
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          )}
          showsVerticalScrollIndicator={false}
        >
          {!user?.id ? (
            <View style={S.emptyCard}>
              <Text style={S.emptyTitle}>Kullanıcı bulunamadı</Text>
              <Text style={S.emptyText}>Tüm kategorileri görmek için giriş yapmanız gerekiyor.</Text>
            </View>
          ) : query.isLoading ? (
            <View style={S.emptyCard}>
              <Text style={S.emptyTitle}>Kategoriler yükleniyor…</Text>
              <Text style={S.emptyText}>Bugünün tüm alanları hazırlanıyor.</Text>
            </View>
          ) : query.isError ? (
            <View style={S.emptyCard}>
              <Text style={S.emptyTitle}>Veri alınamadı</Text>
              <Text style={S.emptyText}>Ağ veya servis kaynaklı bir sorun olabilir.</Text>
            </View>
          ) : filteredCategories.length === 0 ? (
            <View style={S.emptyCard}>
              <Text style={S.emptyTitle}>Bu filtrede kategori yok</Text>
              <Text style={S.emptyText}>Farklı bir filtre seçerek tüm alanları tekrar görebilirsiniz.</Text>
            </View>
          ) : (
            <AllCategoriesGrid
              featuredCategories={featured}
              compactCategories={compact}
              columnWidth={columnWidth}
              onPressCategory={openCategoryDetail}
            />
          )}
        </ScrollView>

        <CategoryDetailBottomSheet
          visible={detailSheetOpen && !!selectedCategory}
          onClose={() => setDetailSheetOpen(false)}
          category={selectedCategory}
          dateLabel={dateLabel}
          onOpenCalendar={() => {
            setDetailSheetOpen(false);
            router.push('/(tabs)/calendar');
          }}
          onOpenFullDetail={openDetailScreen}
        />
      </View>
    </SafeScreen>
  );
}

function styles(C: ReturnType<typeof useTheme>['colors'], isDark: boolean, T: ReturnType<typeof getCompassTokens>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    ambientTop: {
      position: 'absolute',
      top: -26,
      left: -58,
      width: 280,
      height: 240,
      borderRadius: 140,
    },
    ambientBottomRight: {
      position: 'absolute',
      right: -40,
      bottom: 90,
      width: 250,
      height: 220,
      borderRadius: 130,
    },
    ambientMidRight: {
      position: 'absolute',
      right: -24,
      top: 240,
      width: 200,
      height: 170,
      borderRadius: 110,
    },
    ambientMist: {
      position: 'absolute',
      top: 194,
      left: 20,
      right: 20,
      height: 160,
      borderRadius: 48,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.36)',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 4,
    },
    emptyCard: {
      marginTop: 18,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: T.border.soft,
      padding: 18,
      backgroundColor: T.surface.glass,
      gap: 6,
      ...T.shadows.soft,
    },
    emptyTitle: {
      color: T.text.title,
      fontSize: 17,
      fontWeight: '800',
      letterSpacing: -0.32,
    },
    emptyText: {
      color: T.text.subtitle,
      fontSize: 13.2,
      lineHeight: 18.8,
      fontWeight: '600',
    },
  });
}
