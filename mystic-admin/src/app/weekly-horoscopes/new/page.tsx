'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useMutation } from '@tanstack/react-query';
import { weeklyHoroscopeApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ZODIAC_SIGNS, ZODIAC_EMOJIS } from '@/lib/utils';

export default function NewWeeklyHoroscopePage() {
  const toast = useToast();
  const router = useRouter();

  const [form, setForm] = useState({
    zodiacSign: 'ARIES',
    weekStartDate: '',
    weekEndDate: '',
    locale: 'tr',
    title: '',
    shortSummary: '',
    fullContent: '',
    love: '',
    career: '',
    money: '',
    health: '',
    social: '',
    luckyDay: '',
    cautionDay: '',
    luckyColor: '',
    luckyNumber: '',
  });

  const createMut = useMutation({
    mutationFn: () => weeklyHoroscopeApi.create({ ...form, sourceType: 'ADMIN_CREATED', status: 'DRAFT' }),
    onSuccess: (res) => {
      toast.success('Oluşturuldu.');
      router.push(`/weekly-horoscopes/${res.data.id}`);
    },
    onError: (e: unknown) =>
      toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Oluşturma başarısız.'),
  });

  const textArea = (key: keyof typeof form, label: string) => (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <textarea
        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm resize-none h-24"
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/weekly-horoscopes">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Yeni Haftalık Burç İçeriği</h1>
        <div className="ml-auto">
          <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
            <Save className="w-4 h-4 mr-1" /> Taslak Kaydet
          </Button>
        </div>
      </div>

      <div className="max-w-3xl space-y-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h3 className="text-white font-semibold">Temel Bilgiler</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Burç</label>
              <select className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                value={form.zodiacSign} onChange={(e) => setForm({ ...form, zodiacSign: e.target.value })}>
                {ZODIAC_SIGNS.map((s) => <option key={s} value={s}>{ZODIAC_EMOJIS[s]} {s}</option>)}
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
            <div>
              <label className="block text-xs text-gray-400 mb-1">Hafta Başlangıcı</label>
              <Input type="date" value={form.weekStartDate}
                onChange={(e) => setForm({ ...form, weekStartDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Hafta Bitişi</label>
              <Input type="date" value={form.weekEndDate}
                onChange={(e) => setForm({ ...form, weekEndDate: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Başlık</label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          {textArea('shortSummary', 'Kısa Özet')}
          {textArea('fullContent', 'Genel Yorum')}

          <div className="grid grid-cols-2 gap-3">
            {textArea('love', 'Aşk')}
            {textArea('career', 'Kariyer')}
            {textArea('money', 'Para')}
            {textArea('health', 'Sağlık')}
            {textArea('social', 'Sosyal')}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(['luckyDay', 'cautionDay', 'luckyColor', 'luckyNumber'] as const).map((key) => (
              <div key={key}>
                <label className="block text-xs text-gray-400 mb-1">
                  {key === 'luckyDay' ? 'Şanslı Gün' : key === 'cautionDay' ? 'Dikkat Günü' : key === 'luckyColor' ? 'Şanslı Renk' : 'Şanslı Sayı'}
                </label>
                <Input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
