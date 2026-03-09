'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArrowLeft, Edit, Send, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { tutorialConfigsApi } from '@/lib/api';
import { TutorialConfigForm, type TutorialConfigFormValues } from '@/modules/tutorial-config/components/TutorialConfigForm';
import { TutorialPreviewPanel } from '@/modules/tutorial-config/components/TutorialPreviewPanel';
import { TutorialValidationSummary } from '@/modules/tutorial-config/components/TutorialValidationSummary';
import { buildChangedFieldList, buildTutorialValidationSummary, isValidationPass } from '@/modules/tutorial-config/utils/tutorialValidation';
import type { TutorialConfig, TutorialConfigUpsertRequest } from '@/types';

function fmtDate(value?: string) {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString('tr-TR');
}

function mapToFormValues(config: TutorialConfig): TutorialConfigFormValues {
  return {
    tutorialId: config.tutorialId,
    name: config.name,
    screenKey: config.screenKey,
    platform: config.platform,
    version: config.version,
    isActive: config.isActive,
    priority: config.priority,
    presentationType: config.presentationType,
    startAt: config.startAt ?? '',
    endAt: config.endAt ?? '',
    description: config.description ?? '',
    audienceRules: config.audienceRules ?? '',
    minAppVersion: config.minAppVersion ?? '',
    maxAppVersion: config.maxAppVersion ?? '',
    locale: config.locale ?? '',
    experimentKey: config.experimentKey ?? '',
    rolloutPercentage: config.rolloutPercentage,
    status: config.status === 'ARCHIVED' ? 'ARCHIVED' : config.status === 'DRAFT' ? 'DRAFT' : undefined,
    steps: config.steps.map((step) => ({
      stepId: step.stepId,
      orderIndex: step.orderIndex,
      title: step.title,
      body: step.body,
      targetKey: step.targetKey,
      iconKey: step.iconKey ?? '',
      presentationType: step.presentationType,
      isActive: step.isActive,
    })),
  };
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err !== 'object' || err === null) {
    return fallback;
  }

  const maybeError = err as { response?: { data?: { message?: unknown } } };
  const message = maybeError.response?.data?.message;
  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  return fallback;
}

function normalizeStepForDiff(step: TutorialConfigFormValues['steps'][number]) {
  return {
    stepId: step.stepId.trim(),
    orderIndex: step.orderIndex,
    title: step.title.trim(),
    body: step.body.trim(),
    targetKey: step.targetKey.trim(),
    iconKey: step.iconKey?.trim() ?? '',
    presentationType: step.presentationType ?? '',
    isActive: step.isActive,
  };
}

function buildDiffSummary(base: TutorialConfigFormValues, draft: TutorialConfigFormValues | null) {
  if (!draft) {
    return {
      changedFields: [] as string[],
      addedSteps: [] as string[],
      removedSteps: [] as string[],
      changedSteps: [] as string[],
    };
  }

  const changedFields = buildChangedFieldList(base, draft)
    .filter((field) => field !== 'steps');

  const baseSteps = new Map(base.steps.map((step) => [step.stepId, normalizeStepForDiff(step)]));
  const draftSteps = new Map(draft.steps.map((step) => [step.stepId, normalizeStepForDiff(step)]));

  const addedSteps = Array.from(draftSteps.keys()).filter((stepId) => !baseSteps.has(stepId));
  const removedSteps = Array.from(baseSteps.keys()).filter((stepId) => !draftSteps.has(stepId));

  const changedSteps: string[] = [];
  draftSteps.forEach((draftStep, stepId) => {
    const baseStep = baseSteps.get(stepId);
    if (!baseStep) {
      return;
    }

    if (JSON.stringify(baseStep) !== JSON.stringify(draftStep)) {
      changedSteps.push(stepId);
    }
  });

  return {
    changedFields,
    addedSteps,
    removedSteps,
    changedSteps,
  };
}

