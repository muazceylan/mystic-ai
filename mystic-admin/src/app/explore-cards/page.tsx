'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, Eye, Archive, ToggleLeft, ToggleRight, Send, Star, ChevronUp, ChevronDown } from 'lucide-react';
import { exploreCardsApi } from '@/lib/api';
import type { ExploreCard, CmsContentStatus } from '@/types';

const STATUS_COLORS: Record<CmsContentStatus, string> = {
  DRAFT: 'bg-gray-700 text-gray-300',
  PUBLISHED: 'bg-green-900/50 text-green-300',
  ARCHIVED: 'bg-red-900/50 text-red-300',
};

export default function ExploreCardsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [categoryKey, setCategoryKey] = useState('');
  const [status, setStatus] = useState('');
  const [isFeatured, setIsFeatured] = useState('');
  const [isActive, setIsActive] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['explore-cards', categoryKey, status, isFeatured, isActive],
    queryFn: () => exploreCardsApi.list({
      ...(categoryKey && { categoryKey }),
      ...(status && { status }),
      ...(isFeatured !== '' && { isFeatured }),
      ...(isActive !== '' && { isActive }),
      size: 100,
      sort: 'sortOrder,asc',
    }).then(r => r.data),
  });

  const publishMut = useMutation({ mutationFn: (id: number) => exploreCardsApi.publish(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['explore-cards'] }) });
  const archiveMut = useMutation({ mutationFn: (id: number) => exploreCardsApi.archive(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['explore-cards'] }) });
  const toggleMut = useMutation({ mutationFn: ({ id, active }: { id: number; active: boolean }) => active ? exploreCardsApi.deactivate(id) : exploreCardsApi.activate(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['explore-cards'] }) });
  const featureMut = useMutation({ mutationFn: ({ id, featured }: { id: number; featured: boolean }) => featured ? exploreCardsApi.unfeature(id) : exploreCardsApi.feature(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['explore-cards'] }) });
  const reorderMut = useMutation({
    mutationFn: (orderMap: Record<number, number>) => exploreCardsApi.reorder(orderMap),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['explore-cards'] }),
  });

  const cards: ExploreCard[] = data?.content ?? [];

  function moveUp(index: number) {
    if (index === 0) return;
    const curr = cards[index];
    const prev = cards[index - 1];
    reorderMut.mutate({ [curr.id]: prev.sortOrder, [prev.id]: curr.sortOrder });
  }

  function moveDown(index: number) {
    if (index === cards.length - 1) return;
    const curr = cards[index];
    const next = cards[index + 1];
    reorderMut.mutate({ [curr.id]: next.sortOrder, [next.id]: curr.sortOrder });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Explore Cards</h1>
          <p className="text-gray-400 text-sm mt-1">Manage explore screen cards by category</p>
        </div>
        <button onClick={() => router.push('/explore-cards/new')} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> New Card
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input value={categoryKey} onChange={e => setCategoryKey(e.target.value)} placeholder="Filter by category key..."
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2" />
        <select value={status} onChange={e => setStatus(e.target.value)} className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2">
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <select value={isFeatured} onChange={e => setIsFeatured(e.target.value)} className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2">
          <option value="">All</option>
          <option value="true">Featured ★</option>
          <option value="false">Not Featured</option>
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
              <th className="text-left px-4 py-3">Card Key</th>
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Flags</th>
              <th className="text-left px-4 py-3">Route</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : cards.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No cards found</td></tr>
            ) : cards.map((c, index) => (
              <tr key={c.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="px-2 py-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveUp(index)} disabled={index === 0 || reorderMut.isPending}
                      className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed">
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveDown(index)} disabled={index === cards.length - 1 || reorderMut.isPending}
                      className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-purple-300">{c.cardKey}</td>
                <td className="px-4 py-3 text-white font-medium">{c.title}</td>
                <td className="px-4 py-3 text-xs text-blue-300 font-mono">{c.categoryKey}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status]}`}>{c.status}</span></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {c.isActive && <span className="text-xs bg-green-900/40 text-green-300 px-1.5 py-0.5 rounded">Active</span>}
                    {c.isFeatured && <span className="text-xs bg-yellow-900/40 text-yellow-300 px-1.5 py-0.5 rounded">★ Featured</span>}
                    {c.isPremium && <span className="text-xs bg-purple-900/40 text-purple-300 px-1.5 py-0.5 rounded">PRO</span>}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400 max-w-xs truncate">{c.routeKey ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => router.push(`/explore-cards/${c.id}`)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"><Eye className="w-4 h-4" /></button>
                    {c.status !== 'PUBLISHED' && <button onClick={() => publishMut.mutate(c.id)} className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-gray-700 rounded"><Send className="w-4 h-4" /></button>}
                    {c.status !== 'ARCHIVED' && <button onClick={() => archiveMut.mutate(c.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded"><Archive className="w-4 h-4" /></button>}
                    <button onClick={() => featureMut.mutate({ id: c.id, featured: c.isFeatured })}
                      className={`p-1.5 hover:bg-gray-700 rounded ${c.isFeatured ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}`}
                      title={c.isFeatured ? 'Unfeature' : 'Feature'}>
                      <Star className={`w-4 h-4 ${c.isFeatured ? 'fill-yellow-400' : ''}`} />
                    </button>
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
