import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
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

/**
 * Register push token with the notification service.
 * Call this after user login and when push permission is granted.
 */
export async function registerPushTokenIfNeeded(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('[PUSH] permission status:', existingStatus, 'platform:', Platform.OS);

    if (existingStatus === 'undetermined') {
      trackNotificationEvent(NotificationEvent.PERMISSION_PROMPT_SHOWN);
      const { status } = await Notifications.requestPermissionsAsync();
      console.log('[PUSH] after request:', status);
      if (status === 'granted') {
        trackNotificationEvent(NotificationEvent.PERMISSION_GRANTED);
      } else {
        trackNotificationEvent(NotificationEvent.PERMISSION_DENIED);
        return null;
      }
    } else if (existingStatus !== 'granted') {
      console.log('[PUSH] permission not granted, skipping token registration');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: EXPO_PUSH_PROJECT_ID,
    });
    const token = tokenData.data;
    console.log('[PUSH] token obtained:', token);

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

    // Foreground: notification received — refresh unread count
    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      trackNotificationEvent(NotificationEvent.PUSH_RECEIVED);
      useNotificationStore.getState().fetchUnreadCount().catch(() => {});
    });

    // Background / foreground tap — route through central resolver
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      setTimeout(() => {
        handlePushNotificationOpen(response, isAuthenticated).catch(() => {});
      }, 300);
    });

    // Cold start: app was opened by tapping a push notification
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
