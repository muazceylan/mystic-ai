import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Animated,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import OnboardingBackground from '../../components/OnboardingBackground';
import { useAuthStore } from '../../store/useAuthStore';
import { useNatalChartStore } from '../../store/useNatalChartStore';
import { useLuckyDatesStore } from '../../store/useLuckyDatesStore';
import axios from 'axios/dist/browser/axios.cjs';
import {
  GoalCategory,
  LuckyDateCard,
  calculateLuckyDates,
  fetchLuckyDatesByCorrelationId,
} from '../../services/lucky-dates.service';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { SafeScreen } from '../../components/ui';

interface CategoryOption {
  key: GoalCategory;
  label: string;
  emoji: string;
}

const CATEGORY_KEYS = [
  { key: 'MARRIAGE' as const, labelKey: 'calendar.marriage', emoji: '\uD83D\uDC8D' },
  { key: 'CAREER' as const, labelKey: 'calendar.career', emoji: '\uD83D\uDCBC' },
  { key: 'CONTRACT' as const, labelKey: 'calendar.contract', emoji: '\u270D\uFE0F' },
  { key: 'NEW_BEGINNING' as const, labelKey: 'calendar.newBeginning', emoji: '\uD83D\uDE80' },
];

function formatLocaleDate(dateStr: string, months: string[], days: string[]): string {
  const date = new Date(dateStr);
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${days[date.getDay()]}`;
}

function getScoreColor(score: number, colors: { green: string; yellow: string; orange: string }): string {
  if (score >= 80) return colors.green;
  if (score >= 60) return colors.yellow;
  return colors.orange;
}

function openCalendarEvent(dateStr: string, category: string, cosmicWindowLabel: string) {
  const date = new Date(dateStr);
  const endDate = new Date(date);
  endDate.setHours(endDate.getHours() + 1);

  const title = encodeURIComponent(`${cosmicWindowLabel} - ${category}`);
  const startISO = date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const endISO = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  // Google Calendar deep link works on both platforms
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startISO}/${endISO}`;
  Linking.openURL(url);
}

