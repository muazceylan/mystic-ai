'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import { notifHistoryApi } from '@/lib/api';
import type { AdminNotification, Page } from '@/types';
import { formatDate, timeAgo, statusColor } from '@/lib/utils';
import { Bell, Users, CheckCircle, XCircle } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Taslak',
  SCHEDULED: 'Planlanmış',
  SENT: 'Gönderildi',
  CANCELLED: 'İptal',
  FAILED: 'Başarısız',
};

const CHANNEL_COLOR: Record<string, string> = {
  PUSH: 'bg-blue-900/40 text-blue-300',
  IN_APP: 'bg-teal-900/40 text-teal-300',
  BOTH: 'bg-purple-900/40 text-purple-300',
};

const AUDIENCE_COLOR: Record<string, string> = {
  ALL_USERS: 'bg-indigo-900/40 text-indigo-300',
  TEST_USERS: 'bg-yellow-900/40 text-yellow-300',
  PREMIUM_USERS: 'bg-amber-900/40 text-amber-300',
};

export default function NotificationHistoryPage() {
  const [status, setStatus] = useState('');
  const [channel, setChannel] = useState('');
  const [audience, setAudience] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AdminNotification | null>(null);

  const { data, isLoading } = useQuery<Page<AdminNotification>>({
    queryKey: ['notif-history', status, channel, audience, page],
    queryFn: () => notifHistoryApi.list({
      ...(status && { status }),
      ...(channel && { deliveryChannel: channel }),
      ...(audience && { targetAudience: audience }),
      page,
      size: 30,
    }).then(r => r.data),
    refetchInterval: 30_000,
  });

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Delivery History</h1>
        <p className="text-gray-400 text-sm mt-1">
          Admin panelden oluşturulan bildirimlerin gönderim geçmişi
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2">
          <option value="">Tüm Durum</option>
          {['DRAFT','SCHEDULED','SENT','CANCELLED','FAILED'].map(v =>
            <option key={v} value={v}>{STATUS_LABELS[v] ?? v}</option>)}
        </select>
        <select value={channel} onChange={e => { setChannel(e.target.value); setPage(0); }}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2">
          <option value="">Tüm Kanal</option>
          {['PUSH','IN_APP','BOTH'].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={audience} onChange={e => { setAudience(e.target.value); setPage(0); }}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2">
          <option value="">Tüm Hedef</option>
          {['ALL_USERS','TEST_USERS','PREMIUM_USERS'].map(v =>
            <option key={v} value={v}>{v.replace('_', ' ')}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* List */}
        <div className={`${selected ? 'lg:col-span-2' : 'lg:col-span-3'} bg-gray-900 border border-gray-800 rounded-xl overflow-hidden`}>
          <table className="w-full text-sm">
            <thead className="bg-gray-800/50">
              <tr>
                {['Başlık','Hedef','Kanal','Durum','Gönderildi / Başarısız','Tarih',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-semibold uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading && Array.from({length: 8}).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td></tr>
              ))}
              {data?.content.map(notif => (
                <tr key={notif.id}
                  onClick={() => setSelected(notif === selected ? null : notif)}
                  className={`cursor-pointer hover:bg-gray-800/30 transition-colors ${selected?.id === notif.id ? 'bg-purple-900/10' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="text-white font-medium truncate max-w-[200px]">{notif.title}</p>
                    <p className="text-xs text-gray-500 truncate">{notif.body?.substring(0, 60)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${AUDIENCE_COLOR[notif.targetAudience] ?? 'bg-gray-800 text-gray-400'}`}>
                      {notif.targetAudience.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${CHANNEL_COLOR[notif.deliveryChannel] ?? 'bg-gray-800 text-gray-400'}`}>
                      {notif.deliveryChannel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(notif.status)}`}>
                      {STATUS_LABELS[notif.status] ?? notif.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {notif.status === 'SENT' ? (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-green-400 flex items-center gap-0.5">
                          <CheckCircle className="w-3 h-3" /> {notif.sentCount ?? 0}
                        </span>
                        {(notif.failedCount ?? 0) > 0 && (
                          <span className="text-red-400 flex items-center gap-0.5">
                            <XCircle className="w-3 h-3" /> {notif.failedCount}
                          </span>
                        )}
                      </div>
                    ) : <span className="text-xs text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {timeAgo(notif.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    <Bell className="w-3.5 h-3.5" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
              <span className="text-xs text-gray-500">{data.totalElements} kayıt</span>
              <div className="flex gap-2">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                  className="text-xs px-3 py-1 rounded bg-gray-800 text-gray-300 disabled:opacity-40">Önceki</button>
                <span className="text-xs text-gray-500 self-center">{page + 1} / {data.totalPages}</span>
                <button disabled={page >= data.totalPages - 1} onClick={() => setPage(p => p + 1)}
                  className="text-xs px-3 py-1 rounded bg-gray-800 text-gray-300 disabled:opacity-40">Sonraki</button>
              </div>
            </div>
          )}
        </div>

        {/* Detail drawer */}
        {selected && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Detay</h3>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white text-lg">×</button>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Başlık</p>
              <p className="text-sm text-white">{selected.title}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Mesaj</p>
              <p className="text-sm text-gray-300">{selected.body}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Durum</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(selected.status)}`}>
                  {STATUS_LABELS[selected.status]}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Kanal</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${CHANNEL_COLOR[selected.deliveryChannel] ?? 'bg-gray-800 text-gray-400'}`}>
                  {selected.deliveryChannel}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Hedef Kitle</p>
                <p className="text-gray-200">{selected.targetAudience}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Kategori</p>
                <p className="text-gray-200">{selected.category ?? '—'}</p>
              </div>
              {selected.routeKey && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Route Key</p>
                  <p className="text-gray-200 font-mono text-xs">{selected.routeKey}</p>
                </div>
              )}
              {selected.scheduledAt && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Planlanan Gönderim</p>
                  <p className="text-gray-200">{formatDate(selected.scheduledAt)}</p>
                </div>
              )}
              {selected.sentAt && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Gönderildi</p>
                  <p className="text-gray-200">{formatDate(selected.sentAt)}</p>
                </div>
              )}
              {selected.sentCount !== undefined && (
                <div>
                  <p className="text-xs text-gray-500">Başarılı</p>
                  <p className="text-green-400 font-bold">{selected.sentCount}</p>
                </div>
              )}
              {selected.failedCount !== undefined && (
                <div>
                  <p className="text-xs text-gray-500">Başarısız</p>
                  <p className="text-red-400 font-bold">{selected.failedCount}</p>
                </div>
              )}
              {selected.failureReason && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Hata</p>
                  <p className="text-red-400 text-xs font-mono">{selected.failureReason}</p>
                </div>
              )}
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Oluşturulma</p>
                <p className="text-gray-400 text-xs">{formatDate(selected.createdAt)}</p>
              </div>
              {selected.notes && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Notlar</p>
                  <p className="text-gray-400 text-xs">{selected.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
