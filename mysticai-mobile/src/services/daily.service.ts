import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { envConfig } from '../config/env';
import { buildUserScopedStorageKey } from '../store/userScopedPersist';
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
const DAILY_CACHE_VERSION = 'v2';

type DailyLocale = 'tr' | 'en';

interface CacheEnvelope<T> {
  payload: T;
  savedAt: number;
  expiresAt: number;
}

function resolveDailyScopeKey(scopeKey?: string | null): string {
  const normalizedScope = scopeKey?.trim();
  return normalizedScope ? normalizedScope : 'guest';
}

const transitsCacheKey = (date: string, locale: DailyLocale, scopeKey?: string | null) =>
  buildUserScopedStorageKey(
    `dailyTransits:${DAILY_CACHE_VERSION}:${locale}:${date}`,
    resolveDailyScopeKey(scopeKey),
  );

const actionsCacheKey = (date: string, locale: DailyLocale, scopeKey?: string | null) =>
  buildUserScopedStorageKey(
    `dailyActions:${DAILY_CACHE_VERSION}:${locale}:${date}`,
    resolveDailyScopeKey(scopeKey),
  );

function normalizeLocale(locale?: string | null): DailyLocale {
  return locale?.toLowerCase().startsWith('en') ? 'en' : 'tr';
}