export default function CalendarScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const CATEGORIES = CATEGORY_KEYS.map((c) => ({ ...c, label: t(c.labelKey) }));
  const months = t('calendar.months').split(',');
  const days = t('calendar.days').split(',');
  const styles = makeStyles(colors);
  const user = useAuthStore((s) => s.user);
  const chart = useNatalChartStore((s) => s.chart);
  const router = useRouter();

  const {
    results,
    activeCategory,
    isLoading,
    error,
    pollingCorrelationId,
    setResult,
    setActiveCategory,
    setLoading,
    setError,
    setPollingCorrelationId,
  } = useLuckyDatesStore();

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const currentResult = results[activeCategory];

  // Fetch lucky dates when category changes
  const fetchDates = useCallback(async () => {
    if (!user?.id || !chart) return;

    setLoading(true);
    setError(null);
    try {
      const response = await calculateLuckyDates({
        userId: user.id,
        goalCategory: activeCategory,
        monthsAhead: 3,
      });
      setResult(activeCategory, response.data);
      setPollingCorrelationId(response.data.correlationId);

      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const msg = err.response?.data?.message as string | undefined;
        if (status === 404 && msg?.includes('Natal chart not found')) {
          setError(t('calendar.errors.natalChartNotFound'));
        } else if (status === 400) {
          setError(msg || t('calendar.errors.invalidRequest'));
        } else {
          setError(t('calendar.errors.serviceUnavailable'));
        }
      } else {
        setError(t('calendar.errors.connectionError'));
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, chart, activeCategory]);

  // Poll for AI interpretation
  useEffect(() => {
    if (!pollingCorrelationId) return;
    if (currentResult?.status === 'COMPLETED' || currentResult?.status === 'FAILED') {
      setPollingCorrelationId(null);
      return;
    }

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetchLuckyDatesByCorrelationId(pollingCorrelationId);
        if (res.data.status === 'COMPLETED' || res.data.status === 'FAILED') {
          setResult(activeCategory, res.data);
          setPollingCorrelationId(null);
        }
      } catch {
        // silently continue polling
      }
    }, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [pollingCorrelationId, currentResult?.status, activeCategory]);

  // Auto-fetch when category changes and no cached result
  useEffect(() => {
    if (chart && !currentResult && !isLoading) {
      fetchDates();
    }
  }, [activeCategory, chart]);

  const handleCategoryPress = (cat: GoalCategory) => {
    setActiveCategory(cat);
  };

  // No natal chart state
  if (!chart) {
    return (
      <SafeScreen edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <OnboardingBackground />
        <View style={styles.emptyContainer}>
          <Ionicons name="planet-outline" size={64} color={colors.primary} />
          <Text style={styles.emptyTitle}>Do\u011Fum Haritan\u0131z Gerekli</Text>
          <Text style={styles.emptyText}>
            Kozmik Planlay\u0131c\u0131'y\u0131 kullanabilmek i\u00E7in \u00F6nce do\u011Fum haritan\u0131z\u0131n hesaplanmas\u0131 gerekiyor.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/(tabs)/natal-chart')}
            accessibilityLabel="Doğum haritası oluştur"
            accessibilityRole="button"
          >
            <Text style={styles.emptyButtonText}>Do\u011Fum Haritas\u0131 Olu\u015Ftur</Text>
          </TouchableOpacity>
        </View>
        </View>
      </SafeScreen>
    );
  }

  const renderDateCard = ({ item }: { item: LuckyDateCard }) => {
    const scoreColor = getScoreColor(item.successScore, colors);
    const categoryLabel = CATEGORIES.find((c) => c.key === activeCategory)?.label ?? '';

    return (
      <View style={styles.dateCard}>
        <View style={styles.dateCardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateCardDate}>{formatLocaleDate(item.date, months, days)}</Text>
            {item.mercuryRetrograde && (
              <View style={styles.retroBadge}>
                <Text style={styles.retroBadgeText}>{t('calendar.mercuryRetro')}</Text>
              </View>
            )}
          </View>
          <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
            <Text style={[styles.scoreText, { color: scoreColor }]}>%{item.successScore}</Text>
            <Text style={styles.scoreLabel}>{t('calendar.compatibility')}</Text>
          </View>
        </View>

        <Text style={styles.dateCardReason}>{item.reason}</Text>

        {item.supportingAspects.length > 0 && (
          <View style={styles.aspectPills}>
            {item.supportingAspects.map((aspect, idx) => (
              <View key={idx} style={styles.aspectPill}>
                <Text style={styles.aspectPillText}>{aspect}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.dateCardFooter}>
          <View style={styles.moonPhaseRow}>
            <Ionicons name="moon-outline" size={14} color={colors.subtext} />
            <Text style={styles.moonPhaseText}>{item.moonPhase}</Text>
          </View>
          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => openCalendarEvent(item.date, categoryLabel, t('calendar.cosmicWindow'))}
            accessibilityLabel="Takvime ekle"
            accessibilityRole="button"
          >
            <Ionicons name="calendar-outline" size={14} color={colors.primary} />
            <Text style={styles.calendarButtonText}>{t('calendar.addToCalendar')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeScreen edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <OnboardingBackground />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="calendar" size={22} color={colors.primary} />
          <Text style={styles.headerTitle}>Kozmik Planlay\u0131c\u0131</Text>
        </View>

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContainer}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                onPress={() => handleCategoryPress(cat.key)}
                accessibilityLabel={cat.label}
                accessibilityRole="button"
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Kozmik pencereler hesaplan\u0131yor...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={32} color={colors.red} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchDates}
              accessibilityLabel="Tekrar dene"
              accessibilityRole="button"
            >
              <Text style={styles.retryButtonText}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        ) : currentResult ? (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Hook Card */}
            {currentResult.hookText && (
              <View style={styles.hookCard}>
                <View style={styles.hookHeader}>
                  <Ionicons name="sparkles" size={16} color={colors.primary} />
                  <Text style={styles.hookTitle}>Kozmik Analiz</Text>
                </View>
                <Text style={styles.hookText}>{currentResult.hookText}</Text>
              </View>
            )}

            {/* Date Cards */}
            <FlatList
              data={currentResult.luckyDates}
              keyExtractor={(item) => item.date}
              renderItem={renderDateCard}
              scrollEnabled={false}
              contentContainerStyle={styles.dateCardsContainer}
            />

            {/* AI Interpretation */}
            <View style={styles.aiSection}>
              <View style={styles.aiHeader}>
                <Ionicons name="sparkles" size={16} color={colors.accent} />
                <Text style={styles.aiTitle}>Kozmik Yorum</Text>
              </View>
              {currentResult.status === 'COMPLETED' && currentResult.aiInterpretation ? (
                <Text style={styles.aiText}>{currentResult.aiInterpretation}</Text>
              ) : currentResult.status === 'FAILED' ? (
                <View style={styles.aiErrorBlock}>
                  <Text style={styles.aiErrorText}>
                    Kozmik yorum olu\u015Fturulurken bir sorun ya\u015Fand\u0131. Yeniden deneyebilirsin.
                  </Text>
                  <TouchableOpacity
                    style={styles.aiRetryButton}
                    onPress={fetchDates}
                    accessibilityLabel="Kozmik yorumu tekrar dene"
                    accessibilityRole="button"
                  >
                    <Text style={styles.aiRetryButtonText}>Tekrar Dene</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.aiLoading}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={styles.aiLoadingText}>
                    Y\u0131ld\u0131zlar\u0131n mesaj\u0131 \u00E7\u00F6z\u00FCml\u00FCyor...
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        ) : null}
      </ScrollView>
      </View>
    </SafeScreen>
  );
}

