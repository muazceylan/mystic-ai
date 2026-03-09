import type { TutorialConfigSource, TutorialDefinition } from '../domain/tutorial.types';
import { TUTORIAL_CONFIG_POLICY } from '../domain/tutorial.constants';
import { TutorialRepository } from '../repository/TutorialRepository';
import { tutorialDebugLog } from './tutorialDebug';

interface CacheEntry {
  tutorials: TutorialDefinition[];
  cachedAt: number;
}

const CACHE_TTL_MS = TUTORIAL_CONFIG_POLICY.IN_MEMORY_TTL_MS;

export class TutorialConfigService {
  private readonly cache = new Map<TutorialConfigSource, CacheEntry>();

  constructor(private readonly repository: TutorialRepository) {}

  async getTutorials(source: TutorialConfigSource = 'merged_fallback', forceRefresh = false): Promise<TutorialDefinition[]> {
    const now = Date.now();
    const current = this.cache.get(source);

    if (!forceRefresh && current && now - current.cachedAt < CACHE_TTL_MS) {
      return current.tutorials;
    }

    const tutorials = await this.repository.listTutorials({ source });
    this.cache.set(source, { tutorials, cachedAt: now });
    tutorialDebugLog('config_resolved', {
      source,
      tutorials: tutorials.length,
      resolved_sources: tutorials.reduce<Record<string, number>>((acc, tutorial) => {
        acc[tutorial.resolvedSource] = (acc[tutorial.resolvedSource] ?? 0) + 1;
        return acc;
      }, {}),
    });
    return tutorials;
  }

  async getTutorialsForScreen(
    screenKey: string,
    source: TutorialConfigSource = 'merged_fallback',
    forceRefresh = false,
  ): Promise<TutorialDefinition[]> {
    const tutorials = await this.getTutorials(source, forceRefresh);
    return tutorials.filter((tutorial) => tutorial.screenKey === screenKey);
  }

  async getTutorialById(
    tutorialId: string,
    source: TutorialConfigSource = 'merged_fallback',
    forceRefresh = false,
  ): Promise<TutorialDefinition | null> {
    if (forceRefresh) {
      await this.getTutorials(source, true);
    }

    const tutorials = await this.getTutorials(source);
    return tutorials.find((tutorial) => tutorial.tutorialId === tutorialId) ?? null;
  }

  invalidateCache(source?: TutorialConfigSource): void {
    if (source) {
      this.cache.delete(source);
      return;
    }

    this.cache.clear();
  }
}
