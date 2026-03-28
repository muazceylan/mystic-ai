'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, Archive, ToggleLeft, ToggleRight, Edit, X, Save } from 'lucide-react';
import { exploreCategoriesApi } from '@/lib/api';
import AdminLayout from '@/components/layout/AdminLayout';
import { useToast } from '@/components/ui/Toast';
import type { ExploreCategory } from '@/types';

export default function ExploreCategoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ['explore-category', id] });
    qc.invalidateQueries({ queryKey: ['explore-categories'] });
  };
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<ExploreCategory>>({});
  const [saveError, setSaveError] = useState('');

  const { data: cat, isLoading } = useQuery<ExploreCategory>({
    queryKey: ['explore-category', id],
    queryFn: () => exploreCategoriesApi.get(Number(id)).then(r => r.data),
  });

  useEffect(() => {
    if (cat) {
      setForm({
        categoryKey: cat.categoryKey,
        title: cat.title,
        subtitle: cat.subtitle ?? '',
        icon: cat.icon ?? '',
        sortOrder: cat.sortOrder,
        locale: cat.locale,
        startDate: cat.startDate ?? '',
        endDate: cat.endDate ?? '',
      });
    }
  }, [cat?.id]);

  const publishMut = useMutation({
    mutationFn: () => exploreCategoriesApi.publish(Number(id)),
    onSuccess: () => { inv(); toast.success('Yayınlandı.'); },
    onError: () => toast.error('Yayınlama başarısız.'),
  });
  const archiveMut = useMutation({
    mutationFn: () => exploreCategoriesApi.archive(Number(id)),
    onSuccess: () => { inv(); toast.success('Arşivlendi.'); },
    onError: () => toast.error('Arşivleme başarısız.'),
  });
  const toggleMut = useMutation({
    mutationFn: () => cat?.isActive ? exploreCategoriesApi.deactivate(Number(id)) : exploreCategoriesApi.activate(Number(id)),
    onSuccess: () => { inv(); toast.success(cat?.isActive ? 'Devre dışı bırakıldı.' : 'Etkinleştirildi.'); },
    onError: () => toast.error('İşlem başarısız.'),
  });
  const updateMut = useMutation({
    mutationFn: (data: Partial<ExploreCategory>) => exploreCategoriesApi.update(Number(id), data),
    onSuccess: () => { inv(); setIsEditing(false); setSaveError(''); toast.success('Kaydedildi.'); },
    onError: (e: any) => setSaveError(e.response?.data?.message ?? 'Kaydetme hatası'),
  });

  if (isLoading) return <AdminLayout><div className="text-gray-400 p-8">Yükleniyor...</div></AdminLayout>;
  if (!cat) return <AdminLayout><div className="text-red-400 p-8">Kategori bulunamadı.</div></AdminLayout>;

  const fmt = (d?: string) => d ? new Date(d).toLocaleString('tr-TR') : '—';

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4 flex-wrap">
          <button onClick={() => router.push('/explore-categories')} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white truncate">{cat.title}</h1>
            <p className="text-gray-400 text-sm font-mono">{cat.categoryKey}</p>
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
            {cat.status !== 'PUBLISHED' && <button onClick={() => publishMut.mutate()} disabled={publishMut.isPending} className="flex items-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm"><Send className="w-4 h-4" /> Yayınla</button>}
            {cat.status !== 'ARCHIVED' && <button onClick={() => archiveMut.mutate()} disabled={archiveMut.isPending} className="flex items-center gap-2 bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm"><Archive className="w-4 h-4" /> Arşivle</button>}
            <button onClick={() => toggleMut.mutate()} disabled={toggleMut.isPending} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm">
              {cat.isActive ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4" />}
              {cat.isActive ? 'Devre Dışı' : 'Etkinleştir'}
            </button>
          </div>
        </div>

        {saveError && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-3 text-sm">{saveError}</div>}

        {isEditing ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4 max-w-2xl">
            <h2 className="text-white font-semibold">Kategoriyi Düzenle</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Category Key *</label>
                <input value={form.categoryKey ?? ''} onChange={e => setForm(f => ({ ...f, categoryKey: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm font-mono" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Başlık *</label>
                <input value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Alt Başlık</label>
                <input value={form.subtitle ?? ''} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">İkon</label>
                <input value={form.icon ?? ''} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Sıralama</label>
                <input type="number" value={form.sortOrder ?? 0} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Locale</label>
                <select value={form.locale ?? 'tr'} onChange={e => setForm(f => ({ ...f, locale: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="tr">tr</option>
                  <option value="en">en</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Başlangıç Tarihi</label>
                <input type="datetime-local" value={form.startDate ?? ''} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Bitiş Tarihi</label>
                <input type="datetime-local" value={form.endDate ?? ''} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-xl">
            <h2 className="text-white font-semibold mb-4">Kategori Bilgileri</h2>
            <div className="space-y-3 text-sm">
              {[
                ['Durum', cat.status],
                ['Aktif', cat.isActive ? 'Evet' : 'Hayır'],
                ['Alt Başlık', cat.subtitle ?? '—'],
                ['İkon', cat.icon ?? '—'],
                ['Sıralama', String(cat.sortOrder)],
                ['Locale', cat.locale],
                ['Başlangıç', fmt(cat.startDate)],
                ['Bitiş', fmt(cat.endDate)],
                ['Yayın Tarihi', fmt(cat.publishedAt)],
                ['Oluşturulma', fmt(cat.createdAt)],
                ['Güncelleme', fmt(cat.updatedAt)],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between gap-4"><span className="text-gray-400">{l}</span><span className="text-white text-right">{v}</span></div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
