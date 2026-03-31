import api from './api';

export interface NotificationItem {
  id: string;
  type: string;
  category: string;
  title: string;
  body: string;
  deeplink?: string;
  imageUrl?: string;
  status: 'UNREAD' | 'READ';
  priority: string;
  sourceModule?: string;
  templateKey?: string;
  variantKey?: string;
  createdAt: string;
  readAt?: string;
  seenAt?: string;
  metadata?: string;
  pushSent?: boolean;
}

export interface NotificationPage {
  content: NotificationItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  last: boolean;
  first: boolean;
}

export interface NotificationPreferences {
  userId: number;
  dailyEnabled: boolean;
  intradayEnabled: boolean;
  weeklyEnabled: boolean;
  plannerReminderEnabled: boolean;
  prayerReminderEnabled: boolean;
  meditationReminderEnabled: boolean;
  dreamReminderEnabled: boolean;
  eveningCheckinEnabled: boolean;
  productUpdatesEnabled: boolean;
  frequencyLevel: 'LOW' | 'BALANCED' | 'FREQUENT';
  preferredTimeSlot: 'MORNING' | 'NOON' | 'EVENING';
  quietHoursStart: string;
  quietHoursEnd: string;
  pushEnabled: boolean;
  timezone: string;
}

export interface UpdatePreferencesPayload {
  dailyEnabled?: boolean;
  intradayEnabled?: boolean;
  weeklyEnabled?: boolean;
  plannerReminderEnabled?: boolean;
  prayerReminderEnabled?: boolean;
  meditationReminderEnabled?: boolean;
  dreamReminderEnabled?: boolean;
  eveningCheckinEnabled?: boolean;
  productUpdatesEnabled?: boolean;
  frequencyLevel?: string;
  preferredTimeSlot?: string;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  pushEnabled?: boolean;
  timezone?: string;
}

export interface MorningDreamReminderTriggerResponse {
  created: boolean;
  notificationId?: string;
  deliveryChannel?: string;
  pushSent: boolean;
  reason?: string;
}

const BASE = '/api/v1/notifications';

export const notificationService = {
  async getNotifications(page = 0, size = 20, category?: string): Promise<NotificationPage> {
    const params: Record<string, any> = { page, size };
    if (category) params.category = category;
    const res = await api.get(BASE, { params });
    return res.data;
  },

  async getUnreadCount(): Promise<number> {
    const res = await api.get(`${BASE}/unread-count`);
    return res.data.unreadCount;
  },

  async markAsRead(notificationId: string): Promise<void> {
    await api.post(`${BASE}/read`, { notificationId });
  },

  async markAllAsRead(): Promise<void> {
    await api.post(`${BASE}/read-all`);
  },

  async deleteNotification(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },

  async getPreferences(): Promise<NotificationPreferences> {
    const res = await api.get(`${BASE}/preferences`);
    return res.data;
  },

  async updatePreferences(payload: UpdatePreferencesPayload): Promise<NotificationPreferences> {
    const res = await api.put(`${BASE}/preferences`, payload);
    return res.data;
  },

  async registerPushToken(token: string, platform: string): Promise<void> {
    await api.post(`${BASE}/push-tokens`, { token, platform });
  },

  async deactivatePushToken(token: string): Promise<void> {
    await api.delete(`${BASE}/push-tokens`, { data: { token } });
  },

  async markAsSeen(notificationId: string): Promise<void> {
    await api.post(`${BASE}/seen`, { notificationId });
  },

  async markAllAsSeen(): Promise<void> {
    await api.post(`${BASE}/seen-all`);
  },

  async triggerMorningDreamReminder(): Promise<MorningDreamReminderTriggerResponse> {
    const res = await api.post(`${BASE}/dream-reminder/morning-open`);
    return res.data;
  },
};
