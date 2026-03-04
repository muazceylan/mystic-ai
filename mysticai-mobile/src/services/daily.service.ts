import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { envConfig } from '../config/env';
import {
  createServiceNotConfiguredError,
  logApiError,
  logWarnOnce,
} from './observability';
import type {
  DailyActionToggleResponse,
  DailyActionsDTO,
  DailyFeedbackPayload,
  DailyTransitsDTO,
} from '../types/daily.types';

const DAILY_TRANSITS_BASE = '/api/v1/daily/transits';
const FEEDBACK_BASE = '/api/v1/feedback';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEnvelope<T> {
  payload: T;
  savedAt: number;
  expiresAt: number;
}

const transitsCacheKey = (date: string) => `dailyTransits:${date}`;
const actionsCacheKey = (date: string) => `dailyActions:${date}`;

function toIsoDate(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normalizeDate(date?: string): string {
  if (!date) return toIsoDate(new Date());
  const trimmed = date.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return toIsoDate(new Date());
  return toIsoDate(parsed);
}

function isCacheEnvelope<T>(value: unknown): value is CacheEnvelope<T> {
  if (!value || typeof value !== 'object') return false;
  const envelope = value as Partial<CacheEnvelope<T>>;
  return (
    'payload' in envelope &&
    typeof envelope.savedAt === 'number' &&
    typeof envelope.expiresAt === 'number'
  );
}

async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);

    if (!isCacheEnvelope<T>(parsed)) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    if (parsed.expiresAt <= Date.now()) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    return parsed.payload;
  } catch {
    return null;
  }
}

async function writeCache<T>(key: string, payload: T): Promise<void> {
  try {
    const now = Date.now();
    const envelope: CacheEnvelope<T> = {
      payload,
      savedAt: now,
      expiresAt: now + CACHE_TTL_MS,
    };
    await AsyncStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // no-op: cache write failure should never block the primary flow
  }
}

async function patchLocalActionState(date: string, actionId: string, isDone: boolean, doneAt?: string | null): Promise<void> {
  const key = actionsCacheKey(date);
  const existing = await readCache<DailyActionsDTO>(key);
  if (!existing) return;

  const updated: DailyActionsDTO = {
    ...existing,
    actions: existing.actions.map((action) =>
      action.id === actionId ? { ...action, isDone, doneAt: isDone ? doneAt : undefined } : action),
  };
  await writeCache(key, updated);
}

function buildEmptyDailyTransits(date: string): DailyTransitsDTO {
  return {
    date,
    title: 'Günün Transitleri',
    hero: {
      headline: 'Bugün için veri hazırlanıyor',
      supporting: 'Veri gelir gelmez bu alan otomatik güncellenecek.',
      moodTag: 'Sakin',
      intensity: 0,
      icon: 'moon',
      gradientKey: 'purpleMist',
    },
    quickFacts: [],
    todayCanDo: {
      headline: 'Bugün Yapabileceklerin',
      body: 'Aksiyon önerileri henüz hazır değil.',
      ctaText: 'Bugün Ne Yapabilirsin?',
      ctaRoute: 'TodayActions',
    },
    focusPoints: [],
    retrogrades: [],
    transits: [],
  };
}

function buildEmptyDailyActions(date: string): DailyActionsDTO {
  return {
    date,
    header: {
      title: 'Bugün Ne Yapabilirsin?',
      subtitle: 'Aksiyon listesi hazırlanıyor.',
    },
    actions: [],
    miniPlan: {
      title: 'Mini Plan',
      steps: [],
    },
  };
}

export async function getDailyTransits(date: string): Promise<DailyTransitsDTO> {
  const normalizedDate = normalizeDate(date);
  const cacheKey = transitsCacheKey(normalizedDate);

  if (!envConfig.isApiConfigured) {
    logWarnOnce(
      'daily',
      'transits_service_not_configured',
      'Daily transits service is not configured. Returning empty state payload.',
      { appEnv: envConfig.appEnv, date: normalizedDate },
    );
    const cached = await readCache<DailyTransitsDTO>(cacheKey);
    return cached ?? buildEmptyDailyTransits(normalizedDate);
  }

  try {
    const { data } = await api.get<DailyTransitsDTO>(DAILY_TRANSITS_BASE, {
      params: { date: normalizedDate },
    });
    await writeCache(cacheKey, data);
    return data;
  } catch (error) {
    logApiError('daily_transits_fetch', error, { date: normalizedDate });
    const fallback = await readCache<DailyTransitsDTO>(cacheKey);
    return fallback ?? buildEmptyDailyTransits(normalizedDate);
  }
}

export async function getDailyActions(date: string): Promise<DailyActionsDTO> {
  const normalizedDate = normalizeDate(date);
  const cacheKey = actionsCacheKey(normalizedDate);

  if (!envConfig.isApiConfigured) {
    logWarnOnce(
      'daily',
      'actions_service_not_configured',
      'Daily actions service is not configured. Returning empty state payload.',
      { appEnv: envConfig.appEnv, date: normalizedDate },
    );
    const cached = await readCache<DailyActionsDTO>(cacheKey);
    return cached ?? buildEmptyDailyActions(normalizedDate);
  }

  try {
    const { data } = await api.get<DailyActionsDTO>(`${DAILY_TRANSITS_BASE}/actions`, {
      params: { date: normalizedDate },
    });
    await writeCache(cacheKey, data);
    return data;
  } catch (error) {
    logApiError('daily_actions_fetch', error, { date: normalizedDate });
    const fallback = await readCache<DailyActionsDTO>(cacheKey);
    return fallback ?? buildEmptyDailyActions(normalizedDate);
  }
}

export async function markActionDone(
  date: string,
  actionId: string,
  isDone: boolean,
): Promise<DailyActionToggleResponse> {
  const normalizedDate = normalizeDate(date);

  if (!envConfig.isApiConfigured) {
    logWarnOnce(
      'daily',
      'actions_toggle_not_configured',
      'Action toggle blocked because service configuration is missing.',
      { appEnv: envConfig.appEnv },
    );
    throw createServiceNotConfiguredError('daily');
  }

  try {
    const { data } = await api.post<DailyActionToggleResponse>(
      `${DAILY_TRANSITS_BASE}/actions/${encodeURIComponent(actionId)}/done`,
      { date: normalizedDate, isDone },
    );
    await patchLocalActionState(normalizedDate, actionId, data.isDone, data.doneAt);
    return data;
  } catch (error) {
    logApiError('daily_action_toggle', error, {
      date: normalizedDate,
      actionId,
      isDone,
    });
    throw error;
  }
}

export async function sendFeedback(payload: DailyFeedbackPayload): Promise<void> {
  if (!envConfig.isApiConfigured) {
    logWarnOnce(
      'daily',
      'feedback_not_configured',
      'Feedback endpoint blocked because service configuration is missing.',
      { appEnv: envConfig.appEnv },
    );
    throw createServiceNotConfiguredError('daily');
  }

  try {
    await api.post(FEEDBACK_BASE, {
      ...payload,
      date: normalizeDate(payload.date),
    });
  } catch (error) {
    logApiError('daily_feedback_send', error, {
      itemType: payload.itemType,
      itemId: payload.itemId,
      sentiment: payload.sentiment,
    });
    throw error;
  }
}

export function getTodayIsoDate(): string {
  return normalizeDate();
}

