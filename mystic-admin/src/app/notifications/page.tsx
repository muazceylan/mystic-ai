'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifApi } from '@/lib/api';
import { AdminNotification, Page } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { TestSendModal } from '@/components/notifications/TestSendModal';
import { formatDate, statusColor } from '@/lib/utils';
import { Plus, Eye, Send, PowerOff, XCircle } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export default function NotificationsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);

  // Reset to page 0 when filter changes
  const handleStatusFilter = (value: string) => { setStatusFilter(value); setPage(0); };
  const [testModal, setTestModal] = useState<{ id: number; title: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ type: 'cancel' | 'deactivate'; id: number } | null>(null);

  const PAGE_SIZE = 20;
  const { data, isLoading } = useQuery<Page<AdminNotification>>({
    queryKey: ['admin-notifications', statusFilter, page],
    queryFn: () => notifApi.list({ status: statusFilter || undefined, page, size: PAGE_SIZE }).then((r) => r.data),
  });

  const testMut = useMutation({
    mutationFn: ({ id, userIds }: { id: number; userIds: number[] }) =>
      notifApi.testSend(id, userIds),
    onSuccess: (_, { userIds }) => {
      toast.success(`Test bildirimi ${userIds.length} kişiye gönderildi.`);
      setTestModal(null);
    },
    onError: () => toast.error('Test gönderimi başarısız.'),
  });

  const cancelMut = useMutation({
    mutationFn: (id: number) => notifApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
      toast.success('İptal edildi.');
      setConfirmModal(null);
    },
    onError: () => toast.error('İşlem başarısız.'),
  });

  const deactivateMut = useMutation({
    mutationFn: (id: number) => notifApi.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
      toast.success('Pasife alındı.');
      setConfirmModal(null);
    },
    onError: () => toast.error('İşlem başarısız.'),
  });

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-gray-400 text-sm mt-1">{data?.totalElements ?? 0} kayıt</p>
        </div>
        <Link href="/notifications/new">
          <Button><Plus className="w-4 h-4" /> Yeni Bildirim</Button>
        </Link>
      </div>

      <div className="flex gap-3 mb-4">
        <Select value={statusFilter} onChange={(e) => handleStatusFilter(e.target.value)} className="w-40">
          <option value="">Tüm Durumlar</option>
          <option value="DRAFT">DRAFT</option>
          <option value="SCHEDULED">SCHEDULED</option>
          <option value="SENT">SENT</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="FAILED">FAILED</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                <th className="text-left px-4 py-3">Başlık</th>
                <th className="text-left px-4 py-3">Kategori</th>
                <th className="text-left px-4 py-3">Kanal</th>
                <th className="text-left px-4 py-3">Hedef</th>
                <th className="text-left px-4 py-3">Route</th>
                <th className="text-left px-4 py-3">Durum</th>
                <th className="text-left px-4 py-3">Oluşturulma</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {data?.content?.map((n) => (
                <tr key={n.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium truncate max-w-[180px]">{n.title}</p>
                    <p className="text-gray-500 text-xs truncate max-w-[180px]">{n.body}</p>
                  </td>
                  <td className="px-4 py-3"><Badge className="bg-gray-700 text-gray-300">{n.category}</Badge></td>
                  <td className="px-4 py-3"><Badge className="bg-indigo-900 text-indigo-300">{n.deliveryChannel}</Badge></td>
                  <td className="px-4 py-3 text-xs text-gray-400">{n.targetAudience}</td>
                  <td className="px-4 py-3 font-mono text-xs text-purple-300">{n.routeKey ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(n.status)}`}>{n.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(n.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/notifications/${n.id}`}>
                        <Button variant="ghost" size="sm"><Eye className="w-3 h-3" /></Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => setTestModal({ id: n.id, title: n.title })}>
                        <Send className="w-3 h-3 text-green-400" />
                      </Button>
                      {n.status === 'SCHEDULED' && (
                        <Button variant="ghost" size="sm" onClick={() => setConfirmModal({ type: 'cancel', id: n.id })}>
                          <XCircle className="w-3 h-3 text-yellow-400" />
                        </Button>
                      )}
                      {n.active && (
                        <Button variant="ghost" size="sm" onClick={() => setConfirmModal({ type: 'deactivate', id: n.id })}>
                          <PowerOff className="w-3 h-3 text-red-400" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.content?.length && (
            <p className="text-gray-500 text-sm text-center py-12">Bildirim bulunamadı.</p>
          )}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
          <span>Sayfa {page + 1} / {data.totalPages} ({data.totalElements} kayıt)</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              ← Önceki
            </Button>
            <Button variant="secondary" size="sm" disabled={page >= data.totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Sonraki →
            </Button>
          </div>
        </div>
      )}

      {/* Test Send Modal */}
      <TestSendModal
        open={!!testModal}
        onClose={() => setTestModal(null)}
        notificationTitle={testModal?.title ?? ''}
        onSend={(userIds) => testMut.mutate({ id: testModal!.id, userIds })}
        isSending={testMut.isPending}
      />

      {/* Confirm Modal */}
      <Modal
        open={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title={confirmModal?.type === 'cancel' ? 'Bildirimi İptal Et' : 'Bildirimi Pasife Al'}
      >
        <p className="text-gray-300 text-sm mb-6">Bu işlemi onaylıyor musun?</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setConfirmModal(null)}>İptal</Button>
          <Button
            variant="danger"
            onClick={() => {
              if (!confirmModal) return;
              if (confirmModal.type === 'cancel') cancelMut.mutate(confirmModal.id);
              else deactivateMut.mutate(confirmModal.id);
            }}
            disabled={cancelMut.isPending || deactivateMut.isPending}
          >
            Onayla
          </Button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
