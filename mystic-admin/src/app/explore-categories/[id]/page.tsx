'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, Archive, ToggleLeft, ToggleRight } from 'lucide-react';
import { exploreCategoriesApi } from '@/lib/api';
import type { ExploreCategory } from '@/types';

export default function ExploreCategoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: cat, isLoading } = useQuery<ExploreCategory>({
    queryKey: ['explore-category', id],
    queryFn: () => exploreCategoriesApi.get(Number(id)).then(r => r.data),
  });

  const publishMut = useMutation({ mutationFn: () => exploreCategoriesApi.publish(Number(id)), onSuccess: () => qc.invalidateQueries({ queryKey: ['explore-category', id] }) });
  const archiveMut = useMutation({ mutationFn: () => exploreCategoriesApi.archive(Number(id)), onSuccess: () => qc.invalidateQueries({ queryKey: ['explore-category', id] }) });
  const toggleMut = useMutation({
    mutationFn: () => cat?.isActive ? exploreCategoriesApi.deactivate(Number(id)) : exploreCategoriesApi.activate(Number(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['explore-category', id] }),
  });

  if (isLoading) return <div className="text-gray-400 p-8">Loading...</div>;
  if (!cat) return <div className="text-red-400 p-8">Not found</div>;

  const fmt = (d?: string) => d ? new Date(d).toLocaleString('tr-TR') : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{cat.title}</h1>
          <p className="text-gray-400 text-sm font-mono">{cat.categoryKey}</p>
        </div>
        <div className="flex gap-2">
          {cat.status !== 'PUBLISHED' && <button onClick={() => publishMut.mutate()} className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm"><Send className="w-4 h-4" /> Publish</button>}
          {cat.status !== 'ARCHIVED' && <button onClick={() => archiveMut.mutate()} className="flex items-center gap-2 bg-red-800 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm"><Archive className="w-4 h-4" /> Archive</button>}
          <button onClick={() => toggleMut.mutate()} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm">
            {cat.isActive ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4" />}
            {cat.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-xl">
        <h2 className="text-white font-semibold mb-4">Category Info</h2>
        <div className="space-y-3 text-sm">
          {[['Status', cat.status], ['Active', cat.isActive ? 'Yes' : 'No'], ['Subtitle', cat.subtitle ?? '—'], ['Icon', cat.icon ?? '—'], ['Sort Order', String(cat.sortOrder)], ['Locale', cat.locale], ['Start Date', fmt(cat.startDate)], ['End Date', fmt(cat.endDate)], ['Published At', fmt(cat.publishedAt)], ['Created At', fmt(cat.createdAt)], ['Updated At', fmt(cat.updatedAt)]].map(([l, v]) => (
            <div key={l} className="flex justify-between"><span className="text-gray-400">{l}</span><span className="text-white">{v}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}
