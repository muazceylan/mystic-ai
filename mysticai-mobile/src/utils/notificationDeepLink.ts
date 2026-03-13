/**
 * Centralized notification deep link resolver.
 *
 * All notification opens — whether from push tap, in-app notification center,
 * cold-start, or background — flow through `openNotification`.
 * It handles: auth guard, mark-as-read, analytics, and navigation with fallback.
 */

import { router } from 'expo-router';
import { useNotificationStore } from '../store/useNotificationStore';
import { useAppConfigStore } from '../store/useAppConfigStore';
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

function normalizeId(value: unknown): string {
  return String(value ?? '').trim();
}

function isUnreadStatus(status?: string): boolean {
  return String(status ?? '').trim().toUpperCase() === 'UNREAD';
}

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
  const normalizedId = normalizeId(notif.id);
  const dedupeKey = normalizedId || `anon:${notif.deeplink ?? 'empty'}`;

  // Prevent double-processing the same notification
  if (recentlyOpened.has(dedupeKey)) return;
  recentlyOpened.add(dedupeKey);
  // Clear after 5s so edge cases (re-open after navigate back) still work
  setTimeout(() => recentlyOpened.delete(dedupeKey), 5000);

  // Auth guard: redirect to login if not authenticated
  if (!isAuthenticated) {
    router.replace('/(auth)/welcome' as any);
    return;
  }

  const payload = notifEventPayload({
    ...notif,
    id: normalizedId || notif.id,
    deeplink: notif.deeplink ?? undefined,
  });

  // Mark as read (fire-and-forget, don't block navigation)
  if (normalizedId && !normalizedId.startsWith('push-') && isUnreadStatus(notif.status)) {
    useNotificationStore.getState().markAsRead(normalizedId).catch(() => {});
    trackNotificationEvent(NotificationEvent.MARKED_READ, payload);
  }

  trackNotificationEvent(NotificationEvent.ITEM_OPENED, payload);

  // Navigate — with module visibility/maintenance guard
  const deeplink = notif.deeplink;
  if (deeplink && deeplink.trim().length > 0) {
    // Extract moduleKey from deeplink path (e.g. "/(tabs)/dreams" → "dreams")
    const moduleKey = extractModuleKey(deeplink);
    if (moduleKey) {
      const access = useAppConfigStore.getState().canOpenViaDeeplink(moduleKey);
      if (!access.allowed) {
        if (access.reason === 'maintenance') {
          trackNotificationEvent(NotificationEvent.DEEPLINK_FALLBACK, {
            ...payload, deeplink, reason: 'maintenance',
          });
          // Navigate to home with maintenance context — the home screen can check this
          router.push(SAFE_FALLBACK);
          return;
        }
        if (access.reason === 'inactive') {
          trackNotificationEvent(NotificationEvent.DEEPLINK_FALLBACK, {
            ...payload, deeplink, reason: 'module_inactive',
          });
          router.push(SAFE_FALLBACK);
          return;
        }
        // not_found: proceed anyway (config may not have this module key)
      }
    }

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
  const incomingId = normalizeId(data?.notificationId);
  const notifId = incomingId || generateTempId();

  trackNotificationEvent(NotificationEvent.PUSH_OPENED, { notificationId: notifId, deeplink });

  // Refresh unread count after tap
  useNotificationStore.getState().fetchUnreadCount().catch(() => {});

  await openNotification(
    { id: notifId, deeplink, status: incomingId ? 'UNREAD' : undefined },
    isAuthenticated
  );
}

function generateTempId(): string {
  return 'push-' + Date.now().toString(36);
}

/**
 * Extract a module key from a deeplink path for config-gated access control.
 * Maps known route segments to module keys.
 *
 * Examples:
 *   "/(tabs)/dreams"        → "dream_analysis"
 *   "/(tabs)/spiritual"     → "spiritual"
 *   "/(tabs)/compatibility" → "compatibility"
 *   "/some/unknown"         → null (no module gate applied)
 */
function extractModuleKey(deeplink: string): string | null {
  const ROUTE_TO_MODULE: Record<string, string> = {
    dreams: 'dream_analysis',
    spiritual: 'spiritual',
    compatibility: 'compatibility',
    numerology: 'numerology',
    meditation: 'meditation',
    horoscope: 'weekly_horoscope',
    transits: 'daily_transits',
    planner: 'daily_transits',
    calendar: 'daily_transits',
  };

  // Extract last meaningful path segment
  const cleanPath = deeplink.split('?')[0]?.split('#')[0] ?? deeplink;
  const segments = cleanPath.replace(/[()]/g, '').split('/').filter(Boolean);
  for (const seg of segments.reverse()) {
    const moduleKey = ROUTE_TO_MODULE[seg];
    if (moduleKey) return moduleKey;
  }
  return null;
}
