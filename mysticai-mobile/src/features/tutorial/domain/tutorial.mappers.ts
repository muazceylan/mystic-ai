import type {
  TutorialConfigContract,
  TutorialContractPresentationType,
  TutorialStepContract,
} from './tutorial.contracts';
import type {
  TutorialDefinition,
  TutorialDisplayRule,
  TutorialPresentationType,
  TutorialResolvedConfigSource,
  TutorialTarget,
} from './tutorial.types';
import { TUTORIAL_SCREEN_KEYS, getTutorialTargetKeyOptions, normalizeTutorialId } from './tutorial.constants';

function buildDefaultRules(screenKey: string): TutorialDisplayRule[] {
  if (screenKey === TUTORIAL_SCREEN_KEYS.GLOBAL_ONBOARDING) {
    return [
      {
        ruleId: 'first-app-open',
        trigger: 'first_app_open',
        frequency: 'once_per_version',
      },
      {
        ruleId: 'manual-reopen',
        trigger: 'manual_reopen',
        frequency: 'always',
        allowIfCompleted: true,
        allowIfSkipped: true,
      },
      {
        ruleId: 'version-changed',
        trigger: 'version_changed',
        frequency: 'once_per_version',
        allowIfCompleted: true,
        allowIfSkipped: true,
      },
    ];
  }

  return [
    {
      ruleId: 'first-screen-visit',
      trigger: 'first_screen_visit',
      frequency: 'once_per_version',
    },
    {
      ruleId: 'manual-reopen',
      trigger: 'manual_reopen',
      frequency: 'always',
      allowIfCompleted: true,
      allowIfSkipped: true,
    },
    {
      ruleId: 'version-changed',
      trigger: 'version_changed',
      frequency: 'once_per_version',
      allowIfCompleted: true,
      allowIfSkipped: true,
    },
  ];
}

function normalizePresentationType(value: TutorialContractPresentationType): TutorialPresentationType {
  if (value === 'SPOTLIGHT_CARD' || value === 'spotlight_card') {
    return 'spotlight_card';
  }

  if (value === 'FULLSCREEN_CAROUSEL' || value === 'fullscreen_carousel') {
    return 'fullscreen_carousel';
  }

  if (value === 'INLINE_HINT' || value === 'inline_hint') {
    return 'inline_hint';
  }

  return 'spotlight_card';
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeRolloutPercentage(value: number | null | undefined): number | null {
  if (!Number.isFinite(value ?? null)) {
    return null;
  }

  const numeric = Number(value);
  if (numeric < 0 || numeric > 100) {
    return null;
  }

  return numeric;
}

function normalizeAudienceRules(value: unknown): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function buildTargets(steps: TutorialStepContract[], screenKey: string): TutorialTarget[] {
  const options = getTutorialTargetKeyOptions(screenKey);
  const seen = new Set<string>();
  const targets: TutorialTarget[] = [];

  for (const step of steps) {
    const targetKey = step.targetKey;
    if (seen.has(targetKey)) {
      continue;
    }

    seen.add(targetKey);
    targets.push({
      targetKey,
      screenKey,
      shape: 'rounded_rect',
      padding: options.includes(targetKey) ? 10 : 8,
      cornerRadius: options.includes(targetKey) ? 20 : 16,
    });
  }

  return targets;
}

export function mapContractToTutorialDefinition(
  contract: TutorialConfigContract,
  source: 'remote_api' | 'merged_fallback',
  resolvedSource: TutorialResolvedConfigSource = 'remote',
): TutorialDefinition {
  const normalizedTutorialId = normalizeTutorialId(contract.tutorialId);
  const activeStepContracts = contract.steps
    .filter((step) => step.isActive)
    .sort((left, right) => left.order - right.order);

  const activeSteps = activeStepContracts
    .map((step) => ({
      stepId: step.stepId,
      order: step.order,
      title: step.title,
      body: step.body,
      targetKey: step.targetKey,
      iconKey: step.iconKey ?? undefined,
      presentationType: normalizePresentationType(step.presentationType ?? contract.presentationType),
      isActive: step.isActive,
      analyticsKey: `${normalizedTutorialId}.${step.stepId}`,
    }));

  const targets = buildTargets(activeStepContracts, contract.screenKey);

  return {
    tutorialId: normalizedTutorialId,
    name: contract.name,
    screenKey: contract.screenKey,
    version: contract.version,
    isActive: contract.isActive,
    platform: contract.platform,
    priority: contract.priority,
    order: contract.priority,
    presentationType: normalizePresentationType(contract.presentationType),
    analyticsKey: normalizedTutorialId,
    startAt: contract.startAt ?? null,
    endAt: contract.endAt ?? null,
    publishStatus: contract.status === 'PUBLISHED' ? 'published' : 'draft',
    source,
    resolvedSource,
    targets,
    steps: activeSteps,
    displayRules: buildDefaultRules(contract.screenKey),
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
    targeting: {
      audienceRules: normalizeAudienceRules(contract.audienceRules),
      minAppVersion: normalizeOptionalString(contract.minAppVersion),
      maxAppVersion: normalizeOptionalString(contract.maxAppVersion),
      locale: normalizeOptionalString(contract.locale),
      experimentKey: normalizeOptionalString(contract.experimentKey),
      rolloutPercentage: normalizeRolloutPercentage(contract.rolloutPercentage),
    },
  };
}
