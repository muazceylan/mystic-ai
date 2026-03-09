import type { TutorialDefinition } from '../domain/tutorial.types';
import { localTutorialRegistry } from '../registry/tutorialRegistry';
import type { TutorialSource } from './TutorialSource';

export class TutorialLocalSource implements TutorialSource {
  readonly sourceType = 'local_static' as const;

  async fetchTutorials(): Promise<TutorialDefinition[]> {
    return localTutorialRegistry.map((tutorial) => ({
      ...tutorial,
      source: this.sourceType,
      steps: tutorial.steps.map((step) => ({ ...step })),
      targets: tutorial.targets.map((target) => ({ ...target })),
      displayRules: tutorial.displayRules.map((rule) => ({ ...rule })),
    }));
  }
}
