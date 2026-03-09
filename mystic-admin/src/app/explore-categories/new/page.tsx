'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { exploreCategoriesApi } from '@/lib/api';

export default function NewExploreCategoryPage() {
  const router = useRouter();
  const [form, setForm] = useState({ categoryKey: '', title: '', subtitle: '', icon: '', sortOrder: 0, locale: 'tr', startDate: '', endDate: '' });
  const [error, setError] = useState('');

  const createMut = useMutation({
    mutationFn: (data: typeof form) => exploreCategoriesApi.create(data),
    onSuccess: (r) => router.push(`/explore-categories/${r.data.id}`),
    onError: (e: any) => setError(e.response?.data?.message ?? 'Error'),
  });

  const f = (key: keyof typeof form, label: string, type = 'text') => (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      {type === 'number'
        ? <input type="number" value={form[key] as number} onChange={e => setForm(p => ({ ...p, [key]: Number(e.target.value) }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
        : <input type={type} value={form[key] as string} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />}
    </div>
  );

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold text-white">New Explore Category</h1>
      </div>
      {error && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-3 text-sm">{error}</div>}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {f('categoryKey', 'Category Key *')}
          {f('title', 'Title *')}
          {f('subtitle', 'Subtitle')}
          {f('icon', 'Icon')}
          {f('sortOrder', 'Sort Order', 'number')}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Locale</label>
            <select value={form.locale} onChange={e => setForm(p => ({ ...p, locale: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm">
              <option value="tr">tr</option><option value="en">en</option>
            </select>
          </div>
          {f('startDate', 'Start Date', 'datetime-local')}
          {f('endDate', 'End Date', 'datetime-local')}
        </div>
      </div>
      <button onClick={() => createMut.mutate(form)} disabled={createMut.isPending}
        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium">
        <Save className="w-4 h-4" /> Save as Draft
      </button>
    </div>
  );
}
