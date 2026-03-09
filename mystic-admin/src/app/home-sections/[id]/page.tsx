'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, Archive, ToggleLeft, ToggleRight, Edit, X, Save } from 'lucide-react';
import { homeSectionsApi } from '@/lib/api';
import { RouteSelector } from '@/components/notifications/RouteSelector';
import type { HomeSection } from '@/types';

const SECTION_TYPES = [
  'HERO_BANNER', 'DAILY_HIGHLIGHT', 'QUICK_ACTIONS', 'FEATURED_CARD',
  'MODULE_PROMO', 'WEEKLY_SUMMARY', 'PRAYER_HIGHLIGHT', 'CUSTOM_CARD_GROUP',
];

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleString('tr-TR');
}

export default function HomeSectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<HomeSection>>({});
  const [saveError, setSaveError] = useState('');

  const { data: section, isLoading } = useQuery<HomeSection>({
    queryKey: ['home-section', id],
    queryFn: () => homeSectionsApi.get(Number(id)).then(r => r.data),
  });

  useEffect(() => {
    if (section) {
      setForm({
        title: section.title,
        subtitle: section.subtitle ?? '',
        type: section.type,
        routeKey: section.routeKey ?? '',
        fallbackRouteKey: section.fallbackRouteKey ?? '',
        ctaLabel: section.ctaLabel ?? '',
        badgeLabel: section.badgeLabel ?? '',
        icon: section.icon ?? '',
        imageUrl: section.imageUrl ?? '',
        sortOrder: section.sortOrder,
        startDate: section.startDate ?? '',
        endDate: section.endDate ?? '',
        payloadJson: section.payloadJson ?? '',
      });
    }
  }, [section?.id]);

  const publishMut = useMutation({ mutationFn: () => homeSectionsApi.publish(Number(id)), onSuccess: () => qc.invalidateQueries({ queryKey: ['home-section', id] }) });
  const archiveMut = useMutation({ mutationFn: () => homeSectionsApi.archive(Number(id)), onSuccess: () => qc.invalidateQueries({ queryKey: ['home-section', id] }) });
  const toggleMut = useMutation({
    mutationFn: () => section?.isActive ? homeSectionsApi.deactivate(Number(id)) : homeSectionsApi.activate(Number(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['home-section', id] }),
  });
  const updateMut = useMutation({
    mutationFn: (data: Partial<HomeSection>) => homeSectionsApi.update(Number(id), data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['home-section', id] }); setIsEditing(false); setSaveError(''); },
    onError: (e: any) => setSaveError(e.response?.data?.message ?? 'Kaydetme hatası'),
  });

  if (isLoading) return <div className="text-gray-400 p-8">Loading...</div>;
  if (!section) return <div className="text-red-400 p-8">Not found</div>;

  const statusColor = section.status === 'PUBLISHED' ? 'text-green-400' : section.status === 'ARCHIVED' ? 'text-red-400' : 'text-gray-400';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white truncate">{section.title}</h1>
          <p className="text-gray-400 text-sm font-mono">{section.sectionKey}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isEditing ? (
            <>
              <button onClick={() => { setIsEditing(false); setSaveError(''); }} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm">
                <X className="w-4 h-4" /> İptal
              </button>
              <button onClick={() => updateMut.mutate(form)} disabled={updateMut.isPending}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm">
                <Save className="w-4 h-4" /> Kaydet
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm">
              <Edit className="w-4 h-4" /> Düzenle
            </button>
          )}
          {section.status !== 'PUBLISHED' && (
            <button onClick={() => publishMut.mutate()} disabled={publishMut.isPending}
              className="flex items-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm">
              <Send className="w-4 h-4" /> Yayınla
            </button>
          )}
          {section.status !== 'ARCHIVED' && (
            <button onClick={() => archiveMut.mutate()} disabled={archiveMut.isPending}
              className="flex items-center gap-2 bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm">
              <Archive className="w-4 h-4" /> Arşivle
            </button>
          )}
          <button onClick={() => toggleMut.mutate()} disabled={toggleMut.isPending}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm">
            {section.isActive ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4" />}
            {section.isActive ? 'Devre Dışı' : 'Etkinleştir'}
          </button>
        </div>
      </div>

      {saveError && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-3 text-sm">{saveError}</div>}

      {isEditing ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4 max-w-2xl">
          <h2 className="text-white font-semibold">Bölümü Düzenle</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Başlık *</label>
              <input value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Alt Başlık</label>
              <input value={form.subtitle ?? ''} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Tip</label>
              <select value={form.type ?? 'FEATURED_CARD'} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm">
                {SECTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Sıralama</label>
              <input type="number" value={form.sortOrder ?? 0} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">CTA Label</label>
              <input value={form.ctaLabel ?? ''} onChange={e => setForm(f => ({ ...f, ctaLabel: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Badge Label</label>
              <input value={form.badgeLabel ?? ''} onChange={e => setForm(f => ({ ...f, badgeLabel: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">İkon</label>
              <input value={form.icon ?? ''} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Görsel URL</label>
              <input value={form.imageUrl ?? ''} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Başlangıç Tarihi</label>
              <input type="datetime-local" value={form.startDate ?? ''} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Bitiş Tarihi</label>
              <input type="datetime-local" value={form.endDate ?? ''} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <RouteSelector value={form.routeKey ?? ''} onChange={(key) => setForm(f => ({ ...f, routeKey: key }))} label="Route Key" />
          <RouteSelector value={form.fallbackRouteKey ?? ''} onChange={(key) => setForm(f => ({ ...f, fallbackRouteKey: key }))} label="Fallback Route Key" />
          <div>
            <label className="block text-sm text-gray-400 mb-1">Payload JSON</label>
            <textarea value={form.payloadJson ?? ''} onChange={e => setForm(f => ({ ...f, payloadJson: e.target.value }))} rows={3}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm font-mono" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
            <h2 className="text-white font-semibold text-lg">Bölüm Bilgileri</h2>
            <div className="space-y-3">
              {[
                ['Tip', section.type],
                ['Alt Başlık', section.subtitle ?? '—'],
                ['Route Key', section.routeKey ?? '—'],
                ['Fallback Route', section.fallbackRouteKey ?? '—'],
                ['CTA Label', section.ctaLabel ?? '—'],
                ['Badge Label', section.badgeLabel ?? '—'],
                ['İkon', section.icon ?? '—'],
                ['Locale', section.locale],
                ['Sıralama', String(section.sortOrder)],
                ['Başlangıç', fmtDate(section.startDate)],
                ['Bitiş', fmtDate(section.endDate)],
                ['Yayın Tarihi', fmtDate(section.publishedAt)],
                ['Oluşturulma', fmtDate(section.createdAt)],
                ['Güncelleme', fmtDate(section.updatedAt)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm gap-4">
                  <span className="text-gray-400 shrink-0">{label}</span>
                  <span className="text-white text-right truncate">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-3">
              <h2 className="text-white font-semibold">Durum</h2>
              <span className={`text-lg font-bold ${statusColor}`}>{section.status}</span>
              <div className="text-sm text-gray-400">
                Aktif: <span className={section.isActive ? 'text-green-400' : 'text-gray-500'}>{section.isActive ? 'Evet' : 'Hayır'}</span>
              </div>
            </div>
            {section.imageUrl && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h2 className="text-white font-semibold mb-3">Görsel</h2>
                <img src={section.imageUrl} alt={section.title} className="w-full rounded-lg object-cover max-h-48" />
              </div>
            )}
            {section.payloadJson && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h2 className="text-white font-semibold mb-3">Payload JSON</h2>
                <pre className="text-xs text-gray-300 bg-gray-900 rounded p-3 overflow-auto max-h-48">{section.payloadJson}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
