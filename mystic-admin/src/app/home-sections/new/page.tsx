'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { homeSectionsApi } from '@/lib/api';
import { RouteSelector } from '@/components/notifications/RouteSelector';

const SECTION_TYPES = [
  'HERO_BANNER', 'DAILY_HIGHLIGHT', 'QUICK_ACTIONS', 'FEATURED_CARD',
  'MODULE_PROMO', 'WEEKLY_SUMMARY', 'PRAYER_HIGHLIGHT', 'CUSTOM_CARD_GROUP',
];

export default function NewHomeSectionPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    sectionKey: '', title: '', subtitle: '', type: 'FEATURED_CARD',
    routeKey: '', fallbackRouteKey: '', icon: '', imageUrl: '',
    ctaLabel: '', badgeLabel: '', sortOrder: 0, locale: 'tr',
    startDate: '', endDate: '', payloadJson: '',
  });
  const [error, setError] = useState('');

  const createMut = useMutation({
    mutationFn: (data: typeof form) => homeSectionsApi.create(data),
    onSuccess: (r) => router.push(`/home-sections/${r.data.id}`),
    onError: (e: any) => setError(e.response?.data?.message ?? 'Error'),
  });

  const field = (key: keyof typeof form, label: string, type = 'text', opts?: string[]) => (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      {opts ? (
        <select value={form[key] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm">
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === 'number' ? (
        <input type="number" value={form[key] as number} onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))}
          className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
      ) : type === 'textarea' ? (
        <textarea value={form[key] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} rows={3}
          className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
      ) : (
        <input type={type} value={form[key] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-white">New Home Section</h1>
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-3 text-sm">{error}</div>}

      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {field('sectionKey', 'Section Key *')}
          {field('title', 'Title *')}
          {field('type', 'Type', 'text', SECTION_TYPES)}
          {field('locale', 'Locale', 'text', ['tr', 'en'])}
          {field('subtitle', 'Subtitle')}
          {field('sortOrder', 'Sort Order', 'number')}
        </div>
        <RouteSelector
          value={form.routeKey}
          onChange={(key) => setForm(f => ({ ...f, routeKey: key }))}
          label="Route Key"
        />
        <RouteSelector
          value={form.fallbackRouteKey}
          onChange={(key) => setForm(f => ({ ...f, fallbackRouteKey: key }))}
          label="Fallback Route Key"
        />
        <div className="grid grid-cols-2 gap-4">
          {field('ctaLabel', 'CTA Label')}
          {field('badgeLabel', 'Badge Label')}
          {field('icon', 'Icon')}
          {field('imageUrl', 'Image URL')}
          {field('startDate', 'Start Date', 'datetime-local')}
          {field('endDate', 'End Date', 'datetime-local')}
        </div>
        {field('payloadJson', 'Payload JSON', 'textarea')}
      </div>

      <div className="flex gap-3">
        <button onClick={() => createMut.mutate(form)} disabled={createMut.isPending}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium">
          <Save className="w-4 h-4" /> Save as Draft
        </button>
      </div>
    </div>
  );
}