export default function TutorialConfigDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [draftValues, setDraftValues] = useState<TutorialConfigFormValues | null>(null);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishIntentDismissed, setPublishIntentDismissed] = useState(false);

  const { data: config, isLoading } = useQuery<TutorialConfig>({
    queryKey: ['tutorial-config', id],
    queryFn: () => tutorialConfigsApi.get(Number(id)).then((response) => response.data),
  });
  const { data: contractOptions } = useQuery({
    queryKey: ['tutorial-config-contract'],
    queryFn: () => tutorialConfigsApi.contract().then((response) => response.data),
  });

  const updateMut = useMutation({
    mutationFn: (payload: TutorialConfigUpsertRequest) => tutorialConfigsApi.update(Number(id), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutorial-config', id] });
      queryClient.invalidateQueries({ queryKey: ['tutorial-configs'] });
      setSaveError('');
      setIsFormDirty(false);
      setDraftValues(null);
      setIsEditing(false);
    },
    onError: (err: unknown) => setSaveError(extractErrorMessage(err, 'Update failed')),
  });

  const publishMut = useMutation({
    mutationFn: () => tutorialConfigsApi.publish(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutorial-config', id] });
      queryClient.invalidateQueries({ queryKey: ['tutorial-configs'] });
      setPublishModalOpen(false);
      setPublishIntentDismissed(true);
      setSaveError('');
    },
    onError: (err: unknown) => {
      const message = extractErrorMessage(err, 'Publish failed');
      if (message === 'Archived tutorial cannot be published') {
        setSaveError('Arşivlenen bir tutorial doğrudan publish edilemez. Önce status alanını DRAFT yapıp kaydedin, sonra publish edin.');
        return;
      }
      setSaveError(message);
    },
  });

  const archiveMut = useMutation({
    mutationFn: () => tutorialConfigsApi.archive(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutorial-config', id] });
      queryClient.invalidateQueries({ queryKey: ['tutorial-configs'] });
    },
  });

  const toggleActiveMut = useMutation({
    mutationFn: () => config?.isActive ? tutorialConfigsApi.deactivate(Number(id)) : tutorialConfigsApi.activate(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutorial-config', id] });
      queryClient.invalidateQueries({ queryKey: ['tutorial-configs'] });
    },
  });

  const formValues = useMemo(() => (config ? mapToFormValues(config) : null), [config]);
  const publishValidationSummary = useMemo(
    () => (formValues ? buildTutorialValidationSummary(formValues, 'publish') : { errors: [], warnings: [] }),
    [formValues],
  );
  const diffSummary = useMemo(
    () => (formValues ? buildDiffSummary(formValues, draftValues) : {
      changedFields: [] as string[],
      addedSteps: [] as string[],
      removedSteps: [] as string[],
      changedSteps: [] as string[],
    }),
    [draftValues, formValues],
  );

  const hasPublishBlockingErrors = !isValidationPass(publishValidationSummary);

  const previewSteps = useMemo(() => (
    (draftValues?.steps ?? config?.steps ?? [])
      .map((step) => ({
        stepId: step.stepId,
        orderIndex: step.orderIndex,
        title: step.title,
        body: step.body,
        targetKey: step.targetKey,
        isActive: step.isActive,
      }))
  ), [config?.steps, draftValues?.steps]);

  function handleBack() {
    if (isEditing && isFormDirty) {
      const shouldLeave = window.confirm('Kaydedilmemiş değişiklikler var. Sayfadan çıkmak istiyor musun?');
      if (!shouldLeave) {
        return;
      }
    }
    router.back();
  }

  function handleCancelEdit() {
    if (isFormDirty) {
      const shouldDiscard = window.confirm('Kaydedilmemiş değişiklikler silinsin mi?');
      if (!shouldDiscard) {
        return;
      }
    }
    setIsFormDirty(false);
    setDraftValues(null);
    setSaveError('');
    setIsEditing(false);
  }

  const publishIntentActive = searchParams.get('intent') === 'publish'
    && !publishIntentDismissed
    && config?.status === 'DRAFT';
  const isPublishModalVisible = publishModalOpen || publishIntentActive;

  if (isLoading) {
    return <div className="text-gray-400 p-8">Loading...</div>;
  }

  if (!config || !formValues) {
    return <div className="text-red-400 p-8">Tutorial config not found</div>;
  }

  const statusColor =
    config.status === 'PUBLISHED'
      ? 'text-green-400'
      : config.status === 'ARCHIVED'
        ? 'text-red-400'
        : 'text-gray-300';

  const canPublish = config.status === 'DRAFT' && !hasPublishBlockingErrors;
  const activeStepCount = config.steps.filter((step) => step.isActive).length;
  const impactChangeCount = diffSummary.changedFields.length
    + diffSummary.changedSteps.length
    + diffSummary.addedSteps.length
    + diffSummary.removedSteps.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={handleBack} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white truncate">{config.name}</h1>
          <p className="text-gray-400 text-sm font-mono">{config.tutorialId}</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {isEditing ? (
            <button
              onClick={handleCancelEdit}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm"
            >
              <Edit className="w-4 h-4" /> Edit
            </button>
          )}

          {config.status === 'DRAFT' && (
            <button
              onClick={() => {
                if (isEditing) {
                  setSaveError('Publish öncesi düzenlemeleri kaydedin veya iptal edin.');
                  return;
                }
                setPublishModalOpen(true);
                setSaveError('');
              }}
              disabled={isEditing || !canPublish || publishMut.isPending}
              className="flex items-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm"
            >
              <Send className="w-4 h-4" /> Publish
            </button>
          )}

          {config.status !== 'ARCHIVED' && (
            <button
              onClick={() => {
                if (!window.confirm('Tutorial archive edilsin mi?')) {
                  return;
                }
                archiveMut.mutate();
              }}
              disabled={archiveMut.isPending}
              className="flex items-center gap-2 bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm"
            >
              <Archive className="w-4 h-4" /> Archive
            </button>
          )}

          <button
            onClick={() => toggleActiveMut.mutate()}
            disabled={toggleActiveMut.isPending}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm"
          >
            {config.isActive ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4" />}
            {config.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-3 text-sm">{saveError}</div>
      )}

      {isEditing && isFormDirty ? (
        <div className="rounded-lg border border-amber-700 bg-amber-900/20 p-3 text-sm text-amber-200">
          Unsaved changes var. Kaydetmeden çıkarsanız değişiklikler kaybolur.
        </div>
      ) : null}

      {isEditing && isFormDirty ? (
        <div className="rounded-lg border border-indigo-700/70 bg-indigo-900/20 p-4 text-sm text-indigo-100 space-y-2">
          <div className="font-semibold">Draft vs Saved Diff</div>
          <div>Değişen alanlar: {diffSummary.changedFields.length ? diffSummary.changedFields.join(', ') : 'Yok'}</div>
          <div>Değişen step: {diffSummary.changedSteps.length ? diffSummary.changedSteps.join(', ') : 'Yok'}</div>
          <div>Eklenen step: {diffSummary.addedSteps.length ? diffSummary.addedSteps.join(', ') : 'Yok'}</div>
          <div>Silinen step: {diffSummary.removedSteps.length ? diffSummary.removedSteps.join(', ') : 'Yok'}</div>
        </div>
      ) : null}

      {isEditing ? (
        <TutorialConfigForm
          key={`${config.id}:${config.updatedAt}`}
          initialValues={formValues}
          submitLabel={updateMut.isPending ? 'Saving...' : 'Save Changes'}
          onSubmit={(payload) => {
            setSaveError('');
            updateMut.mutate(payload);
          }}
          isSubmitting={updateMut.isPending}
          error={saveError}
          allowStatusEdit={config.status !== 'PUBLISHED'}
          onDirtyChange={setIsFormDirty}
          onValuesChange={setDraftValues}
          contractOptions={contractOptions}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-3">
            <h2 className="text-white font-semibold text-lg">Tutorial Info</h2>
            {[
              ['screenKey', config.screenKey],
              ['platform', config.platform],
              ['version', String(config.version)],
              ['priority', String(config.priority)],
              ['presentationType', config.presentationType],
              ['locale', config.locale ?? '—'],
              ['minAppVersion', config.minAppVersion ?? '—'],
              ['maxAppVersion', config.maxAppVersion ?? '—'],
              ['experimentKey', config.experimentKey ?? '—'],
              ['rolloutPercentage', config.rolloutPercentage != null ? `${config.rolloutPercentage}%` : '—'],
              ['audienceRules', config.audienceRules ? 'JSON tanımlı' : '—'],
              ['startAt', fmtDate(config.startAt)],
              ['endAt', fmtDate(config.endAt)],
              ['createdBy', config.createdBy ?? '—'],
              ['updatedBy', config.updatedBy ?? '—'],
              ['createdAt', fmtDate(config.createdAt)],
              ['updatedAt', fmtDate(config.updatedAt)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm gap-4">
                <span className="text-gray-400 shrink-0">{label}</span>
                <span className="text-white text-right truncate">{value}</span>
              </div>
            ))}
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-3">
            <h2 className="text-white font-semibold text-lg">Status & Steps</h2>
            <div className={`text-lg font-bold ${statusColor}`}>{config.status}</div>
            <div className="text-sm text-gray-300">isActive: {config.isActive ? 'true' : 'false'}</div>
              <div className="text-sm text-gray-300">publishedAt: {fmtDate(config.publishedAt)}</div>
              {config.status === 'ARCHIVED' ? (
                <div className="mt-2 rounded-md border border-amber-700/50 bg-amber-900/20 px-3 py-2 text-xs text-amber-200">
                  Arşivli kayıt publish edilemez. Önce Edit modunda status alanını `DRAFT` yapıp kaydedin.
                </div>
              ) : null}
            <div className="pt-2 border-t border-gray-700">
              <TutorialValidationSummary
                title="Publish Guardrail"
                summary={publishValidationSummary}
              />
            </div>
          </div>

          <TutorialPreviewPanel
            tutorialName={draftValues?.name ?? config.name}
            tutorialId={draftValues?.tutorialId ?? config.tutorialId}
            presentationType={draftValues?.presentationType ?? config.presentationType}
            steps={previewSteps}
          />
        </div>
      )}

      {isPublishModalVisible ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-gray-700 bg-gray-900 p-5 space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-white">Publish Guardrail Check</h3>
              <p className="text-sm text-gray-400">
                Publish öncesi minimum doğrulamalar aşağıda. Hatalar düzeltilmeden publish işlemi yapılmaz.
              </p>
            </div>

            <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-3 text-sm text-gray-200 space-y-1">
              <div>Etkilenen ekran: <span className="font-mono text-purple-300">{config.screenKey}</span></div>
              <div>Yayınlanacak versiyon: <span className="font-semibold text-white">v{config.version}</span></div>
              <div>Aktif step sayısı: <span className="font-semibold text-white">{activeStepCount}</span></div>
              <div>Draft değişiklik adedi: <span className="font-semibold text-white">{impactChangeCount}</span></div>
              <div className="text-xs text-gray-400">Not: Draft edit açık değilse değişiklik adedi son kayda göre 0 görünebilir.</div>
            </div>

            <TutorialValidationSummary
              title="Publish Validation Summary"
              summary={publishValidationSummary}
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setPublishModalOpen(false);
                  setPublishIntentDismissed(true);
                }}
                className="rounded-lg bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600"
              >
                Vazgeç
              </button>
              <button
                onClick={() => publishMut.mutate()}
                disabled={hasPublishBlockingErrors || publishMut.isPending}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white hover:bg-green-600 disabled:opacity-50"
              >
                {publishMut.isPending ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
