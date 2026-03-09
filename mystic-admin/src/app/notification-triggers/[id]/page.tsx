'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import { notifTriggerApi } from '@/lib/api';
import type { NotificationTrigger } from '@/types';
import { formatDate, timeAgo } from '@/lib/utils';
import { ArrowLeft, Lock, Power, PowerOff, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';

const RUN_STATUS_CONFIG: Record<string, { color: string; label: string; Icon: React.ElementType }> = {
  SUCCESS: { color: 'text-green-400', label: 'Başarılı', Icon: CheckCircle },
  FAILED: { color: 'text-red-400', label: 'Başarısız', Icon: XCircle },
  SKIPPED: { color: 'text-yellow-400', label: 'Atlandı', Icon: AlertCircle },
  DISABLED: { color: 'text-gray-500', label: 'Devre Dışı', Icon: Clock },
};

function InfoRow({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500 uppercase font-semibold">{label}</span>
      <span className="text-sm text-gray-200">{String(value)}</span>
    </div>
  );
}

export default function TriggerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: trigger, isLoading, isError } = useQuery<NotificationTrigger>({
    queryKey: ['notif-trigger-detail', id],
    queryFn: () => notifTriggerApi.get(Number(id)).then(r => r.data),
    refetchInterval: 30_000,
  });

  const enableMut = useMutation({
    mutationFn: () => notifTriggerApi.enable(Number(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notif-trigger-detail', id] }),
  });
  const disableMut = useMutation({
    mutationFn: () => notifTriggerApi.disable(Number(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notif-trigger-detail', id] }),
  });

  const rs = trigger?.lastRunStatus ? RUN_STATUS_CONFIG[trigger.lastRunStatus] : null;

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => router.push('/notification-triggers')}
          className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Trigger Detayı</h1>
          <p className="text-gray-400 text-sm">{trigger?.triggerKey}</p>
        </div>
      </div>

      {isLoading && <div className="animate-pulse bg-gray-900 rounded-xl h-64" />}
      {isError && <p className="text-red-400">Trigger yüklenemedi.</p>}

      {trigger && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  {trigger.isSystemCritical && <Lock className="w-4 h-4 text-red-400" />}
                  {trigger.displayName}
                </h2>
                {trigger.isPausable && !trigger.isSystemCritical && (
                  <button
                    onClick={() => trigger.isActive ? disableMut.mutate() : enableMut.mutate()}
                    disabled={enableMut.isPending || disableMut.isPending}
                    className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors ${
                      trigger.isActive
                        ? 'bg-red-900/40 text-red-300 hover:bg-red-900/60'
                        : 'bg-green-900/40 text-green-300 hover:bg-green-900/60'
                    }`}>
                    {trigger.isActive
                      ? <><PowerOff className="w-4 h-4" /> Pasif Et</>
                      : <><Power className="w-4 h-4" /> Aktif Et</>}
                  </button>
                )}
              </div>

              <p className="text-gray-400 text-sm mb-6">{trigger.description ?? '—'}</p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <InfoRow label="Trigger Key" value={trigger.triggerKey} />
                <InfoRow label="Definition Key" value={trigger.definitionKey} />
                <InfoRow label="Owner Module" value={trigger.ownerModule} />
                <InfoRow label="Cron Expression" value={trigger.cronExpression} />
                <InfoRow label="Fixed Delay" value={trigger.fixedDelayMs ? `${trigger.fixedDelayMs / 1000}s` : undefined} />
                <InfoRow label="Timezone" value={trigger.timezone} />
                <InfoRow label="Oluşturulma" value={formatDate(trigger.createdAt)} />
                <InfoRow label="Son Güncelleme" value={formatDate(trigger.updatedAt)} />
              </div>
            </div>

            {/* Runtime Monitor */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase">Runtime Monitor</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Son Çalışma</p>
                  <p className="text-sm text-gray-200">{trigger.lastRunAt ? timeAgo(trigger.lastRunAt) : '—'}</p>
                  {trigger.lastRunAt && (
                    <p className="text-xs text-gray-600 mt-0.5">{formatDate(trigger.lastRunAt)}</p>
                  )}
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Son Durum</p>
                  {rs ? (
                    <p className={`text-sm font-semibold flex items-center justify-center gap-1 ${rs.color}`}>
                      <rs.Icon className="w-4 h-4" />
                      {rs.label}
                    </p>
                  ) : <p className="text-sm text-gray-600">—</p>}
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Son Üretim</p>
                  <p className="text-2xl font-bold text-white">
                    {trigger.lastProducedCount ?? '—'}
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Durum</p>
                  <p className={`text-sm font-semibold ${trigger.isActive ? 'text-green-400' : 'text-red-400'}`}>
                    {trigger.isActive ? 'Aktif' : 'Pasif'}
                  </p>
                </div>
              </div>

              {trigger.lastRunMessage && (
                <div className="mt-4 bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Son Mesaj</p>
                  <p className="text-xs text-gray-300 font-mono">{trigger.lastRunMessage}</p>
                </div>
              )}
            </div>

            {trigger.codeReference && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Kod Referansı</h3>
                <code className="text-xs text-green-400 bg-gray-800 px-3 py-2 rounded block">
                  {trigger.codeReference}
                </code>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase">Özellikler</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Cadence</span>
                  <span className="text-gray-200">{trigger.cadenceType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Kaynak</span>
                  <span className="text-gray-200">{trigger.sourceType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Duraklatılabilir</span>
                  <span className={trigger.isPausable ? 'text-green-400' : 'text-gray-500'}>
                    {trigger.isPausable ? 'Evet' : 'Hayır'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sistem Kritik</span>
                  <span className={trigger.isSystemCritical ? 'text-red-400' : 'text-gray-500'}>
                    {trigger.isSystemCritical ? 'Evet' : 'Hayır'}
                  </span>
                </div>
              </div>
            </div>

            {trigger.isSystemCritical && (
              <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-4">
                <p className="text-xs text-red-400 flex items-start gap-1.5">
                  <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  Bu trigger sistem kritik olarak işaretlenmiştir. Admin panelden devre dışı bırakılamaz.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
