import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TutorialConfigListResponse } from '../domain/tutorial.contracts';
import { TUTORIAL_STORAGE_KEYS } from '../domain/tutorial.constants';

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

export async function readTutorialConfigCache(): Promise<TutorialConfigListResponse | null> {
  const snapshot = await readTutorialConfigCacheSnapshot();
  return snapshot?.payload ?? null;
}

export async function readTutorialConfigCacheSnapshot(): Promise<TutorialConfigCacheSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(TUTORIAL_STORAGE_KEYS.REMOTE_CONFIG_CACHE);
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

export async function writeTutorialConfigCache(payload: TutorialConfigListResponse): Promise<void> {
  try {
    const envelope: TutorialConfigCacheEnvelope = {
      cachedAt: new Date().toISOString(),
      cachedAtMs: Date.now(),
      payload,
    };

    await AsyncStorage.setItem(
      TUTORIAL_STORAGE_KEYS.REMOTE_CONFIG_CACHE,
      JSON.stringify(envelope),
    );
  } catch {
    // Non-blocking cache write.
  }
}

export async function clearTutorialConfigCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TUTORIAL_STORAGE_KEYS.REMOTE_CONFIG_CACHE);
  } catch {
    // Non-blocking cache clear.
  }
}
