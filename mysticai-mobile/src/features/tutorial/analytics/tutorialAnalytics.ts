import { trackEvent } from '../../../services/analytics';
import type { TutorialDefinition, TutorialStartReason, TutorialStep } from '../domain/tutorial.types';

export const TUTORIAL_ANALYTICS_EVENTS = {
  STARTED: 'tutorial_started',
  STEP_VIEWED: 'tutorial_step_viewed',
  NEXT_CLICKED: 'tutorial_next_clicked',
  SKIPPED: 'tutorial_skipped',
  COMPLETED: 'tutorial_completed',
  REOPENED: 'tutorial_reopened',
  MANAGEMENT_CENTER_OPENED: 'tutorial_management_center_opened',
  RESET_CLICKED: 'tutorial_reset_clicked',
  RESET_CONFIRMED: 'tutorial_reset_confirmed',
  DISMISS_TOGGLED: 'tutorial_dismiss_toggled',
  REOPEN_CLICKED: 'tutorial_reopen_clicked',
  GLOBAL_ONBOARDING_REOPENED: 'global_onboarding_reopened',
  CONFIG_FETCH_STARTED: 'tutorial_config_fetch_started',
  CONFIG_FETCH_SUCCEEDED: 'tutorial_config_fetch_succeeded',
  CONFIG_FETCH_FAILED: 'tutorial_config_fetch_failed',
} as const;

interface TutorialAnalyticsBase {
  tutorial: TutorialDefinition;
  reason: TutorialStartReason;
}

function buildBasePayload({ tutorial, reason }: TutorialAnalyticsBase) {
  return {
    tutorial_id: tutorial.tutorialId,
    tutorial_version: tutorial.version,
    screen_key: tutorial.screenKey,
    tutorial_key: tutorial.analyticsKey,
    source: tutorial.source,
    reason,
    entry_point: reason,
    config_source: tutorial.resolvedSource,
  };
}

function buildStepPayload(step: TutorialStep, stepIndex: number, totalSteps: number) {
  return {
    step_id: step.stepId,
    step_key: step.analyticsKey,
    step_order: step.order,
    step_index: stepIndex + 1,
    total_steps: totalSteps,
  };
}

export function trackTutorialStarted(input: TutorialAnalyticsBase): void {
  trackEvent(TUTORIAL_ANALYTICS_EVENTS.STARTED, buildBasePayload(input));
}

export function trackTutorialStepViewed(
  input: TutorialAnalyticsBase,
  step: TutorialStep,
  stepIndex: number,
  totalSteps: number,
): void {
  trackEvent(TUTORIAL_ANALYTICS_EVENTS.STEP_VIEWED, {
    ...buildBasePayload(input),
    ...buildStepPayload(step, stepIndex, totalSteps),
  });
}

export function trackTutorialNextClicked(
  input: TutorialAnalyticsBase,
  step: TutorialStep,
  stepIndex: number,
  totalSteps: number,
): void {
  trackEvent(TUTORIAL_ANALYTICS_EVENTS.NEXT_CLICKED, {
    ...buildBasePayload(input),
    ...buildStepPayload(step, stepIndex, totalSteps),
  });
}

export function trackTutorialSkipped(
  input: TutorialAnalyticsBase,
  step: TutorialStep,
  stepIndex: number,
  totalSteps: number,
): void {
  trackEvent(TUTORIAL_ANALYTICS_EVENTS.SKIPPED, {
    ...buildBasePayload(input),
    ...buildStepPayload(step, stepIndex, totalSteps),
    completion_state: 'skipped',
  });
}

export function trackTutorialCompleted(input: TutorialAnalyticsBase): void {
  trackEvent(TUTORIAL_ANALYTICS_EVENTS.COMPLETED, {
    ...buildBasePayload(input),
    completion_state: 'completed',
  });
}

export function trackTutorialReopened(input: TutorialAnalyticsBase): void {
  trackEvent(TUTORIAL_ANALYTICS_EVENTS.REOPENED, buildBasePayload(input));
}

interface TutorialManagementPayload {
  tutorial?: TutorialDefinition | null;
  tutorialId?: string;
  tutorialVersion?: number | null;
  screenKey?: string | null;
  sourceScreen?: string;
  entryPoint?: string;
  completionState?: string;
}

