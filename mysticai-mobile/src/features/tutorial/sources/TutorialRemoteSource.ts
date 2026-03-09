import { Platform } from 'react-native';
import {
  trackTutorialConfigFetchFailed,
  trackTutorialConfigFetchStarted,
  trackTutorialConfigFetchSucceeded,
} from '../analytics/tutorialAnalytics';
import { TUTORIAL_CONFIG_POLICY } from '../domain/tutorial.constants';
import { getTutorialTargetKeyOptions } from '../domain/tutorial.constants';
import type { TutorialConfigListResponse } from '../domain/tutorial.contracts';
import { mapContractToTutorialDefinition } from '../domain/tutorial.mappers';
import type { TutorialDefinition, TutorialPlatform } from '../domain/tutorial.types';
import {
  readTutorialConfigCacheSnapshot,
  type TutorialConfigCacheSnapshot,
  writeTutorialConfigCache,
} from '../storage/tutorialConfigCacheStorage';
import { tutorialDebugLog } from '../services/tutorialDebug';
import type { TutorialSource } from './TutorialSource';

export interface TutorialRemoteClient {
  fetchTutorialConfig: (platform: TutorialPlatform) => Promise<TutorialConfigListResponse | null>;
}

function mapRuntimePlatform(): TutorialPlatform {
  if (Platform.OS === 'ios') return 'IOS';
  if (Platform.OS === 'android') return 'ANDROID';
  if (Platform.OS === 'web') return 'WEB';
  return 'MOBILE';
}

function hasText(input: unknown): input is string {
  return typeof input === 'string' && input.trim().length > 0;
}

function normalizeErrorReason(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim().slice(0, 120);
  }

  return 'tutorial_config_fetch_failed';
}

function normalizeResponse(response: TutorialConfigListResponse | null): TutorialConfigListResponse | null {
  if (!response || !Array.isArray(response.tutorials) || response.tutorials.length === 0) {
    return null;
  }

  const normalizedTutorials = response.tutorials
    .filter((tutorial) => (
      hasText(tutorial?.tutorialId)
      && hasText(tutorial?.name)
      && hasText(tutorial?.screenKey)
      && Number.isFinite(tutorial?.version)
      && Array.isArray(tutorial?.steps)
    ))
    .map((tutorial) => {
      const supportedTargetKeys = getTutorialTargetKeyOptions(tutorial.screenKey);
      return {
        ...tutorial,
        steps: tutorial.steps.filter((step) => (
          hasText(step?.stepId)
          && Number.isFinite(step?.order)
          && hasText(step?.title)
          && hasText(step?.body)
          && hasText(step?.targetKey)
          && (supportedTargetKeys.length === 0 || supportedTargetKeys.includes(step.targetKey))
        )),
      };
    })
    .filter((tutorial) => tutorial.steps.length > 0);

  if (!normalizedTutorials.length) {
    return null;
  }

  return {
    ...response,
    tutorials: normalizedTutorials,
  };
}

function mapToDefinitions(
  response: TutorialConfigListResponse,
  resolvedSource: 'remote' | 'cache',
): TutorialDefinition[] {
  return response.tutorials.map((tutorial) => mapContractToTutorialDefinition(
    tutorial,
    'remote_api',
    resolvedSource,
  ));
}

function toCacheAgeMs(snapshot: TutorialConfigCacheSnapshot): number {
  return Math.max(0, Date.now() - snapshot.cachedAtMs);
}

async function readNormalizedCacheSnapshot(): Promise<{
  snapshot: TutorialConfigCacheSnapshot;
  normalized: TutorialConfigListResponse;
} | null> {
  const snapshot = await readTutorialConfigCacheSnapshot();
  const normalized = snapshot ? normalizeResponse(snapshot.payload) : null;

  if (!snapshot || !normalized) {
    return null;
  }

  return {
    snapshot,
    normalized,
  };
}

export class TutorialRemoteSource implements TutorialSource {
  readonly sourceType = 'remote_api' as const;
  private backgroundRefreshInFlight = false;

  constructor(private readonly client: TutorialRemoteClient | null = null) {}

  private async fetchNormalizedRemoteConfig(runtimePlatform: TutorialPlatform): Promise<{
    normalized: TutorialConfigListResponse | null;
    failureReason: string | null;
  }> {
    try {
      const response = await this.client?.fetchTutorialConfig(runtimePlatform);
      return {
        normalized: normalizeResponse(response ?? null),
        failureReason: null,
      };
    } catch (error) {
      return {
        normalized: null,
        failureReason: normalizeErrorReason(error),
      };
    }
  }

