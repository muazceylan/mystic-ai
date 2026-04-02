'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { aiModelsApi } from '@/lib/api';
import { AiModelConfig, AiModelProviderConfig, AiProviderAdapter } from '@/types';

const ADAPTER_OPTIONS: Array<{ value: AiProviderAdapter; label: string }> = [
  { value: 'groq', label: 'Groq' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'ollama', label: 'Ollama (Local)' },
];

type ChainKey = 'complexChain' | 'simpleChain';

function adapterDefaults(adapter: AiProviderAdapter) {
  switch (adapter) {
    case 'gemini':
      return { model: 'gemini-2.5-flash', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', timeoutMs: 8000, maxOutputTokens: 2048 };
    case 'openrouter':
      return { model: 'openrouter/auto', baseUrl: 'https://openrouter.ai/api/v1', timeoutMs: 10000, maxOutputTokens: 2048 };
    case 'ollama':
      return { model: 'gemma3:4b', baseUrl: 'http://localhost:11434', timeoutMs: 15000, maxOutputTokens: 1024 };
    default:
      return { model: 'openai/gpt-oss-120b', baseUrl: 'https://api.groq.com/openai/v1', timeoutMs: 8000, maxOutputTokens: 2048 };
  }
}

function createNewProvider(seed: number): AiModelProviderConfig {
  const defaults = adapterDefaults('groq');
  return {
    key: `provider_${seed}`,
    displayName: `Provider ${seed}`,
    adapter: 'groq',
    enabled: true,
    model: defaults.model,
    baseUrl: defaults.baseUrl,
    apiKey: '',
    localProviderType: null,
    chatEndpoint: null,
    timeoutMs: defaults.timeoutMs,
    retryCount: 0,
    cooldownSeconds: 60,
    temperature: 0.8,
    maxOutputTokens: defaults.maxOutputTokens,
    headers: {},
  };
}

function parseNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseOptionalNumber(value: string) {
  if (value.trim() === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function AiModelsPage() {
  const qc = useQueryClient();
  const toast = useToast();

  const [draftOverride, setDraftOverride] = useState<AiModelConfig | null>(null);
  const [addKey, setAddKey] = useState<{ complexChain: string; simpleChain: string }>({
    complexChain: '',
    simpleChain: '',
  });

  const { data, isLoading, isError, refetch, isFetching } = useQuery<AiModelConfig>({
    queryKey: ['ai-model-config'],
    queryFn: () => aiModelsApi.getConfig().then((r) => r.data),
  });

  const draft = draftOverride ?? data ?? null;

  const saveMutation = useMutation({
    mutationFn: (payload: AiModelConfig) => aiModelsApi.updateConfig(payload).then((r) => r.data),
    onSuccess: (updated) => {
      setDraftOverride(null);
      qc.setQueryData(['ai-model-config'], updated);
      toast.success('AI model ayarları güncellendi.');
    },
    onError: () => {
      toast.error('Güncelleme başarısız oldu.');
    },
  });

  const providerMap = useMemo(() => {
    const map = new Map<string, AiModelProviderConfig>();
    if (!draft) return map;
    draft.providers.forEach((provider) => map.set(provider.key, provider));
    return map;
  }, [draft]);

  const duplicateKeys = useMemo(() => {
    if (!draft) return [];
    const count = new Map<string, number>();
    draft.providers.forEach((provider) => {
      const key = provider.key.trim();
      count.set(key, (count.get(key) ?? 0) + 1);
    });
    return [...count.entries()].filter(([, value]) => value > 1).map(([key]) => key);
  }, [draft]);

  const isDirty = draftOverride !== null;

  const canSave = !!draft && duplicateKeys.length === 0 && isDirty && !saveMutation.isPending;

  function updateDraft(updater: (prev: AiModelConfig) => AiModelConfig) {
    setDraftOverride((currentOverride) => {
      const base = currentOverride ?? data;
      if (!base) {
        return currentOverride;
      }
      return updater(base);
    });
  }

  function updateProvider(index: number, patch: Partial<AiModelProviderConfig>) {
    updateDraft((prev) => {
      const nextProviders = [...prev.providers];
      const current = nextProviders[index];
      if (!current) return prev;

      const nextKeyRaw = patch.key ?? current.key;
      const nextKey = nextKeyRaw.trim();
      const safeKey = nextKey.length > 0 ? nextKey : current.key;

      const nextProvider = {
        ...current,
        ...patch,
        key: safeKey,
      };
      nextProviders[index] = nextProvider;

      const replaceKey = (keys: string[]) => keys.map((key) => (key === current.key ? safeKey : key));

      return {
        ...prev,
        providers: nextProviders,
        complexChain: replaceKey(prev.complexChain),
        simpleChain: replaceKey(prev.simpleChain),
      };
    });
  }

  function removeProvider(key: string) {
    updateDraft((prev) => ({
      ...prev,
      providers: prev.providers.filter((provider) => provider.key !== key),
      complexChain: prev.complexChain.filter((item) => item !== key),
      simpleChain: prev.simpleChain.filter((item) => item !== key),
    }));
  }

  function addProvider() {
    updateDraft((prev) => ({
      ...prev,
      providers: [...prev.providers, createNewProvider(prev.providers.length + 1)],
    }));
  }

  function addToChain(chain: ChainKey) {
    const keyToAdd = addKey[chain];
    if (!keyToAdd) return;
    updateDraft((prev) => {
      if (prev[chain].includes(keyToAdd)) {
        return prev;
      }
      return {
        ...prev,
        [chain]: [...prev[chain], keyToAdd],
      };
    });
    setAddKey((prev) => ({ ...prev, [chain]: '' }));
  }

  function removeFromChain(chain: ChainKey, key: string) {
    updateDraft((prev) => ({
      ...prev,
      [chain]: prev[chain].filter((item) => item !== key),
    }));
  }

  function moveInChain(chain: ChainKey, index: number, direction: -1 | 1) {
    updateDraft((prev) => {
      const list = [...prev[chain]];
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= list.length) {
        return prev;
      }
      const temp = list[index];
      list[index] = list[nextIndex];
      list[nextIndex] = temp;
      return {
        ...prev,
        [chain]: list,
      };
    });
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-3">
          <div className="h-10 bg-gray-900 rounded-xl animate-pulse" />
          <div className="h-64 bg-gray-900 rounded-xl animate-pulse" />
          <div className="h-64 bg-gray-900 rounded-xl animate-pulse" />
        </div>
      </AdminLayout>
    );
  }

  if (!draft) {
    return (
      <AdminLayout>
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
          <p className="text-sm text-red-200 mb-3">AI model ayarları yüklenemedi.</p>
          <Button variant="secondary" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
            Tekrar Dene
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Models</h1>
          <p className="text-gray-400 text-sm mt-1">Model ekle/sil, provider ayarları ve simple/complex fallback sırası</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
          <Button
            onClick={() => draft && saveMutation.mutate(draft)}
            disabled={!canSave}
          >
            <Save className="w-4 h-4" />
            Kaydet
          </Button>
        </div>
      </div>

      {isError && (
        <div className="mb-4 bg-red-900/30 border border-red-700 rounded-lg p-3 text-sm text-red-200">
          AI model ayarları yüklenemedi.
        </div>
      )}

      {duplicateKeys.length > 0 && (
        <div className="mb-4 bg-amber-900/30 border border-amber-700 rounded-lg p-3 text-sm text-amber-200">
          Tekil olmayan provider key bulundu: {duplicateKeys.join(', ')}
        </div>
      )}

      <div className="mb-6 bg-gray-900 border border-gray-800 rounded-xl p-4">
        <label className="inline-flex items-center gap-2 text-sm text-gray-200">
          <input
            type="checkbox"
            checked={draft.allowMock}
            onChange={(e) => updateDraft((prev) => ({ ...prev, allowMock: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-purple-600"
          />
          Tüm sağlayıcılar başarısız olursa mock fallback kullan
        </label>
      </div>

      <div className="mb-6 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Providers</h2>
          <Button size="sm" onClick={addProvider}>
            <Plus className="w-3 h-3" />
            Model Ekle
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1200px]">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                <th className="text-left px-3 py-2">Key</th>
                <th className="text-left px-3 py-2">Ad</th>
                <th className="text-left px-3 py-2">Adapter</th>
                <th className="text-left px-3 py-2">Model</th>
                <th className="text-left px-3 py-2">Base URL</th>
                <th className="text-left px-3 py-2">Timeout</th>
                <th className="text-left px-3 py-2">Retry</th>
                <th className="text-left px-3 py-2">Cooldown</th>
                <th className="text-left px-3 py-2">Enabled</th>
                <th className="text-left px-3 py-2">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {draft.providers.map((provider, index) => (
                <tr key={`${provider.key}-${index}`} className="align-top">
                  <td className="px-3 py-2">
                    <Input
                      value={provider.key}
                      onChange={(e) => updateProvider(index, { key: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={provider.displayName}
                      onChange={(e) => updateProvider(index, { displayName: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={provider.adapter}
                      onChange={(e) => {
                        const adapter = e.target.value as AiProviderAdapter;
                        const defaults = adapterDefaults(adapter);
                        updateProvider(index, {
                          adapter,
                          model: defaults.model,
                          baseUrl: defaults.baseUrl,
                          timeoutMs: defaults.timeoutMs,
                          maxOutputTokens: defaults.maxOutputTokens,
                          localProviderType: adapter === 'ollama' ? 'ollama' : null,
                          chatEndpoint: adapter === 'ollama' ? '/api/generate' : null,
                        });
                      }}
                    >
                      {ADAPTER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={provider.model}
                      onChange={(e) => updateProvider(index, { model: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={provider.baseUrl}
                      onChange={(e) => updateProvider(index, { baseUrl: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      value={provider.timeoutMs}
                      onChange={(e) => updateProvider(index, { timeoutMs: parseNumber(e.target.value, 8000) })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      value={provider.retryCount}
                      onChange={(e) => updateProvider(index, { retryCount: parseNumber(e.target.value, 0) })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      value={provider.cooldownSeconds}
                      onChange={(e) => updateProvider(index, { cooldownSeconds: parseNumber(e.target.value, 0) })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <label className="inline-flex items-center gap-2 text-xs text-gray-200">
                      <input
                        type="checkbox"
                        checked={provider.enabled}
                        onChange={(e) => updateProvider(index, { enabled: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-purple-600"
                      />
                      Aktif
                    </label>
                    <div className="mt-2 text-xs text-gray-500">
                      <span className="block mb-1">Sıcaklık</span>
                      <Input
                        type="number"
                        step="0.1"
                        value={provider.temperature ?? ''}
                        onChange={(e) => updateProvider(index, { temperature: parseOptionalNumber(e.target.value) })}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProvider(provider.key)}
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {(['complexChain', 'simpleChain'] as ChainKey[]).map((chainKey) => (
          <div key={chainKey} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">
                {chainKey === 'complexChain' ? 'Complex Chain' : 'Simple Chain'}
              </h3>
            </div>

            <div className="space-y-2 mb-3">
              {draft[chainKey].map((key, index) => {
                const provider = providerMap.get(key);
                return (
                  <div key={`${chainKey}-${key}-${index}`} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm text-white">{provider?.displayName ?? key}</p>
                      <p className="text-xs text-gray-500 font-mono">{key}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveInChain(chainKey, index, -1)}
                        disabled={index === 0}
                      >
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveInChain(chainKey, index, 1)}
                        disabled={index === draft[chainKey].length - 1}
                      >
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromChain(chainKey, key)}
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {draft[chainKey].length === 0 && (
                <p className="text-xs text-gray-500">Henüz model eklenmedi.</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={addKey[chainKey]}
                onChange={(e) => setAddKey((prev) => ({ ...prev, [chainKey]: e.target.value }))}
              >
                <option value="">Provider seç</option>
                {draft.providers
                  .filter((provider) => !draft[chainKey].includes(provider.key))
                  .map((provider) => (
                    <option key={provider.key} value={provider.key}>
                      {provider.displayName} ({provider.key})
                    </option>
                  ))}
              </Select>
              <Button size="sm" onClick={() => addToChain(chainKey)} disabled={!addKey[chainKey]}>
                <Plus className="w-3 h-3" />
                Ekle
              </Button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
