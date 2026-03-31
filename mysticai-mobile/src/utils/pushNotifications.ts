import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { appStorage } from '../services/storage';
import {
  notificationService,
  type NotificationPreferences,
  type UpdatePreferencesPayload,
} from '../services/notification.service';
import { useNotificationStore } from '../store/useNotificationStore';
import { handlePushNotificationOpen } from './notificationDeepLink';
import {
  trackNotificationEvent,
  NotificationEvent,
} from './notificationAnalytics';

let notificationHandlerInstalled = false;

export const DEFAULT_NOTIFICATION_CHANNEL_ID = 'mysticai-notifications';
export const LEGACY_DREAM_NOTIFICATION_CHANNEL_ID = 'dream-notifications';
export const EXPO_PUSH_PROJECT_ID = 'ae6fd7e4-2d11-45f8-828c-d916782b852f';
const MORNING_DREAM_REMINDER_ATTEMPT_PREFIX = 'notification:dream-reminder-morning-open';
const MORNING_WINDOW_START_MINUTES = 5 * 60;
const MORNING_WINDOW_END_MINUTES = 12 * 60;

interface RegisterPushTokenOptions {
  allowPrompt?: boolean;
  respectStoredPreference?: boolean;
  syncBackendPreference?: boolean;
}

function resolveDeviceTimezone(): string | null {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timezone?.trim() ? timezone.trim() : null;
  } catch {
    return null;
  }
}

function allowsRemotePush(
  settings: Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>
): boolean {
  if (settings.granted) {
    return true;
  }

  if (Platform.OS !== 'ios') {
    return settings.status === 'granted';
  }

  const iosStatus = settings.ios?.status;
  return (
    iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

async function syncBackendPreferenceState(pushEnabled: boolean): Promise<void> {
  const timezone = resolveDeviceTimezone();
  const payload: UpdatePreferencesPayload = { pushEnabled };
  if (timezone) {
    payload.timezone = timezone;
  }
  await useNotificationStore.getState().updatePreferences(payload);
}

function resolveTimezone(preferences?: Pick<NotificationPreferences, 'timezone'> | null): string | null {
  return preferences?.timezone?.trim() || resolveDeviceTimezone();
}

function resolveLocalDateKey(timezone: string | null): string {
  const now = new Date();

  if (!timezone) {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

function resolveLocalMinutes(timezone: string | null): number {
  const now = new Date();

  if (!timezone) {
    return now.getHours() * 60 + now.getMinutes();
  }

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');
    return hour * 60 + minute;
  } catch {
    return now.getHours() * 60 + now.getMinutes();
  }
}

function parseTimeToMinutes(value?: string | null): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

function isWithinMorningWindow(timezone: string | null): boolean {
  const minutes = resolveLocalMinutes(timezone);
  return minutes >= MORNING_WINDOW_START_MINUTES && minutes < MORNING_WINDOW_END_MINUTES;
}

function isInQuietHours(preferences: Pick<NotificationPreferences, 'quietHoursStart' | 'quietHoursEnd' | 'timezone'>): boolean {
  const startMinutes = parseTimeToMinutes(preferences.quietHoursStart);
  const endMinutes = parseTimeToMinutes(preferences.quietHoursEnd);

  if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) {
    return false;
  }

  const nowMinutes = resolveLocalMinutes(resolveTimezone(preferences));
  if (startMinutes > endMinutes) {
    return nowMinutes >= startMinutes || nowMinutes < endMinutes;
  }

  return nowMinutes >= startMinutes && nowMinutes < endMinutes;
}

function buildMorningDreamReminderAttemptKey(userId: number, timezone: string | null): string {
  return `${MORNING_DREAM_REMINDER_ATTEMPT_PREFIX}:${userId}:${resolveLocalDateKey(timezone)}`;
}

export async function syncNotificationPreferencesWithDeviceState(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const store = useNotificationStore.getState();
    if (!store.preferences) {
      await store.fetchPreferences();
    }

    const preferences = useNotificationStore.getState().preferences;
    if (!preferences) return;

    const timezone = resolveDeviceTimezone();
    const permissionSettings = await Notifications.getPermissionsAsync();
    const hasPushPermission = allowsRemotePush(permissionSettings);
    const payload: UpdatePreferencesPayload = {};

    if (timezone && preferences.timezone !== timezone) {
      payload.timezone = timezone;
    }

    if (!hasPushPermission && permissionSettings.status !== 'undetermined' && preferences.pushEnabled) {
      payload.pushEnabled = false;
    }

    if (Object.keys(payload).length > 0) {
      await store.updatePreferences(payload);
    }
  } catch {
    // Sync should never block app startup.
  }
}

export async function ensureNotificationHandlerInstalled(): Promise<void> {
  if (Platform.OS === 'web' || notificationHandlerInstalled) return;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationHandlerInstalled = true;
  } catch {
    // Ignore handler setup failures and let callers continue gracefully.
  }
}

