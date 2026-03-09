'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, Archive, ToggleLeft, ToggleRight, Edit, X, Save } from 'lucide-react';
import { bannersApi } from '@/lib/api';
import { RouteSelector } from '@/components/notifications/RouteSelector';
import type { PlacementBanner } from '@/types';

const PLACEMENTS = ['HOME_HERO', 'HOME_INLINE', 'EXPLORE_HERO', 'EXPLORE_INLINE'];

export default function BannerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['banner', id] });
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<PlacementBanner>>({});
  const [saveError, setSaveError] = useState('');

  const { data: banner, isLoading } = useQuery<PlacementBanner>({
    queryKey: ['banner', id],
    queryFn: () => bannersApi.get(Number(id)).then(r => r.data),
  });

  useEffect(() => {
    if (banner) {
      setForm({
        title: banner.title,
        subtitle: banner.subtitle ?? '',
        imageUrl: banner.imageUrl,
        ctaLabel: banner.ctaLabel ?? '',
        routeKey: banner.routeKey ?? '',
        fallbackRouteKey: banner.fallbackRouteKey ?? '',
        priority: banner.priority,
        placementType: banner.placementType,
        startDate: banner.startDate ?? '',
        endDate: banner.endDate ?? '',
      });
    }
  }, [banner?.id]);

  const publishMut = useMutation({ mutationFn: () => bannersApi.publish(Number(id)), onSuccess: inv });
  const archiveMut = useMutation({ mutationFn: () => bannersApi.archive(Number(id)), onSuccess: inv });
  const toggleMut = useMutation({ mutationFn: () => banner?.isActive ? bannersApi.deactivate(Number(id)) : bannersApi.activate(Number(id)), onSuccess: inv });
  const updateMut = useMutation({
    mutationFn: (data: Partial<PlacementBanner>) => bannersApi.update(Number(id), data),
    onSuccess: () => { inv(); setIsEditing(false); setSaveError(''); },
    onError: (e: any) => setSaveError(e.response?.data?.message ?? 'Kaydetme hatası'),
  });

  if (isLoading) return <div className="text-gray-400 p-8">Loading...</div>;
  if (!banner) return <div className="text-red-400 p-8">Not found</div>;

  const fmt = (d?: string) => d ? new Date(d).toLocaleString('tr-TR') : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white truncate">{banner.title}</h1>
          <p className="text-gray-400 text-sm font-mono">{banner.bannerKey} · {banner.placementType}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isEditing ? (
            <>
              <button onClick={() => { setIsEditing(false); setSaveError(''); }} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm"><X className="w-4 h-4" /> İptal</button>
              <button onClick={() => updateMut.mutate(form)} disabled={updateMut.isPending}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm"><Save className="w-4 h-4" /> Kaydet</button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm"><Edit className="w-4 h-4" /> Düzenle</button>
          )}
          {banner.status !== 'PUBLISHED' && <button onClick={() => publishMut.mutate()} disabled={publishMut.isPending} className="flex items-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm"><Send className="w-4 h-4" /> Yayınla</button>}
          {banner.status !== 'ARCHIVED' && <button onClick={() => archiveMut.mutate()} disabled={archiveMut.isPending} className="flex items-center gap-2 bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm"><Archive className="w-4 h-4" /> Arşivle</button>}
          <button onClick={() => toggleMut.mutate()} disabled={toggleMut.isPending} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm">
            {banner.isActive ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4" />}
            {banner.isActive ? 'Devre Dışı' : 'Etkinleştir'}
          </button>
        </div>
      </div>

      {saveError && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-3 text-sm">{saveError}</div>}

      {isEditing ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4 max-w-2xl">
          <h2 className="text-white font-semibold">Banner'ı Düzenle</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-gray-400 mb-1">Başlık *</label>
              <input value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Alt Başlık</label>
              <input value={form.subtitle ?? ''} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" /></div>
            <div className="col-span-2"><label className="block text-sm text-gray-400 mb-1">Görsel URL *</label>
              <input value={form.imageUrl ?? ''} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">CTA Label</label>
              <input value={form.ctaLabel ?? ''} onChange={e => setForm(f => ({ ...f, ctaLabel: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Öncelik (Priority)</label>
              <input type="number" value={form.priority ?? 0} onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Yerleşim</label>
              <select value={form.placementType ?? 'HOME_HERO'} onChange={e => setForm(f => ({ ...f, placementType: e.target.value as any }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm">
                {PLACEMENTS.map(p => <option key={p} value={p}>{p}</option>)}
              </select></div>
            <div><label className="block text-sm text-gray-400 mb-1">Başlangıç Tarihi</label>
              <input type="datetime-local" value={form.startDate ?? ''} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Bitiş Tarihi</label>
              <input type="datetime-local" value={form.endDate ?? ''} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" /></div>
          </div>
          <RouteSelector value={form.routeKey ?? ''} onChange={(key) => setForm(f => ({ ...f, routeKey: key }))} label="Route Key" />
          <RouteSelector value={form.fallbackRouteKey ?? ''} onChange={(key) => setForm(f => ({ ...f, fallbackRouteKey: key }))} label="Fallback Route" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-white font-semibold mb-4">Banner Bilgileri</h2>
            <div className="space-y-3 text-sm">
              {[
                ['Durum', banner.status],
                ['Aktif', banner.isActive ? 'Evet' : 'Hayır'],
                ['Yerleşim', banner.placementType],
                ['Öncelik', String(banner.priority)],
                ['Alt Başlık', banner.subtitle ?? '—'],
                ['CTA Label', banner.ctaLabel ?? '—'],
                ['Route Key', banner.routeKey ?? '—'],
                ['Fallback Route', banner.fallbackRouteKey ?? '—'],
                ['Locale', banner.locale],
                ['Başlangıç', fmt(banner.startDate)],
                ['Bitiş', fmt(banner.endDate)],
                ['Yayın Tarihi', fmt(banner.publishedAt)],
                ['Güncelleme', fmt(banner.updatedAt)],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between gap-4"><span className="text-gray-400 shrink-0">{l}</span><span className="text-white text-right">{v}</span></div>
              ))}
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-white font-semibold mb-3">Önizleme</h2>
            <img src={banner.imageUrl} alt={banner.title} className="w-full rounded-lg object-cover" />
            {banner.ctaLabel && <div className="mt-3 text-center"><span className="bg-purple-600 text-white px-4 py-2 rounded-full text-sm">{banner.ctaLabel}</span></div>}
          </div>
        </div>
      )}
    </div>
  );
}
