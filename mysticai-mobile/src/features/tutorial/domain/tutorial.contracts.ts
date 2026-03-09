import type { TutorialPlatform } from './tutorial.types';

export type TutorialAdminStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type TutorialContractPresentationType =
  | 'SPOTLIGHT_CARD'
  | 'FULLSCREEN_CAROUSEL'
  | 'INLINE_HINT'
  | 'spotlight_card'
  | 'fullscreen_carousel'
  | 'inline_hint';

export interface TutorialStepContract {
  stepId: string;
  order: number;
  title: string;
  body: string;
  targetKey: string;
  iconKey?: string | null;
  presentationType: TutorialContractPresentationType;
  isActive: boolean;
}

export interface TutorialConfigContract {
  tutorialId: string;
  name: string;
  screenKey: string;
  version: number;
  isActive: boolean;
  platform: TutorialPlatform;
  priority: number;
  presentationType: TutorialContractPresentationType;
  startAt?: string | null;
  endAt?: string | null;
  status: TutorialAdminStatus;
  steps: TutorialStepContract[];
  audienceRules?: Record<string, unknown> | string | null;
  minAppVersion?: string | null;
  maxAppVersion?: string | null;
  locale?: string | null;
  experimentKey?: string | null;
  rolloutPercentage?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TutorialConfigListResponse {
  tutorials: TutorialConfigContract[];
  configVersion?: string;
  fetchedAt?: string;
}
