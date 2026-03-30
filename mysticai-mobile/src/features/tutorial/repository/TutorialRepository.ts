import type { TutorialConfigSource, TutorialDefinition } from '../domain/tutorial.types';
import { getTutorialLocaleRank, resolveTutorialLocaleTag } from '../domain/tutorial.locale';
import type { TutorialSource } from '../sources/TutorialSource';

export interface TutorialQuery {
  screenKey?: string;
  includeInactive?: boolean;
  source?: TutorialConfigSource;
  at?: Date;
}

function sortTutorials(tutorials: TutorialDefinition[], locale: string): TutorialDefinition[] {
  return tutorials.sort((left, right) => {
    const localeRankDiff =
      getTutorialLocaleRank(right.targeting?.locale, locale)
      - getTutorialLocaleRank(left.targeting?.locale, locale);

    if (localeRankDiff !== 0) {
      return localeRankDiff;
    }

    return right.priority - left.priority || left.order - right.order;
  });
}

function isWithinSchedule(tutorial: TutorialDefinition, at: Date): boolean {
  const startAtMs = tutorial.startAt ? Date.parse(tutorial.startAt) : Number.NEGATIVE_INFINITY;
  const endAtMs = tutorial.endAt ? Date.parse(tutorial.endAt) : Number.POSITIVE_INFINITY;

  return at.getTime() >= startAtMs && at.getTime() <= endAtMs;
}

export class TutorialRepository {
  constructor(
    private readonly sources: Record<TutorialConfigSource, TutorialSource>,
  ) {}

  private resolveSource(source: TutorialConfigSource): TutorialSource {
    return this.sources[source];
  }

  async listTutorials(query: TutorialQuery = {}): Promise<TutorialDefinition[]> {
    const {
      source = 'merged_fallback',
      screenKey,
      includeInactive = false,
      at = new Date(),
    } = query;

    const sourceAdapter = this.resolveSource(source);
    const tutorials = await sourceAdapter.fetchTutorials();
    const locale = resolveTutorialLocaleTag();

    return sortTutorials(
      tutorials.filter((tutorial) => {
        if (getTutorialLocaleRank(tutorial.targeting?.locale, locale) === 0) {
          return false;
        }

        if (screenKey && tutorial.screenKey !== screenKey) {
          return false;
        }

        if (!includeInactive) {
          if (!tutorial.isActive || tutorial.publishStatus !== 'published') {
            return false;
          }
          if (!isWithinSchedule(tutorial, at)) {
            return false;
          }
        }

        return true;
      }),
      locale,
    );
  }

  async findById(tutorialId: string, source: TutorialConfigSource = 'merged_fallback'): Promise<TutorialDefinition | null> {
    const tutorials = await this.listTutorials({ source, includeInactive: true });
    return tutorials.find((tutorial) => tutorial.tutorialId === tutorialId) ?? null;
  }
}