function makeStyles(C: {
  background: string;
  text: string;
  subtext: string;
  surface: string;
  card: string;
  border: string;
  primary: string;
  primarySoft: string;
  red: string;
  orange: string;
  accent: string;
  accentSoft: string;
  neutralBg: string;
}) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
  },

  // Categories
  categoryContainer: {
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  categoryPillActive: {
    backgroundColor: C.primarySoft,
    borderColor: C.primary,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.subtext,
  },
  categoryLabelActive: {
    color: C.primary,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: C.subtext,
    fontStyle: 'italic',
  },

  // Error
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
    marginHorizontal: 20,
  },
  errorText: {
    fontSize: 14,
    color: C.red,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: C.primarySoft,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.primary,
  },

  // Hook Card
  hookCard: {
    marginHorizontal: 20,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  hookHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  hookTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
  },
  hookText: {
    fontSize: 14,
    color: C.text,
    lineHeight: 21,
  },

  // Date Cards
  dateCardsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  dateCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  dateCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dateCardDate: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  retroBadge: {
    marginTop: 6,
    backgroundColor: C.neutralBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  retroBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.orange,
  },
  scoreCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 8,
    color: C.subtext,
    marginTop: 1,
  },
  dateCardReason: {
    fontSize: 13,
    color: C.subtext,
    lineHeight: 19,
    marginBottom: 10,
  },
  aspectPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  aspectPill: {
    backgroundColor: C.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  aspectPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.accent,
  },
  dateCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 10,
  },
  moonPhaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  moonPhaseText: {
    fontSize: 12,
    color: C.subtext,
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: C.primarySoft,
  },
  calendarButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.primary,
  },

  // AI Section
  aiSection: {
    marginTop: 20,
    marginHorizontal: 20,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  aiTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.accent,
  },
  aiText: {
    fontSize: 14,
    color: C.text,
    lineHeight: 22,
  },
  aiErrorBlock: {
    gap: 12,
    marginTop: 4,
  },
  aiErrorText: {
    fontSize: 13,
    color: C.red,
    fontStyle: 'italic',
  },
  aiRetryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: C.primary,
    minHeight: 44,
    justifyContent: 'center',
  },
  aiRetryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.white,
  },
  aiLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  aiLoadingText: {
    fontSize: 13,
    color: C.subtext,
    fontStyle: 'italic',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: C.subtext,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
    backgroundColor: C.primary,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.white,
  },
  });
}
