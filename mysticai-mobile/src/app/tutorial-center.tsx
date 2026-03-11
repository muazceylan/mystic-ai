import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeScreen, SurfaceHeaderIconButton, TabHeader } from '../components/ui';
import { useTheme } from '../context/ThemeContext';
import {
  TUTORIAL_IDS,
  TUTORIAL_SCREEN_KEYS,
  useTutorial,
  type TutorialDefinition,
  type TutorialManagementStatus,
} from '../features/tutorial';
import { trackTutorialManagementCenterOpened } from '../features/tutorial/analytics/tutorialAnalytics';

interface TutorialManagementItem {
  tutorial: TutorialDefinition;
  status: TutorialManagementStatus;
  lastSeenAt: string | null;
  dontShowAgain: boolean;
}

const CORE_SCREEN_KEYS = new Set<string>([
  TUTORIAL_SCREEN_KEYS.HOME,
  TUTORIAL_SCREEN_KEYS.DAILY_TRANSITS,
  TUTORIAL_SCREEN_KEYS.COSMIC_PLANNER,
  TUTORIAL_SCREEN_KEYS.DECISION_COMPASS,
  TUTORIAL_SCREEN_KEYS.COMPATIBILITY,
]);

function mapStatus(item: { status?: string | null; dontShowAgain?: boolean | null }): TutorialManagementStatus {
  if (item.dontShowAgain) {
    return 'dismissed';
  }

  if (item.status === 'completed') {
    return 'completed';
  }

  if (item.status === 'skipped') {
    return 'skipped';
  }

  return 'not_started';
}

function formatStatusLabel(status: TutorialManagementStatus): string {
  if (status === 'completed') return 'Tamamlandı';
  if (status === 'skipped') return 'Geçildi';
  if (status === 'dismissed') return 'Bir daha gösterme';
  return 'Başlamadı';
}

function formatScreenName(screenKey: string): string {
  return screenKey
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function formatLastSeen(value: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('tr-TR');
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 12,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      color: C.text,
      fontSize: 16,
      fontWeight: '700',
    },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
    heroCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      padding: 14,
      gap: 10,
    },
    heroTitle: {
      color: C.text,
      fontSize: 16,
      fontWeight: '700',
    },
    heroBody: {
      color: C.subtext,
      fontSize: 13,
      lineHeight: 20,
    },
    heroRow: {
      flexDirection: 'row',
      gap: 10,
    },
    primaryBtn: {
      flex: 1,
      minHeight: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.primary,
    },
    primaryBtnText: {
      color: C.white,
      fontSize: 13,
      fontWeight: '700',
    },
    subtleBtn: {
      flex: 1,
      minHeight: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.surfaceAlt,
    },
    subtleBtnText: {
      color: C.text,
      fontSize: 13,
      fontWeight: '600',
    },
    sectionTitle: {
      color: C.text,
      fontSize: 14,
      fontWeight: '700',
      marginTop: 8,
      marginBottom: -4,
    },
    card: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      padding: 12,
      gap: 10,
    },
    rowTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 10,
    },
    title: {
      color: C.text,
      fontSize: 14,
      fontWeight: '700',
    },
    subtitle: {
      color: C.subtext,
      fontSize: 12,
      marginTop: 2,
    },
    badge: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 3,
      alignSelf: 'flex-start',
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
    },
    metaText: {
      color: C.subtext,
      fontSize: 11,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 8,
    },
    actionBtn: {
      flex: 1,
      minHeight: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surfaceAlt,
    },
    actionBtnText: {
      color: C.text,
      fontSize: 12,
      fontWeight: '600',
    },
    toggleRow: {
      minHeight: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: C.surfaceAlt,
    },
    toggleTitle: {
      color: C.text,
      fontSize: 12,
      fontWeight: '600',
    },
    toggleSub: {
      color: C.subtext,
      fontSize: 11,
      marginTop: 2,
    },
    emptyText: {
      color: C.subtext,
      fontSize: 13,
      textAlign: 'center',
      marginTop: 28,
    },
  });
}

