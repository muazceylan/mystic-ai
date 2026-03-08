/**
 * Centralized notification deep link resolver.
 *
 * All notification opens — whether from push tap, in-app notification center,
 * cold-start, or background — flow through `openNotification`.
 * It handles: auth guard, mark-as-read, analytics, and navigation with fallback.
 */

import { router } from 'expo-router';
import { useNotificationStore } from '../store/useNotificationStore';
import {
  trackNotificationEvent,
  notifEventPayload,
  NotificationEvent,
} from './notificationAnalytics';

interface NotificationRef {
  id: string;
  deeplink?: string | null;
  status?: string;
  type?: string;
  category?: string;
  sourceModule?: string;
  templateKey?: string;
  variantKey?: string;
}

const SAFE_FALLBACK = '/(tabs)/home' as const;
const NOTIF_CENTER = '/(tabs)/notifications' as const;

// Track recently opened notification IDs to prevent duplicate processing
const recentlyOpened = new Set<string>();

/**
 * Open a notification: marks as read, tracks analytics, navigates.
 * Safe to call multiple times for the same notification — deduplicates.
 *
 * @param notif  notification reference (id + deeplink + status)
 * @param isAuthenticated  whether the user is currently logged in
 */
export async function openNotification(
  notif: NotificationRef,
  isAuthenticated: boolean
): Promise<void> {
  // Prevent double-processing the same notification
  if (recentlyOpened.has(notif.id)) return;
  recentlyOpened.add(notif.id);
  // Clear after 5s so edge cases (re-open after navigate back) still work
  setTimeout(() => recentlyOpened.delete(notif.id), 5000);

  // Auth guard: redirect to login if not authenticated
  if (!isAuthenticated) {
    router.replace('/(auth)/welcome' as any);
    return;
  }

  const payload = notifEventPayload(notif);

  // Mark as read (fire-and-forget, don't block navigation)
  if (notif.status === 'UNREAD') {
    useNotificationStore.getState().markAsRead(notif.id).catch(() => {});
    trackNotificationEvent(NotificationEvent.MARKED_READ, payload);
  }

  trackNotificationEvent(NotificationEvent.ITEM_OPENED, payload);

  // Navigate
  const deeplink = notif.deeplink;
  if (deeplink && deeplink.trim().length > 0) {
    try {
      router.push(deeplink as any);
      trackNotificationEvent(NotificationEvent.DEEPLINK_OPENED, { ...payload, deeplink });
    } catch {
      trackNotificationEvent(NotificationEvent.DEEPLINK_FALLBACK, { ...payload, deeplink, reason: 'route_error' });
      router.push(SAFE_FALLBACK);
    }
  } else {
    // No deeplink → open notification center so user sees the content
    router.push(NOTIF_CENTER as any);
  }
}

/**
 * Handle a push notification tap from expo-notifications response.
 * Extracts the deeplink from the notification data payload.
 */
export async function handlePushNotificationOpen(
  response: {
    notification: {
      request: {
        content: {
          data?: Record<string, unknown> | null;
        };
      };
    };
  },
  isAuthenticated: boolean
): Promise<void> {
  const data = response.notification.request.content.data;
  const deeplink = (data?.deeplink as string | undefined) ?? undefined;
  const notifId = (data?.notificationId as string | undefined) ?? generateTempId();

  trackNotificationEvent(NotificationEvent.PUSH_OPENED, { notificationId: notifId, deeplink });

  // Refresh unread count after tap
  useNotificationStore.getState().fetchUnreadCount().catch(() => {});

  await openNotification(
    { id: notifId, deeplink, status: 'UNREAD' },
    isAuthenticated
  );
}

function generateTempId(): string {
  return 'push-' + Date.now().toString(36);
}
