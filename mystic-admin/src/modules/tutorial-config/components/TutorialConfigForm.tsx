'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type {
  TutorialConfigStatus,
  TutorialContractOptions,
  TutorialConfigUpsertRequest,
  TutorialPlatform,
  TutorialPresentationType,
} from '@/types';
import {
  TUTORIAL_EDITABLE_STATUS_OPTIONS,
  TUTORIAL_PLATFORM_OPTIONS,
  TUTORIAL_PRESENTATION_OPTIONS,
  getTargetKeyOptions,
  resolveScreenOptions,
} from '../constants/tutorialConfigOptions';
import {
  buildChangedFieldList,
  buildTutorialValidationSummary,
  isValidationPass,
} from '../utils/tutorialValidation';
import { TutorialPreviewPanel } from './TutorialPreviewPanel';
import { TutorialValidationSummary } from './TutorialValidationSummary';

export interface TutorialConfigFormStep {
  stepId: string;
  orderIndex: number;
  title: string;
  body: string;
  targetKey: string;
  iconKey?: string;
  presentationType?: TutorialPresentationType;
  isActive: boolean;
}

export interface TutorialConfigFormValues {
  tutorialId: string;
  name: string;
  screenKey: string;
  platform: TutorialPlatform;
  version: number;
  isActive: boolean;
  priority: number;
  presentationType: TutorialPresentationType;
  startAt?: string;
  endAt?: string;
  description?: string;
  audienceRules?: string;
  minAppVersion?: string;
  maxAppVersion?: string;
  locale?: string;
  experimentKey?: string;
  rolloutPercentage?: number;
  status?: Extract<TutorialConfigStatus, 'DRAFT' | 'ARCHIVED'>;
  steps: TutorialConfigFormStep[];
}

interface TutorialConfigFormProps {
  initialValues: TutorialConfigFormValues;
  submitLabel: string;
  onSubmit: (payload: TutorialConfigUpsertRequest) => void;
  isSubmitting?: boolean;
  error?: string;
  allowStatusEdit?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  onValuesChange?: (values: TutorialConfigFormValues) => void;
  contractOptions?: TutorialContractOptions | null;
}

function normalizeStepOrder(steps: TutorialConfigFormStep[]): TutorialConfigFormStep[] {
  return steps.map((step, index) => ({
    ...step,
    orderIndex: index,
  }));
}

function toDateInputValue(value?: string): string {
  if (!value) {
    return '';
  }

  return value.slice(0, 16);
}

function normalizeForDiff(values: TutorialConfigFormValues): TutorialConfigFormValues {
  return {
    ...values,
    tutorialId: values.tutorialId.trim(),
    name: values.name.trim(),
    screenKey: values.screenKey.trim(),
    description: values.description?.trim() ?? '',
    audienceRules: values.audienceRules?.trim() ?? '',
    minAppVersion: values.minAppVersion?.trim() ?? '',
    maxAppVersion: values.maxAppVersion?.trim() ?? '',
    locale: values.locale?.trim() ?? '',
    experimentKey: values.experimentKey?.trim() ?? '',
    rolloutPercentage: values.rolloutPercentage,
    steps: normalizeStepOrder(values.steps).map((step) => ({
      ...step,
      stepId: step.stepId.trim(),
      title: step.title.trim(),
      body: step.body.trim(),
      targetKey: step.targetKey.trim(),
      iconKey: step.iconKey?.trim() ?? '',
      presentationType: step.presentationType,
    })),
  };
}

function emptyStep(nextIndex: number, defaultTargetKey = ''): TutorialConfigFormStep {
  return {
    stepId: `step_${nextIndex + 1}`,
    orderIndex: nextIndex,
    title: '',
    body: '',
    targetKey: defaultTargetKey,
    iconKey: '',
    presentationType: undefined,
    isActive: true,
  };
}