function normalizeDailyToken(value?: string | null): string {
  const trMap: Record<string, string> = {
    ç: 'c',
    ğ: 'g',
    ı: 'i',
    ö: 'o',
    ş: 's',
    ü: 'u',
  };

  return (value ?? '')
    .trim()
    .toLowerCase()
    .split('')
    .map((char) => trMap[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function localizeDailyThemeEn(value?: string | null): string {
  const token = normalizeDailyToken(value);
  if (token.includes('iletisim') || token.includes('communication')) return 'Communication';
  if (token.includes('ask') || token.includes('love') || token.includes('relationship')) return 'Love';
  if (token === 'is' || token.includes('work') || token.includes('career')) return 'Work';
  if (token.includes('enerji') || token.includes('energy')) return 'Energy';
  return 'Mood';
}

function localizeDailyMoodEn(value?: string | null): string {
  const token = normalizeDailyToken(value);
  if (token.includes('odak') || token.includes('focus')) return 'focus';
  if (token.includes('sosyal') || token.includes('social')) return 'social';
  if (token.includes('cesur') || token.includes('bold')) return 'bold';
  if (token.includes('duygusal') || token.includes('emotional')) return 'emotional';
  return 'calm';
}

function localizeActionSentenceEn(value?: string | null): string {
  const text = (value ?? '').trim();
  if (!text) return '';

  const normalized = text.endsWith('.') ? text.slice(0, -1) : text;
  const token = normalizeDailyToken(normalized);

  const exactMap: Record<string, string> = {
    'bugun ne yapabilirsin': 'What Can You Do Today?',
    'bugun yapabileceklerin': 'What You Can Do Today',
    'mesajlarini gondermeden once iki kez kontrol et': 'Double-check your messages before sending.',
    'uzun suredir yazmadigin bir kisiye kisa bir mesaj at': 'Send a short message to someone you have not written to in a while.',
    'iliskinde kucuk ama samimi bir jest yap': 'Make a small but sincere gesture in your relationship.',
    'duygusal konusmalarda savunmaya gecmeden once dinle': 'Listen before going defensive in emotional conversations.',
    'tek ise odaklanip bitirmeden yeni is acma': 'Do not open a new task before finishing the one in front of you.',
    'erteledigin bir isi 15 dakikalik blokla baslat': 'Start a delayed task with a focused 15-minute block.',
    'gunun temposunu molalarla dengele': "Balance the day's pace with short breaks.",
    'kisa bir yuruyusle enerjini tazele': 'Refresh your energy with a short walk.',
    'karar almadan once bir adim geri cekilip planini netlestir': 'Step back and clarify your plan before making a decision.',
    'sezgini dinleyip kucuk bir adim at': 'Listen to intuition and take one small step.',
    'ani tepkiyle mesaj gondermekten kacinmak faydali olur': 'Avoid sending messages from a reactive state.',
    'kirici veya kesin yargili cumlelerden kacinmak iliskiyi korur': 'Avoid harsh or final-sounding sentences to protect the relationship.',
    'netlesmeden yeni gorev acmaktan kacinmak stresi dusurur': 'Avoid opening new tasks before priorities are clear to lower stress.',
    'gunu tek tempoda zorlamaktan kacinmak daha surdurulebilir olur': 'Avoid forcing the whole day at one speed to keep things sustainable.',
    'kesin kararlari anlik duygu ile vermekten kacinmak daha guvenli olur': 'Avoid making final decisions from a passing emotion.',
    'aksam icin 1 mini plan yaz': 'Write 1 mini plan for tonight.',
    'yarin icin tek bir oncelik belirleyip not alman yeterli': 'Naming one priority for tomorrow and writing it down is enough.',
    'aksiyon listesi hazirlaniyor': 'The action list is being prepared.',
  };

  if (exactMap[token]) {
    return exactMap[token];
  }

  const retroMatch = normalized.match(/^(.+?) retrosu icin kontrol listesi hazirla\.?$/i)
    ?? normalized.match(/^(.+?) retrosu için kontrol listesi hazırla\.?$/i);
  if (retroMatch?.[1]) {
    return `Prepare a checklist for ${retroMatch[1].trim()} retrograde.`;
  }

  const moodSubtitleMatch = normalized.match(/^(.+?) akisi icin 3 kucuk adim planla\.?$/i)
    ?? normalized.match(/^(.+?) akışı için 3 küçük adım planla\.?$/i);
  if (moodSubtitleMatch?.[1]) {
    const mood = localizeDailyMoodEn(moodSubtitleMatch[1]);
    return `Plan 3 small steps for a ${mood} flow.`;
  }

  return text;
}

function localizeActionTitleEn(value?: string | null): string {
  const localized = localizeActionSentenceEn(value);
  if (!localized) return '';
  return /[.!?]$/.test(localized) ? localized : `${localized}.`;
}

function localizeActionStepEn(value?: string | null): string {
  const localized = localizeActionSentenceEn(value);
  if (!localized) return '';
  return localized.endsWith('.') ? localized.slice(0, -1) : localized;
}

function localizeActionHeaderTitleEn(value?: string | null): string {
  const localized = localizeActionSentenceEn(value);
  if (!localized) return 'What Can You Do Today?';
  return localized.endsWith('?') ? localized : localized.replace(/[.]$/, '?');
}

function localizeActionDetailEn(value?: string | null): string {
  const text = (value ?? '').trim();
  if (!text) return '';
  const parts = text.split('•').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return text;
  if (parts.length === 1) return localizeActionSentenceEn(parts[0]);

  const [theme, ...rest] = parts;
  const localizedTheme = localizeDailyThemeEn(theme);
  const localizedRest = rest.map((part) => localizeActionSentenceEn(part));
  return [localizedTheme, ...localizedRest].join(' • ');
}

function localizeActionTagEn(tag?: DailyActionsDTO['actions'][number]['tag'] | string): DailyActionsDTO['actions'][number]['tag'] | undefined {
  if (!tag) return undefined;
  const token = normalizeDailyToken(tag);
  if (token.includes('kolay') || token.includes('easy')) return 'Easy';
  if (token.includes('orta') || token.includes('moderate') || token.includes('medium')) return 'Moderate';
  return 'Bold';
}

/**
 * v2 plans are composed per-locale on the server, so the legacy string map must not touch them.
 * `mainTheme` is the marker: only the premium composer emits it.
 */
function isPremiumPlanPayload(payload: DailyActionsDTO): boolean {
  return Boolean(payload?.mainTheme || payload?.primaryAction);
}

function localizeDailyActionsPayload(payload: DailyActionsDTO, locale: DailyLocale): DailyActionsDTO {
  if (locale !== 'en') return payload;
  if (isPremiumPlanPayload(payload)) return payload;

  return {
    ...payload,
    header: {
      title: localizeActionHeaderTitleEn(payload.header.title),
      subtitle: localizeActionSentenceEn(payload.header.subtitle),
    },
    actions: payload.actions.map((action) => ({
      ...action,
      title: localizeActionTitleEn(action.title),
      detail: localizeActionDetailEn(action.detail),
      tag: localizeActionTagEn(action.tag),
    })),
    miniPlan: {
      ...payload.miniPlan,
      title: 'Mini Plan',
      steps: payload.miniPlan.steps.map((step) => localizeActionStepEn(step)),
    },
  };
}

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

async function patchLocalActionState(
  date: string,
  actionId: string,
  isDone: boolean,
  locale: DailyLocale,
  scopeKey?: string | null,
  doneAt?: string | null,
): Promise<void> {
  const key = actionsCacheKey(date, locale, scopeKey);
  const existing = await readCache<DailyActionsDTO>(key);
  if (!existing) return;

  const patchDone = <T extends { id: string; isDone: boolean; doneAt?: string | null }>(item: T): T =>
    item.id === actionId ? { ...item, isDone, doneAt: isDone ? doneAt : undefined } : item;

  const updated: DailyActionsDTO = {
    ...existing,
    actions: existing.actions.map(patchDone),
    primaryAction: existing.primaryAction ? patchDone(existing.primaryAction) : undefined,
    lifeAreaCards: existing.lifeAreaCards?.map(patchDone),
  };
  await writeCache(key, localizeDailyActionsPayload(updated, locale));
}

function buildEmptyDailyTransits(date: string, locale: DailyLocale): DailyTransitsDTO {
  const isEnglish = locale === 'en';

  return {
    date,
    title: isEnglish ? "Today's Sky Effects" : 'Bugünün Gökyüzü Etkileri',
    hero: {
      headline: isEnglish ? 'Today is being prepared' : 'Bugün için veri hazırlanıyor',
      supporting: isEnglish
        ? 'This area will update automatically as soon as the data arrives.'
        : 'Veri gelir gelmez bu alan otomatik güncellenecek.',
      moodTag: isEnglish ? 'Calm' : 'Sakin',
      intensity: 0,
      icon: 'moon',
      gradientKey: 'purpleMist',
    },
    quickFacts: [],
    todayCanDo: {
      headline: isEnglish ? 'What You Can Do Today' : 'Bugün Yapabileceklerin',
      body: isEnglish ? 'Action suggestions are not ready yet.' : 'Aksiyon önerileri henüz hazır değil.',
      ctaText: isEnglish ? 'What Can You Do Today?' : 'Bugün Ne Yapabilirsin?',
      ctaRoute: 'TodayActions',
    },
    focusPoints: [],
    retrogrades: [],
    transits: [],
  };
}

function buildEmptyDailyActions(date: string, locale: DailyLocale): DailyActionsDTO {
  const isEnglish = locale === 'en';

  return {
    date,
    header: {
      title: isEnglish ? 'What Can You Do Today?' : 'Bugün Ne Yapabilirsin?',
      subtitle: isEnglish ? 'The action list is being prepared.' : 'Aksiyon listesi hazırlanıyor.',
    },
    actions: [],
    miniPlan: {
      title: isEnglish ? 'Mini Plan' : 'Mini Plan',
      steps: [],
    },
  };
}

export async function getDailyTransits(
  date: string,
  locale?: string,
  scopeKey?: string | null,
): Promise<DailyTransitsDTO> {
  const normalizedDate = normalizeDate(date);
  const resolvedLocale = normalizeLocale(locale);
  const cacheKey = transitsCacheKey(normalizedDate, resolvedLocale, scopeKey);

  if (!envConfig.isApiConfigured) {
    logWarnOnce(
      'daily',
      'transits_service_not_configured',
      'Daily transits service is not configured. Returning empty state payload.',
      { appEnv: envConfig.appEnv, date: normalizedDate, locale: resolvedLocale },
    );
    const cached = await readCache<DailyTransitsDTO>(cacheKey);
    return cached ?? buildEmptyDailyTransits(normalizedDate, resolvedLocale);
  }

  try {
    const { data } = await api.get<DailyTransitsDTO>(DAILY_TRANSITS_BASE, {
      params: { date: normalizedDate, locale: resolvedLocale },
    });
    await writeCache(cacheKey, data);
    return data;
  } catch (error) {
    logApiError('daily_transits_fetch', error, { date: normalizedDate, locale: resolvedLocale });
    const fallback = await readCache<DailyTransitsDTO>(cacheKey);
    return fallback ?? buildEmptyDailyTransits(normalizedDate, resolvedLocale);
  }
}

export async function getDailyActions(
  date: string,
  locale?: string,
  scopeKey?: string | null,
): Promise<DailyActionsDTO> {
  const normalizedDate = normalizeDate(date);
  const resolvedLocale = normalizeLocale(locale);
  const cacheKey = actionsCacheKey(normalizedDate, resolvedLocale, scopeKey);

  if (!envConfig.isApiConfigured) {
    logWarnOnce(
      'daily',
      'actions_service_not_configured',
      'Daily actions service is not configured. Returning empty state payload.',
      { appEnv: envConfig.appEnv, date: normalizedDate, locale: resolvedLocale },
    );
    const cached = await readCache<DailyActionsDTO>(cacheKey);
    return cached ? localizeDailyActionsPayload(cached, resolvedLocale) : buildEmptyDailyActions(normalizedDate, resolvedLocale);
  }

  try {
    const { data } = await api.get<DailyActionsDTO>(`${DAILY_TRANSITS_BASE}/actions`, {
      params: { date: normalizedDate, locale: resolvedLocale },
    });
    const localized = localizeDailyActionsPayload(data, resolvedLocale);
    await writeCache(cacheKey, localized);
    return localized;
  } catch (error) {
    logApiError('daily_actions_fetch', error, { date: normalizedDate, locale: resolvedLocale });
    const fallback = await readCache<DailyActionsDTO>(cacheKey);
    return fallback ? localizeDailyActionsPayload(fallback, resolvedLocale) : buildEmptyDailyActions(normalizedDate, resolvedLocale);
  }
}

export async function markActionDone(
  date: string,
  actionId: string,
  isDone: boolean,
  locale?: string,
  scopeKey?: string | null,
): Promise<DailyActionToggleResponse> {
  const normalizedDate = normalizeDate(date);
  const resolvedLocale = normalizeLocale(locale);

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
      { date: normalizedDate, isDone, locale: resolvedLocale },
    );
    await patchLocalActionState(normalizedDate, actionId, data.isDone, resolvedLocale, scopeKey, data.doneAt);
    return data;
  } catch (error) {
    logApiError('daily_action_toggle', error, {
      date: normalizedDate,
      actionId,
      isDone,
      locale: resolvedLocale,
    });
    throw error;
  }
}

export async function sendFeedback(payload: DailyFeedbackPayload, locale?: string): Promise<void> {
  const resolvedLocale = normalizeLocale(locale);

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
      locale: resolvedLocale,
    });
  } catch (error) {
    logApiError('daily_feedback_send', error, {
      itemType: payload.itemType,
      itemId: payload.itemId,
      sentiment: payload.sentiment,
      locale: resolvedLocale,
    });
    throw error;
  }
}

export function getTodayIsoDate(): string {
  return normalizeDate();
}
