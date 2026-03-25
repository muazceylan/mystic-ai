import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { ReminderType } from '../services/reminder.service';
import { ensureNotificationHandlerInstalled } from './pushNotifications';

type PlannerReminderPayload = {
  deeplink: string;
  notificationId: string;
  plannerDate: string;
  categoryKey?: string;
  plannerCategoryId?: string;
  type: ReminderType;
};

export type SchedulePlannerReminderResult =
  | { status: 'scheduled'; id: string; scheduledFor: Date }
  | { status: 'permission-denied' }
  | { status: 'unsupported' };

interface SchedulePlannerReminderInput {
  date: string;
  time: string;
  title: string;
  body: string;
  payload: PlannerReminderPayload;
}

function parseDateKey(dateKey: string): { year: number; month: number; day: number } {
  const match = dateKey.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error('Invalid reminder date.');
  }

  return {
    year: Number.parseInt(match[1], 10),
    month: Number.parseInt(match[2], 10),
    day: Number.parseInt(match[3], 10),
  };
}

function parseTimeValue(time: string): { hours: number; minutes: number } {
  const match = time.trim().match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    throw new Error('Invalid reminder time.');
  }

  return {
    hours: Number.parseInt(match[1], 10),
    minutes: Number.parseInt(match[2], 10),
  };
}

export function buildPlannerReminderDate(dateKey: string, time: string): Date {
  const { year, month, day } = parseDateKey(dateKey);
  const { hours, minutes } = parseTimeValue(time);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function allowsNotifications(
  settings: Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>,
): boolean {
  if (settings.granted) {
    return true;
  }

  if (Platform.OS !== 'ios') {
    return settings.status === 'granted';
  }

  const iosStatus = settings.ios?.status;
  return iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED
    || iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL
    || iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL;
}

async function ensureNotificationPermission(): Promise<boolean> {
  const existingSettings = await Notifications.getPermissionsAsync();
  if (allowsNotifications(existingSettings)) {
    return true;
  }

  const requestedSettings = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return allowsNotifications(requestedSettings);
}

export async function schedulePlannerLocalNotification(
  input: SchedulePlannerReminderInput,
): Promise<SchedulePlannerReminderResult> {
  if (Platform.OS === 'web') {
    return { status: 'unsupported' };
  }

  await ensureNotificationHandlerInstalled();

  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) {
    return { status: 'permission-denied' };
  }

  const scheduledFor = buildPlannerReminderDate(input.date, input.time);
  const androidChannelId = Platform.OS === 'android' ? 'mysticai-notifications' : undefined;
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      sound: 'default',
      data: input.payload,
      ...(androidChannelId ? { channelId: androidChannelId } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: scheduledFor,
      ...(androidChannelId ? { channelId: androidChannelId } : {}),
    },
  });

  return {
    status: 'scheduled',
    id,
    scheduledFor,
  };
}
