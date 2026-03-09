'use client';

interface TutorialPreviewStep {
  stepId: string;
  orderIndex: number;
  title: string;
  body: string;
  targetKey: string;
  isActive: boolean;
}

interface TutorialPreviewPanelProps {
  tutorialName: string;
  tutorialId: string;
  presentationType: string;
  steps: TutorialPreviewStep[];
}

export function TutorialPreviewPanel({
  tutorialName,
  tutorialId,
  presentationType,
  steps,
}: TutorialPreviewPanelProps) {
  const sortedSteps = [...steps].sort((left, right) => left.orderIndex - right.orderIndex);

  return (
    <div className="space-y-3 rounded-xl border border-gray-700 bg-gray-800 p-4">
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-gray-400">Tutorial Preview</div>
        <div className="text-sm font-semibold text-white">{tutorialName || 'Untitled Tutorial'}</div>
        <div className="text-xs font-mono text-purple-300">{tutorialId || 'tutorial_id_missing'}</div>
        <div className="text-xs text-gray-400">Presentation: {presentationType}</div>
      </div>

      <div className="space-y-2">
        {sortedSteps.map((step, index) => (
          <div
            key={`${step.stepId || 'step'}-${step.orderIndex}-${index}`}
            className={`rounded-lg border p-3 ${step.isActive ? 'border-gray-600 bg-gray-900/60' : 'border-gray-700 bg-gray-900/30 opacity-70'}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-mono text-gray-400">#{index + 1} • {step.stepId || 'step_id'}</div>
              <span className={`text-[10px] uppercase tracking-wide ${step.isActive ? 'text-emerald-300' : 'text-gray-500'}`}>
                {step.isActive ? 'active' : 'passive'}
              </span>
            </div>
            <div className="mt-1 text-sm font-medium text-white">{step.title || 'Başlık eksik'}</div>
            <div className="mt-1 text-xs text-gray-300">{step.body || 'Açıklama eksik'}</div>
            <div className="mt-2 text-[11px] text-gray-400">
              targetKey: <span className="font-mono text-purple-300">{step.targetKey || 'target_missing'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
