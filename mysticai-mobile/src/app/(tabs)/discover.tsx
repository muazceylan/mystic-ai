import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { SafeScreen } from '../../components/ui/SafeScreen';

import { TabHeader } from '../../components/ui/TabHeader';
import { useTheme } from '../../context/ThemeContext';
import { COLORS } from '../../constants/colors';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants/tokens';
import { trackEvent } from '../../services/analytics';
import {
  buildDiscoverCategories,
  buildDiscoverModules,
  RECOMMENDED_MODULE_KEYS,
  TODAY_MODULE_KEYS,
  type DiscoverModule,
  type DiscoverModuleKey,
} from '../../features/discover/catalog';
import { fetchExploreCategories, fetchExploreCards, type ExploreCategory, type ExploreCard } from '../../services/exploreContent.service';
import {
  getDiscoverVisualForCmsCard,
  getDiscoverVisualForModule,
  type DiscoverVisual,
} from '../../features/discover/discoverVisuals';
import {
  getModuleConfig,
  isModuleInMaintenance,
  isModuleVisibleInUI,
  type AppConfig,
} from '../../services/appConfig.service';
import { useAppConfigStore } from '../../store/useAppConfigStore';
import { navigateWithOrigin } from '../../navigation';

const HIT_SLOP = { top: 8, right: 8, bottom: 8, left: 8 };
const VISIBLE_CATEGORY_LIMIT = 5;
const CATEGORY_TOGGLE_THRESHOLD = 6;
type DiscoverSurface = 'today_quick_access' | 'category_grid' | 'recommended';
const DECISION_COMPASS_TAB_ROUTE = '/(tabs)/decision-compass-tab';
const STAR_MATE_MODULE_KEY = 'star_mate';
const STAR_MATE_ROUTE = '/(tabs)/star-mate';

function resolveFeatureModuleKey(module: DiscoverModule): string | null {
  return module.key === 'star_mate' ? STAR_MATE_MODULE_KEY : null;
}

function resolveFeatureModuleKeyFromRoute(route?: string | null): string | null {
  if (!route) return null;
  return route.startsWith(STAR_MATE_ROUTE) ? STAR_MATE_MODULE_KEY : null;
}

function isExploreModuleAvailable(config: AppConfig | null, moduleKey: string): boolean {
  if (moduleKey === STAR_MATE_MODULE_KEY && !config) {
    return false;
  }

  if (!config) {
    return true;
  }

  const moduleConfig = getModuleConfig(config, moduleKey);
  if (!moduleConfig) {
    return moduleKey !== STAR_MATE_MODULE_KEY;
  }

  if (!moduleConfig.showOnExplore) {
    return false;
  }

  if (!isModuleVisibleInUI(config, moduleKey)) {
    return false;
  }

  if (isModuleInMaintenance(config, moduleKey)) {
    return false;
  }

  return true;
}

function normalizeText(value: string): string {
  const lowered = value.toLocaleLowerCase();
  const map: Record<string, string> = {
    ç: 'c',
    ğ: 'g',
    ı: 'i',
    ö: 'o',
    ş: 's',
    ü: 'u',
  };

  return lowered
    .split('')
    .map((char) => map[char] ?? char)
    .join('');
}

function matchModule(module: DiscoverModule, query: string): boolean {
  if (!query.trim()) {
    return true;
  }

  const q = normalizeText(query.trim());
  const fields = [module.title, module.subtitle, ...module.keywords].map((item) => normalizeText(item));

  return fields.some((field) => field.includes(q));
}

