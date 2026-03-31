import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, useLocalSearchParams, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeScreen, useBottomTabBarOffset } from '../components/ui';
import { BottomSheet } from '../components/ui/BottomSheet';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { useCosmicSummary } from '../hooks/useHomeQueries';
import { fetchCosmicDayDetail } from '../services/cosmic.service';
import { useDecisionCompassStore } from '../store/useDecisionCompassStore';
import {
  DECISION_COMPASS_TUTORIAL_TARGET_KEYS,
  SpotlightTarget,
  TUTORIAL_SCREEN_KEYS,
  useTutorialTrigger,
} from '../features/tutorial';
import { useSmartBackNavigation } from '../hooks/useSmartBackNavigation';
import { DecisionCompassHeader } from '../components/decision-compass/DecisionCompassHeader';
import { DecisionCompassFilters } from '../components/decision-compass/DecisionCompassFilters';
import { DecisionInsightHero } from '../components/decision-compass/DecisionInsightHero';
import { FeaturedCategoryRow } from '../components/decision-compass/FeaturedCategoryRow';
import { CategoryMiniGrid } from '../components/decision-compass/CategoryMiniGrid';
import { CategoryDetailBottomSheet } from '../components/decision-compass/CategoryDetailBottomSheet';
import {
  buildDecisionCompassFilterOptions,
  buildCategoryModels,
  buildHeroModel,
  matchesCompassFilter,
  type CompassFilter,
  type DecisionCategoryModel,
} from '../components/decision-compass/model';
import { statusColors } from '../components/decision-compass/palette';
import { getCompassTokens } from '../components/decision-compass/tokens';

function formatDateShort(input: string | null | undefined, todayLabel: string, locale: string) {
  if (!input) return todayLabel;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return todayLabel;
  return d.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' });
}

