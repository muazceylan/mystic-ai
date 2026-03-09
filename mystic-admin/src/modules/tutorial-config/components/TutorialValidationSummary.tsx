'use client';

import type { TutorialValidationSummary as TutorialValidationSummaryModel } from '../utils/tutorialValidation';

interface TutorialValidationSummaryProps {
  summary: TutorialValidationSummaryModel;
  title?: string;
}

export function TutorialValidationSummary({
  summary,
  title = 'Validation Summary',
}: TutorialValidationSummaryProps) {
  if (summary.errors.length === 0 && summary.warnings.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-700/60 bg-emerald-900/20 p-3 text-sm text-emerald-300">
        {title}: Publish için bloklayıcı hata görünmüyor.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-gray-700 bg-gray-900/40 p-4">
      <div className="text-sm font-medium text-gray-200">{title}</div>

      {summary.errors.length > 0 ? (
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-red-300">Errors</div>
          <ul className="space-y-1 text-sm text-red-200">
            {summary.errors.map((error) => (
              <li key={error} className="rounded-md border border-red-800/50 bg-red-900/25 px-2 py-1">
                {error}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {summary.warnings.length > 0 ? (
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-300">Warnings</div>
          <ul className="space-y-1 text-sm text-amber-200">
            {summary.warnings.map((warning) => (
              <li key={warning} className="rounded-md border border-amber-800/50 bg-amber-900/20 px-2 py-1">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
