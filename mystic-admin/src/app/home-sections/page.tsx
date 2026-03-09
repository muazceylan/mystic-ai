'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, Eye, Archive, ToggleLeft, ToggleRight, Send, ChevronUp, ChevronDown } from 'lucide-react';
import { homeSectionsApi } from '@/lib/api';
import type { HomeSection, HomeSectionType, CmsContentStatus } from '@/types';

const STATUS_COLORS: Record<CmsContentStatus, string> = {
  DRAFT: 'bg-gray-700 text-gray-300',
  PUBLISHED: 'bg-green-900/50 text-green-300',
  ARCHIVED: 'bg-red-900/50 text-red-300',
};

const TYPE_LABELS: Record<HomeSectionType, string> = {
  HERO_BANNER: 'Hero Banner',
  DAILY_HIGHLIGHT: 'Daily Highlight',
  QUICK_ACTIONS: 'Quick Actions',
  FEATURED_CARD: 'Featured Card',
  MODULE_PROMO: 'Module Promo',
  WEEKLY_SUMMARY: 'Weekly Summary',
  PRAYER_HIGHLIGHT: 'Prayer Highlight',
  CUSTOM_CARD_GROUP: 'Custom Card Group',
};

export default function HomeSectionsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [isActive, setIsActive] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['home-sections', type, status, isActive],
    queryFn: () => homeSectionsApi.list({
      ...(type && { type }),
      ...(status && { status }),
      ...(isActive !== '' && { isActive }),
      size: 50,
      sort: 'sortOrder,asc',
    }).then(r => r.data),
  });

  const publishMut = useMutation({
    mutationFn: (id: number) => homeSectionsApi.publish(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['home-sections'] }),
  });
  const archiveMut = useMutation({
    mutationFn: (id: number) => homeSectionsApi.archive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['home-sections'] }),
  });
  const toggleActiveMut = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      active ? homeSectionsApi.deactivate(id) : homeSectionsApi.activate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['home-sections'] }),
  });
  const reorderMut = useMutation({
    mutationFn: (orderMap: Record<number, number>) => homeSectionsApi.reorder(orderMap),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['home-sections'] }),
  });

  const sections: HomeSection[] = data?.content ?? [];

  function moveUp(index: number) {
    if (index === 0) return;
    const curr = sections[index];
    const prev = sections[index - 1];
    reorderMut.mutate({ [curr.id]: prev.sortOrder, [prev.id]: curr.sortOrder });
  }

  function moveDown(index: number) {
    if (index === sections.length - 1) return;
    const curr = sections[index];
    const next = sections[index + 1];
    reorderMut.mutate({ [curr.id]: next.sortOrder, [next.id]: curr.sortOrder });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Home Sections</h1>
          <p className="text-gray-400 text-sm mt-1">Manage home screen section layout and content</p>
        </div>
        <button
          onClick={() => router.push('/home-sections/new')}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New Section
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={type} onChange={e => setType(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2">
          <option value="">All Types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2">
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <select value={isActive} onChange={e => setIsActive(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2">
          <option value="">Active/Passive</option>
          <option value="true">Active</option>
          <option value="false">Passive</option>
        </select>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="text-left px-4 py-3 w-8">↕</th>
              <th className="text-left px-4 py-3">Section Key</th>
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Active</th>
              <th className="text-left px-4 py-3">Order</th>
              <th className="text-left px-4 py-3">Route</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : sections.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No sections found</td></tr>
            ) : sections.map((s, index) => (
              <tr key={s.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                <td className="px-2 py-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveUp(index)} disabled={index === 0 || reorderMut.isPending}
                      className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed">
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveDown(index)} disabled={index === sections.length - 1 || reorderMut.isPending}
                      className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-purple-300">{s.sectionKey}</td>
                <td className="px-4 py-3 text-white font-medium">{s.title}</td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full">
                    {TYPE_LABELS[s.type] ?? s.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status]}`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${s.isActive ? 'text-green-400' : 'text-gray-500'}`}>
                    {s.isActive ? 'Active' : 'Passive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{s.sortOrder}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400 max-w-xs truncate">{s.routeKey ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => router.push(`/home-sections/${s.id}`)}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded" title="Detail">
                      <Eye className="w-4 h-4" />
                    </button>
                    {s.status !== 'PUBLISHED' && (
                      <button onClick={() => publishMut.mutate(s.id)}
                        className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-gray-700 rounded" title="Publish">
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                    {s.status !== 'ARCHIVED' && (
                      <button onClick={() => archiveMut.mutate(s.id)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded" title="Archive">
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => toggleActiveMut.mutate({ id: s.id, active: s.isActive })}
                      className="p-1.5 text-gray-400 hover:text-yellow-400 hover:bg-gray-700 rounded"
                      title={s.isActive ? 'Deactivate' : 'Activate'}>
                      {s.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
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