  private refreshRemoteInBackground(runtimePlatform: TutorialPlatform): void {
    if (!this.client || this.backgroundRefreshInFlight) {
      return;
    }

    this.backgroundRefreshInFlight = true;

    void (async () => {
      trackTutorialConfigFetchStarted(runtimePlatform);
      const result = await this.fetchNormalizedRemoteConfig(runtimePlatform);

      if (result.normalized) {
        await writeTutorialConfigCache(result.normalized);
        tutorialDebugLog('config_source_selected', {
          source: 'remote',
          tutorial_count: result.normalized.tutorials.length,
          refresh_mode: 'background',
        });
        trackTutorialConfigFetchSucceeded(runtimePlatform, result.normalized.tutorials.length, 'remote');
      } else {
        tutorialDebugLog('config_background_refresh_failed', {
          reason: result.failureReason ?? 'remote_empty_or_invalid_response',
        });
        trackTutorialConfigFetchFailed(
          runtimePlatform,
          result.failureReason ?? 'remote_empty_or_invalid_response',
          true,
        );
      }
    })().finally(() => {
      this.backgroundRefreshInFlight = false;
    });
  }

  async fetchTutorials(): Promise<TutorialDefinition[]> {
    const runtimePlatform = mapRuntimePlatform();
    const cacheEntry = await readNormalizedCacheSnapshot();

    if (!this.client) {
      if (!cacheEntry) {
        return [];
      }

      tutorialDebugLog('config_source_selected', {
        source: 'cached_remote',
        tutorial_count: cacheEntry.normalized.tutorials.length,
        reason: 'remote_client_missing',
      });
      trackTutorialConfigFetchSucceeded(runtimePlatform, cacheEntry.normalized.tutorials.length, 'cache');
      return mapToDefinitions(cacheEntry.normalized, 'cache');
    }

    if (cacheEntry) {
      const cacheAgeMs = toCacheAgeMs(cacheEntry.snapshot);

      if (cacheAgeMs < TUTORIAL_CONFIG_POLICY.CACHE_FRESH_TTL_MS) {
        tutorialDebugLog('config_source_selected', {
          source: 'cached_remote',
          tutorial_count: cacheEntry.normalized.tutorials.length,
          reason: 'fresh_cache',
          cache_age_ms: cacheAgeMs,
        });
        trackTutorialConfigFetchSucceeded(runtimePlatform, cacheEntry.normalized.tutorials.length, 'cache');
        return mapToDefinitions(cacheEntry.normalized, 'cache');
      }

      if (cacheAgeMs < TUTORIAL_CONFIG_POLICY.CACHE_STALE_TTL_MS) {
        tutorialDebugLog('config_source_selected', {
          source: 'cached_remote',
          tutorial_count: cacheEntry.normalized.tutorials.length,
          reason: 'stale_cache_background_refresh',
          cache_age_ms: cacheAgeMs,
        });
        this.refreshRemoteInBackground(runtimePlatform);
        trackTutorialConfigFetchSucceeded(runtimePlatform, cacheEntry.normalized.tutorials.length, 'cache');
        return mapToDefinitions(cacheEntry.normalized, 'cache');
      }
    }

    trackTutorialConfigFetchStarted(runtimePlatform);
    const remoteResult = await this.fetchNormalizedRemoteConfig(runtimePlatform);

    if (remoteResult.normalized) {
      await writeTutorialConfigCache(remoteResult.normalized);
      tutorialDebugLog('config_source_selected', {
        source: 'remote',
        tutorial_count: remoteResult.normalized.tutorials.length,
        reason: 'fresh_remote_fetch',
      });
      trackTutorialConfigFetchSucceeded(runtimePlatform, remoteResult.normalized.tutorials.length, 'remote');
      return mapToDefinitions(remoteResult.normalized, 'remote');
    }

    const hasFallback = Boolean(cacheEntry);
    trackTutorialConfigFetchFailed(
      runtimePlatform,
      remoteResult.failureReason ?? 'remote_empty_or_invalid_response',
      hasFallback,
    );

    if (!cacheEntry) {
      return [];
    }

    tutorialDebugLog('config_source_selected', {
      source: 'cached_remote',
      tutorial_count: cacheEntry.normalized.tutorials.length,
      reason: 'remote_fetch_failed',
    });
    trackTutorialConfigFetchSucceeded(runtimePlatform, cacheEntry.normalized.tutorials.length, 'cache');
    return mapToDefinitions(cacheEntry.normalized, 'cache');
  }
}
