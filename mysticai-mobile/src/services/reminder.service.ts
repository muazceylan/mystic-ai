import api from './api';

export type ReminderType = 'DO' | 'AVOID' | 'WINDOW_START';
export type ReminderStatus = 'SCHEDULED' | 'SENT' | 'FAILED' | 'CANCELLED';

export interface ReminderPayload {
  plannerDate?: string;
  categoryKey?: string;
  recommendationId?: string;
  [key: string]: unknown;
}

export interface Reminder {
  id: number;
  date: string;
  time: string;
  timezone: string;
  type: ReminderType;
  status: ReminderStatus;
  enabled: boolean;
  payload: ReminderPayload;
  dateTimeUtc: string;
  sentAt?: string | null;
  messageTitle: string;
  messageBody: string;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReminderInput {
  date: string;
  time: string;
  timezone: string;
  type: ReminderType;
  payload?: ReminderPayload;
}

export interface UpdateReminderInput {
  date?: string;
  time?: string;
  timezone?: string;
  enabled?: boolean;
}

function toIsoDate(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normalizeDate(input: string): string {
  const trimmed = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Geçersiz tarih formatı.');
  }
  return toIsoDate(date);
}

function normalizeTime(input: string): string {
  const trimmed = input.trim();
  const m = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) throw new Error('Saat HH:mm formatında olmalı.');
  const hh = Number.parseInt(m[1], 10);
  const mm = Number.parseInt(m[2], 10);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    throw new Error('Saat HH:mm formatında olmalı.');
  }
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export async function createReminder(input: CreateReminderInput): Promise<Reminder> {
  const payload = {
    date: normalizeDate(input.date),
    time: normalizeTime(input.time),
    timezone: input.timezone || 'Europe/Istanbul',
    type: input.type,
    payload: input.payload ?? {},
  };
  const { data } = await api.post<Reminder>('/api/v1/reminders', payload);
  return data;
}

export async function listReminders(from?: string, to?: string): Promise<Reminder[]> {
  const { data } = await api.get<Reminder[]>('/api/v1/reminders', {
    params: {
      from: from ? normalizeDate(from) : undefined,
      to: to ? normalizeDate(to) : undefined,
    },
  });
  return data;
}

export async function updateReminder(reminderId: number, input: UpdateReminderInput): Promise<Reminder> {
  const payload = {
    date: input.date ? normalizeDate(input.date) : undefined,
    time: input.time ? normalizeTime(input.time) : undefined,
    timezone: input.timezone,
    enabled: input.enabled,
  };
  const { data } = await api.patch<Reminder>(`/api/v1/reminders/${reminderId}`, payload);
  return data;
}

export async function deleteReminder(reminderId: number): Promise<void> {
  await api.delete(`/api/v1/reminders/${reminderId}`);
}
