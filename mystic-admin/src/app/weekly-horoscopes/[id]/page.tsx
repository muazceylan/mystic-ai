'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { weeklyHoroscopeApi } from '@/lib/api';
import { WeeklyHoroscope } from '@/types';
import { formatDate, statusColor, ZODIAC_EMOJIS, ZODIAC_TR, sourceTypeLabel, sourceTypeColor } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Save, Globe } from 'lucide-react';
import Link from 'next/link';
import { useState, use, useEffect } from 'react';

export default function WeeklyHoroscopeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();
  const qc = useQueryClient();

  const { data: h, isLoading } = useQuery<WeeklyHoroscope>({
    queryKey: ['weekly-horoscope', id],
    queryFn: () => weeklyHoroscopeApi.get(Number(id)).then((r) => r.data),
  });

  const [form, setForm] = useState({
    title: '', shortSummary: '', fullContent: '',
    love: '', career: '', money: '', health: '', social: '',
    luckyDay: '', cautionDay: '', luckyColor: '', luckyNumber: '',
    isOverrideActive: false,
  });

  useEffect(() => {
    if (h) {
      setForm({
        title: h.title ?? '',
        shortSummary: h.shortSummary ?? '',
        fullContent: h.fullContent ?? '',
        love: h.love ?? '',
        career: h.career ?? '',
        money: h.money ?? '',
        health: h.health ?? '',
        social: h.social ?? '',
        luckyDay: h.luckyDay ?? '',
        cautionDay: h.cautionDay ?? '',
        luckyColor: h.luckyColor ?? '',
        luckyNumber: h.luckyNumber ?? '',
        isOverrideActive: h.isOverrideActive,
      });
    }
  }, [h]);

  const updateMut = useMutation({
    mutationFn: () => weeklyHoroscopeApi.update(Number(id), form),
    onSuccess: () => {
      toast.success('Kaydedildi.');
      qc.invalidateQueries({ queryKey: ['weekly-horoscope', id] });
    },
    onError: () => toast.error('Kayıt başarısız.'),
  });

  const publishMut = useMutation({
    mutationFn: () => weeklyHoroscopeApi.publish(Number(id)),
    onSuccess: () => {
      toast.success('Yayınlandı.');
      qc.invalidateQueries({ queryKey: ['weekly-horoscope', id] });
    },
    onError: (e: unknown) =>
      toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Yayınlama başarısız.'),
  });

  const archiveMut = useMutation({
    mutationFn: () => weeklyHoroscopeApi.archive(Number(id)),
    onSuccess: () => {
      toast.success('Arşivlendi.');
      qc.invalidateQueries({ queryKey: ['weekly-horoscope', id] });
    },
    onError: () => toast.error('Arşivleme başarısız.'),
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

  const inputField = (key: keyof typeof form, label: string) => (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <Input value={form[key] as string} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/weekly-horoscopes">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Haftalık Burç Detay</h1>
        {h && (
          <div className="ml-auto flex gap-2 flex-wrap">
            {h.status !== 'ARCHIVED' && (
              <>
                <Button variant="secondary" size="sm" onClick={() => updateMut.mutate()}
                  disabled={updateMut.isPending}>
                  <Save className="w-3 h-3" /> Kaydet
                </Button>
                {h.status === 'DRAFT' && (
                  <Button size="sm" onClick={() => publishMut.mutate()} disabled={publishMut.isPending}>
                    <Globe className="w-3 h-3" /> Yayınla
                  </Button>
                )}
              </>
            )}
            {h.status === 'PUBLISHED' && (
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

      {h && (
        <div className="max-w-3xl space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <span className="text-2xl">{ZODIAC_EMOJIS[h.zodiacSign]}</span>
              <span className="text-white font-semibold text-lg">{ZODIAC_TR[h.zodiacSign] ?? h.zodiacSign}</span>
              <Badge className="bg-gray-700 text-gray-300 text-xs">{h.weekStartDate} → {h.weekEndDate}</Badge>
              <Badge className="bg-indigo-900 text-indigo-300">{h.locale.toUpperCase()}</Badge>
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(h.status)}`}>{h.status}</span>
              <Badge className={`text-xs ${sourceTypeColor(h.sourceType)}`}>{sourceTypeLabel(h.sourceType)}</Badge>
            </div>
            {h.isOverrideActive && (
              <p className="text-amber-400 text-xs font-medium">⚠ Admin override aktif — bu içerik API yanıtını geçersiz kılar</p>
            )}
            {h.ingestError && (
              <div className="mt-2 bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">
                <p className="text-red-400 text-xs font-semibold mb-0.5">⚠ İngest Hatası</p>
                <p className="text-red-300 text-xs font-mono break-all">{h.ingestError}</p>
              </div>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h3 className="text-white font-semibold">İçerik Düzenle</h3>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="override" checked={form.isOverrideActive}
                onChange={(e) => setForm({ ...form, isOverrideActive: e.target.checked })}
                className="w-4 h-4 rounded" />
              <label htmlFor="override" className="text-sm text-gray-300">
                Admin Override — API yanıtı yerine bu içeriği kullan
              </label>
            </div>

            {inputField('title', 'Başlık')}
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
              {inputField('luckyDay', 'Şanslı Gün')}
              {inputField('cautionDay', 'Dikkat Günü')}
              {inputField('luckyColor', 'Şanslı Renk')}
              {inputField('luckyNumber', 'Şanslı Sayı')}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-gray-500 mb-0.5">Oluşturulma</p><p className="text-white">{formatDate(h.createdAt)}</p></div>
            <div><p className="text-gray-500 mb-0.5">Güncellenme</p><p className="text-white">{formatDate(h.updatedAt)}</p></div>
            {h.ingestedAt && (
              <div><p className="text-gray-500 mb-0.5">Son İngest</p><p className="text-white">{formatDate(h.ingestedAt)}</p></div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
