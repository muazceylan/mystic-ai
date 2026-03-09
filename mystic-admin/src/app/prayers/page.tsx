'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { prayerApi } from '@/lib/api';
import { PrayerContent, Page } from '@/types';
import { formatDate, statusColor } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useState } from 'react';
import Link from 'next/link';
import { Plus, Star } from 'lucide-react';

const CONTENT_TYPES = [
  { value: 'DUA',  label: '🤲 Dua' },
  { value: 'ESMA', label: '✨ Esmaül Hüsna' },
  { value: 'SURE', label: '📖 Sure' },
];

const CATEGORY_LABELS: Record<string, string> = {
  MORNING: 'Sabah', EVENING: 'Akşam / Gece', GRATITUDE: 'Şükür / Zikir',
  PROTECTION: 'Korunma', HEALING: 'Şifa', FORGIVENESS: 'Bağışlanma',
  GUIDANCE: 'Hidayet / Sure', ABUNDANCE: 'Bereket', GENERAL: 'Genel / Esma',
};

const CATEGORIES = Object.keys(CATEGORY_LABELS);

function contentTypeLabel(type: string) {
  return CONTENT_TYPES.find((c) => c.value === type)?.label ?? type;
}

export default function PrayersPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [contentType, setContentType] = useState('');
  const [category, setCategory] = useState('');
  const [locale, setLocale] = useState('tr');
  const [isFeatured, setIsFeatured] = useState('');
  const [page, setPage] = useState(0);

  const params: Record<string, unknown> = { page, size: 20, locale };
  if (status) params.status = status;
  if (contentType) params.contentType = contentType;
  if (category) params.category = category;
  if (isFeatured !== '') params.isFeatured = isFeatured === 'true';

  const { data, isLoading } = useQuery<Page<PrayerContent>>({
    queryKey: ['prayers', params],
    queryFn: () => prayerApi.list(params).then((r) => r.data),
  });

  const publishMut = useMutation({
    mutationFn: (id: number) => prayerApi.publish(id),
    onSuccess: () => {
      toast.success('Yayınlandı.');
      qc.invalidateQueries({ queryKey: ['prayers'] });
    },
    onError: () => toast.error('Yayınlama başarısız.'),
  });

  const featureMut = useMutation({
    mutationFn: ({ id, featured }: { id: number; featured: boolean }) =>
      prayerApi.setFeatured(id, featured),
    onSuccess: () => {
      toast.success('Güncellendi.');
      qc.invalidateQueries({ queryKey: ['prayers'] });
    },
    onError: () => toast.error('Güncelleme başarısız.'),
  });

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Dua İçerikleri</h1>
        <Link href="/prayers/new">
          <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Yeni Dua</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
          value={contentType} onChange={(e) => { setContentType(e.target.value); setCategory(''); setPage(0); }}>
          <option value="">Tüm Türler</option>
          {CONTENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
          value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
          <option value="">Tüm Durumlar</option>
          <option value="DRAFT">DRAFT</option>
          <option value="PUBLISHED">PUBLISHED</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
        <select className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
          value={category} onChange={(e) => { setCategory(e.target.value); setPage(0); }}>
          <option value="">Tüm Kategoriler</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
        <select className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
          value={locale} onChange={(e) => { setLocale(e.target.value); setPage(0); }}>
          <option value="tr">TR</option>
          <option value="en">EN</option>
        </select>
        <select className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
          value={isFeatured} onChange={(e) => { setIsFeatured(e.target.value); setPage(0); }}>
          <option value="">Tümü</option>
          <option value="true">Öne Çıkanlar</option>
          <option value="false">Normal</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
              <th className="px-4 py-3 text-left">Başlık</th>
              <th className="px-4 py-3 text-left">Tür</th>
              <th className="px-4 py-3 text-left">Kategori</th>
              <th className="px-4 py-3 text-left">Dil</th>
              <th className="px-4 py-3 text-left">Durum</th>
              <th className="px-4 py-3 text-left">Öne Çıkan</th>
              <th className="px-4 py-3 text-left">Tekrar</th>
              <th className="px-4 py-3 text-left"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">Yükleniyor...</td></tr>
            )}
            {data?.content.map((p) => (
              <tr key={p.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="px-4 py-3 text-white font-medium max-w-xs">
                  <div className="truncate">{p.arabicText && (
                    <span className="text-amber-300 mr-2 text-base font-arabic">{p.arabicText.split(' ').slice(0,3).join(' ')}…</span>
                  )}</div>
                  <div className="truncate">{p.title}</div>
                  {p.transliteration && (
                    <div className="text-xs text-gray-500 truncate italic">{p.transliteration}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge className={
                    p.contentType === 'ESMA' ? 'bg-purple-900/50 text-purple-300' :
                    p.contentType === 'SURE' ? 'bg-blue-900/50 text-blue-300' :
                    'bg-green-900/50 text-green-300'
                  }>{contentTypeLabel(p.contentType ?? 'DUA')}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge className="bg-gray-700 text-gray-300">{CATEGORY_LABELS[p.category] ?? p.category}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge className="bg-gray-700 text-gray-300">{p.locale.toUpperCase()}</Badge>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(p.status)}`}>{p.status}</span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => featureMut.mutate({ id: p.id, featured: !p.isFeatured })}
                    className={`transition-colors ${p.isFeatured ? 'text-amber-400' : 'text-gray-600 hover:text-gray-400'}`}>
                    <Star className="w-4 h-4" fill={p.isFeatured ? 'currentColor' : 'none'} />
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-400 text-sm">
                  {p.suggestedCount ? `${p.suggestedCount}×` : '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link href={`/prayers/${p.id}`}>
                      <Button variant="ghost" size="sm">Detay</Button>
                    </Link>
                    {p.status === 'DRAFT' && (
                      <Button size="sm" onClick={() => publishMut.mutate(p.id)}
                        disabled={publishMut.isPending}>Yayınla</Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && data?.content.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">Kayıt bulunamadı.</td></tr>
            )}
          </tbody>
        </table>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <span className="text-gray-500 text-sm">{data.totalElements} kayıt</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Önceki</Button>
              <span className="text-gray-400 text-sm px-2 py-1">{page + 1} / {data.totalPages}</span>
              <Button variant="secondary" size="sm" disabled={page >= data.totalPages - 1} onClick={() => setPage(page + 1)}>Sonraki</Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
