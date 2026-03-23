'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { monetizationActionsApi } from '@/lib/api';
import { MonetizationAction, Page } from '@/types';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Plus, Eye, Trash2 } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export default function MonetizationActionsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(0);
  const [confirm, setConfirm] = useState<{ id: number; key: string } | null>(null);
  const PAGE_SIZE = 20;

  const { data, isLoading } = useQuery<Page<MonetizationAction>>({
    queryKey: ['monetization-actions', page],
    queryFn: () => monetizationActionsApi.list({ page, size: PAGE_SIZE }).then(r => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => monetizationActionsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['monetization-actions'] }); toast.success('Aksiyon silindi.'); setConfirm(null); },
    onError: () => toast.error('Silme başarısız.'),
  });

  const unlockColor = (type: string) => {
    switch (type) {
      case 'FREE': return 'bg-green-900 text-green-300';
      case 'AD_WATCH': return 'bg-blue-900 text-blue-300';
      case 'GURU_SPEND': return 'bg-purple-900 text-purple-300';
      case 'AD_OR_GURU': return 'bg-yellow-900 text-yellow-300';
      case 'PURCHASE_ONLY': return 'bg-red-900 text-red-300';
      default: return 'bg-gray-800 text-gray-500';
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Monetization Aksiyonları</h1>
          <p className="text-gray-400 text-sm mt-1">{data?.totalElements ?? 0} aksiyon</p>
        </div>
        <Link href="/monetization/actions/new">
          <Button><Plus className="w-4 h-4" /> Yeni Aksiyon</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-gray-900 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                <th className="text-left px-4 py-3">Aksiyon</th>
                <th className="text-left px-4 py-3">Modül</th>
                <th className="text-left px-4 py-3">Unlock Type</th>
                <th className="text-left px-4 py-3">Guru Cost</th>
                <th className="text-left px-4 py-3">Reward</th>
                <th className="text-left px-4 py-3">Enabled</th>
                <th className="text-left px-4 py-3">Güncellendi</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {data?.content?.map(a => (
                <tr key={a.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{a.displayName || a.actionKey}</p>
                    <p className="text-gray-500 text-xs font-mono">{a.actionKey}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono">{a.moduleKey}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs ${unlockColor(a.unlockType)}`}>{a.unlockType}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{a.guruCost}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{a.rewardAmount}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${a.isEnabled ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                      {a.isEnabled ? 'Evet' : 'Hayır'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(a.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/monetization/actions/${a.id}`}>
                        <Button variant="ghost" size="sm"><Eye className="w-3 h-3" /></Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => setConfirm({ id: a.id, key: a.actionKey })}>
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.content?.length && <p className="text-gray-500 text-sm text-center py-12">Aksiyon bulunamadı.</p>}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
          <span>Sayfa {page + 1} / {data.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Önceki</Button>
            <Button variant="secondary" size="sm" disabled={page >= data.totalPages - 1} onClick={() => setPage(p => p + 1)}>Sonraki</Button>
          </div>
        </div>
      )}

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Aksiyonu Sil">
        <p className="text-gray-300 text-sm mb-6"><span className="text-white font-mono">{confirm?.key}</span> aksiyonunu silmek istediğine emin misin?</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setConfirm(null)}>İptal</Button>
          <Button variant="danger" disabled={deleteMut.isPending} onClick={() => confirm && deleteMut.mutate(confirm.id)}>Sil</Button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
