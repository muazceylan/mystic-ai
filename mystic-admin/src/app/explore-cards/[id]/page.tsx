'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, Archive, ToggleLeft, ToggleRight, Star, Edit, X, Save } from 'lucide-react';
import { exploreCardsApi } from '@/lib/api';
import { RouteSelector } from '@/components/notifications/RouteSelector';
import type { ExploreCard } from '@/types';

export default function ExploreCardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['explore-card', id] });
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<ExploreCard>>({});
  const [saveError, setSaveError] = useState('');

  const { data: card, isLoading } = useQuery<ExploreCard>({
    queryKey: ['explore-card', id],
    queryFn: () => exploreCardsApi.get(Number(id)).then(r => r.data),
  });

  useEffect(() => {
    if (card) {
      setForm({
        categoryKey: card.categoryKey,
        title: card.title,
        subtitle: card.subtitle ?? '',
        description: card.description ?? '',
        imageUrl: card.imageUrl ?? '',
        routeKey: card.routeKey ?? '',
        fallbackRouteKey: card.fallbackRouteKey ?? '',
        ctaLabel: card.ctaLabel ?? '',
        sortOrder: card.sortOrder,
        isPremium: card.isPremium,
        startDate: card.startDate ?? '',
        endDate: card.endDate ?? '',
        payloadJson: card.payloadJson ?? '',
      });
    }
  }, [card?.id]);

  const publishMut = useMutation({ mutationFn: () => exploreCardsApi.publish(Number(id)), onSuccess: inv });
  const archiveMut = useMutation({ mutationFn: () => exploreCardsApi.archive(Number(id)), onSuccess: inv });
  const toggleMut = useMutation({ mutationFn: () => card?.isActive ? exploreCardsApi.deactivate(Number(id)) : exploreCardsApi.activate(Number(id)), onSuccess: inv });
  const featureMut = useMutation({ mutationFn: () => card?.isFeatured ? exploreCardsApi.unfeature(Number(id)) : exploreCardsApi.feature(Number(id)), onSuccess: inv });
  const updateMut = useMutation({
    mutationFn: (data: Partial<ExploreCard>) => exploreCardsApi.update(Number(id), data),
    onSuccess: () => { inv(); setIsEditing(false); setSaveError(''); },
    onError: (e: any) => setSaveError(e.response?.data?.message ?? 'Kaydetme hatası'),
  });

  if (isLoading) return <div className="text-gray-400 p-8">Loading...</div>;
  if (!card) return <div className="text-red-400 p-8">Not found</div>;

  const fmt = (d?: string) => d ? new Date(d).toLocaleString('tr-TR') : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white truncate">{card.title}</h1>
          <p className="text-gray-400 text-sm font-mono">{card.cardKey} · {card.categoryKey}</p>
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
          <button onClick={() => featureMut.mutate()} disabled={featureMut.isPending}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm disabled:opacity-50 ${card.isFeatured ? 'bg-yellow-900/60 text-yellow-300 hover:bg-yellow-900/80' : 'bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50'}`}>
            <Star className={`w-4 h-4 ${card.isFeatured ? 'fill-yellow-300' : ''}`} />
            {card.isFeatured ? 'Öne Çıkarımı Kaldır' : 'Öne Çıkar'}
          </button>
          {card.status !== 'PUBLISHED' && <button onClick={() => publishMut.mutate()} disabled={publishMut.isPending} className="flex items-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm"><Send className="w-4 h-4" /> Yayınla</button>}
          {card.status !== 'ARCHIVED' && <button onClick={() => archiveMut.mutate()} disabled={archiveMut.isPending} className="flex items-center gap-2 bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm"><Archive className="w-4 h-4" /> Arşivle</button>}
          <button onClick={() => toggleMut.mutate()} disabled={toggleMut.isPending} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm">
            {card.isActive ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4" />}
            {card.isActive ? 'Devre Dışı' : 'Etkinleştir'}
          </button>
        </div>
      </div>

      {saveError && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-3 text-sm">{saveError}</div>}

      {isEditing ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4 max-w-2xl">
          <h2 className="text-white font-semibold">Kartı Düzenle</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-gray-400 mb-1">Başlık *</label>
              <input value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Alt Başlık</label>
              <input value={form.subtitle ?? ''} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">CTA Label</label>
              <input value={form.ctaLabel ?? ''} onChange={e => setForm(f => ({ ...f, ctaLabel: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Sıralama</label>
              <input type="number" value={form.sortOrder ?? 0} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Başlangıç Tarihi</label>
              <input type="datetime-local" value={form.startDate ?? ''} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Bitiş Tarihi</label>
              <input type="datetime-local" value={form.endDate ?? ''} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" /></div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="isPremium" checked={form.isPremium ?? false} onChange={e => setForm(f => ({ ...f, isPremium: e.target.checked }))} className="w-4 h-4" />
              <label htmlFor="isPremium" className="text-sm text-gray-400">Premium İçerik</label>
            </div>
          </div>
          <div><label className="block text-sm text-gray-400 mb-1">Görsel URL</label>
            <input value={form.imageUrl ?? ''} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" /></div>
          <RouteSelector value={form.routeKey ?? ''} onChange={(key) => setForm(f => ({ ...f, routeKey: key }))} label="Route Key" />
          <RouteSelector value={form.fallbackRouteKey ?? ''} onChange={(key) => setForm(f => ({ ...f, fallbackRouteKey: key }))} label="Fallback Route" />
          <div><label className="block text-sm text-gray-400 mb-1">Açıklama</label>
            <textarea value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm text-gray-400 mb-1">Payload JSON</label>
            <textarea value={form.payloadJson ?? ''} onChange={e => setForm(f => ({ ...f, payloadJson: e.target.value }))} rows={2} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm font-mono" /></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-white font-semibold mb-4">Kart Bilgileri</h2>
            <div className="space-y-3 text-sm">
              {[
                ['Durum', card.status],
                ['Aktif', card.isActive ? 'Evet' : 'Hayır'],
                ['Öne Çıkan', card.isFeatured ? '★ Evet' : 'Hayır'],
                ['Premium', card.isPremium ? 'Evet' : 'Hayır'],
                ['Route Key', card.routeKey ?? '—'],
                ['Fallback Route', card.fallbackRouteKey ?? '—'],
                ['CTA Label', card.ctaLabel ?? '—'],
                ['Sıralama', String(card.sortOrder)],
                ['Locale', card.locale],
                ['Başlangıç', fmt(card.startDate)],
                ['Bitiş', fmt(card.endDate)],
                ['Yayın Tarihi', fmt(card.publishedAt)],
                ['Güncelleme', fmt(card.updatedAt)],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between gap-4"><span className="text-gray-400 shrink-0">{l}</span><span className="text-white text-right">{v}</span></div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            {card.imageUrl && <div className="bg-gray-800 rounded-xl border border-gray-700 p-6"><h2 className="text-white font-semibold mb-3">Görsel</h2><img src={card.imageUrl} alt={card.title} className="w-full rounded-lg object-cover max-h-48" /></div>}
            {card.description && <div className="bg-gray-800 rounded-xl border border-gray-700 p-6"><h2 className="text-white font-semibold mb-3">Açıklama</h2><p className="text-gray-300 text-sm">{card.description}</p></div>}
            {card.payloadJson && <div className="bg-gray-800 rounded-xl border border-gray-700 p-6"><h2 className="text-white font-semibold mb-3">Payload JSON</h2><pre className="text-xs text-gray-300 bg-gray-900 rounded p-3 overflow-auto max-h-48">{card.payloadJson}</pre></div>}
          </div>
        </div>
      )}
    </div>
  );
}
