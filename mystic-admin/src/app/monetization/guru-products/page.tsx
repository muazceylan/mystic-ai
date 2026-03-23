'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { guruProductsApi } from '@/lib/api';
import { GuruProductCatalog, Page } from '@/types';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Plus, Eye, Power, PowerOff } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export default function GuruProductsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(0);
  const [confirm, setConfirm] = useState<{ type: 'enable' | 'disable'; id: number; key: string } | null>(null);
  const PAGE_SIZE = 20;

  const { data, isLoading } = useQuery<Page<GuruProductCatalog>>({
    queryKey: ['guru-products', page],
    queryFn: () => guruProductsApi.list({ page, size: PAGE_SIZE }).then(r => r.data),
  });

  const mutOpts = (msg: string) => ({
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['guru-products'] }); toast.success(msg); setConfirm(null); },
    onError: () => toast.error('İşlem başarısız.'),
  });

  const enableMut = useMutation({ mutationFn: (id: number) => guruProductsApi.enable(id), ...mutOpts('Ürün aktif edildi.') });
  const disableMut = useMutation({ mutationFn: (id: number) => guruProductsApi.disable(id), ...mutOpts('Ürün pasife alındı.') });

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Guru Ürünleri</h1>
          <p className="text-gray-400 text-sm mt-1">{data?.totalElements ?? 0} ürün</p>
        </div>
        <Link href="/monetization/guru-products/new">
          <Button><Plus className="w-4 h-4" /> Yeni Ürün</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-gray-900 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                <th className="text-left px-4 py-3">Ürün</th>
                <th className="text-left px-4 py-3">Tip</th>
                <th className="text-left px-4 py-3">Guru</th>
                <th className="text-left px-4 py-3">Bonus</th>
                <th className="text-left px-4 py-3">Fiyat</th>
                <th className="text-left px-4 py-3">Enabled</th>
                <th className="text-left px-4 py-3">Güncellendi</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {data?.content?.map(p => (
                <tr key={p.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{p.title}</p>
                    <p className="text-gray-500 text-xs font-mono">{p.productKey}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className="bg-indigo-900 text-indigo-300 text-xs">{p.productType}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{p.guruAmount}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{p.bonusGuruAmount > 0 ? `+${p.bonusGuruAmount}` : '-'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{p.price ? `${p.price} ${p.currency}` : '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.isEnabled ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                      {p.isEnabled ? 'Evet' : 'Hayır'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(p.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/monetization/guru-products/${p.id}`}>
                        <Button variant="ghost" size="sm"><Eye className="w-3 h-3" /></Button>
                      </Link>
                      {p.isEnabled ? (
                        <Button variant="ghost" size="sm" onClick={() => setConfirm({ type: 'disable', id: p.id, key: p.productKey })}>
                          <PowerOff className="w-3 h-3 text-red-400" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setConfirm({ type: 'enable', id: p.id, key: p.productKey })}>
                          <Power className="w-3 h-3 text-green-400" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.content?.length && <p className="text-gray-500 text-sm text-center py-12">Ürün bulunamadı.</p>}
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

      <Modal open={!!confirm} onClose={() => setConfirm(null)}
        title={confirm?.type === 'enable' ? 'Ürünü Aktif Et' : 'Ürünü Pasife Al'}>
        <p className="text-gray-300 text-sm mb-6"><span className="text-white font-mono">{confirm?.key}</span> için onaylıyor musun?</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setConfirm(null)}>İptal</Button>
          <Button
            variant={confirm?.type === 'disable' ? 'danger' : 'primary'}
            disabled={enableMut.isPending || disableMut.isPending}
            onClick={() => {
              if (!confirm) return;
              if (confirm.type === 'enable') enableMut.mutate(confirm.id);
              else disableMut.mutate(confirm.id);
            }}
          >Onayla</Button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
