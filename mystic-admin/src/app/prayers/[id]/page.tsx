'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { prayerApi } from '@/lib/api';
import { PrayerContent } from '@/types';
import { formatDate, statusColor } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Save, Globe, Star, Languages } from 'lucide-react';
import Link from 'next/link';
import { useState, use, useEffect } from 'react';

const CATEGORIES = ['MORNING','EVENING','GRATITUDE','PROTECTION','HEALING','FORGIVENESS','GUIDANCE','ABUNDANCE','GENERAL'];

export default function PrayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();
  const qc = useQueryClient();

  const { data: p, isLoading } = useQuery<PrayerContent>({
    queryKey: ['prayer', id],
    queryFn: () => prayerApi.get(Number(id)).then((r) => r.data),
  });

  const [form, setForm] = useState({
    title: '',
    arabicText: '',
    transliteration: '',
    meaning: '',
    meaningEn: '',
    category: 'GENERAL',
    suggestedCount: '',
    tags: '',
    isPremium: false,
    isActive: true,
    audioUrl: '',
  });

  useEffect(() => {
    if (p) {
      setForm({
        title: p.title,
        arabicText: p.arabicText ?? '',
        transliteration: p.transliteration ?? '',
        meaning: p.meaning ?? '',
        meaningEn: p.meaningEn ?? '',
        category: p.category,
        suggestedCount: p.suggestedCount?.toString() ?? '',
        tags: p.tags ?? '',
        isPremium: p.isPremium,
        isActive: p.isActive,
        audioUrl: p.audioUrl ?? '',
      });
    }
  }, [p]);

  const updateMut = useMutation({
    mutationFn: () => prayerApi.update(Number(id), {
      ...form,
      suggestedCount: form.suggestedCount ? Number(form.suggestedCount) : null,
    }),
    onSuccess: () => {
      toast.success('Kaydedildi.');
      qc.invalidateQueries({ queryKey: ['prayer', id] });
    },
    onError: () => toast.error('Kayıt başarısız.'),
  });

  const publishMut = useMutation({
    mutationFn: () => prayerApi.publish(Number(id)),
    onSuccess: () => {
      toast.success('Yayınlandı.');
      qc.invalidateQueries({ queryKey: ['prayer', id] });
    },
    onError: () => toast.error('Yayınlama başarısız.'),
  });

  const archiveMut = useMutation({
    mutationFn: () => prayerApi.archive(Number(id)),
    onSuccess: () => {
      toast.success('Arşivlendi.');
      qc.invalidateQueries({ queryKey: ['prayer', id] });
    },
    onError: () => toast.error('Arşivleme başarısız.'),
  });

  const featureMut = useMutation({
    mutationFn: (featured: boolean) => prayerApi.setFeatured(Number(id), featured),
    onSuccess: () => {
      toast.success('Güncellendi.');
      qc.invalidateQueries({ queryKey: ['prayer', id] });
    },
    onError: () => toast.error('Güncelleme başarısız.'),
  });

  const textArea = (key: keyof typeof form, label: string) => (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <textarea
        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm resize-none h-24"
        value={form[key] as string}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/prayers">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Dua Detay</h1>
        {p && (
          <div className="ml-auto flex gap-2 flex-wrap">
            <button
              onClick={() => featureMut.mutate(!p.isFeatured)}
              className={`p-2 rounded-lg border transition-colors ${p.isFeatured ? 'border-amber-500 text-amber-400 bg-amber-900/20' : 'border-gray-700 text-gray-500 hover:text-gray-300'}`}
              title={p.isFeatured ? 'Öne çıkarmayı kaldır' : 'Öne çıkar'}>
              <Star className="w-4 h-4" fill={p.isFeatured ? 'currentColor' : 'none'} />
            </button>
            {p.status !== 'ARCHIVED' && (
              <>
                <Button variant="secondary" size="sm" onClick={() => updateMut.mutate()}
                  disabled={updateMut.isPending}>
                  <Save className="w-3 h-3" /> Kaydet
                </Button>
                {p.status === 'DRAFT' && (
                  <Button size="sm" onClick={() => publishMut.mutate()} disabled={publishMut.isPending}>
                    <Globe className="w-3 h-3" /> Yayınla
                  </Button>
                )}
              </>
            )}
            {p.status === 'PUBLISHED' && (
              <Button variant="secondary" size="sm"
                onClick={() => { if (confirm('Arşivlensin mi?')) archiveMut.mutate(); }}
                disabled={archiveMut.isPending}>
                Arşivle
              </Button>
            )}
          </div>
        )}
      </div>

      {isLoading && <div className="h-48 bg-gray-900 rounded-xl animate-pulse" />}

      {p && (
        <div className="max-w-3xl space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(p.status)}`}>{p.status}</span>
              <Badge className="bg-gray-700 text-gray-300">{p.category}</Badge>
              <Badge className="bg-gray-700 text-gray-300">{p.locale.toUpperCase()}</Badge>
              {p.isFeatured && <Badge className="bg-amber-900 text-amber-300">Öne Çıkan</Badge>}
              {p.isPremium && <Badge className="bg-purple-900 text-purple-300">Premium</Badge>}
              {!p.isActive && <Badge className="bg-red-900 text-red-300">Pasif</Badge>}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h3 className="text-white font-semibold">İçerik Düzenle</h3>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Başlık</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Kategori</label>
              <select className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {textArea('arabicText', 'Arapça Metin')}
            {textArea('transliteration', 'Transkripsiyon')}
            {textArea('meaning', 'Anlam / Türkçe Meal (TR)')}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Önerilen Tekrar</label>
                <Input type="number" value={form.suggestedCount}
                  onChange={(e) => setForm({ ...form, suggestedCount: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Etiketler (virgülle)</label>
                <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Ses URL</label>
              <Input value={form.audioUrl} onChange={(e) => setForm({ ...form, audioUrl: e.target.value })} />
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={form.isPremium}
                  onChange={(e) => setForm({ ...form, isPremium: e.target.checked })}
                  className="w-4 h-4 rounded" />
                Premium İçerik
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 rounded" />
                Aktif
              </label>
            </div>
          </div>

          {/* Localization Section */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-indigo-400" />
              <h3 className="text-white font-semibold">Lokalizasyon</h3>
              <span className="text-xs text-gray-500 ml-1">— İngilizce çeviri</span>
            </div>

            <div className="flex items-start gap-2 bg-indigo-950/40 border border-indigo-800/40 rounded-lg px-3 py-2 text-xs text-indigo-300">
              <Globe className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                Mobil uygulama dil ayarı İngilizce olduğunda aşağıdaki meal gösterilir.
                Boş bırakılırsa Türkçe meal kullanılır.
              </span>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">İngilizce Meal (EN)</label>
              <textarea
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm resize-none h-28 focus:border-indigo-500 focus:outline-none transition-colors"
                placeholder="Enter English meaning / translation..."
                value={form.meaningEn}
                onChange={(e) => setForm({ ...form, meaningEn: e.target.value })}
              />
              <p className="text-xs text-gray-600 mt-1">
                {form.meaningEn.length > 0
                  ? `${form.meaningEn.length} karakter`
                  : 'Henüz İngilizce çeviri girilmedi'}
              </p>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-gray-500 mb-0.5">Oluşturulma</p><p className="text-white">{formatDate(p.createdAt)}</p></div>
            <div><p className="text-gray-500 mb-0.5">Güncellenme</p><p className="text-white">{formatDate(p.updatedAt)}</p></div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
