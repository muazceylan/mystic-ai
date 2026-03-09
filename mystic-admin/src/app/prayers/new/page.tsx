'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useMutation } from '@tanstack/react-query';
import { prayerApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIES = ['MORNING','EVENING','GRATITUDE','PROTECTION','HEALING','FORGIVENESS','GUIDANCE','ABUNDANCE','GENERAL'];

export default function NewPrayerPage() {
  const toast = useToast();
  const router = useRouter();

  const [form, setForm] = useState({
    title: '',
    arabicText: '',
    transliteration: '',
    meaning: '',
    category: 'GENERAL',
    locale: 'tr',
    suggestedCount: '',
    tags: '',
    isFeatured: false,
    isPremium: false,
    audioUrl: '',
  });

  const createMut = useMutation({
    mutationFn: () => prayerApi.create({
      ...form,
      suggestedCount: form.suggestedCount ? Number(form.suggestedCount) : null,
      status: 'DRAFT',
    }),
    onSuccess: (res) => {
      toast.success('Dua oluşturuldu.');
      router.push(`/prayers/${res.data.id}`);
    },
    onError: (e: unknown) =>
      toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Oluşturma başarısız.'),
  });

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/prayers">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Yeni Dua</h1>
        <div className="ml-auto">
          <Button onClick={() => createMut.mutate()} disabled={createMut.isPending || !form.title}>
            <Save className="w-4 h-4 mr-1" /> Taslak Kaydet
          </Button>
        </div>
      </div>

      <div className="max-w-3xl space-y-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h3 className="text-white font-semibold">Temel Bilgiler</h3>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Başlık *</label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Dua başlığı..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Kategori</label>
              <select className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Dil</label>
              <select className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                value={form.locale} onChange={(e) => setForm({ ...form, locale: e.target.value })}>
                <option value="tr">TR</option>
                <option value="en">EN</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Arapça Metin</label>
            <textarea className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm resize-none h-24"
              value={form.arabicText} onChange={(e) => setForm({ ...form, arabicText: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Transkripsiyon</label>
            <textarea className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm resize-none h-24"
              value={form.transliteration} onChange={(e) => setForm({ ...form, transliteration: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Anlam / Türkçe Metin</label>
            <textarea className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm resize-none h-24"
              value={form.meaning} onChange={(e) => setForm({ ...form, meaning: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Önerilen Tekrar Sayısı</label>
              <Input type="number" value={form.suggestedCount}
                onChange={(e) => setForm({ ...form, suggestedCount: e.target.value })}
                placeholder="33, 99, 100..." />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Etiketler (virgülle)</label>
              <Input value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="sabah,şükür,koruma" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Ses URL (isteğe bağlı)</label>
            <Input value={form.audioUrl} onChange={(e) => setForm({ ...form, audioUrl: e.target.value })}
              placeholder="https://..." />
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={form.isFeatured}
                onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                className="w-4 h-4 rounded" />
              Öne Çıkan
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={form.isPremium}
                onChange={(e) => setForm({ ...form, isPremium: e.target.checked })}
                className="w-4 h-4 rounded" />
              Premium İçerik
            </label>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