export default function DecisionCompassScreen() {
  const { colors, isDark } = useTheme();
  const T = getCompassTokens(colors, isDark);
  const { i18n, t } = useTranslation();
  const { width } = useWindowDimensions();
  const segments = useSegments();
  const isFocused = useIsFocused();
  const params = useLocalSearchParams<{ from?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const { tabBarHeight } = useBottomTabBarOffset();
  const user = useAuthStore((s) => s.user);
  const hiddenCategoryKeys = useDecisionCompassStore((s) => s.hiddenCategoryKeys);
  const setCategoryVisibility = useDecisionCompassStore((s) => s.setCategoryVisibility);
  const resetHiddenCategories = useDecisionCompassStore((s) => s.resetHiddenCategories);

  const goBack = useSmartBackNavigation({
    fallbackRoute: '/(tabs)/home',
    preferLastTabPath: true,
  });
  const { trigger: triggerTutorial, triggerInitial: triggerInitialTutorials } = useTutorialTrigger(
    TUTORIAL_SCREEN_KEYS.DECISION_COMPASS,
  );
  const tutorialBootstrapRef = useRef<string | null>(null);

  const [selectedFilter, setSelectedFilter] = useState<CompassFilter>('ALL');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DecisionCategoryModel | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);

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

  React.useEffect(() => {
    if (query.data?.date) {
      setSelectedDate((prev) => prev ?? query.data.date);
    }
  }, [query.data?.date]);

  const detailDate = selectedDate ?? query.data?.date;
  const dayDetailQuery = useQuery({
    queryKey: [
      'cosmic',
      'day-detail',
      user?.id ?? 0,
      detailDate ?? '',
      user?.preferredLanguage ?? i18n.language,
      user?.gender ?? '',
      user?.maritalStatus ?? '',
    ],
    queryFn: async () => {
      if (!user?.id || !detailDate) throw new Error('missing params');
      const res = await fetchCosmicDayDetail({
        userId: user.id,
        date: detailDate,
        locale: user.preferredLanguage ?? i18n.language,
        gender: user.gender,
        maritalStatus: user.maritalStatus,
      });
      return res.data;
    },
    enabled: !!user?.id && !!detailDate,
    staleTime: 1000 * 60 * 30,
  });

  const categories = useMemo(
    () => buildCategoryModels(query.data?.dailyGuide?.activities, dayDetailQuery.data?.categories),
    [dayDetailQuery.data?.categories, query.data?.dailyGuide?.activities],
  );

  const visibleCategories = useMemo(
    () => categories.filter((item) => !hiddenCategoryKeys.includes(item.id)),
    [categories, hiddenCategoryKeys],
  );

  const availableFilters = useMemo(
    () => buildDecisionCompassFilterOptions(visibleCategories, t),
    [visibleCategories, t],
  );

  React.useEffect(() => {
    if (!availableFilters.some((option) => option.key === selectedFilter)) {
      setSelectedFilter('ALL');
    }
  }, [availableFilters, selectedFilter]);

  const filteredCategories = useMemo(() => {
    return visibleCategories.filter((item) => matchesCompassFilter(item, selectedFilter));
  }, [selectedFilter, visibleCategories]);

  const featuredCategories = useMemo(
    () => filteredCategories.slice(0, Math.min(3, filteredCategories.length)),
    [filteredCategories],
  );

  const remainingCategories = useMemo(
    () => filteredCategories.filter((item) => !featuredCategories.some((featured) => featured.id === item.id)),
    [featuredCategories, filteredCategories],
  );

  const heroModel = useMemo(() => buildHeroModel(visibleCategories), [visibleCategories]);
  const strongestCategory = visibleCategories[0] ?? null;

  const dateLabel = formatDateShort(selectedDate ?? query.data?.date, t('decisionCompassScreen.todayLabel'), i18n.language);
  const isInTabFlow = segments[0] === '(tabs)';

  const effectiveTabBarHeight = isInTabFlow ? tabBarHeight : 0;
  const contentBottomPadding = Platform.OS === 'ios'
    ? effectiveTabBarHeight + Math.max(18, insets.bottom > 0 ? 12 : 18)
    : Platform.OS === 'web'
      ? 40
      : 92;

  const contentMaxWidth = Platform.OS === 'web' ? Math.min(900, width - 24) : undefined;

  React.useEffect(() => {
    if (!isFocused) return;

    if (!isInTabFlow) {
      const fromParam = Array.isArray(params.from) ? params.from[0] : params.from;
      router.replace({
        pathname: '/(tabs)/decision-compass-tab',
        params: typeof fromParam === 'string' && fromParam.startsWith('/') ? { from: fromParam } : undefined,
      } as never);
    }
  }, [isFocused, isInTabFlow, params.from]);

  React.useEffect(() => {
    if (selectedCategory && !visibleCategories.some((item) => item.id === selectedCategory.id)) {
      setSelectedCategory(null);
      setDetailSheetOpen(false);
    }
  }, [selectedCategory, visibleCategories]);

  React.useEffect(() => {
    const scope = user?.id ? String(user.id) : null;
    if (!scope) {
      tutorialBootstrapRef.current = null;
      return;
    }

    if (tutorialBootstrapRef.current === scope) {
      return;
    }

    tutorialBootstrapRef.current = scope;
    void triggerInitialTutorials();
  }, [triggerInitialTutorials, user?.id]);

  const openCategoryDetail = useCallback((category: DecisionCategoryModel) => {
    setSettingsSheetOpen(false);
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
        date: selectedDate ?? query.data?.date ?? '',
      },
    });
  }, [query.data?.date, selectedDate]);

  const handlePressTutorialHelp = useCallback(() => {
    void triggerTutorial('manual_reopen');
  }, [triggerTutorial]);

  const S = makeStyles(colors, isDark, T);

  if (!isInTabFlow) {
    return (
      <SafeScreen edges={['top', 'left', 'right']}>
        <View style={{ flex: 1 }} />
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edges={['top', 'left', 'right']}>
      <View style={S.container}>
        <LinearGradient colors={T.page.backgroundGradient as [string, string, string]} style={StyleSheet.absoluteFillObject} />
        <LinearGradient pointerEvents="none" colors={T.gradients.pageHaze as [string, string]} style={S.ambientTop} />
        <LinearGradient pointerEvents="none" colors={T.gradients.pagePinkHaze as [string, string]} style={S.ambientHeroMist} />
        <LinearGradient pointerEvents="none" colors={T.gradients.pageBlueHaze as [string, string]} style={S.ambientFeatured} />
        <View pointerEvents="none" style={S.ambientCenter} />
        <View pointerEvents="none" style={S.ambientBottom} />
        <View pointerEvents="none" style={S.ambientSoftBottom} />

        <DecisionCompassHeader
          onBack={goBack}
          onOpenNotifications={() => router.navigate('/notifications')}
          onOpenHelp={handlePressTutorialHelp}
        />

        <SpotlightTarget targetKey={DECISION_COMPASS_TUTORIAL_TARGET_KEYS.INPUT_AREA}>
          <View>
            <SpotlightTarget targetKey={DECISION_COMPASS_TUTORIAL_TARGET_KEYS.REEVALUATE_ENTRY}>
              <View>
                <DecisionCompassFilters
                  dateLabel={dateLabel}
                  selectedFilter={selectedFilter}
                  options={availableFilters}
                  onSelectFilter={setSelectedFilter}
                  onOpenCategories={() => {
                    setDetailSheetOpen(false);
                    setSettingsSheetOpen(true);
                  }}
                />
              </View>
            </SpotlightTarget>
          </View>
        </SpotlightTarget>

        <ScrollView
          style={S.scroll}
          contentContainerStyle={[
            S.scrollContent,
            { paddingBottom: contentBottomPadding },
            contentMaxWidth ? { width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' } : null,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching || dayDetailQuery.isRefetching}
              onRefresh={() => {
                void query.refetch();
                void dayDetailQuery.refetch();
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {!user?.id ? (
            <View style={S.emptyCard}>
              <Text style={S.emptyTitle}>{t('decisionCompassScreen.authRequiredTitle')}</Text>
              <Text style={S.emptyText}>{t('decisionCompassScreen.authRequiredBody')}</Text>
            </View>
          ) : query.isLoading ? (
            <View style={S.emptyCard}>
              <Text style={S.emptyTitle}>{t('decisionCompassScreen.loadingTitle')}</Text>
              <Text style={S.emptyText}>{t('decisionCompassScreen.loadingBody')}</Text>
            </View>
          ) : query.isError ? (
            <View style={S.emptyCard}>
              <Text style={S.emptyTitle}>{t('decisionCompassScreen.errorTitle')}</Text>
              <Text style={S.emptyText}>{t('decisionCompassScreen.errorBody')}</Text>
              <Pressable onPress={() => { void query.refetch(); }} style={({ pressed }) => [S.retryBtn, pressed && S.pressed]}>
                <Text style={S.retryBtnText}>{t('decisionCompassScreen.retryBtn')}</Text>
              </Pressable>
            </View>
          ) : visibleCategories.length === 0 ? (
            <View style={S.emptyCard}>
              <Text style={S.emptyTitle}>{categories.length ? t('decisionCompassScreen.allHiddenTitle') : t('decisionCompassScreen.emptyTitle')}</Text>
              <Text style={S.emptyText}>
                {categories.length
                  ? t('decisionCompassScreen.allHiddenBody')
                  : t('decisionCompassScreen.emptyBody')}
              </Text>
              {categories.length ? (
                <Pressable onPress={resetHiddenCategories} style={({ pressed }) => [S.retryBtn, pressed && S.pressed]}>
                  <Text style={S.retryBtnText}>{t('decisionCompassScreen.showAllBtn')}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <>
              <SpotlightTarget targetKey={DECISION_COMPASS_TUTORIAL_TARGET_KEYS.HEADER_SUMMARY}>
                <View>
                  <DecisionInsightHero
                    hero={heroModel}
                    onPressDetail={() => {
                      if (strongestCategory) {
                        openCategoryDetail(strongestCategory);
                      }
                    }}
                  />
                </View>
              </SpotlightTarget>

              <SpotlightTarget targetKey={DECISION_COMPASS_TUTORIAL_TARGET_KEYS.RESULT_AREA}>
                <View>
                  {featuredCategories.length ? (
                    <FeaturedCategoryRow
                      categories={featuredCategories}
                      onPressCategory={openCategoryDetail}
                    />
                  ) : null}

                  {remainingCategories.length ? (
                    <CategoryMiniGrid
                      categories={remainingCategories}
                      onPressCategory={openCategoryDetail}
                      onPressShowAll={() => router.push({
                        pathname: '/(tabs)/decision-compass-all-categories',
                        params: { from: '/(tabs)/decision-compass-tab' },
                      })}
                    />
                  ) : (
                    <View style={S.filterEmptyCard}>
                      <Ionicons name="funnel-outline" size={16} color={colors.subtext} />
                      <Text style={S.filterEmptyText}>{t('decisionCompassScreen.filterEmptyText')}</Text>
                    </View>
                  )}
                </View>
              </SpotlightTarget>
            </>
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

        <BottomSheet
          visible={settingsSheetOpen}
          onClose={() => setSettingsSheetOpen(false)}
          title={t('decisionCompassScreen.categoryVisibilityTitle')}
        >
          <ScrollView style={S.settingsScroll} contentContainerStyle={S.settingsScrollContent} showsVerticalScrollIndicator={false}>
            <Text style={S.settingsSubtitle}>{t('decisionCompassScreen.settingsSubtitle')}</Text>

            {categories.map((category) => {
              const visible = !hiddenCategoryKeys.includes(category.id);
              const tint = statusColors(category.status, isDark);
              return (
                <View key={category.id} style={S.settingsRow}>
                  <View style={[S.settingsIconBubble, { backgroundColor: tint.bg }]}> 
                    <Ionicons name={category.icon} size={15} color={colors.primary} />
                  </View>
                  <View style={S.settingsRowTextWrap}>
                    <Text style={S.settingsRowTitle} numberOfLines={1}>{category.title}</Text>
                    <Text style={S.settingsRowMeta} numberOfLines={1}>{Math.round(category.score)}% • {category.subLabel}</Text>
                  </View>
                  <Switch
                    value={visible}
                    onValueChange={(next) => setCategoryVisibility(category.id, next)}
                    thumbColor={Platform.OS === 'android' ? (visible ? '#FFFFFF' : '#F4F4F8') : undefined}
                    trackColor={{
                      false: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(122,91,234,0.18)',
                      true: isDark ? 'rgba(180,148,255,0.40)' : 'rgba(122,91,234,0.36)',
                    }}
                    ios_backgroundColor={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(122,91,234,0.18)'}
                  />
                </View>
              );
            })}

            <Pressable onPress={resetHiddenCategories} style={({ pressed }) => [S.settingsResetBtn, pressed && S.pressed]}>
              <Text style={S.settingsResetBtnText}>Tümünü Göster</Text>
            </Pressable>
          </ScrollView>
        </BottomSheet>
      </View>
    </SafeScreen>
  );
}

function makeStyles(
  C: ReturnType<typeof useTheme>['colors'],
  isDark: boolean,
  T: ReturnType<typeof getCompassTokens>,
) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    ambientTop: {
      position: 'absolute',
      top: -148,
      left: -128,
      width: 368,
      height: 338,
      borderRadius: 188,
    },
    ambientHeroMist: {
      position: 'absolute',
      top: 118,
      right: -96,
      width: 308,
      height: 226,
      borderRadius: 154,
    },
    ambientFeatured: {
      position: 'absolute',
      top: 418,
      left: -58,
      width: 272,
      height: 188,
      borderRadius: 140,
    },
    ambientBottom: {
      position: 'absolute',
      right: -84,
      bottom: -78,
      width: 290,
      height: 224,
      borderRadius: 142,
      backgroundColor: T.page.blobB,
    },
    ambientCenter: {
      position: 'absolute',
      top: 248,
      right: -42,
      width: 236,
      height: 172,
      borderRadius: 110,
      backgroundColor: T.page.blobC,
    },
    ambientSoftBottom: {
      position: 'absolute',
      left: -62,
      bottom: 132,
      width: 248,
      height: 164,
      borderRadius: 124,
      backgroundColor: T.page.blobD,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: Platform.OS === 'web' ? 40 : 92,
    },
    emptyCard: {
      borderRadius: 22,
      backgroundColor: T.surface.glass,
      borderWidth: 1,
      borderColor: T.border.soft,
      padding: 18,
      gap: 7,
      marginTop: 8,
      ...T.shadows.soft,
    },
    emptyTitle: {
      color: C.text,
      fontSize: 15,
      fontWeight: '800',
    },
    emptyText: {
      color: C.subtext,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '500',
    },
    retryBtn: {
      alignSelf: 'flex-start',
      marginTop: 6,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(180,148,255,0.20)' : 'rgba(229,212,255,0.88)',
      borderWidth: 1,
      borderColor: T.border.soft,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    retryBtnText: {
      color: C.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    filterEmptyCard: {
      marginBottom: 10,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: T.border.soft,
      backgroundColor: T.surface.glass,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      ...T.shadows.soft,
    },
    filterEmptyText: {
      flex: 1,
      color: C.subtext,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '600',
    },
    settingsScroll: {
      maxHeight: 500,
    },
    settingsScrollContent: {
      gap: 8,
      paddingBottom: 4,
    },
    settingsSubtitle: {
      color: T.text.subtitle,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '600',
      marginBottom: 4,
    },
    settingsRow: {
      borderRadius: 16,
      backgroundColor: T.surface.glass,
      borderWidth: 1,
      borderColor: T.border.soft,
      paddingHorizontal: 10,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    settingsIconBubble: {
      width: 28,
      height: 28,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingsRowTextWrap: {
      flex: 1,
      minWidth: 0,
      gap: 1,
    },
    settingsRowTitle: {
      color: C.text,
      fontSize: 12.5,
      fontWeight: '700',
      letterSpacing: -0.1,
    },
    settingsRowMeta: {
      color: C.subtext,
      fontSize: 10.5,
      fontWeight: '700',
    },
    settingsResetBtn: {
      marginTop: 2,
      minHeight: 38,
      borderRadius: 999,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(180,148,255,0.18)' : 'rgba(228,212,255,0.92)',
      borderWidth: 1,
      borderColor: T.border.soft,
      alignSelf: 'flex-end',
    },
    settingsResetBtnText: {
      color: C.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    pressed: {
      opacity: 0.86,
    },
  });
}