export default function TutorialCenterScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const {
    getTutorialCatalog,
    getTutorialProgress,
    reopenTutorialById,
    resetTutorialById,
    resetAllTutorials,
    setDontShowAgain,
  } = useTutorial();

  const [items, setItems] = useState<TutorialManagementItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async (forceRefresh = false) => {
    const tutorials = await getTutorialCatalog(forceRefresh);
    const mapped = tutorials
      .sort((left, right) => right.priority - left.priority || left.order - right.order)
      .map((tutorial) => {
        const progress = getTutorialProgress(tutorial.tutorialId);
        return {
          tutorial,
          status: mapStatus({ status: progress?.status, dontShowAgain: progress?.dontShowAgain }),
          lastSeenAt: progress?.lastShownAt ?? null,
          dontShowAgain: Boolean(progress?.dontShowAgain),
        } satisfies TutorialManagementItem;
      });

    setItems(mapped);
  }, [getTutorialCatalog, getTutorialProgress]);

  useEffect(() => {
    trackTutorialManagementCenterOpened('profile');
    setLoading(true);
    void loadItems(true).finally(() => setLoading(false));
  }, [loadItems]);

  const sections = useMemo(() => {
    const general = items.filter((item) => item.tutorial.screenKey === TUTORIAL_SCREEN_KEYS.GLOBAL_ONBOARDING);
    const core = items.filter((item) => CORE_SCREEN_KEYS.has(item.tutorial.screenKey));
    const secondary = items.filter((item) => (
      item.tutorial.screenKey !== TUTORIAL_SCREEN_KEYS.GLOBAL_ONBOARDING
      && !CORE_SCREEN_KEYS.has(item.tutorial.screenKey)
    ));

    return { general, core, secondary };
  }, [items]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadItems(true);
    setRefreshing(false);
  }, [loadItems]);

  const handleResetAll = useCallback(() => {
    Alert.alert(
      'Tüm rehberleri sıfırla',
      'Tüm tutorial ilerlemeleri temizlenecek. Devam etmek istiyor musun?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sıfırla',
          style: 'destructive',
          onPress: () => {
            resetAllTutorials('tutorial_center');
            void loadItems();
          },
        },
      ],
    );
  }, [loadItems, resetAllTutorials]);

  const renderItem = useCallback((item: TutorialManagementItem) => {
    const { tutorial, status, lastSeenAt, dontShowAgain } = item;

    return (
      <View key={tutorial.tutorialId} style={styles.card}>
        <View style={styles.rowTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{tutorial.name}</Text>
            <Text style={styles.subtitle}>{formatScreenName(tutorial.screenKey)}</Text>
          </View>
          <View
            style={[
              styles.badge,
              {
                borderColor: status === 'completed'
                  ? '#16A34A'
                  : status === 'skipped'
                    ? '#CA8A04'
                    : status === 'dismissed'
                      ? '#64748B'
                      : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                {
                  color: status === 'completed'
                    ? '#4ADE80'
                    : status === 'skipped'
                      ? '#FACC15'
                      : status === 'dismissed'
                        ? '#CBD5E1'
                        : colors.subtext,
                },
              ]}
            >
              {formatStatusLabel(status)}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Versiyon: v{tutorial.version}</Text>
          <Text style={styles.metaText}>Son görülme: {formatLastSeen(lastSeenAt)}</Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              void reopenTutorialById(tutorial.tutorialId, 'tutorial_center');
            }}
            accessibilityRole="button"
            accessibilityLabel={`${tutorial.name} rehberini tekrar aç`}
          >
            <Text style={styles.actionBtnText}>Tekrar Aç</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              Alert.alert(
                'İlerlemeyi sıfırla',
                `${tutorial.name} için rehber ilerlemesi sıfırlansın mı?`,
                [
                  { text: 'Vazgeç', style: 'cancel' },
                  {
                    text: 'Sıfırla',
                    style: 'destructive',
                    onPress: () => {
                      void resetTutorialById(tutorial.tutorialId, 'tutorial_center').then(() => loadItems());
                    },
                  },
                ],
              );
            }}
            accessibilityRole="button"
            accessibilityLabel={`${tutorial.name} ilerlemesini sıfırla`}
          >
            <Text style={styles.actionBtnText}>İlerlemesini Sıfırla</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.toggleRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.toggleTitle}>Bir daha otomatik gösterme</Text>
            <Text style={styles.toggleSub}>Açıkken ilk kullanımda otomatik tetiklenmez.</Text>
          </View>
          <Switch
            value={dontShowAgain}
            onValueChange={(value) => {
              setDontShowAgain(tutorial.tutorialId, value, 'tutorial_center');
              void loadItems();
            }}
            trackColor={{ false: '#CBD5E1', true: '#A78BFA' }}
            thumbColor={dontShowAgain ? '#7C3AED' : '#F8FAFC'}
          />
        </View>
      </View>
    );
  }, [colors.border, loadItems, reopenTutorialById, resetTutorialById, setDontShowAgain, styles]);

  return (
    <SafeScreen>
      <View style={styles.container}>
        <TabHeader
          title="Rehber Merkezi"
          rightActions={(
            <SurfaceHeaderIconButton
              iconName="refresh-outline"
              onPress={handleRefresh}
              accessibilityLabel="Rehberi yenile"
            />
          )}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        >
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Tüm Rehberleri Buradan Yönet</Text>
            <Text style={styles.heroBody}>
              Tutorial durumlarını görebilir, tekrar açabilir, tek tek veya toplu şekilde sıfırlayabilirsin.
            </Text>
            <View style={styles.heroRow}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => {
                  void reopenTutorialById(TUTORIAL_IDS.GLOBAL_ONBOARDING, 'tutorial_center');
                }}
              >
                <Text style={styles.primaryBtnText}>Global Onboarding’i Gör</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.subtleBtn} onPress={handleResetAll}>
                <Text style={styles.subtleBtnText}>Tümünü Sıfırla</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Genel</Text>
          {sections.general.map(renderItem)}

          <Text style={styles.sectionTitle}>Ana Modüller</Text>
          {sections.core.map(renderItem)}

          <Text style={styles.sectionTitle}>Diğer Modüller</Text>
          {sections.secondary.map(renderItem)}

          {!loading && items.length === 0 ? (
            <Text style={styles.emptyText}>Henüz yönetilecek rehber bulunamadı.</Text>
          ) : null}
        </ScrollView>
      </View>
    </SafeScreen>
  );
}
