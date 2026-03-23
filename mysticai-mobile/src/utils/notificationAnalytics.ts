/**
 * Centralized notification analytics event tracker.
 * All notification-related events flow through here.
 * Events are sent to all active providers (Amplitude + Firebase GA4)
 * via the shared trackEvent facade.
 */

import { trackEvent, type AnalyticsParams } from '../services/analytics';

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
 * Routes to the shared analytics facade (Amplitude + Firebase GA4).
 */
export function trackNotificationEvent(
  event: NotificationEventName,
  payload?: NotificationEventPayload
): void {
  // Build a clean params object — exclude undefined/complex values
  const params: AnalyticsParams = {};
  if (payload) {
    for (const [key, value] of Object.entries(payload)) {
      if (
        value === undefined ||
        (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean' && value !== null)
      ) {
        continue;
      }
      params[key] = value as string | number | boolean | null;
    }
  }

  trackEvent(event, params);
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
