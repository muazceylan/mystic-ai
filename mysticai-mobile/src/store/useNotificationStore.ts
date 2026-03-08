import { create } from 'zustand';
import {
  notificationService,
  NotificationItem,
  NotificationPreferences,
  UpdatePreferencesPayload,
} from '../services/notification.service';

interface NotificationState {
  notifications: NotificationItem[];
  totalPages: number;
  currentPage: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  unreadCount: number;
  preferences: NotificationPreferences | null;
  preferencesLoading: boolean;
  activeCategory: string | null;

  fetchNotifications: (reset?: boolean) => Promise<void>;
  fetchMore: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markAsSeen: (id: string) => Promise<void>;
  markAllAsSeen: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  setCategory: (category: string | null) => void;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (payload: UpdatePreferencesPayload) => Promise<void>;
  registerPushToken: (token: string, platform: string) => Promise<void>;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  totalPages: 0,
  currentPage: 0,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  hasMore: true,
  unreadCount: 0,
  preferences: null,
  preferencesLoading: false,
  activeCategory: null,

  fetchNotifications: async (reset = true) => {
    const { activeCategory } = get();
    set({ isLoading: true, error: null });
    if (reset) set({ notifications: [], currentPage: 0 });
    try {
      const data = await notificationService.getNotifications(0, 20, activeCategory ?? undefined);
      set({
        notifications: data.content,
        totalPages: data.totalPages,
        currentPage: 0,
        hasMore: !data.last,
        isLoading: false,
      });
    } catch (e: any) {
      set({ error: e?.message ?? 'Failed to load notifications', isLoading: false });
    }
  },

  fetchMore: async () => {
    const { currentPage, hasMore, isLoadingMore, activeCategory } = get();
    if (!hasMore || isLoadingMore) return;
    set({ isLoadingMore: true });
    try {
      const nextPage = currentPage + 1;
      const data = await notificationService.getNotifications(nextPage, 20, activeCategory ?? undefined);
      set((s) => ({
        notifications: [...s.notifications, ...data.content],
        currentPage: nextPage,
        hasMore: !data.last,
        isLoadingMore: false,
      }));
    } catch {
      set({ isLoadingMore: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const count = await notificationService.getUnreadCount();
      set({ unreadCount: count });
    } catch {}
  },

  markAsRead: async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      set((s) => ({
        notifications: s.notifications.map((n) =>
          n.id === id ? { ...n, status: 'READ' as const, readAt: new Date().toISOString() } : n
        ),
        unreadCount: Math.max(0, s.unreadCount - 1),
      }));
    } catch {}
  },

  markAllAsRead: async () => {
    try {
      await notificationService.markAllAsRead();
      const now = new Date().toISOString();
      set((s) => ({
        notifications: s.notifications.map((n) => ({
          ...n,
          status: 'READ' as const,
          readAt: n.readAt ?? now,
          seenAt: n.seenAt ?? now,
        })),
        unreadCount: 0,
      }));
    } catch {}
  },

  markAsSeen: async (id: string) => {
    try {
      await notificationService.markAsSeen(id);
      const now = new Date().toISOString();
      set((s) => ({
        notifications: s.notifications.map((n) =>
          n.id === id && !n.seenAt ? { ...n, seenAt: now } : n
        ),
      }));
    } catch {}
  },

  markAllAsSeen: async () => {
    try {
      await notificationService.markAllAsSeen();
      const now = new Date().toISOString();
      set((s) => ({
        notifications: s.notifications.map((n) => ({
          ...n,
          seenAt: n.seenAt ?? now,
        })),
      }));
    } catch {}
  },

  deleteNotification: async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      set((s) => ({
        notifications: s.notifications.filter((n) => n.id !== id),
        unreadCount: s.notifications.find((n) => n.id === id)?.status === 'UNREAD'
          ? Math.max(0, s.unreadCount - 1)
          : s.unreadCount,
      }));
    } catch {}
  },

  setCategory: (category) => {
    set({ activeCategory: category });
    get().fetchNotifications(true);
  },

  fetchPreferences: async () => {
    set({ preferencesLoading: true });
    try {
      const prefs = await notificationService.getPreferences();
      set({ preferences: prefs, preferencesLoading: false });
    } catch {
      set({ preferencesLoading: false });
    }
  },

  updatePreferences: async (payload) => {
    try {
      const prefs = await notificationService.updatePreferences(payload);
      set({ preferences: prefs });
    } catch {}
  },

  registerPushToken: async (token, platform) => {
    try {
      await notificationService.registerPushToken(token, platform);
    } catch {}
  },

  reset: () => {
    set({
      notifications: [],
      totalPages: 0,
      currentPage: 0,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      hasMore: true,
      unreadCount: 0,
      preferences: null,
      preferencesLoading: false,
      activeCategory: null,
    });
  },
}));