export async function maybeTriggerMorningDreamReminder(userId: number | null | undefined): Promise<void> {
  if (Platform.OS === 'web' || !userId) return;

  try {
    const store = useNotificationStore.getState();
    if (!store.preferences) {
      await store.fetchPreferences();
    }

    const preferences = useNotificationStore.getState().preferences;
    if (!preferences?.dreamReminderEnabled) return;
    if (preferences.preferredTimeSlot !== 'MORNING') return;

    const timezone = resolveTimezone(preferences);
    if (!isWithinMorningWindow(timezone)) return;
    if (isInQuietHours(preferences)) return;

    const attemptKey = buildMorningDreamReminderAttemptKey(userId, timezone);
    const attemptedToday = await appStorage.getItem(attemptKey);
    if (attemptedToday) return;

    const result = await notificationService.triggerMorningDreamReminder();
    await appStorage.setItem(attemptKey, new Date().toISOString());

    if (result.created) {
      await store.fetchUnreadCount();
    }
  } catch {
    // Network or storage failures should not break app startup/foreground flows.
  }
}

/**
 * Register push token with the notification service.
 * Call this only from a user-intentful flow or from bootstrap when permission is
 * already granted and the stored push preference is enabled.
 */
export async function registerPushTokenIfNeeded(
  options: RegisterPushTokenOptions = {}
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const {
    allowPrompt = false,
    respectStoredPreference = false,
    syncBackendPreference = false,
  } = options;

  try {
    if (respectStoredPreference) {
      const store = useNotificationStore.getState();
      if (!store.preferences) {
        await store.fetchPreferences();
      }

      const preferences = useNotificationStore.getState().preferences;
      if (preferences && !preferences.pushEnabled) {
        console.log('[PUSH] stored preference disabled, skipping token registration');
        return null;
      }
    }

    let permissionSettings = await Notifications.getPermissionsAsync();
    console.log('[PUSH] permission status:', permissionSettings.status, 'platform:', Platform.OS);

    if (!allowsRemotePush(permissionSettings) && permissionSettings.status === 'undetermined' && allowPrompt) {
      trackNotificationEvent(NotificationEvent.PERMISSION_PROMPT_SHOWN);
      permissionSettings = await Notifications.requestPermissionsAsync();
      console.log('[PUSH] after request:', permissionSettings.status);
      if (allowsRemotePush(permissionSettings)) {
        trackNotificationEvent(NotificationEvent.PERMISSION_GRANTED);
      } else {
        trackNotificationEvent(NotificationEvent.PERMISSION_DENIED);
        if (syncBackendPreference) {
          await syncBackendPreferenceState(false);
        }
        return null;
      }
    } else if (!allowsRemotePush(permissionSettings)) {
      console.log('[PUSH] permission not granted, skipping token registration');
      if (syncBackendPreference && permissionSettings.status !== 'undetermined') {
        await syncBackendPreferenceState(false);
      }
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: EXPO_PUSH_PROJECT_ID,
    });
    const token = tokenData.data;
    console.log('[PUSH] token obtained:', token);

    if (syncBackendPreference) {
      await syncBackendPreferenceState(true);
    }

    await useNotificationStore.getState().registerPushToken(token, Platform.OS);
    console.log('[PUSH] token registered to backend');
    return token;
  } catch (e) {
    console.log('[PUSH] error:', e);
    return null;
  }
}

/**
 * Setup notification response handler for deep linking.
 * Call this once in the root layout.
 */
export async function setupNotificationResponseHandler(
  isAuthenticated: boolean = true
): Promise<(() => void) | null> {
  if (Platform.OS === 'web') return null;

  try {
    await ensureNotificationHandlerInstalled();

    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      trackNotificationEvent(NotificationEvent.PUSH_RECEIVED);
      useNotificationStore.getState().fetchUnreadCount().catch(() => {});
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      setTimeout(() => {
        handlePushNotificationOpen(response, isAuthenticated).catch(() => {});
      }, 300);
    });

    const lastResponse = await Notifications.getLastNotificationResponseAsync();
    if (lastResponse) {
      setTimeout(() => {
        handlePushNotificationOpen(lastResponse, isAuthenticated).catch(() => {});
      }, 600);
    }

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  } catch {
    return null;
  }
}

/**
 * Configure Android notification channel.
 */
export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    await Notifications.setNotificationChannelAsync(DEFAULT_NOTIFICATION_CHANNEL_ID, {
      name: 'Astro Guru',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#9D4EDD',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync(LEGACY_DREAM_NOTIFICATION_CHANNEL_ID, {
      name: 'Astro Guru Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#9D4EDD',
      sound: 'default',
    });
  } catch {
    // silently fail
  }
}
