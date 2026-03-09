export type TutorialPlatform = 'MOBILE' | 'IOS' | 'ANDROID' | 'WEB' | 'ALL';

export type TutorialStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';
export type TutorialManagementStatus = 'not_started' | 'completed' | 'skipped' | 'dismissed';

export type TutorialPublishStatus = 'draft' | 'published';

export type TutorialPresentationType = 'spotlight_card' | 'fullscreen_carousel' | 'inline_hint';

export type TutorialDisplayTrigger =
  | 'first_app_open'
  | 'first_screen_visit'
  | 'manual_reopen'
  | 'version_changed';

export type TutorialDisplayFrequency = 'once' | 'once_per_version' | 'always';

export type TutorialConfigSource = 'local_static' | 'remote_api' | 'merged_fallback';

export type TutorialStartReason = TutorialDisplayTrigger;
export type TutorialResolvedConfigSource = 'remote' | 'cache' | 'local';

export interface TutorialTargeting {
  audienceRules?: Record<string, unknown> | null;
  minAppVersion?: string | null;
  maxAppVersion?: string | null;
  locale?: string | null;
  experimentKey?: string | null;
  rolloutPercentage?: number | null;
}

export interface TutorialTarget {
  targetKey: string;
  screenKey: string;
  shape?: 'rounded_rect' | 'circle';
  padding?: number;
  cornerRadius?: number;
}

export interface TutorialStep {
  stepId: string;
  order: number;
  title: string;
  body: string;
  targetKey: string;
  iconKey?: string;
  presentationType: TutorialPresentationType;
  isActive: boolean;
  analyticsKey: string;
}

export interface TutorialDisplayRule {
  ruleId: string;
  trigger: TutorialDisplayTrigger;
  frequency: TutorialDisplayFrequency;
  allowIfSkipped?: boolean;
  allowIfCompleted?: boolean;
}

export interface TutorialDefinition {
  tutorialId: string;
  name: string;
  screenKey: string;
  version: number;
  isActive: boolean;
  platform: TutorialPlatform;
  priority: number;
  order: number;
  presentationType: TutorialPresentationType;
  analyticsKey: string;
  startAt?: string | null;
  endAt?: string | null;
  publishStatus: TutorialPublishStatus;
  source: TutorialConfigSource;
  resolvedSource: TutorialResolvedConfigSource;
  targets: TutorialTarget[];
  steps: TutorialStep[];
  displayRules: TutorialDisplayRule[];
  createdAt?: string;
  updatedAt?: string;
  targeting?: TutorialTargeting;
}

export interface TutorialProgress {
  tutorialId: string;
  currentStepIndex: number;
  status: TutorialStatus;
  shownCount: number;
  lastSeenVersion: number | null;
  completedVersion: number | null;
  skippedVersion: number | null;
  lastShownAt: string | null;
  dontShowAgain: boolean;
}

export interface TutorialSession {
  definition: TutorialDefinition;
  stepIndex: number;
  reason: TutorialStartReason;
}

export interface TutorialTargetLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}
