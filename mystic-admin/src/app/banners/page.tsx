'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, Eye, Archive, ToggleLeft, ToggleRight, Send, ChevronUp, ChevronDown } from 'lucide-react';
import { bannersApi } from '@/lib/api';
import type { PlacementBanner, BannerPlacementType, CmsContentStatus } from '@/types';

const STATUS_COLORS: Record<CmsContentStatus, string> = {
  DRAFT: 'bg-gray-700 text-gray-300',
  PUBLISHED: 'bg-green-900/50 text-green-300',
  ARCHIVED: 'bg-red-900/50 text-red-300',
};

const PLACEMENT_COLORS: Record<BannerPlacementType, string> = {
  HOME_HERO: 'bg-blue-900/40 text-blue-300',
  HOME_INLINE: 'bg-cyan-900/40 text-cyan-300',
  EXPLORE_HERO: 'bg-orange-900/40 text-orange-300',
  EXPLORE_INLINE: 'bg-amber-900/40 text-amber-300',
};

export default function BannersPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [placementType, setPlacementType] = useState('');
  const [status, setStatus] = useState('');
  const [isActive, setIsActive] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['banners', placementType, status, isActive],
    queryFn: () => bannersApi.list({
      ...(placementType && { placementType }),
      ...(status && { status }),
      ...(isActive !== '' && { isActive }),
      size: 100,
      sort: 'priority,asc',
    }).then(r => r.data),
  });

  const publishMut = useMutation({ mutationFn: (id: number) => bannersApi.publish(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['banners'] }) });
  const archiveMut = useMutation({ mutationFn: (id: number) => bannersApi.archive(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['banners'] }) });
  const toggleMut = useMutation({ mutationFn: ({ id, active }: { id: number; active: boolean }) => active ? bannersApi.deactivate(id) : bannersApi.activate(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['banners'] }) });
  const reorderMut = useMutation({
    mutationFn: (priorityMap: Record<number, number>) => bannersApi.reorder(priorityMap),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['banners'] }),
  });

  const banners: PlacementBanner[] = data?.content ?? [];

  function moveUp(index: number) {
    if (index === 0) return;
    const curr = banners[index];
    const prev = banners[index - 1];
    reorderMut.mutate({ [curr.id]: prev.priority, [prev.id]: curr.priority });
  }

  function moveDown(index: number) {
    if (index === banners.length - 1) return;
    const curr = banners[index];
    const next = banners[index + 1];
    reorderMut.mutate({ [curr.id]: next.priority, [next.id]: curr.priority });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Banners</h1>
          <p className="text-gray-400 text-sm mt-1">Manage hero and inline banners across Home and Explore</p>
        </div>
        <button onClick={() => router.push('/banners/new')} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> New Banner
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={placementType} onChange={e => setPlacementType(e.target.value)} className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2">
          <option value="">All Placements</option>
          <option value="HOME_HERO">Home Hero</option>
          <option value="HOME_INLINE">Home Inline</option>
          <option value="EXPLORE_HERO">Explore Hero</option>
          <option value="EXPLORE_INLINE">Explore Inline</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2">
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <select value={isActive} onChange={e => setIsActive(e.target.value)} className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2">
          <option value="">Active/Passive</option>
          <option value="true">Active</option>
          <option value="false">Passive</option>
        </select>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="text-left px-2 py-3 w-8">↕</th>
              <th className="text-left px-4 py-3">Banner Key</th>
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Placement</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Active</th>
              <th className="text-left px-4 py-3">Priority</th>
              <th className="text-left px-4 py-3">Dates</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : banners.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No banners found</td></tr>
            ) : banners.map((b, index) => (
              <tr key={b.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="px-2 py-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveUp(index)} disabled={index === 0 || reorderMut.isPending}
                      className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed">
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveDown(index)} disabled={index === banners.length - 1 || reorderMut.isPending}
                      className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-purple-300">{b.bannerKey}</td>
                <td className="px-4 py-3 text-white font-medium">{b.title}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${PLACEMENT_COLORS[b.placementType]}`}>{b.placementType}</span></td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[b.status]}`}>{b.status}</span></td>
                <td className="px-4 py-3"><span className={`text-xs ${b.isActive ? 'text-green-400' : 'text-gray-500'}`}>{b.isActive ? 'Active' : 'Passive'}</span></td>
                <td className="px-4 py-3 text-gray-400">{b.priority}</td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {b.startDate ? new Date(b.startDate).toLocaleDateString('tr-TR') : '—'} → {b.endDate ? new Date(b.endDate).toLocaleDateString('tr-TR') : '∞'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => router.push(`/banners/${b.id}`)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"><Eye className="w-4 h-4" /></button>
                    {b.status !== 'PUBLISHED' && <button onClick={() => publishMut.mutate(b.id)} className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-gray-700 rounded"><Send className="w-4 h-4" /></button>}
                    {b.status !== 'ARCHIVED' && <button onClick={() => archiveMut.mutate(b.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded"><Archive className="w-4 h-4" /></button>}
                    <button onClick={() => toggleMut.mutate({ id: b.id, active: b.isActive })} className="p-1.5 text-gray-400 hover:text-yellow-400 hover:bg-gray-700 rounded">
                      {b.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
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
