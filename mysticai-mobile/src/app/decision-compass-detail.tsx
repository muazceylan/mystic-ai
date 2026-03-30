import React, { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCosmicSubcategoryIcon } from '../constants/icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { AppHeader, SafeScreen, SurfaceHeaderIconButton } from '../components/ui';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { fetchCosmicCategoryDetails } from '../services/cosmic.service';
import { useDecisionCompassStore } from '../store/useDecisionCompassStore';
import { useInnerHeaderSpacing } from '../hooks/useInnerHeaderSpacing';
import { useSmartBackNavigation } from '../hooks/useSmartBackNavigation';

function todayIsoDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseIsoDateLocal(input?: string | null): Date {
  if (!input) return new Date();
  const m = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(baseIso: string, delta: number): string {
  const d = parseIsoDateLocal(baseIso);
  d.setDate(d.getDate() + delta);
  return toIsoDateLocal(d);
}

function formatDateLong(input: string, locale: string): string {
  const d = parseIsoDateLocal(input);
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateShort(input: string, locale: string): string {
  const d = parseIsoDateLocal(input);
  return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
}

function sameIsoDate(a: string, b: string) {
  return a === b;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function withHexAlpha(color: string | undefined, alphaHex: string, fallback: string): string {
  const raw = (color ?? '').trim();
  if (!raw) return fallback;

  const shortHex = raw.match(/^#([0-9a-fA-F]{3})$/);
  if (shortHex) {
    const [r, g, b] = shortHex[1].split('');
    return `#${r}${r}${g}${g}${b}${b}${alphaHex}`;
  }

  if (/^#([0-9a-fA-F]{6})$/.test(raw)) {
    return `${raw}${alphaHex}`;
  }

  return fallback;
}

// iconForCosmicSubcategory has been merged into getCosmicSubcategoryIcon in src/constants/icons.ts

type TFn = (key: string, opts?: Record<string, string>) => string;

function relativeDateLabel(input: string, locale: string, t: TFn): string {
  const today = todayIsoDate();
  if (sameIsoDate(input, today)) return t('decisionCompassDetail.todayLabel');
  if (sameIsoDate(input, addDays(today, -1))) return t('decisionCompassDetail.yesterdayLabel');
  if (sameIsoDate(input, addDays(today, 1))) return t('decisionCompassDetail.tomorrowLabel');
  return formatDateShort(input, locale);
}

export default function DecisionCompassDetailScreen() {
  const params = useLocalSearchParams<{
    categoryKey?: string;
    label?: string;
    activityLabel?: string;
    score?: string;
    date?: string;
  }>();
  const { colors, isDark } = useTheme();
  const { i18n, t } = useTranslation();
  const tFn = t as TFn;
  const { width } = useWindowDimensions();
  const goBack = useSmartBackNavigation({ fallbackRoute: '/(tabs)/home' });
  const { headerPaddingTop, headerPaddingBottom, headerHorizontalPadding } = useInnerHeaderSpacing();
  const user = useAuthStore((s) => s.user);
  const hiddenCategoryKeys = useDecisionCompassStore((s) => s.hiddenCategoryKeys);
  const setCategoryVisibility = useDecisionCompassStore((s) => s.setCategoryVisibility);
  const resetHiddenCategories = useDecisionCompassStore((s) => s.resetHiddenCategories);

  const categoryKey = typeof params.categoryKey === 'string' ? params.categoryKey : '';
  const label = typeof params.label === 'string' ? params.label : t('decisionCompassDetail.labelFallback');
  const activityLabel = typeof params.activityLabel === 'string' ? params.activityLabel : '';
  const initialDate = typeof params.date === 'string' && params.date ? params.date : todayIsoDate();
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const scoreText = typeof params.score === 'string' ? params.score : null;
  const isCategoryHidden = !!categoryKey && hiddenCategoryKeys.includes(categoryKey);

  const query = useQuery({
    queryKey: ['cosmic', 'category-details', user?.id ?? 0, categoryKey, selectedDate, user?.preferredLanguage ?? i18n.language],
    queryFn: async () => {
      if (!user?.id || !categoryKey) throw new Error('missing params');
      const res = await fetchCosmicCategoryDetails({
        userId: user.id,
        categoryKey,
        date: selectedDate,
        locale: user.preferredLanguage ?? i18n.language,
        gender: user.gender,
        maritalStatus: user.maritalStatus,
      });
      return res.data;
    },
    enabled: !!user?.id && !!categoryKey && !isCategoryHidden,
    staleTime: 1000 * 60 * 60,
  });

  const detail = query.data?.category;
  const S = makeStyles(colors, isDark, {
    headerPaddingTop,
    headerPaddingBottom,
    headerHorizontalPadding,
  });
  const contentMaxWidth = Platform.OS === 'web' ? Math.min(860, width - 24) : undefined;

  const highlights = useMemo(() => {
    if (!detail) return [] as string[];
    return [...(detail.dos ?? []), ...(detail.supportingAspects ?? [])].filter(Boolean).slice(0, 6);
  }, [detail]);

  const liveScoreText = typeof detail?.score === 'number' ? String(Math.round(detail.score)) : scoreText;
  const datePresets = useMemo(
    () =>
      [-3, -2, -1, 0, 1, 2, 3].map((offset) => {
        const iso = addDays(selectedDate, offset);
        return { iso, label: relativeDateLabel(iso, i18n.language, tFn) };
      }),
    [selectedDate],
  );
  const isDateRefreshing = query.isFetching && !!query.data;

  const handleDatePickerChange = (event: DateTimePickerEvent, value?: Date) => {
    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }
    if (event.type === 'dismissed' || !value) return;
    setSelectedDate(toIsoDateLocal(value));
  };

  return (
    <SafeScreen>
      <View style={S.container}>
        <AppHeader
          title={label}
          subtitle={activityLabel || t('decisionCompassDetail.subtitleFallback')}
          onBack={goBack}
          rightActions={(
            <SurfaceHeaderIconButton
              iconName="calendar-outline"
              onPress={() => router.push('/(tabs)/calendar')}
              accessibilityLabel={t('decisionCompassDetail.calendarA11y')}
            />
          )}
        />

        <ScrollView
          style={S.scroll}
          contentContainerStyle={[S.scrollContent, contentMaxWidth ? { width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' } : null]}
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
          <View style={S.heroCard}>
            <View style={S.heroTopGlow} />
            <View style={S.heroRow}>
              <View style={S.heroLeft}>
                <Text style={S.heroLabel}>{t('decisionCompassDetail.heroLabel')}</Text>
                <Text style={S.heroTitle} numberOfLines={2}>{label}</Text>
                <Text style={S.heroDate}>{formatDateLong(selectedDate, i18n.language)}</Text>
              </View>
              {liveScoreText ? (
                <View style={S.heroScorePill}>
                  <Text style={S.heroScoreValue}>{liveScoreText}</Text>
                  <Text style={S.heroScoreSub}>{t('decisionCompassDetail.heroScoreSub')}</Text>
                </View>
              ) : null}
            </View>
            <View style={S.datePickerRow}>
              <Pressable onPress={() => setSelectedDate((prev) => addDays(prev, -1))} style={({ pressed }) => [S.dateStepBtn, pressed && S.pressed]}>
                <Ionicons name="chevron-back" size={14} color={colors.subtext} />
              </Pressable>
              <Pressable
                onPress={() => {
                  if (Platform.OS === 'web') return;
                  setShowDatePicker((v) => !v);
                }}
                style={({ pressed }) => [S.dateCenterPill, pressed && S.pressed]}
              >
                <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                <Text style={S.dateCenterText}>{formatDateLong(selectedDate, i18n.language)}</Text>
              </Pressable>
              <Pressable onPress={() => setSelectedDate((prev) => addDays(prev, 1))} style={({ pressed }) => [S.dateStepBtn, pressed && S.pressed]}>
                <Ionicons name="chevron-forward" size={14} color={colors.subtext} />
              </Pressable>
              <Pressable onPress={() => setSelectedDate(todayIsoDate())} style={({ pressed }) => [S.dateTodayBtn, pressed && S.pressed]}>
                <Text style={S.dateTodayText}>{t('decisionCompassDetail.todayBtn')}</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={S.datePresetScrollContent}
              style={S.datePresetScroll}
            >
              {datePresets.map((preset) => {
                const active = preset.iso === selectedDate;
                return (
                  <Pressable
                    key={preset.iso}
                    onPress={() => setSelectedDate(preset.iso)}
                    style={({ pressed }) => [
                      S.datePresetChip,
                      active && S.datePresetChipActive,
                      pressed && S.pressed,
                    ]}
                  >
                    <Text style={[S.datePresetText, active && S.datePresetTextActive]}>{preset.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {Platform.OS !== 'web' && showDatePicker ? (
              <View style={S.datePickerNativeWrap}>
                <DateTimePicker
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  value={parseIsoDateLocal(selectedDate)}
                  onChange={handleDatePickerChange}
                  maximumDate={new Date(2100, 11, 31)}
                  minimumDate={new Date(2000, 0, 1)}
                />
              </View>
            ) : null}
            <View style={S.dateHintRow}>
              <Ionicons
                name={isDateRefreshing ? 'sync-outline' : 'sparkles-outline'}
                size={13}
                color={isDateRefreshing ? colors.primary : colors.subtext}
              />
              <Text style={[S.dateHintText, isDateRefreshing && S.dateHintTextActive]}>
                {isDateRefreshing
                  ? t('decisionCompassDetail.loadingDateHint', { date: formatDateLong(selectedDate, i18n.language) })
                  : t('decisionCompassDetail.dateHint')}
              </Text>
            </View>
            {detail?.reasoning ? (
              <Text style={S.heroBody}>{detail.reasoning}</Text>
            ) : (
              <Text style={S.heroBodyMuted}>{t('decisionCompassDetail.noDetailMsg')}</Text>
            )}
          </View>

          {isCategoryHidden ? (
            <View style={S.panel}>
              <Text style={S.panelTitle}>{t('decisionCompassDetail.hiddenCategoryTitle')}</Text>
              <Text style={S.panelText}>
                {t('decisionCompassDetail.hiddenCategoryBody')}
              </Text>
              <View style={S.hiddenActionsRow}>
                <Pressable
                  onPress={() => setCategoryVisibility(categoryKey, true)}
                  style={({ pressed }) => [S.retryBtn, pressed && S.pressed]}
                >
                  <Text style={S.retryBtnText}>{t('decisionCompassDetail.showCategoryBtn')}</Text>
                </Pressable>
                <Pressable
                  onPress={resetHiddenCategories}
                  style={({ pressed }) => [S.hiddenGhostBtn, pressed && S.pressed]}
                >
                  <Text style={S.hiddenGhostBtnText}>{t('decisionCompassDetail.showAllBtn')}</Text>
                </Pressable>
              </View>
            </View>
          ) : query.isLoading ? (
            <View style={S.panel}><Text style={S.panelText}>{t('decisionCompassDetail.loadingPanel')}</Text></View>
          ) : query.isError ? (
            <View style={S.panel}>
              <Text style={S.panelTitle}>{t('decisionCompassDetail.errorTitle')}</Text>
              <Text style={S.panelText}>{t('decisionCompassDetail.errorBody')}</Text>
              <Pressable onPress={() => { void query.refetch(); }} style={({ pressed }) => [S.retryBtn, pressed && S.pressed]}>
                <Text style={S.retryBtnText}>{t('decisionCompassDetail.retryBtn')}</Text>
              </Pressable>
            </View>
          ) : detail ? (
            <>
              <View style={S.panel}>
                <Text style={S.panelTitle}>{t('decisionCompassDetail.dosTitle')}</Text>
                {(detail.dos?.length ? detail.dos : [t('decisionCompassDetail.dosFallback')]).map((item, idx) => (
                  <View key={`do-${idx}`} style={S.bulletRow}>
                    <View style={[S.bulletDot, { backgroundColor: colors.success }]} />
                    <Text style={S.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>

              <View style={S.panel}>
                <Text style={S.panelTitle}>{t('decisionCompassDetail.dontsTitle')}</Text>
                {(detail.donts?.length ? detail.donts : [t('decisionCompassDetail.dontsFallback')]).map((item, idx) => (
                  <View key={`dont-${idx}`} style={S.bulletRow}>
                    <View style={[S.bulletDot, { backgroundColor: isDark ? '#E5B6C6' : '#B45E79' }]} />
                    <Text style={S.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>

              {highlights.length ? (
                <View style={S.panel}>
                  <Text style={S.panelTitle}>{t('decisionCompassDetail.highlightsTitle')}</Text>
                  <View style={S.tagWrap}>
                    {highlights.map((item, idx) => (
                      <View key={`hl-${idx}`} style={S.tagPill}>
                        <Text style={S.tagText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={S.panel}>
                <View style={S.panelHeaderRow}>
                  <Text style={S.panelTitle}>{t('decisionCompassDetail.starCategoriesTitle')}</Text>
                  <Text style={S.panelMeta}>{t('decisionCompassDetail.starCategoriesCount', { count: detail.subcategories?.length ?? 0 })}</Text>
                </View>
                <View style={S.subAnalysisList}>
                  {(detail.subcategories ?? []).slice(0, 8).map((sub, idx) => {
                    const subColor = sub.colorHex || colors.primary;
                    const score = clampPercent(sub.score);
                    const insightText = sub.insight || sub.shortAdvice || t('decisionCompassDetail.subcategoryFallbackInsight');
                    const technicalText = sub.technicalExplanation?.trim() || '';

                    return (
                      <View key={`${sub.subCategoryKey}-${idx}`} style={S.subAnalysisCard}>
                        <View style={S.subAnalysisGlowWrap}>
                          <View style={[S.subAnalysisGlow, { backgroundColor: subColor, shadowColor: subColor }]} />
                        </View>

                        <View style={S.subAnalysisContent}>
                          <View style={S.subAnalysisTopRow}>
                            <View style={S.subAnalysisLeft}>
                              <View
                                style={[
                                  S.subAnalysisIconWrap,
                                  {
                                    backgroundColor: withHexAlpha(subColor, '18', isDark ? 'rgba(255,255,255,0.06)' : 'rgba(122,91,234,0.08)'),
                                    borderColor: withHexAlpha(subColor, '33', isDark ? 'rgba(255,255,255,0.08)' : 'rgba(122,91,234,0.12)'),
                                  },
                                ]}
                              >
                                <Ionicons
                                  name={getCosmicSubcategoryIcon(categoryKey, sub.subCategoryKey)}
                                  size={14}
                                  color={subColor}
                                />
                              </View>
                              <View style={S.subAnalysisTextWrap}>
                                <Text style={S.subAnalysisName} numberOfLines={1}>{sub.label}</Text>
                                <Text style={S.subAnalysisInsight} numberOfLines={3}>
                                  {insightText}
                                </Text>
                              </View>
                            </View>
                            <Text style={S.subAnalysisScore}>%{score}</Text>
                          </View>

                          {!!technicalText && (
                            <Text style={S.subAnalysisTechnical} numberOfLines={3}>
                              {technicalText}
                            </Text>
                          )}

                          <View style={S.subAnalysisBarTrack}>
                            <View style={[S.subAnalysisBarFill, { width: `${score}%`, backgroundColor: subColor }]} />
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeScreen>
  );
}

function makeStyles(
  C: ReturnType<typeof useTheme>['colors'],
  isDark: boolean,
  headerLayout: {
    headerPaddingTop: number;
    headerPaddingBottom: number;
    headerHorizontalPadding: number;
  },
) {
  const isAndroid = Platform.OS === 'android';
  const insetSurfaceBg = isAndroid ? (isDark ? C.surfaceAlt : C.surface) : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.68)');
  const insetSurfaceBorder = isAndroid ? C.borderLight : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(122,91,234,0.05)');
  const accentInsetBg = isAndroid ? C.primaryTint : (isDark ? 'rgba(180,148,255,0.12)' : 'rgba(122,91,234,0.08)');
  const accentInsetBorder = isAndroid ? C.borderLight : (isDark ? 'rgba(180,148,255,0.16)' : 'rgba(122,91,234,0.08)');
  const topGlowColor = isAndroid ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.88)') : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)');

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: headerLayout.headerHorizontalPadding,
      paddingTop: headerLayout.headerPaddingTop,
      paddingBottom: headerLayout.headerPaddingBottom,
    },
    headerBtn: {
      width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
      backgroundColor: C.surfaceGlass, borderWidth: 1, borderColor: C.surfaceGlassBorder,
    },
    headerTitleWrap: { flex: 1 },
    headerTitle: { color: C.text, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
    headerSub: { color: C.subtext, fontSize: 11.5, fontWeight: '600', marginTop: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 130 : Platform.OS === 'web' ? 40 : 88, gap: 10 },
    heroCard: {
      borderRadius: 20,
      backgroundColor: C.surfaceGlass,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      padding: 14,
      gap: 10,
      overflow: 'hidden',
    },
    heroTopGlow: {
      position: 'absolute', top: 0, left: 14, right: 14, height: 1,
      backgroundColor: topGlowColor,
    },
    heroRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
    heroLeft: { flex: 1 },
    heroLabel: { color: C.subtext, fontSize: 11, fontWeight: '700' },
    heroTitle: { color: C.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginTop: 2 },
    heroDate: { color: C.subtext, fontSize: 11.5, fontWeight: '600', marginTop: 4 },
    heroScorePill: {
      minWidth: 56, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
      backgroundColor: accentInsetBg, paddingHorizontal: 10,
    },
    heroScoreValue: { color: C.primary, fontSize: 14, fontWeight: '800' },
    heroScoreSub: { color: C.subtext, fontSize: 9.5, fontWeight: '700' },
    heroBody: { color: C.text, fontSize: 12.5, lineHeight: 18, fontWeight: '500' },
    heroBodyMuted: { color: C.subtext, fontSize: 12, lineHeight: 18, fontWeight: '500' },
    datePickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    dateStepBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: insetSurfaceBg,
      borderWidth: 1,
      borderColor: insetSurfaceBorder,
    },
    dateCenterPill: {
      minHeight: 28,
      borderRadius: 14,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: accentInsetBg,
      borderWidth: 1,
      borderColor: accentInsetBorder,
    },
    dateCenterText: { color: C.text, fontSize: 11.5, fontWeight: '700' },
    dateTodayBtn: {
      minHeight: 28,
      borderRadius: 14,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.surfaceGlass,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
    },
    dateTodayText: { color: C.primary, fontSize: 11.5, fontWeight: '700' },
    datePickerNativeWrap: {
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: insetSurfaceBg,
      borderWidth: 1,
      borderColor: insetSurfaceBorder,
      marginTop: 2,
    },
    datePresetScroll: {
      marginTop: 0,
      marginHorizontal: -2,
    },
    datePresetScrollContent: {
      paddingHorizontal: 2,
      paddingVertical: 2,
      gap: 6,
    },
    datePresetChip: {
      minHeight: 32,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 6,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: insetSurfaceBg,
      borderWidth: 1,
      borderColor: insetSurfaceBorder,
    },
    datePresetChipActive: {
      backgroundColor: accentInsetBg,
      borderColor: accentInsetBorder,
    },
    datePresetText: {
      color: C.subtext,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '700',
    },
    datePresetTextActive: {
      color: C.primary,
    },
    dateHintRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: -1,
    },
    dateHintText: {
      flex: 1,
      color: C.subtext,
      fontSize: 11,
      lineHeight: 15,
      fontWeight: '600',
    },
    dateHintTextActive: {
      color: C.text,
    },
    panel: {
      borderRadius: 18, backgroundColor: C.surfaceGlass, borderWidth: 1, borderColor: C.surfaceGlassBorder,
      padding: 14, gap: 8,
    },
    panelHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    panelTitle: { color: C.text, fontSize: 14.5, fontWeight: '800' },
    panelMeta: { color: C.subtext, fontSize: 11, fontWeight: '700' },
    panelText: { color: C.subtext, fontSize: 12, lineHeight: 18, fontWeight: '500' },
    bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
    bulletText: { flex: 1, color: C.text, fontSize: 12.5, lineHeight: 18, fontWeight: '500' },
    tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tagPill: {
      borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6,
      backgroundColor: isAndroid ? C.primaryTint : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(122,91,234,0.05)'),
      borderWidth: 1, borderColor: isAndroid ? C.borderLight : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(122,91,234,0.06)'),
    },
    tagText: { color: C.subtext, fontSize: 11, fontWeight: '700' },
    subAnalysisList: {
      gap: 10,
    },
    subAnalysisCard: {
      borderRadius: 14,
      backgroundColor: insetSurfaceBg,
      borderWidth: 1,
      borderColor: insetSurfaceBorder,
      overflow: 'hidden',
      padding: 10,
      gap: 9,
    },
    subAnalysisGlowWrap: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    subAnalysisGlow: {
      height: 2,
      opacity: isDark ? 0.42 : 0.55,
      shadowOpacity: isDark ? 0.28 : 0.2,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
    },
    subAnalysisContent: {
      gap: 8,
    },
    subAnalysisTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
    },
    subAnalysisLeft: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      flex: 1,
      minWidth: 0,
    },
    subAnalysisIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    subAnalysisTextWrap: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    subAnalysisName: {
      color: C.text,
      fontSize: 12.5,
      fontWeight: '700',
    },
    subAnalysisInsight: {
      color: C.subtext,
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '500',
    },
    subAnalysisScore: {
      color: C.primary,
      fontSize: 12.5,
      fontWeight: '800',
      minWidth: 42,
      textAlign: 'right',
    },
    subAnalysisTechnical: {
      color: C.subtext,
      fontSize: 10.5,
      lineHeight: 15,
      fontWeight: '500',
    },
    subAnalysisBarTrack: {
      height: 6,
      borderRadius: 999,
      backgroundColor: isAndroid ? C.primaryTint : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(122,91,234,0.08)'),
      overflow: 'hidden',
    },
    subAnalysisBarFill: {
      height: '100%',
      borderRadius: 999,
    },
    hiddenActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 2,
    },
    hiddenGhostBtn: {
      alignSelf: 'flex-start',
      marginTop: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      backgroundColor: C.surfaceGlass,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    hiddenGhostBtnText: {
      color: C.subtext,
      fontSize: 12,
      fontWeight: '700',
    },
    retryBtn: {
      alignSelf: 'flex-start', marginTop: 4, borderRadius: 12,
      backgroundColor: accentInsetBg,
      paddingHorizontal: 12, paddingVertical: 8,
    },
    retryBtnText: { color: C.primary, fontSize: 12, fontWeight: '700' },
    pressed: { opacity: 0.86 },
  });
}
