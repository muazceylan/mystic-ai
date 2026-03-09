import type {
  TutorialDefinition,
  TutorialDisplayRule,
  TutorialProgress,
  TutorialStartReason,
} from '../domain/tutorial.types';

export interface TutorialDisplayContext {
  reason: TutorialStartReason;
  progress: TutorialProgress | null;
  isFirstScreenVisit: boolean;
  isFirstAppOpen: boolean;
}

function shouldAllowForVersion(
  rule: TutorialDisplayRule,
  definition: TutorialDefinition,
  progress: TutorialProgress | null,
): boolean {
  if (rule.frequency === 'always') {
    return true;
  }

  if (!progress) {
    return true;
  }

  if (rule.frequency === 'once') {
    return progress.shownCount === 0;
  }

  if (rule.frequency === 'once_per_version') {
    if (!rule.allowIfCompleted && progress.completedVersion === definition.version) {
      return false;
    }

    if (!rule.allowIfSkipped && progress.skippedVersion === definition.version) {
      return false;
    }

    if (progress.lastSeenVersion === definition.version) {
      return false;
    }

    return true;
  }

  return true;
}

export function canStartTutorial(definition: TutorialDefinition, context: TutorialDisplayContext): boolean {
  if (!definition.isActive || !definition.steps.length) {
    return false;
  }

  const rule = definition.displayRules.find((entry) => entry.trigger === context.reason);
  if (!rule) {
    return false;
  }

  if (context.progress?.dontShowAgain && context.reason !== 'manual_reopen') {
    return false;
  }

  if (context.reason === 'manual_reopen') {
    return true;
  }

  if (context.reason === 'first_app_open' && !context.isFirstAppOpen) {
    return false;
  }

  if (context.reason === 'first_screen_visit' && !context.isFirstScreenVisit) {
    return false;
  }

  if (context.reason === 'version_changed') {
    if (!context.progress) {
      return false;
    }

    const latestSeen =
      context.progress.lastSeenVersion ??
      context.progress.completedVersion ??
      context.progress.skippedVersion;

    if (latestSeen === null) {
      return false;
    }

    if (latestSeen === definition.version) {
      return false;
    }
  }

  return shouldAllowForVersion(rule, definition, context.progress);
}
