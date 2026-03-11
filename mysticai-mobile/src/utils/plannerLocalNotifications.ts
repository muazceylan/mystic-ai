import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { ReminderType } from '../services/reminder.service';

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

async function ensureNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') {
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function schedulePlannerLocalNotification(
  input: SchedulePlannerReminderInput,
): Promise<SchedulePlannerReminderResult> {
  if (Platform.OS === 'web') {
    return { status: 'unsupported' };
  }

  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) {
    return { status: 'permission-denied' };
  }

  const scheduledFor = buildPlannerReminderDate(input.date, input.time);
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      sound: 'default',
      data: input.payload,
      ...(Platform.OS === 'android' ? { channelId: 'mysticai-notifications' } : {}),
    },
    trigger: scheduledFor,
  });

  return {
    status: 'scheduled',
    id,
    scheduledFor,
  };
}
