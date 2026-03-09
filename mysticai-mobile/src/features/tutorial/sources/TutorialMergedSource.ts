import type { TutorialDefinition } from '../domain/tutorial.types';
import { trackTutorialConfigFetchSucceeded } from '../analytics/tutorialAnalytics';
import { tutorialDebugLog } from '../services/tutorialDebug';
import type { TutorialSource } from './TutorialSource';
import { Platform } from 'react-native';

function sortTutorials(tutorials: TutorialDefinition[]): TutorialDefinition[] {
  return tutorials.sort((left, right) => right.priority - left.priority || left.order - right.order);
}

function cloneWithMergedSource(tutorial: TutorialDefinition): TutorialDefinition {
  return {
    ...tutorial,
    steps: tutorial.steps.map((step) => ({ ...step })),
    targets: tutorial.targets.map((target) => ({ ...target })),
    displayRules: tutorial.displayRules.map((rule) => ({ ...rule })),
  };
}

function mapRuntimePlatform(): string {
  if (Platform.OS === 'ios') return 'IOS';
  if (Platform.OS === 'android') return 'ANDROID';
  if (Platform.OS === 'web') return 'WEB';
  return 'MOBILE';
}

export class TutorialMergedSource implements TutorialSource {
  readonly sourceType = 'merged_fallback' as const;

  constructor(
    private readonly localSource: TutorialSource,
    private readonly remoteSource: TutorialSource,
  ) {}

  async fetchTutorials(): Promise<TutorialDefinition[]> {
    const [localResult, remoteResult] = await Promise.allSettled([
      this.localSource.fetchTutorials(),
      this.remoteSource.fetchTutorials(),
    ]);

    const localTutorials = localResult.status === 'fulfilled' ? localResult.value : [];
    const remoteTutorials = remoteResult.status === 'fulfilled' ? remoteResult.value : [];

    if (!remoteTutorials.length) {
      tutorialDebugLog('config_source_selected', {
        source: 'local_fallback',
        tutorial_count: localTutorials.length,
      });
      trackTutorialConfigFetchSucceeded(mapRuntimePlatform(), localTutorials.length, 'local');
      return sortTutorials(localTutorials.map(cloneWithMergedSource));
    }

    const merged = new Map<string, TutorialDefinition>();

    for (const localTutorial of localTutorials) {
      merged.set(localTutorial.tutorialId, cloneWithMergedSource(localTutorial));
    }

    for (const remoteTutorial of remoteTutorials) {
      merged.set(remoteTutorial.tutorialId, cloneWithMergedSource(remoteTutorial));
    }

    tutorialDebugLog('config_source_selected', {
      source: 'remote_with_local_fallback_merge',
      tutorial_count: merged.size,
      remote_count: remoteTutorials.length,
      local_count: localTutorials.length,
    });
    return sortTutorials(Array.from(merged.values()));
  }
}
