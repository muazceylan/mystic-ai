'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import { notifCatalogApi } from '@/lib/api';
import type { NotificationDefinition, Page } from '@/types';
import { formatDate } from '@/lib/utils';
import { Search, Power, PowerOff, ChevronRight, Lock } from 'lucide-react';

const CHANNEL_COLOR: Record<string, string> = {
  PUSH: 'bg-blue-900/40 text-blue-300',
  IN_APP: 'bg-teal-900/40 text-teal-300',
  BOTH: 'bg-purple-900/40 text-purple-300',
};
const CADENCE_COLOR: Record<string, string> = {
  HOURLY: 'bg-orange-900/40 text-orange-300',
  DAILY: 'bg-green-900/40 text-green-300',
  WEEKLY: 'bg-blue-900/40 text-blue-300',
  EVENT_DRIVEN: 'bg-yellow-900/40 text-yellow-300',
  MANUAL: 'bg-gray-800 text-gray-400',
  SCHEDULED: 'bg-indigo-900/40 text-indigo-300',
};
const SOURCE_COLOR: Record<string, string> = {
  STATIC_BACKEND: 'bg-gray-800 text-gray-300',
  ADMIN_PANEL: 'bg-purple-900/40 text-purple-300',
  HYBRID: 'bg-amber-900/40 text-amber-300',
};

export default function NotificationCatalogPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [cadenceType, setCadenceType] = useState('');
  const [channelType, setChannelType] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery<Page<NotificationDefinition>>({
    queryKey: ['notif-catalog', cadenceType, channelType, sourceType, isActive, page],
    queryFn: () => notifCatalogApi.list({
      ...(cadenceType && { cadenceType }),
      ...(channelType && { channelType }),
      ...(sourceType && { sourceType }),
      ...(isActive !== '' && { isActive: isActive === 'true' }),
      page,
      size: 30,
    }).then(r => r.data),
  });

  const activateMut = useMutation({
    mutationFn: (id: number) => notifCatalogApi.activate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notif-catalog'] }),
  });
  const deactivateMut = useMutation({
    mutationFn: (id: number) => notifCatalogApi.deactivate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notif-catalog'] }),
  });

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Notification Catalog</h1>
        <p className="text-gray-400 text-sm mt-1">
          Sistemdeki tüm bildirim tipleri — statik backend tanımları ve admin panel tanımları
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={cadenceType} onChange={e => { setCadenceType(e.target.value); setPage(0); }}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2">
          <option value="">Tüm Cadence</option>
          {['HOURLY','DAILY','WEEKLY','EVENT_DRIVEN','MANUAL','SCHEDULED'].map(v =>
            <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={channelType} onChange={e => { setChannelType(e.target.value); setPage(0); }}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2">
          <option value="">Tüm Kanal</option>
          {['PUSH','IN_APP','BOTH'].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={sourceType} onChange={e => { setSourceType(e.target.value); setPage(0); }}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2">
          <option value="">Tüm Kaynak</option>
          {['STATIC_BACKEND','ADMIN_PANEL','HYBRID'].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={isActive} onChange={e => { setIsActive(e.target.value); setPage(0); }}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2">
          <option value="">Tüm Durum</option>
          <option value="true">Aktif</option>
          <option value="false">Pasif</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-800/50">
            <tr>
              {['Definition Key','Display Name','Channel','Cadence','Source','Trigger','Module','Durum',''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-semibold uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {isLoading && Array.from({length: 8}).map((_, i) => (
              <tr key={i}><td colSpan={9} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td></tr>
            ))}
            {data?.content.map(def => (
              <tr key={def.id} className="hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-purple-300">{def.definitionKey}</td>
                <td className="px-4 py-3 text-white font-medium max-w-[200px]">
                  <div className="flex items-center gap-1.5">
                    {def.isSystemCritical && <Lock className="w-3 h-3 text-red-400 shrink-0" aria-label="Sistem Kritik" />}
                    <span className="truncate">{def.displayName}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${CHANNEL_COLOR[def.channelType] ?? 'bg-gray-800 text-gray-400'}`}>
                    {def.channelType}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${CADENCE_COLOR[def.cadenceType] ?? 'bg-gray-800 text-gray-400'}`}>
                    {def.cadenceType}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${SOURCE_COLOR[def.sourceType] ?? 'bg-gray-800 text-gray-400'}`}>
                    {def.sourceType}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">{def.triggerType}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{def.ownerModule ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${def.isActive ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
                    {def.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {!def.isSystemCritical && (
                      def.isActive
                        ? <button onClick={() => deactivateMut.mutate(def.id)} title="Pasif et"
                            className="text-gray-500 hover:text-red-400 transition-colors">
                            <PowerOff className="w-4 h-4" />
                          </button>
                        : <button onClick={() => activateMut.mutate(def.id)} title="Aktif et"
                            className="text-gray-500 hover:text-green-400 transition-colors">
                            <Power className="w-4 h-4" />
                          </button>
                    )}
                    <button onClick={() => router.push(`/notification-catalog/${def.id}`)}
                      className="text-gray-500 hover:text-purple-400 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <span className="text-xs text-gray-500">{data.totalElements} tanım</span>
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
    </AdminLayout>
  );
}
