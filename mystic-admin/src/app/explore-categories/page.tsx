'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, Eye, Archive, ToggleLeft, ToggleRight, Send, ChevronUp, ChevronDown } from 'lucide-react';
import { exploreCategoriesApi } from '@/lib/api';
import type { ExploreCategory, CmsContentStatus } from '@/types';

const STATUS_COLORS: Record<CmsContentStatus, string> = {
  DRAFT: 'bg-gray-700 text-gray-300',
  PUBLISHED: 'bg-green-900/50 text-green-300',
  ARCHIVED: 'bg-red-900/50 text-red-300',
};

export default function ExploreCategoriesPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [isActive, setIsActive] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['explore-categories', status, isActive],
    queryFn: () => exploreCategoriesApi.list({ ...(status && { status }), ...(isActive !== '' && { isActive }), size: 50, sort: 'sortOrder,asc' }).then(r => r.data),
  });

  const publishMut = useMutation({ mutationFn: (id: number) => exploreCategoriesApi.publish(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['explore-categories'] }) });
  const archiveMut = useMutation({ mutationFn: (id: number) => exploreCategoriesApi.archive(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['explore-categories'] }) });
  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => active ? exploreCategoriesApi.deactivate(id) : exploreCategoriesApi.activate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['explore-categories'] }),
  });
  const reorderMut = useMutation({
    mutationFn: (orderMap: Record<number, number>) => exploreCategoriesApi.reorder(orderMap),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['explore-categories'] }),
  });

  const cats: ExploreCategory[] = data?.content ?? [];

  function moveUp(index: number) {
    if (index === 0) return;
    const curr = cats[index];
    const prev = cats[index - 1];
    reorderMut.mutate({ [curr.id]: prev.sortOrder, [prev.id]: curr.sortOrder });
  }

  function moveDown(index: number) {
    if (index === cats.length - 1) return;
    const curr = cats[index];
    const next = cats[index + 1];
    reorderMut.mutate({ [curr.id]: next.sortOrder, [next.id]: curr.sortOrder });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Explore Categories</h1>
          <p className="text-gray-400 text-sm mt-1">Manage explore screen category groups</p>
        </div>
        <button onClick={() => router.push('/explore-categories/new')}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> New Category
        </button>
      </div>

      <div className="flex gap-3">
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
              <th className="text-left px-2 py-3 w-8">↕</th>
              <th className="text-left px-4 py-3">Category Key</th>
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Active</th>
              <th className="text-left px-4 py-3">Order</th>
              <th className="text-left px-4 py-3">Locale</th>
              <th className="text-left px-4 py-3">Updated</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : cats.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No categories found</td></tr>
            ) : cats.map((c, index) => (
              <tr key={c.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                <td className="px-2 py-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveUp(index)} disabled={index === 0 || reorderMut.isPending}
                      className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed">
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveDown(index)} disabled={index === cats.length - 1 || reorderMut.isPending}
                      className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-purple-300">{c.categoryKey}</td>
                <td className="px-4 py-3 text-white font-medium">{c.title}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${c.isActive ? 'text-green-400' : 'text-gray-500'}`}>{c.isActive ? 'Active' : 'Passive'}</span>
                </td>
                <td className="px-4 py-3 text-gray-400">{c.sortOrder}</td>
                <td className="px-4 py-3 text-gray-400">{c.locale}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{new Date(c.updatedAt).toLocaleDateString('tr-TR')}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => router.push(`/explore-categories/${c.id}`)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"><Eye className="w-4 h-4" /></button>
                    {c.status !== 'PUBLISHED' && <button onClick={() => publishMut.mutate(c.id)} className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-gray-700 rounded"><Send className="w-4 h-4" /></button>}
                    {c.status !== 'ARCHIVED' && <button onClick={() => archiveMut.mutate(c.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded"><Archive className="w-4 h-4" /></button>}
                    <button onClick={() => toggleMut.mutate({ id: c.id, active: c.isActive })} className="p-1.5 text-gray-400 hover:text-yellow-400 hover:bg-gray-700 rounded">
                      {c.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
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