function buildTutorialIdentityPayload(payload: TutorialManagementPayload) {
  if (payload.tutorial) {
    return {
      tutorial_id: payload.tutorial.tutorialId,
      tutorial_version: payload.tutorial.version,
      screen_key: payload.tutorial.screenKey,
      config_source: payload.tutorial.resolvedSource,
    };
  }

  return {
    tutorial_id: payload.tutorialId ?? null,
    tutorial_version: payload.tutorialVersion ?? null,
    screen_key: payload.screenKey ?? null,
  };
}

export function trackTutorialManagementCenterOpened(sourceScreen: string): void {
  trackEvent(TUTORIAL_ANALYTICS_EVENTS.MANAGEMENT_CENTER_OPENED, {
    source_screen: sourceScreen,
    entry_point: 'manual_reopen',
  });
}

export function trackTutorialResetClicked(payload: TutorialManagementPayload): void {
  trackEvent(TUTORIAL_ANALYTICS_EVENTS.RESET_CLICKED, {
    ...buildTutorialIdentityPayload(payload),
    source_screen: payload.sourceScreen ?? 'tutorial_center',
    entry_point: payload.entryPoint ?? 'manual_reopen',
    completion_state: payload.completionState ?? null,
  });
}

export function trackTutorialResetConfirmed(payload: TutorialManagementPayload): void {
  trackEvent(TUTORIAL_ANALYTICS_EVENTS.RESET_CONFIRMED, {
    ...buildTutorialIdentityPayload(payload),
    source_screen: payload.sourceScreen ?? 'tutorial_center',
    entry_point: payload.entryPoint ?? 'manual_reopen',
    completion_state: payload.completionState ?? null,
  });
}

export function trackTutorialDismissToggled(
  payload: TutorialManagementPayload & { dismissEnabled: boolean },
): void {
  trackEvent(TUTORIAL_ANALYTICS_EVENTS.DISMISS_TOGGLED, {
    ...buildTutorialIdentityPayload(payload),
    source_screen: payload.sourceScreen ?? 'tutorial_center',
    entry_point: payload.entryPoint ?? 'manual_reopen',
    completion_state: payload.dismissEnabled ? 'dismissed' : 'eligible',
    dismiss_enabled: payload.dismissEnabled,
  });
}

export function trackTutorialReopenClicked(payload: TutorialManagementPayload): void {
  trackEvent(TUTORIAL_ANALYTICS_EVENTS.REOPEN_CLICKED, {
    ...buildTutorialIdentityPayload(payload),
    source_screen: payload.sourceScreen ?? 'tutorial_center',
    entry_point: payload.entryPoint ?? 'manual_reopen',
    completion_state: payload.completionState ?? null,
  });
}

export function trackGlobalOnboardingReopened(payload: TutorialManagementPayload): void {
  trackEvent(TUTORIAL_ANALYTICS_EVENTS.GLOBAL_ONBOARDING_REOPENED, {
    ...buildTutorialIdentityPayload(payload),
    source_screen: payload.sourceScreen ?? 'tutorial_center',
    entry_point: payload.entryPoint ?? 'manual_reopen',
  });
}

export function trackTutorialConfigFetchStarted(platform: string): void {
  trackEvent(TUTORIAL_ANALYTICS_EVENTS.CONFIG_FETCH_STARTED, {
    platform,
  });
}

export function trackTutorialConfigFetchSucceeded(
  platform: string,
  tutorialCount: number,
  source: 'remote' | 'cache' | 'local',
): void {
  trackEvent(TUTORIAL_ANALYTICS_EVENTS.CONFIG_FETCH_SUCCEEDED, {
    platform,
    tutorial_count: tutorialCount,
    resolved_source: source,
    config_source: source,
  });
}

export function trackTutorialConfigFetchFailed(
  platform: string,
  reason: string,
  fallbackUsed: boolean,
): void {
  trackEvent(TUTORIAL_ANALYTICS_EVENTS.CONFIG_FETCH_FAILED, {
    platform,
    reason,
    fallback_used: fallbackUsed,
    completion_state: fallbackUsed ? 'fallback_applied' : 'no_fallback',
  });
}