export function TutorialConfigForm({
  initialValues,
  submitLabel,
  onSubmit,
  isSubmitting = false,
  error,
  allowStatusEdit = true,
  onDirtyChange,
  onValuesChange,
  contractOptions,
}: TutorialConfigFormProps) {
  const [form, setForm] = useState<TutorialConfigFormValues>(initialValues);
  const [localError, setLocalError] = useState('');

  const totalActiveSteps = useMemo(
    () => form.steps.filter((step) => step.isActive).length,
    [form.steps],
  );

  const validationSummary = useMemo(
    () => buildTutorialValidationSummary(form, 'publish'),
    [form],
  );

  const changedFields = useMemo(
    () => buildChangedFieldList(normalizeForDiff(initialValues), normalizeForDiff(form)),
    [form, initialValues],
  );

  const isDirty = changedFields.length > 0;
  const screenOptions = useMemo(
    () => resolveScreenOptions(form.screenKey, contractOptions),
    [contractOptions, form.screenKey],
  );
  const targetOptions = useMemo(
    () => getTargetKeyOptions(form.screenKey, contractOptions),
    [contractOptions, form.screenKey],
  );
  const platformOptions = useMemo(
    () => Array.from(new Set([...(contractOptions?.platformOptions ?? []), ...TUTORIAL_PLATFORM_OPTIONS])),
    [contractOptions?.platformOptions],
  );
  const presentationOptions = useMemo(
    () => Array.from(new Set([...(contractOptions?.presentationTypeOptions ?? []), ...TUTORIAL_PRESENTATION_OPTIONS])),
    [contractOptions?.presentationTypeOptions],
  );

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    onValuesChange?.(form);
  }, [form, onValuesChange]);

  useEffect(() => {
    if (!isDirty) {
      return undefined;
    }

    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [isDirty]);

  function setField<K extends keyof TutorialConfigFormValues>(key: K, value: TutorialConfigFormValues[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function setStepField<K extends keyof TutorialConfigFormStep>(
    index: number,
    key: K,
    value: TutorialConfigFormStep[K],
  ) {
    setForm((prev) => {
      const steps = prev.steps.map((step, stepIndex) => {
        if (stepIndex !== index) {
          return step;
        }

        return {
          ...step,
          [key]: value,
        };
      });

      return {
        ...prev,
        steps,
      };
    });
  }

  function addStep() {
    const nextTarget = targetOptions[0] ?? '';
    setForm((prev) => ({
      ...prev,
      steps: normalizeStepOrder([...prev.steps, emptyStep(prev.steps.length, nextTarget)]),
    }));
  }

  function removeStep(index: number) {
    setForm((prev) => ({
      ...prev,
      steps: normalizeStepOrder(prev.steps.filter((_, stepIndex) => stepIndex !== index)),
    }));
  }

  function moveStep(index: number, direction: -1 | 1) {
    setForm((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.steps.length) {
        return prev;
      }

      const nextSteps = [...prev.steps];
      const current = nextSteps[index];
      nextSteps[index] = nextSteps[targetIndex];
      nextSteps[targetIndex] = current;

      return {
        ...prev,
        steps: normalizeStepOrder(nextSteps),
      };
    });
  }

  function buildPayload(values: TutorialConfigFormValues): TutorialConfigUpsertRequest {
    return {
      tutorialId: values.tutorialId.trim(),
      name: values.name.trim(),
      screenKey: values.screenKey.trim(),
      platform: values.platform,
      version: values.version,
      isActive: values.isActive,
      priority: values.priority,
      presentationType: values.presentationType,
      startAt: values.startAt ? values.startAt : undefined,
      endAt: values.endAt ? values.endAt : undefined,
      description: values.description?.trim() ? values.description.trim() : undefined,
      audienceRules: values.audienceRules?.trim() ? values.audienceRules.trim() : undefined,
      minAppVersion: values.minAppVersion?.trim() ? values.minAppVersion.trim() : undefined,
      maxAppVersion: values.maxAppVersion?.trim() ? values.maxAppVersion.trim() : undefined,
      locale: values.locale?.trim() ? values.locale.trim() : undefined,
      experimentKey: values.experimentKey?.trim() ? values.experimentKey.trim() : undefined,
      rolloutPercentage: Number.isFinite(values.rolloutPercentage) ? values.rolloutPercentage : undefined,
      status: values.status,
      steps: normalizeStepOrder(values.steps).map((step) => ({
        stepId: step.stepId.trim(),
        orderIndex: step.orderIndex,
        title: step.title.trim(),
        body: step.body.trim(),
        targetKey: step.targetKey.trim(),
        iconKey: step.iconKey?.trim() ? step.iconKey.trim() : undefined,
        presentationType: step.presentationType,
        isActive: step.isActive,
      })),
    };
  }

  function handleSubmit() {
    const summary = buildTutorialValidationSummary(form, 'publish');
    if (!isValidationPass(summary)) {
      setLocalError(summary.errors[0] ?? 'Formda doğrulama hataları var.');
      return;
    }

    setLocalError('');
    onSubmit(buildPayload(form));
  }

  return (
    <div className="space-y-5">
      {(error || localError) && (
        <div className="rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-300">
          {error ?? localError}
        </div>
      )}

      {isDirty ? (
        <div className="rounded-lg border border-amber-700 bg-amber-900/20 p-3 text-sm text-amber-200">
          Unsaved changes var ({changedFields.length}).
          {changedFields.length > 0 ? ` Değişen alanlar: ${changedFields.slice(0, 6).join(', ')}` : ''}
        </div>
      ) : null}

      <TutorialValidationSummary summary={validationSummary} />

      <div className="rounded-xl border border-gray-700 bg-gray-800 p-6 space-y-4">
        <h2 className="font-semibold text-white">Tutorial Config</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-gray-400">tutorialId *</label>
            <input
              value={form.tutorialId}
              onChange={(event) => setField('tutorialId', event.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">name *</label>
            <input
              value={form.name}
              onChange={(event) => setField('name', event.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">screenKey *</label>
            <select
              value={form.screenKey}
              onChange={(event) => {
                const nextScreenKey = event.target.value;
                setForm((prev) => {
                  const nextTargetOptions = getTargetKeyOptions(nextScreenKey, contractOptions);
                  const nextDefaultTarget = nextTargetOptions[0] ?? '';

                  return {
                    ...prev,
                    screenKey: nextScreenKey,
                    steps: prev.steps.map((step) => {
                      const hasTarget = nextTargetOptions.includes(step.targetKey);
                      return {
                        ...step,
                        targetKey: hasTarget ? step.targetKey : nextDefaultTarget,
                      };
                    }),
                  };
                });
              }}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
            >
              {screenOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">platform</label>
            <select
              value={form.platform}
              onChange={(event) => setField('platform', event.target.value as TutorialPlatform)}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
            >
              {platformOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">version</label>
            <input
              type="number"
              min={1}
              value={form.version}
              onChange={(event) => setField('version', Number(event.target.value))}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">priority</label>
            <input
              type="number"
              min={0}
              value={form.priority}
              onChange={(event) => setField('priority', Number(event.target.value))}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">presentationType</label>
            <select
              value={form.presentationType}
              onChange={(event) => setField('presentationType', event.target.value as TutorialPresentationType)}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
            >
              {presentationOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {allowStatusEdit ? (
            <div>
              <label className="mb-1 block text-sm text-gray-400">status</label>
              <select
                value={form.status ?? 'DRAFT'}
                onChange={(event) => setField('status', event.target.value as Extract<TutorialConfigStatus, 'DRAFT' | 'ARCHIVED'>)}
                className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
              >
                {TUTORIAL_EDITABLE_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-gray-200">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setField('isActive', event.target.checked)}
                className="rounded"
              />
              Active
            </label>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-400">startAt</label>
            <input
              type="datetime-local"
              value={toDateInputValue(form.startAt)}
              onChange={(event) => setField('startAt', event.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">endAt</label>
            <input
              type="datetime-local"
              value={toDateInputValue(form.endAt)}
              onChange={(event) => setField('endAt', event.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-400">description</label>
          <textarea
            value={form.description ?? ''}
            onChange={(event) => setField('description', event.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-gray-400">minAppVersion</label>
            <input
              value={form.minAppVersion ?? ''}
              onChange={(event) => setField('minAppVersion', event.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
              placeholder="örn: 1.8.0"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">maxAppVersion</label>
            <input
              value={form.maxAppVersion ?? ''}
              onChange={(event) => setField('maxAppVersion', event.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
              placeholder="örn: 2.4.0"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">locale</label>
            <input
              value={form.locale ?? ''}
              onChange={(event) => setField('locale', event.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
              placeholder="tr veya en"
            />
            <p className="mt-1 text-xs text-gray-500">Boş bırakırsan tutorial tüm diller için generic fallback olarak kalır.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">experimentKey</label>
            <input
              value={form.experimentKey ?? ''}
              onChange={(event) => setField('experimentKey', event.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
              placeholder="tutorial_rollout_A"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">rolloutPercentage (0-100)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.rolloutPercentage ?? ''}
              onChange={(event) => setField('rolloutPercentage', event.target.value === '' ? undefined : Number(event.target.value))}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-400">audienceRules (JSON)</label>
          <textarea
            value={form.audienceRules ?? ''}
            onChange={(event) => setField('audienceRules', event.target.value)}
            rows={4}
            placeholder='{\"segment\":\"new_users\"}'
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm font-mono text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.8fr_1fr]">
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">Steps</h2>
              <p className="mt-1 text-xs text-gray-400">Toplam: {form.steps.length} / Aktif: {totalActiveSteps}</p>
            </div>
            <button
              onClick={addStep}
              type="button"
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm text-white hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" /> Step Ekle
            </button>
          </div>

          <div className="space-y-3">
            {form.steps.map((step, index) => {
              const scopedTargetOptions = targetOptions.includes(step.targetKey)
                ? targetOptions
                : (step.targetKey ? [step.targetKey, ...targetOptions] : targetOptions);

              return (
                <div key={`${step.stepId}-${index}`} className="space-y-3 rounded-lg border border-gray-700 bg-gray-900/40 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-300">Step {index + 1}</div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveStep(index, -1)}
                        type="button"
                        disabled={index === 0}
                        className="rounded p-1.5 text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-30"
                        title="Yukarı al"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => moveStep(index, 1)}
                        type="button"
                        disabled={index === form.steps.length - 1}
                        className="rounded p-1.5 text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-30"
                        title="Aşağı al"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeStep(index)}
                        type="button"
                        disabled={form.steps.length === 1}
                        className="rounded p-1.5 text-red-300 hover:bg-red-900/40 hover:text-red-200 disabled:opacity-30"
                        title="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">stepId *</label>
                      <input
                        value={step.stepId}
                        onChange={(event) => setStepField(index, 'stepId', event.target.value)}
                        className="w-full rounded border border-gray-600 bg-gray-700 px-2.5 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">orderIndex</label>
                      <input
                        value={step.orderIndex}
                        readOnly
                        className="w-full rounded border border-gray-700 bg-gray-800 px-2.5 py-2 text-sm text-gray-300"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">title *</label>
                      <input
                        value={step.title}
                        onChange={(event) => setStepField(index, 'title', event.target.value)}
                        className="w-full rounded border border-gray-600 bg-gray-700 px-2.5 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">targetKey *</label>
                      <select
                        value={step.targetKey}
                        onChange={(event) => setStepField(index, 'targetKey', event.target.value)}
                        className="w-full rounded border border-gray-600 bg-gray-700 px-2.5 py-2 text-sm text-white"
                      >
                        <option value="">Select target key</option>
                        {scopedTargetOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">iconKey</label>
                      <input
                        value={step.iconKey ?? ''}
                        onChange={(event) => setStepField(index, 'iconKey', event.target.value)}
                        className="w-full rounded border border-gray-600 bg-gray-700 px-2.5 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">presentationType override</label>
                      <select
                        value={step.presentationType ?? ''}
                        onChange={(event) => setStepField(index, 'presentationType', (event.target.value || undefined) as TutorialPresentationType | undefined)}
                        className="w-full rounded border border-gray-600 bg-gray-700 px-2.5 py-2 text-sm text-white"
                      >
                        <option value="">Use tutorial default</option>
                        {presentationOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-gray-400">body *</label>
                    <textarea
                      value={step.body}
                      onChange={(event) => setStepField(index, 'body', event.target.value)}
                      rows={2}
                      className="w-full rounded border border-gray-600 bg-gray-700 px-2.5 py-2 text-sm text-white"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={step.isActive}
                      onChange={(event) => setStepField(index, 'isActive', event.target.checked)}
                      className="rounded"
                    />
                    Step aktif
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        <TutorialPreviewPanel
          tutorialName={form.name}
          tutorialId={form.tutorialId}
          presentationType={form.presentationType}
          steps={form.steps}
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="rounded-lg bg-purple-600 px-6 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
