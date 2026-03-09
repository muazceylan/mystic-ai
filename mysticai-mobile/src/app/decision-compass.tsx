import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Modal,
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
import { router, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeScreen } from '../components/ui';
import OnboardingBackground from '../components/OnboardingBackground';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { useCosmicSummary } from '../hooks/useHomeQueries';
import type { DailyLifeGuideActivity } from '../services/astrology.service';
import { useDecisionCompassStore } from '../store/useDecisionCompassStore';
import {
  DECISION_COMPASS_TUTORIAL_TARGET_KEYS,
  SpotlightTarget,
  TUTORIAL_SCREEN_KEYS,
  useTutorialTrigger,
} from '../features/tutorial';

interface CompassCategoryRow {
  categoryKey: string;
  categoryLabel: string;
  activityLabel: string;
  score: number;
  type: 'OPPORTUNITY' | 'WARNING';
  shortAdvice: string;
  itemCount: number;
  items: DailyLifeGuideActivity[];
}

function iconForCategory(card: Pick<CompassCategoryRow, 'categoryKey' | 'categoryLabel' | 'activityLabel'>): keyof typeof Ionicons.glyphMap {
  const haystack = `${card.categoryKey} ${card.categoryLabel} ${card.activityLabel}`.toLowerCase();
  if (haystack.includes('kariyer') || haystack.includes('iş') || haystack.includes('career') || haystack.includes('work')) return 'briefcase-outline';
  if (haystack.includes('güzellik') || haystack.includes('bakım') || haystack.includes('beauty')) return 'color-palette-outline';
  if (haystack.includes('finans') || haystack.includes('para') || haystack.includes('money') || haystack.includes('finance')) return 'wallet-outline';
  if (haystack.includes('aşk') || haystack.includes('ilişki') || haystack.includes('love') || haystack.includes('partner')) return 'heart-outline';
  if (haystack.includes('sağlık') || haystack.includes('health')) return 'fitness-outline';
  if (haystack.includes('sosyal') || haystack.includes('social')) return 'people-outline';
  return 'sparkles-outline';
}

function tintForScore(score: number, isDark: boolean) {
  if (score >= 70) {
    return isDark
      ? { bg: 'rgba(140,116,246,0.18)', text: '#D8CBFF' }
      : { bg: 'rgba(122,91,234,0.16)', text: '#5D49B4' };
  }
  if (score >= 50) {
    return isDark
      ? { bg: 'rgba(140,116,246,0.10)', text: '#C8C1DE' }
      : { bg: 'rgba(122,91,234,0.08)', text: '#6F6791' };
  }
  return isDark
    ? { bg: 'rgba(255,255,255,0.04)', text: '#A8A3B7' }
    : { bg: 'rgba(103,103,122,0.08)', text: '#7B7888' };
}

