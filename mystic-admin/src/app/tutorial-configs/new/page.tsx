'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { tutorialConfigsApi } from '@/lib/api';
import { TutorialConfigForm, type TutorialConfigFormValues } from '@/modules/tutorial-config/components/TutorialConfigForm';
import { getTargetKeyOptions } from '@/modules/tutorial-config/constants/tutorialConfigOptions';
import type { TutorialConfigUpsertRequest } from '@/types';

const DEFAULT_SCREEN_KEY = 'home';
const DEFAULT_TARGET_KEY = getTargetKeyOptions(DEFAULT_SCREEN_KEY)[0] ?? '';

const DEFAULT_FORM: TutorialConfigFormValues = {
  tutorialId: '',
  name: '',
  screenKey: DEFAULT_SCREEN_KEY,
  platform: 'MOBILE',
  version: 1,
  isActive: true,
  priority: 100,
  presentationType: 'SPOTLIGHT_CARD',
  startAt: '',
  endAt: '',
  description: '',
  audienceRules: '',
  minAppVersion: '',
  maxAppVersion: '',
  locale: '',
  experimentKey: '',
  rolloutPercentage: undefined,
  status: 'DRAFT',
  steps: [
    {
      stepId: 'step_1',
      orderIndex: 0,
      title: '',
      body: '',
      targetKey: DEFAULT_TARGET_KEY,
      iconKey: '',
      presentationType: undefined,
      isActive: true,
    },
  ],
};

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

export default function NewTutorialConfigPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const { data: contractOptions } = useQuery({
    queryKey: ['tutorial-config-contract'],
    queryFn: () => tutorialConfigsApi.contract().then((response) => response.data),
  });

  const createMut = useMutation({
    mutationFn: (payload: TutorialConfigUpsertRequest) => tutorialConfigsApi.create(payload),
    onSuccess: (response) => {
      router.push(`/tutorial-configs/${response.data.id}`);
    },
    onError: (err: unknown) => {
      setError(extractErrorMessage(err, 'Tutorial create failed'));
    },
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">New Tutorial Config</h1>
          <p className="text-gray-400 text-sm mt-1">Create a draft tutorial and define steps before publishing.</p>
        </div>
      </div>

      <TutorialConfigForm
        initialValues={DEFAULT_FORM}
        submitLabel={createMut.isPending ? 'Saving...' : 'Save Draft'}
        onSubmit={(payload) => {
          setError('');
          createMut.mutate(payload);
        }}
        isSubmitting={createMut.isPending}
        error={error}
        contractOptions={contractOptions}
      />
    </div>
  );
}
