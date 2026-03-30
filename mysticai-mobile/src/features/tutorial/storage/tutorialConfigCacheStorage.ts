import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TutorialConfigListResponse } from '../domain/tutorial.contracts';
import { TUTORIAL_STORAGE_KEYS } from '../domain/tutorial.constants';
import { normalizeTutorialLocaleTag } from '../domain/tutorial.locale';

interface TutorialConfigCacheEnvelope {
  cachedAt: string;
  cachedAtMs: number;
  payload: TutorialConfigListResponse;
}

export interface TutorialConfigCacheSnapshot {
  cachedAt: string;
  cachedAtMs: number;
  payload: TutorialConfigListResponse;
}

function isValidPayload(input: unknown): input is TutorialConfigListResponse {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const candidate = input as { tutorials?: unknown };
  return Array.isArray(candidate.tutorials);
}

function resolveCacheKey(locale?: string | null): string {
  const normalizedLocale = normalizeTutorialLocaleTag(locale) ?? 'default';
  return `${TUTORIAL_STORAGE_KEYS.REMOTE_CONFIG_CACHE}:${normalizedLocale}`;
}

export async function readTutorialConfigCache(locale?: string | null): Promise<TutorialConfigListResponse | null> {
  const snapshot = await readTutorialConfigCacheSnapshot(locale);
  return snapshot?.payload ?? null;
}

export async function readTutorialConfigCacheSnapshot(locale?: string | null): Promise<TutorialConfigCacheSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(resolveCacheKey(locale));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as TutorialConfigCacheEnvelope;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    if (!isValidPayload(parsed.payload)) {
      return null;
    }

    const cachedAtMs = Number.isFinite(parsed.cachedAtMs)
      ? parsed.cachedAtMs
      : Date.parse(parsed.cachedAt);

    if (!Number.isFinite(cachedAtMs)) {
      return null;
    }

    return {
      cachedAt: parsed.cachedAt,
      cachedAtMs,
      payload: parsed.payload,
    };
  } catch {
    return null;
  }
}

export async function writeTutorialConfigCache(
  locale: string | null | undefined,
  payload: TutorialConfigListResponse,
): Promise<void> {
  try {
    const envelope: TutorialConfigCacheEnvelope = {
      cachedAt: new Date().toISOString(),
      cachedAtMs: Date.now(),
      payload,
    };

    await AsyncStorage.setItem(
      resolveCacheKey(locale),
      JSON.stringify(envelope),
    );
  } catch {
    // Non-blocking cache write.
  }
}

export async function clearTutorialConfigCache(locale?: string | null): Promise<void> {
  try {
    await AsyncStorage.removeItem(resolveCacheKey(locale));
  } catch {
    // Non-blocking cache clear.
  }
}
