'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Eye, Plus, Send, Sparkles, ToggleLeft, ToggleRight } from 'lucide-react';
import { tutorialConfigsApi } from '@/lib/api';
import { resolveScreenOptions, TUTORIAL_PLATFORM_OPTIONS } from '@/modules/tutorial-config/constants/tutorialConfigOptions';
import type { TutorialConfigStatus, TutorialConfigSummary, TutorialPlatform } from '@/types';

const STATUS_COLORS: Record<TutorialConfigStatus, string> = {
  DRAFT: 'bg-gray-700 text-gray-300',
  PUBLISHED: 'bg-green-900/50 text-green-300',
  ARCHIVED: 'bg-red-900/50 text-red-300',
};

function fmtDate(value?: string) {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString('tr-TR');
}

export default function TutorialConfigsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [screenKey, setScreenKey] = useState('');
  const [status, setStatus] = useState('');
  const [isActive, setIsActive] = useState('');
  const [platform, setPlatform] = useState('');
  const [bootstrapMessage, setBootstrapMessage] = useState('');
  const { data: contractOptions } = useQuery({
    queryKey: ['tutorial-config-contract'],
    queryFn: () => tutorialConfigsApi.contract().then((response) => response.data),
  });
  const screenOptions = resolveScreenOptions(screenKey, contractOptions);

  const queryKey = ['tutorial-configs', screenKey, status, isActive, platform];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => tutorialConfigsApi.list({
      ...(screenKey && { screenKey }),
      ...(status && { status: status as TutorialConfigStatus }),
      ...(isActive !== '' && { isActive: isActive === 'true' }),
      ...(platform && { platform: platform as TutorialPlatform }),
      page: 0,
      size: 100,
    }).then((response) => response.data),
  });

  const archiveMut = useMutation({
    mutationFn: (id: number) => tutorialConfigsApi.archive(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tutorial-configs'] }),
  });

  const toggleActiveMut = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      active ? tutorialConfigsApi.deactivate(id) : tutorialConfigsApi.activate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tutorial-configs'] }),
  });

  const bootstrapMut = useMutation({
    mutationFn: () => tutorialConfigsApi.bootstrapDefaults(),
    onSuccess: (response) => {
      const payload = response.data;
      setBootstrapMessage(`Varsayılan tutoriallar yüklendi: ${payload.createdCount} oluşturuldu, ${payload.skippedCount} atlandı.`);
      queryClient.invalidateQueries({ queryKey: ['tutorial-configs'] });
    },
    onError: () => {
      setBootstrapMessage('Varsayılan tutoriallar yüklenemedi. Backend loglarını kontrol edin.');
    },
  });

  const rows: TutorialConfigSummary[] = data?.content ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tutorial Configs</h1>
          <p className="text-gray-400 text-sm mt-1">Create, edit, publish and operate mobile tutorial content.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => bootstrapMut.mutate()}
            disabled={bootstrapMut.isPending}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Sparkles className="w-4 h-4" />
            {bootstrapMut.isPending ? 'Yükleniyor...' : 'Varsayılanları Yükle'}
          </button>
          <button
            onClick={() => router.push('/tutorial-configs/new')}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> New Tutorial
          </button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select
          value={screenKey}
          onChange={(event) => setScreenKey(event.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2"
        >
          <option value="">All Screens</option>
          {screenOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2"
        >
          <option value="">All Status</option>
          <option value="DRAFT">DRAFT</option>
          <option value="PUBLISHED">PUBLISHED</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>

        <select
          value={isActive}
          onChange={(event) => setIsActive(event.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2"
        >
          <option value="">Active/Passive</option>
          <option value="true">Active</option>
          <option value="false">Passive</option>
        </select>

        <select
          value={platform}
          onChange={(event) => setPlatform(event.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2"
        >
          <option value="">All Platforms</option>
          {TUTORIAL_PLATFORM_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      {bootstrapMessage ? (
        <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-sm text-purple-200">
          {bootstrapMessage}
        </div>
      ) : null}

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="text-left px-4 py-3">name</th>
              <th className="text-left px-4 py-3">tutorialId</th>
              <th className="text-left px-4 py-3">screenKey</th>
              <th className="text-left px-4 py-3">version</th>
              <th className="text-left px-4 py-3">status</th>
              <th className="text-left px-4 py-3">isActive</th>
              <th className="text-left px-4 py-3">platform</th>
              <th className="text-left px-4 py-3">updatedBy</th>
              <th className="text-left px-4 py-3">updatedAt</th>
              <th className="text-left px-4 py-3">actions</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                  <div className="space-y-3">
                    <div>No tutorial config found</div>
                    <button
                      onClick={() => bootstrapMut.mutate()}
                      disabled={bootstrapMut.isPending}
                      className="inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs text-purple-200 hover:bg-purple-500/20 disabled:opacity-60"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {bootstrapMut.isPending ? 'Yükleniyor...' : 'Varsayılan Tutorialları Doldur'}
                    </button>
                  </div>
                </td>
              </tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{row.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-purple-300">{row.tutorialId}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-300">{row.screenKey}</td>
                <td className="px-4 py-3 text-gray-300">{row.version}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[row.status]}`}>{row.status}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${row.isActive ? 'text-green-400' : 'text-gray-500'}`}>
                    {row.isActive ? 'Active' : 'Passive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-300">{row.platform}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{row.updatedBy ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(row.updatedAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => router.push(`/tutorial-configs/${row.id}`)}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                      title="View / Edit"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {row.status === 'DRAFT' && (
                      <button
                        onClick={() => router.push(`/tutorial-configs/${row.id}?intent=publish`)}
                        className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-gray-700 rounded"
                        title="Open Publish Guardrail"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}

                    {row.status !== 'ARCHIVED' && (
                      <button
                        onClick={() => archiveMut.mutate(row.id)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded"
                        title="Archive"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => toggleActiveMut.mutate({ id: row.id, active: row.isActive })}
                      className="p-1.5 text-gray-400 hover:text-yellow-400 hover:bg-gray-700 rounded"
                      title={row.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {row.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
