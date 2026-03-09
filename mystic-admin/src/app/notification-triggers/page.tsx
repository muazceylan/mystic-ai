'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import { notifTriggerApi } from '@/lib/api';
import type { NotificationTrigger, Page } from '@/types';
import { timeAgo, formatDate } from '@/lib/utils';
import { Power, PowerOff, ChevronRight, Lock, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

const RUN_STATUS_CONFIG: Record<string, { color: string; Icon: React.ElementType }> = {
  SUCCESS: { color: 'text-green-400', Icon: CheckCircle },
  FAILED: { color: 'text-red-400', Icon: XCircle },
  SKIPPED: { color: 'text-yellow-400', Icon: AlertCircle },
  DISABLED: { color: 'text-gray-500', Icon: Clock },
};

const CADENCE_COLOR: Record<string, string> = {
  HOURLY: 'bg-orange-900/40 text-orange-300',
  DAILY: 'bg-green-900/40 text-green-300',
  WEEKLY: 'bg-blue-900/40 text-blue-300',
  EVENT_DRIVEN: 'bg-yellow-900/40 text-yellow-300',
  MANUAL: 'bg-gray-800 text-gray-400',
};

export default function NotificationTriggersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [cadence, setCadence] = useState('');
  const [source, setSource] = useState('');
  const [runStatus, setRunStatus] = useState('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery<Page<NotificationTrigger>>({
    queryKey: ['notif-triggers', cadence, source, runStatus, isActive, page],
    queryFn: () => notifTriggerApi.list({
      ...(cadence && { cadenceType: cadence }),
      ...(source && { sourceType: source }),
      ...(runStatus && { lastRunStatus: runStatus }),
      ...(isActive !== '' && { isActive: isActive === 'true' }),
      page,
      size: 30,
    }).then(r => r.data),
    refetchInterval: 60_000,
  });

  const enableMut = useMutation({
    mutationFn: (id: number) => notifTriggerApi.enable(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notif-triggers'] }),
  });
  const disableMut = useMutation({
    mutationFn: (id: number) => notifTriggerApi.disable(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notif-triggers'] }),
  });

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Trigger Monitor</h1>
        <p className="text-gray-400 text-sm mt-1">
          Backend scheduler job'ları ve admin-zamanlanmış tetikleyiciler — son çalışma durumu, üretim sayısı ve kontrol
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={cadence} onChange={e => { setCadence(e.target.value); setPage(0); }}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2">
          <option value="">Tüm Cadence</option>
          {['HOURLY','DAILY','WEEKLY','EVENT_DRIVEN','MANUAL'].map(v =>
            <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={source} onChange={e => { setSource(e.target.value); setPage(0); }}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2">
          <option value="">Tüm Kaynak</option>
          <option value="STATIC_BACKEND">Static Backend</option>
          <option value="ADMIN_SCHEDULED">Admin Scheduled</option>
        </select>
        <select value={runStatus} onChange={e => { setRunStatus(e.target.value); setPage(0); }}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2">
          <option value="">Tüm Son Durum</option>
          {['SUCCESS','FAILED','SKIPPED','DISABLED'].map(v => <option key={v} value={v}>{v}</option>)}
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
              {['Trigger Key','Başlık','Cadence','Cron / Delay','Kaynak','Son Çalışma','Son Durum','Üretim','Aktif',''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-semibold uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {isLoading && Array.from({length: 8}).map((_, i) => (
              <tr key={i}><td colSpan={10} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td></tr>
            ))}
            {data?.content.map(trigger => {
              const rs = trigger.lastRunStatus ? RUN_STATUS_CONFIG[trigger.lastRunStatus] : null;
              const Icon = rs?.Icon ?? Clock;
              return (
                <tr key={trigger.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-purple-300">{trigger.triggerKey}</td>
                  <td className="px-4 py-3 text-white font-medium max-w-[180px]">
                    <div className="flex items-center gap-1.5">
                      {trigger.isSystemCritical && <Lock className="w-3 h-3 text-red-400 shrink-0" aria-label="Sistem Kritik" />}
                      <span className="truncate">{trigger.displayName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${CADENCE_COLOR[trigger.cadenceType] ?? 'bg-gray-800 text-gray-400'}`}>
                      {trigger.cadenceType}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">
                    {trigger.cronExpression ?? (trigger.fixedDelayMs ? `${trigger.fixedDelayMs / 1000}s delay` : '—')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${trigger.sourceType === 'STATIC_BACKEND' ? 'bg-gray-800 text-gray-300' : 'bg-purple-900/40 text-purple-300'}`}>
                      {trigger.sourceType === 'STATIC_BACKEND' ? 'Backend' : 'Admin'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {trigger.lastRunAt ? timeAgo(trigger.lastRunAt) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {rs ? (
                      <span className={`flex items-center gap-1 text-xs ${rs.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {trigger.lastRunStatus}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-600">Henüz çalışmadı</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-300">
                    {trigger.lastProducedCount !== undefined && trigger.lastProducedCount !== null
                      ? trigger.lastProducedCount
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${trigger.isActive ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
                      {trigger.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {trigger.isPausable && !trigger.isSystemCritical && (
                        trigger.isActive
                          ? <button onClick={() => disableMut.mutate(trigger.id)} title="Pasif et"
                              className="text-gray-500 hover:text-red-400 transition-colors">
                              <PowerOff className="w-4 h-4" />
                            </button>
                          : <button onClick={() => enableMut.mutate(trigger.id)} title="Aktif et"
                              className="text-gray-500 hover:text-green-400 transition-colors">
                              <Power className="w-4 h-4" />
                            </button>
                      )}
                      {trigger.isSystemCritical && <Lock className="w-3.5 h-3.5 text-gray-700" aria-label="Devre dışı bırakılamaz" />}
                      <button onClick={() => router.push(`/notification-triggers/${trigger.id}`)}
                        className="text-gray-500 hover:text-purple-400 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <span className="text-xs text-gray-500">{data.totalElements} trigger</span>
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
