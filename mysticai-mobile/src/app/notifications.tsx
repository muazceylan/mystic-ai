import React, { useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  SectionList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeScreen, Chip, Skeleton } from '../components/ui';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useNotificationStore } from '../store/useNotificationStore';
import { NotificationItem } from '../services/notification.service';
import * as Haptics from '../utils/haptics';
import { useAuthStore } from '../store/useAuthStore';
import { openNotification } from '../utils/notificationDeepLink';
import {
  trackNotificationEvent,
  notifEventPayload,
  NotificationEvent,
} from '../utils/notificationAnalytics';

const CATEGORY_FILTERS = [
  { key: null, labelKey: 'notifCenter.filterAll' },
  { key: 'DAILY', labelKey: 'notifCenter.filterDaily' },
  { key: 'REMINDER', labelKey: 'notifCenter.filterReminders' },
  { key: 'WEEKLY', labelKey: 'notifCenter.filterWeekly' },
  { key: 'SYSTEM', labelKey: 'notifCenter.filterSystem' },
] as const;

const CATEGORY_ICONS: Record<string, string> = {
  DAILY: 'sunny-outline',
  INTRADAY: 'time-outline',
  WEEKLY: 'calendar-outline',
  REMINDER: 'alarm-outline',
  BEHAVIORAL: 'pulse-outline',
  SYSTEM: 'information-circle-outline',
};

const CATEGORY_COLOR_KEY: Record<string, keyof ThemeColors> = {
  DAILY: 'warning',
  INTRADAY: 'primary',
  WEEKLY: 'violet',
  REMINDER: 'success',
  BEHAVIORAL: 'primaryLight',
  SYSTEM: 'subtext',
};

function getRelativeTime(dateStr: string, t: (k: string) => string): string {
  const date = new Date(dateStr);
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

function getDateGroup(dateStr: string, t: (k: string) => string): string {
  const date = new Date(dateStr);
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
  t: (k: string) => string
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
  t: (k: string) => string;
  onPress: () => void;
}) {
  const isUnread = item.status === 'UNREAD';
  // unseen = hasn't appeared in notification center yet (stronger highlight)
  const isUnseen = isUnread && !item.seenAt;
  const iconName = CATEGORY_ICONS[item.category] ?? 'notifications-outline';
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
        {/* Line clamp body to 2 lines */}
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

function EmptyState({ colors, t }: { colors: ThemeColors; t: (k: string) => string }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoftBg }]}>
        <Ionicons name="notifications-off-outline" size={32} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {t('notifCenter.emptyTitle')}
      </Text>
      <Text style={[styles.emptyBody, { color: colors.subtext }]}>
        {t('notifCenter.emptyBody')}
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
  t: (k: string) => string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.warningBg }]}>
        <Ionicons name="warning-outline" size={32} color={colors.warning} />
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

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

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
    // Mark all as seen when center opens
    void markAllAsSeen();
  }, []);

  const sections = useMemo(
    () => groupNotifications(notifications, t),
    [notifications, t]
  );

  const handlePress = useCallback(
    (item: NotificationItem) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      trackNotificationEvent(NotificationEvent.ITEM_OPENED, notifEventPayload(item));
      void openNotification(item, isAuthenticated);
    },
    [isAuthenticated]
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
    [setCategory]
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
    [colors, t, handlePress]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: NotificationSection }) => (
      <View style={[styles.sectionHeaderWrap, { backgroundColor: colors.bg }]}>
        <Text style={[styles.sectionHeader, { color: colors.subtext }]}>
          {section.title}
        </Text>
      </View>
    ),
    [colors]
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
    <SafeScreen>
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('notifCenter.title')}
          </Text>
          {unreadCount > 0 ? (
            <Pressable
              onPress={handleMarkAllRead}
              style={styles.markAllBtn}
              accessibilityRole="button"
              accessibilityLabel={t('notifCenter.markAllRead')}
            >
              <Ionicons name="checkmark-done-outline" size={20} color={colors.primary} />
            </Pressable>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        {/* Category Filters */}
        <View style={styles.filtersRow}>
          {CATEGORY_FILTERS.map((f) => (
            <Chip
              key={f.key ?? 'all'}
              label={t(f.labelKey)}
              selected={activeCategory === f.key}
              variant="primary"
              size="sm"
              onPress={() => handleFilterChange(f.key)}
            />
          ))}
        </View>

        {/* Content */}
        {isLoading ? (
          <LoadingSkeleton colors={colors} />
        ) : error ? (
          <ErrorState colors={colors} t={t} onRetry={() => fetchNotifications(true)} />
        ) : notifications.length === 0 ? (
          <EmptyState colors={colors} t={t} />
        ) : (
          <SectionList
            sections={sections}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={(item) => item.id}
            stickySectionHeadersEnabled
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onEndReached={() => {
              if (hasMore) fetchMore();
            }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={renderFooter}
          />
        )}

        {/* Settings Button */}
        <View style={styles.settingsBtnContainer}>
          <Pressable
            onPress={() => router.push('/notifications-settings')}
            style={[styles.settingsBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            accessibilityRole="button"
            accessibilityLabel={t('notifCenter.settings')}
          >
            <Ionicons name="settings-outline" size={15} color={colors.text} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, lineHeight: 22, fontWeight: '700' },
  markAllBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: { width: 40 },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  listContent: { paddingBottom: 100 },
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

  // Skeleton
  skeletonContainer: { paddingHorizontal: 16, paddingTop: 12 },
  skeletonRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  skeletonContent: { flex: 1, justifyContent: 'center' },

  // Empty
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

  // Settings button
  settingsBtnContainer: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 },
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
