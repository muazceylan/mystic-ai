import { useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  SectionList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  SafeScreen,
  Skeleton,
  SurfaceHeaderIconButton,
  TabHeader,
  useBottomTabBarOffset,
} from '../../components/ui';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { useNotificationStore } from '../../store/useNotificationStore';
import { normalizeNotificationTimestamp, NotificationItem } from '../../services/notification.service';
import * as Haptics from '../../utils/haptics';
import { useAuthStore } from '../../store/useAuthStore';
import { openNotification } from '../../utils/notificationDeepLink';
import {
  trackNotificationEvent,
  notifEventPayload,
  NotificationEvent,
} from '../../utils/notificationAnalytics';
import {
  NOTIFICATION_CATEGORY_ICONS,
  STATE_ICONS,
  ACTION_ICONS,
} from '../../constants/icons';

const CATEGORY_FILTERS = [
  { key: null, labelKey: 'notifCenter.filterAll' },
  { key: 'DAILY,INTRADAY', labelKey: 'notifCenter.filterDaily' },
  { key: 'REMINDER', labelKey: 'notifCenter.filterReminders' },
  { key: 'WEEKLY', labelKey: 'notifCenter.filterWeekly' },
  { key: 'SYSTEM,BEHAVIORAL', labelKey: 'notifCenter.filterSystem' },
] as const;

const CATEGORY_COLOR_KEY: Record<string, keyof ThemeColors> = {
  DAILY: 'warning',
  INTRADAY: 'primary',
  WEEKLY: 'violet',
  REMINDER: 'success',
  BEHAVIORAL: 'primaryLight',
  SYSTEM: 'subtext',
};

