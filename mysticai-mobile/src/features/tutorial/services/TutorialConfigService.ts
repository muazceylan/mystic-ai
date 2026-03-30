import type { TutorialConfigSource, TutorialDefinition } from '../domain/tutorial.types';
import { TUTORIAL_CONFIG_POLICY } from '../domain/tutorial.constants';
import { buildTutorialIdCandidates, resolveTutorialLocaleTag } from '../domain/tutorial.locale';
import { TutorialRepository } from '../repository/TutorialRepository';
import { tutorialDebugLog } from './tutorialDebug';

interface CacheEntry {
  tutorials: TutorialDefinition[];
  cachedAt: number;
}

const CACHE_TTL_MS = TUTORIAL_CONFIG_POLICY.IN_MEMORY_TTL_MS;

export class TutorialConfigService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly repository: TutorialRepository) {}

  private buildCacheKey(source: TutorialConfigSource): string {
    return `${source}:${resolveTutorialLocaleTag()}`;
  }

  async getTutorials(source: TutorialConfigSource = 'merged_fallback', forceRefresh = false): Promise<TutorialDefinition[]> {
    const now = Date.now();
    const cacheKey = this.buildCacheKey(source);
    const locale = resolveTutorialLocaleTag();
    const current = this.cache.get(cacheKey);

    if (!forceRefresh && current && now - current.cachedAt < CACHE_TTL_MS) {
      return current.tutorials;
    }

    const tutorials = await this.repository.listTutorials({ source });
    this.cache.set(cacheKey, { tutorials, cachedAt: now });
    tutorialDebugLog('config_resolved', {
      source,
      locale,
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
    const tutorialIdCandidates = buildTutorialIdCandidates(tutorialId, resolveTutorialLocaleTag());

    for (const candidate of tutorialIdCandidates) {
      const matchedTutorial = tutorials.find((tutorial) => tutorial.tutorialId === candidate);
      if (matchedTutorial) {
        return matchedTutorial;
      }
    }

    return null;
  }

  invalidateCache(source?: TutorialConfigSource): void {
    if (source) {
      const prefix = `${source}:`;
      Array.from(this.cache.keys())
        .filter((key) => key.startsWith(prefix))
        .forEach((key) => this.cache.delete(key));
      return;
    }

    this.cache.clear();
  }
}
