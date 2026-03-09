import type { TutorialDefinition, TutorialConfigSource } from '../domain/tutorial.types';

export interface TutorialSource {
  readonly sourceType: TutorialConfigSource;
  fetchTutorials: () => Promise<TutorialDefinition[]>;
}