function getRelativeTime(
  dateStr: string,
  t: (k: string, options?: Record<string, unknown>) => string
): string {
  const date = new Date(normalizeNotificationTimestamp(dateStr) ?? dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return t('notifCenter.justNow');
  if (diffMin < 60) return t('notifCenter.minutesAgo', { count: diffMin });
  if (diffHour < 24) return t('notifCenter.hoursAgo', { count: diffHour });
  if (diffDay === 1) return t('notifCenter.yesterday');
  if (diffDay < 7) return t('notifCenter.daysAgo', { count: diffDay });
  return date.toLocaleDateString();
}

function getDateGroup(
  dateStr: string,
  t: (k: string, options?: Record<string, unknown>) => string
): string {
  const date = new Date(normalizeNotificationTimestamp(dateStr) ?? dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (itemDate.getTime() >= today.getTime()) return t('notifCenter.today');
  if (itemDate.getTime() >= yesterday.getTime()) return t('notifCenter.yesterday');
  if (itemDate.getTime() >= weekAgo.getTime()) return t('notifCenter.thisWeek');
  return t('notifCenter.older');
}

interface NotificationSection {
  title: string;
  data: NotificationItem[];
}

function groupNotifications(
  items: NotificationItem[],
  t: (k: string, options?: Record<string, unknown>) => string
): NotificationSection[] {
  const sectionMap = new Map<string, NotificationItem[]>();

  for (const item of items) {
    const group = getDateGroup(item.createdAt, t);
    if (!sectionMap.has(group)) {
      sectionMap.set(group, []);
    }
    sectionMap.get(group)!.push(item);
  }

  return Array.from(sectionMap.entries()).map(([title, data]) => ({ title, data }));
}

function NotificationRow({
  item,
  colors,
  t,
  onPress,
}: {
  item: NotificationItem;
  colors: ThemeColors;
  t: (k: string, options?: Record<string, unknown>) => string;
  onPress: () => void;
}) {
  const isUnread = item.status === 'UNREAD';
  const isUnseen = isUnread && !item.seenAt;
  const iconName = NOTIFICATION_CATEGORY_ICONS[item.category] ?? ACTION_ICONS.notify;
  const iconColorKey = CATEGORY_COLOR_KEY[item.category] ?? 'primary';
  const iconColor = colors[iconColorKey] as string;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: isUnseen
            ? colors.primarySoftBg
            : isUnread
              ? `${colors.surface}CC`
              : colors.surface,
          borderBottomColor: colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${iconColor}18` }]}>
        <Ionicons name={iconName as any} size={18} color={iconColor} />
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <View style={styles.rowTitleWrap}>
            {isUnread && (
              <View style={[styles.dot, { backgroundColor: isUnseen ? colors.primary : colors.subtext }]} />
            )}
            <Text
              numberOfLines={1}
              style={[
                styles.rowTitle,
                { color: colors.text, fontWeight: isUnread ? '700' : '500' },
              ]}
            >
              {item.title}
            </Text>
          </View>
          <Text style={[styles.rowTime, { color: colors.subtext }]}>
            {getRelativeTime(item.createdAt, t)}
          </Text>
        </View>
        <Text numberOfLines={2} style={[styles.rowBody, { color: isUnread ? colors.text : colors.subtext }]}>
          {item.body}
        </Text>
      </View>
    </Pressable>
  );
}

function LoadingSkeleton({ colors }: { colors: ThemeColors }) {
  return (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={[styles.skeletonRow, { borderBottomColor: colors.border }]}>
          <Skeleton width={36} height={36} borderRadius={18} />
          <View style={styles.skeletonContent}>
            <Skeleton width="60%" height={14} borderRadius={4} />
            <Skeleton width="90%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

function getEmptyCopy(activeCategory: string | null) {
  switch (activeCategory) {
    case 'DAILY,INTRADAY':
      return {
        titleKey: 'notifCenter.emptyDailyTitle',
        bodyKey: 'notifCenter.emptyDailyBody',
      };
    case 'REMINDER':
      return {
        titleKey: 'notifCenter.emptyReminderTitle',
        bodyKey: 'notifCenter.emptyReminderBody',
      };
    case 'WEEKLY':
      return {
        titleKey: 'notifCenter.emptyWeeklyTitle',
        bodyKey: 'notifCenter.emptyWeeklyBody',
      };
    case 'SYSTEM,BEHAVIORAL':
      return {
        titleKey: 'notifCenter.emptySystemTitle',
        bodyKey: 'notifCenter.emptySystemBody',
      };
    default:
      return {
        titleKey: 'notifCenter.emptyTitle',
        bodyKey: 'notifCenter.emptyBody',
      };
  }
}

function EmptyState({
  colors,
  t,
  activeCategory,
}: {
  colors: ThemeColors;
  t: (k: string, options?: Record<string, unknown>) => string;
  activeCategory: string | null;
}) {
  const copy = getEmptyCopy(activeCategory);

  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoftBg }]}>
        <Ionicons name={STATE_ICONS.noNotifications} size={32} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {t(copy.titleKey)}
      </Text>
      <Text style={[styles.emptyBody, { color: colors.subtext }]}>
        {t(copy.bodyKey)}
      </Text>
    </View>
  );
}

function ErrorState({
  colors,
  t,
  onRetry,
}: {
  colors: ThemeColors;
  t: (k: string, options?: Record<string, unknown>) => string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.warningBg }]}>
        <Ionicons name={ACTION_ICONS.warning} size={32} color={colors.warning} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {t('notifCenter.errorTitle')}
      </Text>
      <Text style={[styles.emptyBody, { color: colors.subtext }]}>
        {t('notifCenter.errorBody')}
      </Text>
      <Pressable onPress={onRetry} style={[styles.retryBtn, { borderColor: colors.border }]}>
        <Text style={[styles.retryText, { color: colors.primary }]}>
          {t('notifCenter.retry')}
        </Text>
      </Pressable>
    </View>
  );
}

function NotificationFilterChip({
  label,
  selected,
  colors,
  onPress,
}: {
  label: string;
  selected: boolean;
  colors: ThemeColors;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.filterChip,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <Text style={[styles.filterChipText, { color: selected ? colors.white : colors.primary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { bottomTabBarOffset } = useBottomTabBarOffset();

  const {
    notifications,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    unreadCount,
    activeCategory,
    fetchNotifications,
    fetchMore,
    markAllAsRead,
    markAllAsSeen,
    setCategory,
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications(true);
    trackNotificationEvent(NotificationEvent.CENTER_OPENED);
    void markAllAsSeen();
  }, []);

  const sections = useMemo(
    () => groupNotifications(notifications, t),
    [notifications, t],
  );

  const handlePress = useCallback(
    (item: NotificationItem) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      trackNotificationEvent(NotificationEvent.ITEM_OPENED, notifEventPayload(item));
      void openNotification(item, isAuthenticated);
    },
    [isAuthenticated],
  );

  const handleMarkAllRead = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    trackNotificationEvent(NotificationEvent.READ_ALL);
    markAllAsRead();
  }, [markAllAsRead]);

  const handleFilterChange = useCallback(
    (key: string | null) => {
      trackNotificationEvent(NotificationEvent.FILTER_CHANGED, { filterCategory: key ?? 'ALL' });
      setCategory(key);
    },
    [setCategory],
  );

  const renderItem = useCallback(
    ({ item }: { item: NotificationItem }) => (
      <NotificationRow
        item={item}
        colors={colors}
        t={t}
        onPress={() => handlePress(item)}
      />
    ),
    [colors, t, handlePress],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: NotificationSection }) => (
      <View style={[styles.sectionHeaderWrap, { backgroundColor: colors.bg }]}>
        <Text style={[styles.sectionHeader, { color: colors.subtext }]}>
          {section.title}
        </Text>
      </View>
    ),
    [colors],
  );

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [isLoadingMore, colors.primary]);

  return (
    <SafeScreen disableBottomTabBarCompensation>
      <View style={[styles.root, { backgroundColor: 'transparent' }]}>
        <TabHeader
          title={t('notifCenter.title')}
          rightActions={
            unreadCount > 0 ? (
              <SurfaceHeaderIconButton
                iconName="checkmark-done-outline"
                onPress={handleMarkAllRead}
                accessibilityLabel={t('notifCenter.markAllRead')}
                color={colors.primary}
              />
            ) : undefined
          }
        />

        <View style={styles.filtersRail}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
            contentContainerStyle={styles.filtersRow}
            contentInsetAdjustmentBehavior="never"
          >
            {CATEGORY_FILTERS.map((f) => (
              <NotificationFilterChip
                key={f.key ?? 'all'}
                label={t(f.labelKey)}
                selected={activeCategory === f.key}
                colors={colors}
                onPress={() => handleFilterChange(f.key)}
              />
            ))}
          </ScrollView>
        </View>

        {isLoading ? (
          <LoadingSkeleton colors={colors} />
        ) : error ? (
          <ErrorState colors={colors} t={t} onRetry={() => fetchNotifications(true)} />
        ) : notifications.length === 0 ? (
          <EmptyState colors={colors} t={t} activeCategory={activeCategory} />
        ) : (
          <SectionList
            sections={sections}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={(item) => item.id}
            stickySectionHeadersEnabled
            contentContainerStyle={[styles.listContent, { paddingBottom: 12 + bottomTabBarOffset }]}
            showsVerticalScrollIndicator={false}
            onEndReached={() => {
              if (hasMore) fetchMore();
            }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={renderFooter}
          />
        )}

        <View style={[styles.settingsBtnContainer, { paddingBottom: 16 + bottomTabBarOffset }]}>
          <Pressable
            onPress={() => router.push('/(tabs)/notifications-settings')}
            style={[styles.settingsBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            accessibilityRole="button"
            accessibilityLabel={t('notifCenter.settings')}
          >
            <Ionicons name={ACTION_ICONS.settings} size={15} color={colors.text} />
            <Text style={[styles.settingsBtnText, { color: colors.text }]}>
              {t('notifCenter.settings')}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  filtersRail: {
    marginTop: 12,
    marginBottom: 6,
  },
  filtersScroll: {
    flexGrow: 0,
    height: 40,
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  filterChipText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
  },
  listContent: { paddingBottom: 12 },
  sectionHeaderWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  rowContent: { flex: 1 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  rowTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 10,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  rowTitle: { fontSize: 14, lineHeight: 18, flexShrink: 1 },
  rowTime: { fontSize: 11, lineHeight: 14 },
  rowBody: { fontSize: 12, lineHeight: 17 },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
  skeletonContainer: { paddingHorizontal: 16, paddingTop: 12 },
  skeletonRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  skeletonContent: { flex: 1, justifyContent: 'center' },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  emptyBody: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  retryBtn: {
    marginTop: 16,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  retryText: { fontSize: 14, fontWeight: '600' },
  settingsBtnContainer: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 },
  settingsBtn: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  settingsBtnText: { fontSize: 13, lineHeight: 17, fontWeight: '600' },
});
