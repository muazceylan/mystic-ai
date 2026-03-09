'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dailyHoroscopeApi } from '@/lib/api';
import { DailyHoroscope, IngestStatus } from '@/types';
import { formatDate, statusColor, ZODIAC_SIGNS, ZODIAC_EMOJIS, ZODIAC_TR, sourceTypeLabel, sourceTypeColor } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Download, Clock, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { Page } from '@/types';

const LOCALES = ['tr', 'en'];

export default function DailyHoroscopesPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [sign, setSign] = useState('');
  const [status, setStatus] = useState('');
  const [locale, setLocale] = useState('tr');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);

  // Ingest modal state
  const [ingestSign, setIngestSign] = useState(ZODIAC_SIGNS[0]);
  const [ingestDate, setIngestDate] = useState(new Date().toISOString().split('T')[0]);
  const [ingestLocale, setIngestLocale] = useState('tr');
  const [ingestModal, setIngestModal] = useState(false);

  const params: Record<string, unknown> = { page, size: 20, locale };
  if (sign) params.zodiacSign = sign;
  if (status) params.status = status;
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;

  const { data, isLoading } = useQuery<Page<DailyHoroscope>>({
    queryKey: ['daily-horoscopes', params],
    queryFn: () => dailyHoroscopeApi.list(params).then((r) => r.data),
  });

  const { data: ingestStatus } = useQuery<IngestStatus>({
    queryKey: ['daily-horoscopes-ingest-status', locale],
    queryFn: () => dailyHoroscopeApi.ingestStatus(locale).then((r) => r.data),
  });

  const ingestMut = useMutation({
    mutationFn: () => dailyHoroscopeApi.ingest(ingestSign, ingestDate, ingestLocale),
    onSuccess: () => {
      toast.success('İngest tamamlandı.');
      setIngestModal(false);
      qc.invalidateQueries({ queryKey: ['daily-horoscopes'] });
    },
    onError: (e: unknown) =>
      toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'İngest başarısız.'),
  });

  const publishMut = useMutation({
    mutationFn: (id: number) => dailyHoroscopeApi.publish(id),
    onSuccess: () => {
      toast.success('Yayınlandı.');
      qc.invalidateQueries({ queryKey: ['daily-horoscopes'] });
    },
    onError: () => toast.error('Yayınlama başarısız.'),
  });

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Günlük Burç İçerikleri</h1>
        <Button onClick={() => setIngestModal(true)} size="sm">
          <Download className="w-4 h-4 mr-1" /> İngest Et
        </Button>
      </div>

      {/* Ingest Status Info Panel */}
      {ingestStatus && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-start gap-3">
            <Database className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Veri Kaynağı</p>
              <p className="text-sm text-white font-medium">{ingestStatus.apiSource}</p>
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-start gap-3">
            <Clock className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Sonraki Güncelleme</p>
              <p className="text-sm text-white font-medium">
                {new Date(ingestStatus.nextScheduledAt).toLocaleDateString('tr-TR', {
                  day: 'numeric', month: 'long',
                })}{' '}
                <span className="text-gray-400 font-normal">
                  {new Date(ingestStatus.nextScheduledAt).toLocaleTimeString('tr-TR', {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </p>
              <p className="text-xs text-gray-600">{ingestStatus.schedule}</p>
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Son Başarılı İngest</p>
              <p className="text-sm text-white font-medium">
                {ingestStatus.lastIngestDate ?? '—'}
              </p>
              {ingestStatus.lastIngestAt && (
                <p className="text-xs text-gray-600">
                  {new Date(ingestStatus.lastIngestAt).toLocaleTimeString('tr-TR', {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-start gap-3">
            <AlertCircle className={`w-4 h-4 mt-0.5 shrink-0 ${ingestStatus.failureCount > 0 ? 'text-red-400' : 'text-gray-600'}`} />
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Son İngest Sonucu</p>
              <p className="text-sm text-white font-medium">
                <span className="text-green-400">{ingestStatus.successCount} başarılı</span>
                {ingestStatus.failureCount > 0 && (
                  <span className="text-red-400 ml-2">{ingestStatus.failureCount} hata</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
          value={sign} onChange={(e) => { setSign(e.target.value); setPage(0); }}>
          <option value="">Tüm Burçlar</option>
          {ZODIAC_SIGNS.map((s) => (
            <option key={s} value={s}>{ZODIAC_EMOJIS[s]} {ZODIAC_TR[s]}</option>
          ))}
        </select>
        <select
          className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
          value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
          <option value="">Tüm Durumlar</option>
          <option value="DRAFT">DRAFT</option>
          <option value="PUBLISHED">PUBLISHED</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
        <select
          className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
          value={locale} onChange={(e) => { setLocale(e.target.value); setPage(0); }}>
          {LOCALES.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
          className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm" />
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
          className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm" />
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
              <th className="px-4 py-3 text-left">Burç</th>
              <th className="px-4 py-3 text-left">Tarih</th>
              <th className="px-4 py-3 text-left">Dil</th>
              <th className="px-4 py-3 text-left">Durum</th>
              <th className="px-4 py-3 text-left">Kaynak</th>
              <th className="px-4 py-3 text-left">Override</th>
              <th className="px-4 py-3 text-left">Güncellendi</th>
              <th className="px-4 py-3 text-left"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Yükleniyor...</td></tr>
            )}
            {data?.content.map((h) => (
              <tr key={h.id} className={`border-b border-gray-800 hover:bg-gray-800/50 ${h.ingestError ? 'bg-red-950/20' : ''}`}>
                <td className="px-4 py-3 text-white font-medium">
                  {ZODIAC_EMOJIS[h.zodiacSign]} {ZODIAC_TR[h.zodiacSign]}
                  {h.ingestError && <span className="ml-2 text-xs text-red-400 font-normal">⚠ Hata</span>}
                </td>
                <td className="px-4 py-3 text-gray-300">{h.date}</td>
                <td className="px-4 py-3">
                  <Badge className="bg-gray-700 text-gray-300">{h.locale.toUpperCase()}</Badge>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(h.status)}`}>{h.status}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge className={`text-xs ${sourceTypeColor(h.sourceType)}`}>{sourceTypeLabel(h.sourceType)}</Badge>
                </td>
                <td className="px-4 py-3">
                  {h.isOverrideActive
                    ? <span className="text-amber-400 text-xs font-medium">Override Aktif</span>
                    : <span className="text-gray-600 text-xs">-</span>}
                </td>
                <td className="px-4 py-3 text-gray-400">{formatDate(h.updatedAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link href={`/daily-horoscopes/${h.id}`}>
                      <Button variant="ghost" size="sm">Detay</Button>
                    </Link>
                    {h.status === 'DRAFT' && (
                      <Button size="sm" onClick={() => publishMut.mutate(h.id)}
                        disabled={publishMut.isPending}>Yayınla</Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && data?.content.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Kayıt bulunamadı.</td></tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
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

      {/* Ingest Modal */}
      {ingestModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-white font-semibold">Astroloji Servisinden İçerik Çek</h3>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Burç</label>
              <select className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                value={ingestSign} onChange={(e) => setIngestSign(e.target.value as typeof ingestSign)}>
                {ZODIAC_SIGNS.map((s) => <option key={s} value={s}>{ZODIAC_EMOJIS[s]} {ZODIAC_TR[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Tarih</label>
              <input type="date" value={ingestDate} onChange={(e) => setIngestDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Dil</label>
              <select className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                value={ingestLocale} onChange={(e) => setIngestLocale(e.target.value)}>
                {LOCALES.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setIngestModal(false)}>İptal</Button>
              <Button disabled={ingestMut.isPending} onClick={() => ingestMut.mutate()}>
                {ingestMut.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'İngest Et'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