function ModuleCard({
  module,
  onPress,
  compact = false,
}: {
  module: DiscoverModule;
  onPress: (module: DiscoverModule) => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const isComingSoon = !module.route;
  const visual = getDiscoverVisualForModule(module);

  return (
    <Pressable
      onPress={() => onPress(module)}
      accessibilityRole="button"
      accessibilityLabel={
        isComingSoon
          ? t('discover.cardComingSoonAccessibility', { module: module.title })
          : t('discover.openModuleAccessibility', { module: module.title })
      }
      hitSlop={HIT_SLOP}
      style={({ pressed }) => [
        styles.moduleCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: isComingSoon ? 0.64 : 1,
        },
        compact && styles.moduleCardCompact,
        pressed && !isComingSoon && styles.pressed,
      ]}
    >
      <View style={styles.cardGlowWrap}>
        <LinearGradient
          colors={
            isDark
              ? [visual.glowDark, 'rgba(8,10,24,0.02)']
              : [visual.glowLight, 'rgba(255,255,255,0.02)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGlow}
        />
      </View>

      <PremiumModuleBadge visual={visual} isDark={isDark} locked={isComingSoon} />

      <Text numberOfLines={2} style={[styles.moduleTitle, { color: colors.text }]}>
        {module.title}
      </Text>
      <Text numberOfLines={1} style={[styles.moduleSubtitle, { color: colors.subtext }]}>
        {isComingSoon ? t('discover.comingSoonBadge') : module.subtitle}
      </Text>

      {isComingSoon ? (
        <View style={[styles.comingSoonBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}> 
          <Text style={[styles.comingSoonText, { color: colors.primary }]}>{t('discover.comingSoonBadge')}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function TodayQuickCard({
  module,
  onPress,
}: {
  module: DiscoverModule;
  onPress: (module: DiscoverModule) => void;
}) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const visual = getDiscoverVisualForModule(module);

  return (
    <Pressable
      onPress={() => onPress(module)}
      accessibilityRole="button"
      accessibilityLabel={t('discover.openQuickAccessAccessibility', { module: module.title })}
      hitSlop={HIT_SLOP}
      style={({ pressed }) => [
        styles.todayCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <LinearGradient
        colors={isDark ? visual.gradientDark : visual.gradientLight}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.todayCardTop}
      >
        <View style={styles.todayCardTopOverlay} />
        <View style={styles.todayCardTopAura} />
        <PremiumModuleBadge visual={visual} isDark={isDark} size="hero" />
      </LinearGradient>
      <Text numberOfLines={2} style={[styles.todayCardTitle, { color: colors.text }]}>
        {module.title}
      </Text>
    </Pressable>
  );
}

function PremiumModuleBadge({
  visual,
  isDark,
  size = 'regular',
  locked = false,
  featured = false,
  premium = false,
}: {
  visual: DiscoverVisual;
  isDark: boolean;
  size?: 'regular' | 'hero';
  locked?: boolean;
  featured?: boolean;
  premium?: boolean;
}) {
  const badgeSize = size === 'hero' ? 48 : 40;
  const innerInset = size === 'hero' ? 6 : 5;
  const iconSize = size === 'hero' ? 24 : 18;
  const glowSize = badgeSize + 12;
  const ornamentSize = size === 'hero' ? 18 : 16;
  const iconCoreBackground = isDark ? 'rgba(2,6,23,0.84)' : 'rgba(94,66,187,0.94)';
  const iconCoreBorder = isDark ? 'rgba(216,180,254,0.18)' : 'rgba(255,255,255,0.26)';
  const ornamentIcon = locked ? 'lock-closed-outline' : featured ? 'star' : premium ? 'diamond' : null;
  const ornamentColors = locked
    ? ['#475569', '#0F172A']
    : featured
      ? [COLORS.primaryLight, COLORS.primary700]
      : [COLORS.blue, COLORS.primary];

  return (
    <View style={[styles.premiumBadgeWrap, { width: glowSize, height: glowSize }]}>
      <View
        style={[
          styles.premiumBadgeGlow,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            backgroundColor: isDark ? visual.glowDark : visual.glowLight,
          },
        ]}
      />
      <LinearGradient
        colors={isDark ? visual.gradientDark : visual.gradientLight}
        start={{ x: 0.15, y: 0.05 }}
        end={{ x: 0.9, y: 1 }}
        style={[
          styles.moduleIconShell,
          {
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
            borderColor: isDark ? visual.ringDark : visual.ringLight,
          },
        ]}
      >
        <View
          style={[
            styles.moduleIconInner,
            {
              top: innerInset,
              right: innerInset,
              bottom: innerInset,
              left: innerInset,
              borderRadius: (badgeSize - innerInset * 2) / 2,
              backgroundColor: iconCoreBackground,
              borderColor: iconCoreBorder,
            },
          ]}
        >
          <Ionicons name={visual.icon} size={iconSize} color={isDark ? visual.iconDark : visual.iconLight} />
        </View>
        <View
          style={[
            styles.moduleIconSheen,
            {
              width: badgeSize * 0.44,
              height: badgeSize * 0.2,
              borderRadius: badgeSize * 0.15,
            },
          ]}
        />
      </LinearGradient>

      {ornamentIcon ? (
        <LinearGradient
          colors={ornamentColors as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.moduleBadgeOrnament,
            {
              width: ornamentSize,
              height: ornamentSize,
              borderRadius: ornamentSize / 2,
            },
          ]}
        >
          <Ionicons name={ornamentIcon} size={ornamentSize * 0.58} color="#FFFFFF" />
        </LinearGradient>
      ) : null}
    </View>
  );
}

export function DiscoverScreenContent() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const appConfig = useAppConfigStore((s) => s.config);
  const [query, setQuery] = useState('');
  const [expandedMap, setExpandedMap] = useState<Partial<Record<string, boolean>>>({});
  const [cmsCategories, setCmsCategories] = useState<ExploreCategory[]>([]);
  const [cmsCards, setCmsCards] = useState<ExploreCard[]>([]);
  const appLocale = useMemo(
    () => ((i18n.resolvedLanguage ?? i18n.language ?? 'tr').toLowerCase().startsWith('en') ? 'en' : 'tr'),
    [i18n.language, i18n.resolvedLanguage],
  );
  const discoverCategories = useMemo(() => buildDiscoverCategories(t), [t, appLocale]);
  const discoverModules = useMemo(
    () => buildDiscoverModules(t).filter((module) => {
      const moduleKey = resolveFeatureModuleKey(module);
      return moduleKey ? isExploreModuleAvailable(appConfig, moduleKey) : true;
    }),
    [appConfig, t, appLocale],
  );
  const searchSuggestions = useMemo(
    () => [
      t('discover.searchSuggestions.horoscope'),
      t('discover.searchSuggestions.transits'),
      t('discover.searchSuggestions.dream'),
      t('discover.searchSuggestions.compatibility'),
    ],
    [t, appLocale],
  );

  const filteredModules = useMemo(
    () => discoverModules.filter((module) => matchModule(module, query)),
    [discoverModules, query],
  );

  const filteredMap = useMemo(() => {
    const map = new Map<DiscoverModuleKey, DiscoverModule>();
    for (const module of filteredModules) {
      map.set(module.key, module);
    }
    return map;
  }, [filteredModules]);

  const todayModules = useMemo(
    () => TODAY_MODULE_KEYS.map((key) => filteredMap.get(key)).filter(Boolean) as DiscoverModule[],
    [filteredMap],
  );

  const categoriesWithModules = useMemo(
    () => discoverCategories.map((category) => ({
      ...category,
      modules: filteredModules.filter((module) => module.categoryKey === category.key),
    })),
    [discoverCategories, filteredModules],
  );

  const recommendedModules = useMemo(
    () => RECOMMENDED_MODULE_KEYS.map((key) => filteredMap.get(key)).filter(Boolean) as DiscoverModule[],
    [filteredMap],
  );

  const hasSearch = query.trim().length > 0;
  const totalResultCount = filteredModules.length;
  const hasNoResults = hasSearch && totalResultCount === 0;

  useEffect(() => {
    trackEvent('discover_view');
  }, []);

  useEffect(() => {
    let active = true;

    Promise.all([fetchExploreCategories(appLocale), fetchExploreCards(appLocale)]).then(([cats, cards]) => {
      if (!active) return;

      const localizedCategories = cats.filter((category) => (category.locale ?? '').toLowerCase().startsWith(appLocale));
      const localizedCards = cards.filter((card) => (card.locale ?? '').toLowerCase().startsWith(appLocale));

      setCmsCategories(localizedCategories);

      // Featured cards first within each category, then by sortOrder.
      const sorted = [...localizedCards].sort((a, b) => {
        if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
        return a.sortOrder - b.sortOrder;
      });
      setCmsCards(sorted);
    });

    return () => {
      active = false;
    };
  }, [appLocale]);

  const visibleCmsCards = useMemo(
    () => cmsCards.filter((card) => {
      const moduleKey = resolveFeatureModuleKeyFromRoute(card.routeKey || card.fallbackRouteKey);
      return moduleKey ? isExploreModuleAvailable(appConfig, moduleKey) : true;
    }),
    [appConfig, cmsCards],
  );

  const handleSearchChange = (text: string) => {
    setQuery(text);
    trackEvent('discover_search_change', { query_length: text.trim().length });
  };

  const openRoute = (route: string) => {
    const normalizedRoute = route === '/decision-compass' ? DECISION_COMPASS_TAB_ROUTE : route;
    navigateWithOrigin({ pathname: normalizedRoute, from: '/(tabs)/discover' });
  };

  const handleModuleClick = (module: DiscoverModule, surface: DiscoverSurface) => {
    const eventParams = {
      module_key: module.key,
      category_key: module.categoryKey,
      surface,
    };

    if (!module.route) {
      trackEvent('discover_module_click', {
        ...eventParams,
        available: false,
      });
      Alert.alert(t('discover.comingSoonTitle'));
      return;
    }

    trackEvent('discover_module_click', {
      ...eventParams,
      available: true,
    });

    if (surface === 'recommended') {
      trackEvent('discover_recommended_click', { module_key: module.key });
    }

    openRoute(module.route);
  };

  const toggleCategory = (categoryKey: string) => {
    setExpandedMap((prev) => {
      const nextValue = !prev[categoryKey];
      if (nextValue) {
        trackEvent('discover_category_open', { category_key: categoryKey });
      }
      return {
        ...prev,
        [categoryKey]: nextValue,
      };
    });
  };

  return (
      <SafeScreen edges={['top', 'left', 'right']}>
        <View style={[styles.root, { backgroundColor: colors.bg }]}> 
        <LinearGradient
          colors={
            isDark
              ? ['#120F1E', '#171328', '#1A1631']
              : ['#FBF9FF', '#F4EEFF', '#FFFFFF']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        <TabHeader title={t('tabs.discover')} />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        >
          <View style={[styles.searchWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}> 
            <Ionicons name="search" size={20} color={colors.subtext} />
            <TextInput
              value={query}
              onChangeText={handleSearchChange}
              placeholder={t('discover.searchPlaceholder')}
              placeholderTextColor={colors.subtext}
              style={[styles.searchInput, { color: colors.text }]}
              returnKeyType="search"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {query.length > 0 ? (
              <Pressable
                onPress={() => handleSearchChange('')}
                accessibilityRole="button"
                accessibilityLabel={t('discover.clearSearchAccessibility')}
                hitSlop={HIT_SLOP}
              >
                <Ionicons name="close-circle" size={18} color={colors.subtext} />
              </Pressable>
            ) : null}
          </View>

          {!hasNoResults ? (
            <>
              <View style={styles.sectionWrap}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('discover.today')}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.todayRow}
                >
                  {todayModules.map((module) => (
                    <TodayQuickCard
                      key={module.key}
                      module={module}
                      onPress={(item) => handleModuleClick(item, 'today_quick_access')}
                    />
                  ))}
                </ScrollView>
              </View>

              {/* Category grid: CMS-first when data exists, static catalog as fallback.
                  When searching, always use static catalog (search filters static modules).
                  This ensures admin panel changes (reorder, edit, archive) are reflected on mobile. */}
              {!hasSearch && cmsCategories.length > 0
                ? cmsCategories.map((cat) => {
                    const catCards = visibleCmsCards.filter((c) => c.categoryKey === cat.categoryKey);
                    if (catCards.length === 0) return null;
                    const isExpanded = Boolean(expandedMap[cat.categoryKey]);
                    const hasOverflow = catCards.length >= CATEGORY_TOGGLE_THRESHOLD;
                    const visibleCards = isExpanded ? catCards : catCards.slice(0, VISIBLE_CATEGORY_LIMIT);
                    return (
                      <View key={cat.categoryKey} style={styles.sectionWrap}>
                        <View style={styles.sectionHeadRow}>
                          <View style={styles.sectionHeadTextWrap}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>{cat.title}</Text>
                            {cat.subtitle ? (
                              <Text numberOfLines={1} style={[styles.sectionSubtitle, { color: colors.subtext }]}>
                                {cat.subtitle}
                              </Text>
                            ) : null}
                          </View>
                          {hasOverflow ? (
                            <Pressable
                              onPress={() => toggleCategory(cat.categoryKey)}
                              accessibilityRole="button"
                              accessibilityLabel={t('discover.toggleCategoryAccessibility', {
                                category: cat.title,
                                action: isExpanded ? t('discover.collapse') : t('discover.viewAll'),
                              })}
                              hitSlop={HIT_SLOP}
                            >
                              <Text style={[styles.categoryToggleText, { color: colors.primary }]}>
                                {isExpanded ? t('discover.collapse') : t('discover.viewAll')}
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                        <View style={styles.gridRow}>
                          {visibleCards.map((card) => {
                            const route = card.routeKey || card.fallbackRouteKey;
                            const visual = getDiscoverVisualForCmsCard(card);
                            return (
                              <View key={card.cardKey} style={styles.gridItemWrap}>
                                <Pressable
                                  onPress={() => {
                                    if (!route) return;
                                    trackEvent('discover_cms_card_click', {
                                      card_key: card.cardKey,
                                      category_key: card.categoryKey,
                                      is_featured: card.isFeatured,
                                    });
                                    openRoute(route.startsWith('/') ? route : `/${route}`);
                                  }}
                                  accessibilityRole="button"
                                  style={({ pressed }) => [
                                    styles.moduleCard,
                                    {
                                      backgroundColor: colors.surface,
                                      borderColor: card.isFeatured
                                        ? (isDark ? visual.ringDark : visual.ringLight)
                                        : colors.border,
                                      opacity: route ? 1 : 0.6,
                                    },
                                    styles.moduleCardCompact,
                                    pressed && route ? styles.pressed : undefined,
                                  ]}
                                >
                                  <View style={styles.cardGlowWrap}>
                                    <LinearGradient
                                      colors={
                                        isDark
                                          ? [visual.glowDark, 'rgba(8,10,24,0.02)']
                                          : [visual.glowLight, 'rgba(255,255,255,0.02)']
                                      }
                                      start={{ x: 0, y: 0 }}
                                      end={{ x: 1, y: 1 }}
                                      style={styles.cardGlow}
                                    />
                                  </View>
                                  <PremiumModuleBadge
                                    visual={visual}
                                    isDark={isDark}
                                    locked={!route}
                                    featured={card.isFeatured}
                                    premium={card.isPremium}
                                  />
                                  <Text numberOfLines={2} style={[styles.moduleTitle, { color: colors.text }]}>
                                    {card.title}
                                  </Text>
                                  {card.subtitle ? (
                                    <Text numberOfLines={1} style={[styles.moduleSubtitle, { color: colors.subtext }]}>
                                      {card.subtitle}
                                    </Text>
                                  ) : null}
                                  {!route ? (
                                    <View style={[styles.comingSoonBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                                      <Text style={[styles.comingSoonText, { color: colors.primary }]}>{t('discover.comingSoonBadge')}</Text>
                                    </View>
                                  ) : null}
                                </Pressable>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })
                : categoriesWithModules.map((category) => {
                    if (category.modules.length === 0) return null;
                    const isExpanded = hasSearch ? true : Boolean(expandedMap[category.key]);
                    const hasOverflow = category.modules.length >= CATEGORY_TOGGLE_THRESHOLD;
                    const visibleModules = isExpanded
                      ? category.modules
                      : category.modules.slice(0, VISIBLE_CATEGORY_LIMIT);
                    return (
                      <View key={category.key} style={styles.sectionWrap}>
                        <View style={styles.sectionHeadRow}>
                          <View style={styles.sectionHeadTextWrap}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>{category.title}</Text>
                            <Text numberOfLines={1} style={[styles.sectionSubtitle, { color: colors.subtext }]}>
                              {category.subtitle}
                            </Text>
                          </View>
                          {hasOverflow && !hasSearch ? (
                            <Pressable
                              onPress={() => toggleCategory(category.key)}
                              accessibilityRole="button"
                              accessibilityLabel={t('discover.toggleCategoryAccessibility', {
                                category: category.title,
                                action: isExpanded ? t('discover.collapse') : t('discover.viewAll'),
                              })}
                              hitSlop={HIT_SLOP}
                            >
                              <Text style={[styles.categoryToggleText, { color: colors.primary }]}>
                                {isExpanded ? t('discover.collapse') : t('discover.viewAll')}
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                        <View style={styles.gridRow}>
                          {visibleModules.map((module) => (
                            <View key={module.key} style={styles.gridItemWrap}>
                              <ModuleCard
                                module={module}
                                onPress={(item) => handleModuleClick(item, 'category_grid')}
                                compact
                              />
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })}

              {!hasSearch && recommendedModules.length > 0 ? (
                <View style={styles.sectionWrap}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('discover.recommended')}</Text>
                  <View style={styles.recommendedRow}>
                    {recommendedModules.map((module) => (
                      <View key={module.key} style={styles.recommendedItemWrap}>
                        <ModuleCard
                          module={module}
                          onPress={(item) => handleModuleClick(item, 'recommended')}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={[styles.statusText, { color: colors.subtext }]}>{t('discover.oracleStatus')}</Text>
              </View>
            </>
          ) : (
            <View style={[styles.zeroWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
              <Ionicons name="search-outline" size={22} color={colors.subtext} />
              <Text style={[styles.zeroTitle, { color: colors.text }]}>{t('discover.noResultsTitle')}</Text>
              <Text style={[styles.zeroSubtitle, { color: colors.subtext }]}>{t('discover.noResultsSubtitle')}</Text>
              <View style={styles.suggestionRow}>
                {searchSuggestions.map((suggestion) => (
                  <Pressable
                    key={suggestion}
                    onPress={() => handleSearchChange(suggestion)}
                    style={[styles.suggestionChip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                    accessibilityRole="button"
                    accessibilityLabel={t('discover.searchSuggestionAccessibility', { suggestion })}
                    hitSlop={HIT_SLOP}
                  >
                    <Text style={[styles.suggestionText, { color: colors.text }]}>{suggestion}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
        </View>
      </SafeScreen>
  );
}

/**
 * Route shell — content is rendered by MainTabPager (PagerView).
 */
export default function DiscoverRoute() {
  return null;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    gap: SPACING.lgXl,
  },
  searchWrap: {
    height: 52,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.Small,
    fontSize: 16,
    lineHeight: 21,
    paddingVertical: 0,
  },
  sectionWrap: {
    gap: SPACING.md,
  },
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  sectionHeadTextWrap: {
    flex: 1,
  },
  sectionTitle: {
    ...TYPOGRAPHY.H3,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700',
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.Caption,
    marginTop: 4,
    fontSize: 12,
  },
  categoryToggleText: {
    ...TYPOGRAPHY.CaptionBold,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  todayRow: {
    gap: SPACING.md,
    paddingRight: SPACING.lg,
  },
  todayCard: {
    width: 172,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  todayCardTop: {
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  todayCardTopOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.22,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  todayCardTopAura: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -42,
    right: -18,
  },
  todayCardTitle: {
    ...TYPOGRAPHY.SmallBold,
    fontSize: 17,
    lineHeight: 22,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: SPACING.md,
  },
  gridItemWrap: {
    width: '48.6%',
  },
  moduleCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    minHeight: 124,
    overflow: 'hidden',
  },
  moduleCardCompact: {
    minHeight: 116,
  },
  cardGlowWrap: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.72,
  },
  cardGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  moduleIconShell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  premiumBadgeWrap: {
    marginBottom: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBadgeGlow: {
    position: 'absolute',
    opacity: 0.92,
  },
  moduleIconInner: {
    position: 'absolute',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleIconSheen: {
    position: 'absolute',
    top: 4,
    left: 6,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  moduleBadgeOrnament: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.48)',
  },
  moduleTitle: {
    ...TYPOGRAPHY.SmallBold,
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 2,
  },
  moduleSubtitle: {
    ...TYPOGRAPHY.Caption,
    fontSize: 11,
    lineHeight: 15,
  },
  comingSoonBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: SPACING.sm,
  },
  comingSoonText: {
    ...TYPOGRAPHY.CaptionBold,
    fontSize: 10,
    lineHeight: 14,
  },
  recommendedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  recommendedItemWrap: {
    flex: 1,
  },
  statusRow: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2ECC71',
  },
  statusText: {
    ...TYPOGRAPHY.Caption,
    fontSize: 12,
    fontWeight: '600',
  },
  zeroWrap: {
    marginTop: SPACING.xs,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  zeroTitle: {
    ...TYPOGRAPHY.H3,
    fontSize: 20,
    lineHeight: 24,
    marginTop: SPACING.sm,
  },
  zeroSubtitle: {
    ...TYPOGRAPHY.Small,
    marginTop: 4,
    marginBottom: SPACING.md,
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  suggestionChip: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
  },
  suggestionText: {
    ...TYPOGRAPHY.SmallBold,
    fontSize: 12,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.86,
  },
});
