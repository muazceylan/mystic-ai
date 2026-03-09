import { getTargetKeyOptions } from '../constants/tutorialConfigOptions';

export interface TutorialStepLike {
  stepId: string;
  orderIndex: number;
  title: string;
  body: string;
  targetKey: string;
  iconKey?: string;
  presentationType?: string;
  isActive: boolean;
}

export interface TutorialConfigLike {
  tutorialId: string;
  name: string;
  screenKey: string;
  version: number;
  isActive: boolean;
  startAt?: string;
  endAt?: string;
  minAppVersion?: string;
  maxAppVersion?: string;
  locale?: string;
  experimentKey?: string;
  rolloutPercentage?: number;
  audienceRules?: string;
  steps: TutorialStepLike[];
}

export interface TutorialValidationSummary {
  errors: string[];
  warnings: string[];
}

function hasText(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseTime(value: string | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

export function buildTutorialValidationSummary(
  config: TutorialConfigLike,
  mode: 'draft' | 'publish' = 'draft',
): TutorialValidationSummary {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!hasText(config.tutorialId)) errors.push('`tutorialId` zorunludur.');
  if (!hasText(config.name)) errors.push('`name` zorunludur.');
  if (!hasText(config.screenKey)) errors.push('`screenKey` zorunludur.');
  if (!Number.isFinite(config.version) || config.version < 1) errors.push('`version` en az 1 olmalıdır.');
  if (config.rolloutPercentage != null && (!Number.isFinite(config.rolloutPercentage) || config.rolloutPercentage < 0 || config.rolloutPercentage > 100)) {
    errors.push('`rolloutPercentage` 0-100 arasında olmalıdır.');
  }

  if (hasText(config.audienceRules)) {
    try {
      JSON.parse(config.audienceRules!.trim());
    } catch {
      errors.push('`audienceRules` geçerli bir JSON olmalıdır.');
    }
  }

  const startAtMs = parseTime(config.startAt);
  const endAtMs = parseTime(config.endAt);
  if (startAtMs !== null && endAtMs !== null && startAtMs > endAtMs) {
    errors.push('`startAt`, `endAt` tarihinden büyük olamaz.');
  }

  if (!Array.isArray(config.steps) || config.steps.length === 0) {
    errors.push('En az 1 step gereklidir.');
    return { errors, warnings };
  }

  const activeSteps = config.steps.filter((step) => step.isActive);
  if (mode === 'publish' && activeSteps.length === 0) {
    errors.push('Publish için en az 1 aktif step gereklidir.');
  }

  const stepIdSet = new Set<string>();
  const orderSet = new Set<number>();
  const targetFrequency = new Map<string, number>();

  config.steps.forEach((step, index) => {
    const row = index + 1;

    const normalizedStepId = step.stepId.trim();
    if (!normalizedStepId) {
      errors.push(`Step ${row}: \`stepId\` zorunludur.`);
    } else if (stepIdSet.has(normalizedStepId)) {
      errors.push(`Step ${row}: Duplicate \`stepId\` (${normalizedStepId}).`);
    } else {
      stepIdSet.add(normalizedStepId);
    }

    if (!Number.isFinite(step.orderIndex)) {
      errors.push(`Step ${row}: \`orderIndex\` geçersiz.`);
    } else if (orderSet.has(step.orderIndex)) {
      errors.push(`Step ${row}: Duplicate \`orderIndex\` (${step.orderIndex}).`);
    } else {
      orderSet.add(step.orderIndex);
    }

    if (!hasText(step.title)) errors.push(`Step ${row}: \`title\` zorunludur.`);
    if (!hasText(step.body)) errors.push(`Step ${row}: \`body\` zorunludur.`);
    if (!hasText(step.targetKey)) {
      errors.push(`Step ${row}: \`targetKey\` zorunludur.`);
    } else {
      const normalizedTarget = step.targetKey.trim();
      targetFrequency.set(normalizedTarget, (targetFrequency.get(normalizedTarget) ?? 0) + 1);
    }
  });

  targetFrequency.forEach((count, targetKey) => {
    if (count > 1) {
      warnings.push(`Aynı \`targetKey\` birden fazla adımda kullanılıyor: ${targetKey}`);
    }
  });

  const allowedTargets = getTargetKeyOptions(config.screenKey);
  if (allowedTargets.length > 0) {
    const invalidTargets = config.steps
      .map((step) => step.targetKey.trim())
      .filter((targetKey) => targetKey.length > 0 && !allowedTargets.includes(targetKey));

    if (invalidTargets.length > 0) {
      warnings.push(`Ekran için tanımsız targetKey kullanılıyor: ${Array.from(new Set(invalidTargets)).join(', ')}`);
    }
  }

  if (mode === 'publish' && !config.isActive) {
    warnings.push('Config pasif durumda. Publish sonrası mobilde gösterilmeyebilir.');
  }

  return {
    errors,
    warnings,
  };
}

export function isValidationPass(summary: TutorialValidationSummary): boolean {
  return summary.errors.length === 0;
}

function normalizeForDiff(input: unknown): string {
  return JSON.stringify(input ?? null);
}

export function buildChangedFieldList<T extends object>(initialState: T, currentState: T): string[] {
  const fields: string[] = [];

  Object.keys(initialState).forEach((fieldName) => {
    const key = fieldName as keyof T;
    if (normalizeForDiff(initialState[key]) !== normalizeForDiff(currentState[key])) {
      fields.push(fieldName);
    }
  });

  return fields;
}