function formatDateShortTr(input?: string | null) {
  if (!input) return 'Bugün';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return 'Bugün';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function buildCategoryRows(activities: DailyLifeGuideActivity[] | null | undefined): CompassCategoryRow[] {
  if (!activities?.length) return [];
  const map = new Map<string, { label: string; items: DailyLifeGuideActivity[] }>();
  for (const activity of activities) {
    const existing = map.get(activity.groupKey);
    if (existing) {
      existing.items.push(activity);
      continue;
    }
    map.set(activity.groupKey, {
      label: activity.groupLabel || activity.activityLabel || 'Kategori',
      items: [activity],
    });
  }

  return Array.from(map.entries())
    .map(([categoryKey, group]) => {
      const items = [...group.items].sort((a, b) => b.score - a.score);
      const score = Math.round(items.reduce((sum, item) => sum + item.score, 0) / Math.max(items.length, 1));
      const top = items[0];
      const type: CompassCategoryRow['type'] = score <= 40 ? 'WARNING' : 'OPPORTUNITY';
      return {
        categoryKey,
        categoryLabel: group.label,
        activityLabel: top?.activityLabel || group.label,
        score,
        type,
        shortAdvice: top?.shortAdvice?.trim() || 'Bugün bu alanda dengeli ve bilinçli ilerle.',
        itemCount: items.length,
        items,
      };
    })
    .sort((a, b) => b.score - a.score || a.categoryLabel.localeCompare(b.categoryLabel, 'tr'));
}

export default function DecisionCompassScreen() {
  const { colors, isDark } = useTheme();
  const { i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const tabBarHeight = React.useContext(BottomTabBarHeightContext);
  const user = useAuthStore((s) => s.user);
  const { trigger: triggerTutorial, triggerInitial: triggerInitialTutorials } = useTutorialTrigger(
    TUTORIAL_SCREEN_KEYS.DECISION_COMPASS,
  );
  const tutorialBootstrapRef = useRef<string | null>(null);

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

  const cards = useMemo(
    () => buildCategoryRows(query.data?.dailyGuide?.activities),
    [query.data?.dailyGuide?.activities],
  );
  const hiddenCategoryKeys = useDecisionCompassStore((s) => s.hiddenCategoryKeys);
  const setCategoryVisibility = useDecisionCompassStore((s) => s.setCategoryVisibility);
  const resetHiddenCategories = useDecisionCompassStore((s) => s.resetHiddenCategories);
  const initFromFocusPoints = useDecisionCompassStore((s) => s.initFromFocusPoints);

  // Auto-filter by user's focus points on first load
  React.useEffect(() => {
    if (cards.length > 0 && user?.focusPoint) {
      initFromFocusPoints(user.focusPoint, cards.map((c) => c.categoryKey));
    }
  }, [cards.length, user?.focusPoint]);
  const visibleCards = useMemo(
    () => cards.filter((card) => !hiddenCategoryKeys.includes(card.categoryKey)),
    [cards, hiddenCategoryKeys],
  );
  const [expandedCategoryKey, setExpandedCategoryKey] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const S = makeStyles(colors, isDark);
  const contentMaxWidth = Platform.OS === 'web' ? Math.min(820, width - 24) : undefined;
  const isInTabFlow = segments[0] === '(tabs)';
  const effectiveTabBarHeight = tabBarHeight ?? (Platform.OS === 'ios' ? 88 : 72);
  const contentBottomPadding = Platform.OS === 'ios'
    ? effectiveTabBarHeight + Math.max(20, insets.bottom > 0 ? 12 : 20)
    : Platform.OS === 'web'
      ? 40
      : 96;

  React.useEffect(() => {
    if (!isInTabFlow) {
      router.replace('/(tabs)/decision-compass-tab');
    }
  }, [isInTabFlow]);

  if (!isInTabFlow) {
    return null;
  }

  React.useEffect(() => {
    if (expandedCategoryKey && !visibleCards.some((card) => card.categoryKey === expandedCategoryKey)) {
      setExpandedCategoryKey(null);
    }
  }, [expandedCategoryKey, visibleCards]);

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

  const handlePressTutorialHelp = useCallback(() => {
    void triggerTutorial('manual_reopen');
  }, [triggerTutorial]);

  return (
    <SafeScreen edges={['top', 'left', 'right']}>
      <View style={S.container}>
        <OnboardingBackground />

        <View style={S.header}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [S.headerBtn, pressed && S.pressed]}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <View style={S.headerTitleWrap}>
            <Text style={S.headerTitle}>Karar Pusulası</Text>
            <Text style={S.headerSub}>Günün öncelik alanları ve skorlar</Text>
          </View>
          <View style={S.headerRightRow}>
            <Pressable onPress={() => router.push('/(tabs)/calendar')} style={({ pressed }) => [S.headerBtn, pressed && S.pressed]}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            </Pressable>
            <SpotlightTarget targetKey={DECISION_COMPASS_TUTORIAL_TARGET_KEYS.HELP_ENTRY}>
              <Pressable
                onPress={handlePressTutorialHelp}
                style={({ pressed }) => [S.headerBtn, pressed && S.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Tutorial rehberini tekrar aç"
              >
                <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
              </Pressable>
            </SpotlightTarget>
          </View>
        </View>

        <SpotlightTarget targetKey={DECISION_COMPASS_TUTORIAL_TARGET_KEYS.INPUT_AREA}>
          <View style={S.toolbar}>
            <View style={S.toolbarPill}>
              <Ionicons name="calendar-outline" size={14} color={colors.subtext} />
              <Text style={S.toolbarText}>{formatDateShortTr(query.data?.date)}</Text>
            </View>
            <View style={[S.toolbarPill, S.toolbarPillAction]}>
              <Text style={S.toolbarActionText}>{visibleCards.length} kategori</Text>
            </View>
            <SpotlightTarget targetKey={DECISION_COMPASS_TUTORIAL_TARGET_KEYS.REEVALUATE_ENTRY}>
              <Pressable onPress={() => setSettingsOpen(true)} style={({ pressed }) => [S.toolbarPill, S.toolbarSettingsPill, pressed && S.pressed]}>
                <Ionicons name="options-outline" size={14} color={colors.primary} />
                <Text style={S.toolbarActionText}>Kategoriler</Text>
              </Pressable>
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
              refreshing={query.isRefetching}
              onRefresh={() => { void query.refetch(); }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {!user?.id ? (
            <View style={S.emptyCard}>
              <Text style={S.emptyTitle}>Kullanıcı bulunamadı</Text>
              <Text style={S.emptyText}>Karar Pusulası için giriş yapmanız gerekiyor.</Text>
            </View>
          ) : query.isLoading ? (
            <View style={S.emptyCard}>
              <Text style={S.emptyTitle}>Karar Pusulası yükleniyor…</Text>
              <Text style={S.emptyText}>Günlük skorlar hazırlanıyor.</Text>
            </View>
          ) : query.isError ? (
            <View style={S.emptyCard}>
              <Text style={S.emptyTitle}>Veri alınamadı</Text>
              <Text style={S.emptyText}>Ağ veya servis kaynaklı bir sorun olabilir.</Text>
              <Pressable onPress={() => { void query.refetch(); }} style={({ pressed }) => [S.retryBtn, pressed && S.pressed]}>
                <Text style={S.retryBtnText}>Tekrar Dene</Text>
              </Pressable>
            </View>
          ) : visibleCards.length === 0 ? (
            <View style={S.emptyCard}>
              <Text style={S.emptyTitle}>{cards.length ? 'Tüm kategoriler gizli' : 'Gösterilecek alan yok'}</Text>
              <Text style={S.emptyText}>
                {cards.length
                  ? 'Kategori ayarlarından görünmesini istediğiniz alanları açabilirsiniz.'
                  : 'Karar Pusulası verisi şu an için boş döndü.'}
              </Text>
              {cards.length ? (
                <Pressable onPress={resetHiddenCategories} style={({ pressed }) => [S.retryBtn, pressed && S.pressed]}>
                  <Text style={S.retryBtnText}>Tümünü Göster</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <>
              <SpotlightTarget targetKey={DECISION_COMPASS_TUTORIAL_TARGET_KEYS.HEADER_SUMMARY}>
                <View style={S.insightCard}>
                  <View style={S.insightHeadRow}>
                    <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
                    <Text style={S.insightTitle}>Günün İçgörüsü</Text>
                  </View>
                  <Text style={S.insightBody} numberOfLines={2}>
                    {visibleCards[0]?.shortAdvice?.trim()
                      || 'Yorumlar, seçeneklerin güçlü ve zayıf taraflarını daha net görmene yardım eder.'}
                  </Text>
                </View>
              </SpotlightTarget>

              <SpotlightTarget targetKey={DECISION_COMPASS_TUTORIAL_TARGET_KEYS.RESULT_AREA}>
                <View style={S.listWrap}>
                  {visibleCards.map((card, index) => {
                    const tint = tintForScore(card.score, isDark);
                    const expanded = expandedCategoryKey === card.categoryKey;
                    return (
                      <Pressable
                        key={`${card.categoryKey}-${index}`}
                        onPress={() =>
                          setExpandedCategoryKey((prev) => (prev === card.categoryKey ? null : card.categoryKey))
                        }
                        style={({ pressed }) => [S.itemCard, expanded && S.itemCardExpanded, pressed && S.pressed]}
                      >
                      <View style={S.itemTopGlow} />
                      <View style={S.itemRowTop}>
                        <View style={S.itemIconBubble}>
                          <Ionicons name={iconForCategory(card)} size={16} color={colors.primary} />
                        </View>
                        <View style={S.itemTitleWrap}>
                          <Text style={S.itemTitle} numberOfLines={1}>{card.categoryLabel || card.activityLabel}</Text>
                          <Text style={S.itemSubtitle} numberOfLines={1}>
                            {card.activityLabel}{typeof card.itemCount === 'number' ? ` • ${card.itemCount} alt alan` : ''}
                          </Text>
                        </View>
                        <View style={[S.scoreChip, { backgroundColor: tint.bg }]}>
                          <Text style={[S.scoreChipText, { color: tint.text }]}>{Math.round(card.score)}%</Text>
                        </View>
                        <Ionicons
                          name={expanded ? 'chevron-up' : 'chevron-down'}
                          size={15}
                          color={colors.subtext}
                        />
                      </View>

                      <Text style={S.itemAdvice} numberOfLines={expanded ? 3 : 1}>
                        {card.shortAdvice?.trim() || 'Bugün bu alanda daha bilinçli ve dengeli adımlar at.'}
                      </Text>

                      <View style={S.itemFooter}>
                        <View style={S.typePill}>
                          <Text style={S.typePillText}>{card.type === 'WARNING' ? 'Uyarı' : 'Fırsat'}</Text>
                        </View>
                        <View style={S.itemFooterActions}>
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              router.push('/(tabs)/calendar');
                            }}
                            style={({ pressed }) => [S.itemActionBtn, pressed && S.pressed]}
                          >
                            <Text style={S.itemActionText}>Takvim</Text>
                            <Ionicons name="calendar-outline" size={13} color={colors.subtext} />
                          </Pressable>
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              router.push({
                                pathname: '/decision-compass-detail',
                                params: {
                                  categoryKey: card.categoryKey,
                                  label: card.categoryLabel || card.activityLabel,
                                  activityLabel: card.activityLabel,
                                  score: String(Math.round(card.score)),
                                  date: query.data?.date ?? '',
                                },
                              });
                            }}
                            style={({ pressed }) => [S.itemDetailBtn, pressed && S.pressed]}
                          >
                            <Text style={S.itemDetailBtnText}>Detay</Text>
                            <Ionicons name="chevron-forward" size={13} color={colors.primary} />
                          </Pressable>
                        </View>
                      </View>

                      {expanded ? (
                        <View style={S.itemExpandedPanel}>
                          <View style={S.itemExpandedDivider} />
                          <Text style={S.itemExpandedTitle}>Kategori Açıklaması</Text>
                          <Text style={S.itemExpandedBody}>
                            {card.shortAdvice || 'Bu kategori bugün odak gerektiriyor. Tepki yerine stratejiyle ilerlemek faydalı olur.'}
                          </Text>

                          <View style={S.subActivitiesWrap}>
                            {card.items.slice(0, 4).map((sub, subIndex) => {
                              const subTint = tintForScore(sub.score, isDark);
                              return (
                                <View key={`${card.categoryKey}-${sub.activityKey}-${subIndex}`} style={S.subActivityRow}>
                                  <View style={[S.subActivityDot, { backgroundColor: subTint.text }]} />
                                  <Text style={S.subActivityLabel} numberOfLines={1}>{sub.activityLabel}</Text>
                                  <View style={[S.subActivityScorePill, { backgroundColor: subTint.bg }]}>
                                    <Text style={[S.subActivityScoreText, { color: subTint.text }]}>{Math.round(sub.score)}%</Text>
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </SpotlightTarget>
            </>
          )}
        </ScrollView>

        <Modal visible={settingsOpen} transparent animationType="fade" onRequestClose={() => setSettingsOpen(false)}>
          <View style={S.settingsBackdropRoot}>
            <Pressable style={S.settingsBackdrop} onPress={() => setSettingsOpen(false)} />
            <View style={S.settingsSheet}>
              <View style={S.settingsHeader}>
                <View style={S.settingsHeaderTextWrap}>
                  <Text style={S.settingsKicker}>KATEGORİ GÖRÜNÜRLÜĞÜ</Text>
                  <Text style={S.settingsTitle}>Karar Pusulası Ayarları</Text>
                  <Text style={S.settingsSubtitle}>Bu seçimler ana sayfa, karar pusulası ve kategori detay ekranlarında ortak kullanılır.</Text>
                </View>
                <Pressable onPress={() => setSettingsOpen(false)} style={({ pressed }) => [S.settingsCloseBtn, pressed && S.pressed]}>
                  <Ionicons name="close" size={16} color={colors.text} />
                </Pressable>
              </View>

              <ScrollView style={S.settingsScroll} contentContainerStyle={S.settingsScrollContent} showsVerticalScrollIndicator={false}>
                {cards.map((card) => {
                  const visible = !hiddenCategoryKeys.includes(card.categoryKey);
                  const tint = tintForScore(card.score, isDark);
                  return (
                    <View key={card.categoryKey} style={S.settingsRow}>
                      <View style={[S.settingsIconBubble, { backgroundColor: tint.bg }]}>
                        <Ionicons name={iconForCategory(card)} size={15} color={colors.primary} />
                      </View>
                      <View style={S.settingsRowTextWrap}>
                        <Text style={S.settingsRowTitle} numberOfLines={1}>{card.categoryLabel || card.activityLabel}</Text>
                        <Text style={S.settingsRowMeta}>{Math.round(card.score)}%</Text>
                      </View>
                      <Switch
                        value={visible}
                        onValueChange={(next) => setCategoryVisibility(card.categoryKey, next)}
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
              </ScrollView>

              <View style={S.settingsFooter}>
                <Pressable onPress={resetHiddenCategories} style={({ pressed }) => [S.settingsResetBtn, pressed && S.pressed]}>
                  <Text style={S.settingsResetBtnText}>Tümünü Göster</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeScreen>
  );
}

function makeStyles(C: ReturnType<typeof useTheme>['colors'], isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'web' ? 20 : 52,
      paddingBottom: 10,
    },
    headerBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.surfaceGlass,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
    },
    headerTitleWrap: {
      flex: 1,
    },
    headerRightRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      color: C.text,
      fontSize: 17,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    headerSub: {
      color: C.subtext,
      fontSize: 11.5,
      fontWeight: '600',
      marginTop: 1,
    },
    toolbar: {
      paddingHorizontal: 16,
      paddingBottom: 8,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    toolbarPill: {
      minHeight: 32,
      borderRadius: 16,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: C.surfaceGlass,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
    },
    toolbarPillAction: {
      backgroundColor: isDark ? 'rgba(180,148,255,0.10)' : 'rgba(122,91,234,0.08)',
    },
    toolbarSettingsPill: {
      backgroundColor: isDark ? 'rgba(180,148,255,0.08)' : 'rgba(122,91,234,0.06)',
    },
    toolbarText: {
      color: C.subtext,
      fontSize: 12,
      fontWeight: '700',
    },
    toolbarActionText: {
      color: C.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: Platform.OS === 'web' ? 40 : 96,
      paddingTop: 4,
    },
    insightCard: {
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(180,148,255,0.10)' : 'rgba(122,91,234,0.08)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(180,148,255,0.28)' : 'rgba(122,91,234,0.22)',
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 6,
      marginBottom: 10,
    },
    insightHeadRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    insightTitle: {
      color: C.primary,
      fontSize: 11.5,
      fontWeight: '800',
      letterSpacing: 0.2,
      textTransform: 'uppercase',
    },
    insightBody: {
      color: C.text,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: '600',
    },
    emptyCard: {
      borderRadius: 18,
      backgroundColor: C.surfaceGlass,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      padding: 16,
      gap: 6,
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
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(180,148,255,0.12)' : 'rgba(122,91,234,0.08)',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    retryBtnText: {
      color: C.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    listWrap: {
      gap: 10,
    },
    itemCard: {
      borderRadius: 18,
      backgroundColor: C.surfaceGlass,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      padding: 12,
      gap: 10,
      overflow: 'hidden',
    },
    itemCardExpanded: {
      paddingBottom: 10,
    },
    itemTopGlow: {
      position: 'absolute',
      top: 0,
      left: 12,
      right: 12,
      height: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
    },
    itemRowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    itemIconBubble: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: isDark ? 'rgba(180,148,255,0.10)' : 'rgba(122,91,234,0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemTitleWrap: {
      flex: 1,
      gap: 1,
    },
    itemTitle: {
      color: C.text,
      fontSize: 13.5,
      fontWeight: '800',
      letterSpacing: -0.15,
    },
    itemSubtitle: {
      color: C.subtext,
      fontSize: 11,
      fontWeight: '600',
    },
    scoreChip: {
      minWidth: 48,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    scoreChipText: {
      fontSize: 12,
      fontWeight: '800',
    },
    itemAdvice: {
      color: C.text,
      opacity: isDark ? 0.92 : 0.86,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '500',
    },
    itemFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    itemFooterActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    typePill: {
      height: 22,
      borderRadius: 11,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    typePillText: {
      color: C.subtext,
      fontSize: 10.5,
      fontWeight: '700',
    },
    itemActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      minHeight: 24,
    },
    itemActionText: {
      color: C.subtext,
      fontSize: 11,
      fontWeight: '700',
    },
    itemDetailBtn: {
      minHeight: 26,
      borderRadius: 13,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(180,148,255,0.12)' : 'rgba(122,91,234,0.08)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(122,91,234,0.05)',
    },
    itemDetailBtnText: {
      color: C.primary,
      fontSize: 11,
      fontWeight: '700',
    },
    itemExpandedPanel: {
      gap: 8,
      marginTop: -2,
    },
    itemExpandedDivider: {
      height: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(122,91,234,0.06)',
    },
    itemExpandedTitle: {
      color: C.text,
      fontSize: 11.5,
      fontWeight: '800',
      letterSpacing: -0.1,
    },
    itemExpandedBody: {
      color: C.subtext,
      fontSize: 11.5,
      lineHeight: 16,
      fontWeight: '600',
    },
    subActivitiesWrap: {
      gap: 6,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.55)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(122,91,234,0.05)',
      padding: 8,
    },
    subActivityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    subActivityDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
    subActivityLabel: {
      flex: 1,
      color: C.text,
      fontSize: 11,
      fontWeight: '600',
    },
    subActivityScorePill: {
      minWidth: 44,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    subActivityScoreText: {
      fontSize: 10,
      fontWeight: '800',
    },
    settingsBackdropRoot: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    settingsBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(5,7,12,0.34)',
    },
    settingsSheet: {
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      backgroundColor: isDark ? 'rgba(14,18,28,0.98)' : 'rgba(252,251,255,0.98)',
      borderTopWidth: 1,
      borderColor: C.surfaceGlassBorder,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: Platform.OS === 'ios' ? 26 : 16,
      maxHeight: '72%',
      gap: 10,
    },
    settingsHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    settingsHeaderTextWrap: {
      flex: 1,
      gap: 2,
    },
    settingsKicker: {
      color: C.subtext,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.1,
    },
    settingsTitle: {
      color: C.text,
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    settingsSubtitle: {
      color: C.subtext,
      fontSize: 11.5,
      lineHeight: 16,
      fontWeight: '600',
    },
    settingsCloseBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.surfaceGlass,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
    },
    settingsScroll: {
      marginHorizontal: -2,
    },
    settingsScrollContent: {
      paddingHorizontal: 2,
      paddingBottom: 2,
      gap: 8,
    },
    settingsRow: {
      borderRadius: 14,
      backgroundColor: C.surfaceGlass,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      paddingHorizontal: 10,
      paddingVertical: 9,
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
    settingsFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingTop: 2,
    },
    settingsResetBtn: {
      minHeight: 28,
      borderRadius: 14,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(180,148,255,0.12)' : 'rgba(122,91,234,0.08)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(122,91,234,0.06)',
    },
    settingsResetBtnText: {
      color: C.primary,
      fontSize: 11,
      fontWeight: '700',
    },
    pressed: {
      opacity: 0.86,
    },
  });
}
