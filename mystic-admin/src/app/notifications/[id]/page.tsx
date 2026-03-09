'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifApi } from '@/lib/api';
import { AdminNotification } from '@/types';
import { formatDate, statusColor } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TestSendModal } from '@/components/notifications/TestSendModal';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Edit2, Send, Calendar, XCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useState, use } from 'react';

export default function NotificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();
  const qc = useQueryClient();
  const [testModal, setTestModal] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');

  const { data: notif, isLoading } = useQuery<AdminNotification>({
    queryKey: ['admin-notification', id],
    queryFn: () => notifApi.get(Number(id)).then((r) => r.data),
  });

  const testMut = useMutation({
    mutationFn: (userIds: number[]) => notifApi.testSend(Number(id), userIds),
    onSuccess: (_, userIds) => {
      toast.success(`Test bildirimi ${userIds.length} kişiye gönderildi.`);
      setTestModal(false);
    },
    onError: () => toast.error('Gönderim başarısız.'),
  });

  const scheduleMut = useMutation({
    mutationFn: (scheduledAt: string) => notifApi.schedule(Number(id), scheduledAt),
    onSuccess: () => {
      toast.success('Bildirim planlandı.');
      setScheduleModal(false);
      qc.invalidateQueries({ queryKey: ['admin-notification', id] });
    },
    onError: (e: unknown) =>
      toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Planlama başarısız.'),
  });

  const cancelMut = useMutation({
    mutationFn: () => notifApi.cancel(Number(id)),
    onSuccess: () => {
      toast.success('Bildirim iptal edildi.');
      qc.invalidateQueries({ queryKey: ['admin-notification', id] });
    },
    onError: () => toast.error('İptal başarısız.'),
  });

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/notifications">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Bildirim Detay</h1>
        {notif && (
          <div className="ml-auto flex gap-2 flex-wrap">
            {(notif.status === 'DRAFT' || notif.status === 'SCHEDULED') && (
              <Button variant="secondary" size="sm" onClick={() => setScheduleModal(true)}>
                <Calendar className="w-3 h-3" /> Planla
              </Button>
            )}
            {notif.status === 'SCHEDULED' && (
              <Button variant="secondary" size="sm"
                onClick={() => { if (confirm('İptal edilsin mi?')) cancelMut.mutate(); }}
                disabled={cancelMut.isPending}>
                <XCircle className="w-3 h-3" /> İptal Et
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setTestModal(true)}>
              <Send className="w-3 h-3" /> Test Gönder
            </Button>
            <Link href={`/notifications/${id}/edit`}>
              <Button variant="secondary" size="sm"><Edit2 className="w-3 h-3" /> Düzenle</Button>
            </Link>
          </div>
        )}
      </div>

      {isLoading && <div className="h-48 bg-gray-900 rounded-xl animate-pulse" />}

      {notif && (
        <div className="max-w-2xl space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(notif.status)}`}>{notif.status}</span>
              <Badge className="bg-indigo-900 text-indigo-300">{notif.deliveryChannel}</Badge>
              <Badge className="bg-gray-700 text-gray-300">{notif.category}</Badge>
              <Badge className="bg-gray-700 text-gray-300">{notif.priority}</Badge>
            </div>

            <div>
              <p className="text-lg font-semibold text-white">{notif.title}</p>
              <p className="text-gray-400 text-sm mt-1">{notif.body}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm border-t border-gray-800 pt-4">
              <div><p className="text-gray-500 mb-0.5">Hedef Kitle</p><p className="text-white">{notif.targetAudience}</p></div>
              <div><p className="text-gray-500 mb-0.5">Route Key</p><p className="text-white font-mono">{notif.routeKey ?? '-'}</p></div>
              {notif.fallbackRouteKey && (
                <div><p className="text-gray-500 mb-0.5">Fallback Route</p><p className="text-white font-mono">{notif.fallbackRouteKey}</p></div>
              )}
              {notif.scheduledAt && (
                <div><p className="text-gray-500 mb-0.5">Planlanmış</p><p className="text-white">{formatDate(notif.scheduledAt)}</p></div>
              )}
              {notif.sentAt && (
                <div><p className="text-gray-500 mb-0.5">Gönderildi</p><p className="text-white">{formatDate(notif.sentAt)}</p></div>
              )}
              {notif.sentCount !== undefined && (
                <div><p className="text-gray-500 mb-0.5">Gönderim / Başarısız</p><p className="text-white">{notif.sentCount} / {notif.failedCount ?? 0}</p></div>
              )}
              {notif.notes && (
                <div className="col-span-2"><p className="text-gray-500 mb-0.5">Notlar</p><p className="text-white">{notif.notes}</p></div>
              )}
              <div><p className="text-gray-500 mb-0.5">Oluşturulma</p><p className="text-white">{formatDate(notif.createdAt)}</p></div>
              <div><p className="text-gray-500 mb-0.5">Güncellenme</p><p className="text-white">{formatDate(notif.updatedAt)}</p></div>
              {notif.failureReason && (
                <div className="col-span-2 p-3 bg-red-950 border border-red-800 rounded-lg flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-red-400 text-xs font-medium mb-0.5">Gönderim Hatası</p>
                    <p className="text-red-300 text-xs font-mono">{notif.failureReason}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {scheduleModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-white font-semibold">Bildirim Planla</h3>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Gönderim Tarihi & Saati</label>
              <Input
                type="datetime-local"
                value={scheduleAt}
                onChange={e => setScheduleAt(e.target.value)}
                min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setScheduleModal(false)}>İptal</Button>
              <Button
                disabled={!scheduleAt || scheduleMut.isPending}
                onClick={() => {
                  // Convert local datetime to ISO-8601 without timezone (backend expects LocalDateTime)
                  scheduleMut.mutate(scheduleAt.replace('T', 'T').substring(0, 19));
                }}>
                {scheduleMut.isPending ? 'Planlanıyor...' : 'Planla'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <TestSendModal
        open={testModal}
        onClose={() => setTestModal(false)}
        notificationTitle={notif?.title ?? ''}
        onSend={(userIds) => testMut.mutate(userIds)}
        isSending={testMut.isPending}
      />
    </AdminLayout>
  );
}
