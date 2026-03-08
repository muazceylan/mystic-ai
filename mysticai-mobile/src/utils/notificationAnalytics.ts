/**
 * Centralized notification analytics event tracker.
 * All notification-related events flow through here.
 * Swap the `emit` implementation to plug in Amplitude, Mixpanel, PostHog, etc.
 */

export const NotificationEvent = {
  // Notification Center
  CENTER_OPENED: 'notification_center_opened',
  FILTER_CHANGED: 'notification_filter_changed',

  // Item interactions
  ITEM_OPENED: 'notification_opened',
  MARKED_READ: 'notification_marked_read',
  MARKED_SEEN: 'notification_marked_seen',
  READ_ALL: 'notification_read_all',
  SEEN_ALL: 'notification_seen_all',
  DELETED: 'notification_deleted',

  // Deep link
  DEEPLINK_OPENED: 'notification_deeplink_opened',
  DEEPLINK_FALLBACK: 'notification_deeplink_fallback',

  // Push permission
  PERMISSION_PROMPT_SHOWN: 'notification_permission_prompt_shown',
  PERMISSION_GRANTED: 'notification_permission_granted',
  PERMISSION_DENIED: 'notification_permission_denied',

  // Settings
  SETTINGS_OPENED: 'notification_settings_opened',
  SETTINGS_UPDATED: 'notification_settings_updated',

  // Push received
  PUSH_RECEIVED: 'notification_received',
  PUSH_OPENED: 'notification_push_opened',
} as const;

export type NotificationEventName = typeof NotificationEvent[keyof typeof NotificationEvent];

export interface NotificationEventPayload {
  notificationId?: string;
  type?: string;
  category?: string;
  channel?: string;
  sourceModule?: string;
  templateKey?: string;
  variantKey?: string;
  deeplink?: string;
  filterCategory?: string;
  preferenceKey?: string;
  preferenceValue?: unknown;
  [key: string]: unknown;
}

/**
 * Track a notification analytics event.
 * In dev, logs to console. In prod, send to your analytics SDK.
 */
export function trackNotificationEvent(
  event: NotificationEventName,
  payload?: NotificationEventPayload
): void {
  if (__DEV__) {
    console.log('[NotifAnalytics]', event, payload ?? {});
  }

  // TODO: integrate your analytics SDK here, e.g.:
  // Analytics.track(event, { ...payload, _source: 'notification_module' });
}

/** Convenience: build a standard payload from a NotificationItem */
export function notifEventPayload(notif: {
  id: string;
  type?: string;
  category?: string;
  sourceModule?: string;
  templateKey?: string;
  variantKey?: string;
  deeplink?: string;
}): NotificationEventPayload {
  return {
    notificationId: notif.id,
    type: notif.type,
    category: notif.category,
    sourceModule: notif.sourceModule,
    templateKey: notif.templateKey,
    variantKey: notif.variantKey,
    deeplink: notif.deeplink,
  };
}
