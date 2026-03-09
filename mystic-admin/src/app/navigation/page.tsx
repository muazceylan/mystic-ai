'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { navigationApi } from '@/lib/api';
import { NavigationItem, Page } from '@/types';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Plus, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export default function NavigationPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(0);
  const [confirm, setConfirm] = useState<{ type: 'show' | 'hide'; id: number; key: string } | null>(null);

  const { data, isLoading } = useQuery<Page<NavigationItem>>({
    queryKey: ['navigation', page],
    queryFn: () => navigationApi.list({ page, size: 50 }).then(r => r.data),
  });

  const mutOpts = (msg: string) => ({
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['navigation'] }); toast.success(msg); setConfirm(null); },
    onError: () => toast.error('İşlem başarısız.'),
  });

  const showMut = useMutation({ mutationFn: (id: number) => navigationApi.show(id), ...mutOpts('Gösterildi.') });
  const hideMut = useMutation({ mutationFn: (id: number) => navigationApi.hide(id), ...mutOpts('Gizlendi.') });

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Navigation</h1>
          <p className="text-gray-400 text-sm mt-1">Tab bar ve navigation yönetimi</p>
        </div>
        <Link href="/navigation/new">
          <Button><Plus className="w-4 h-4" /> Yeni Item</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-gray-900 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                <th className="text-left px-4 py-3">Sıra</th>
                <th className="text-left px-4 py-3">Label / Key</th>
                <th className="text-left px-4 py-3">Route Key</th>
                <th className="text-left px-4 py-3">Platform</th>
                <th className="text-left px-4 py-3">Durum</th>
                <th className="text-left px-4 py-3">Premium</th>
                <th className="text-left px-4 py-3">Güncellendi</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {data?.content?.map(n => (
                <tr key={n.id} className={`hover:bg-gray-800/50 transition-colors ${!n.isVisible ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono">{n.sortOrder}</td>
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{n.label}</p>
                    <p className="text-gray-500 text-xs font-mono">{n.navKey}</p>
                  </td>
                  <td className="px-4 py-3 text-purple-300 font-mono text-xs">{n.routeKey}</td>
                  <td className="px-4 py-3"><Badge className="bg-gray-700 text-gray-300 text-xs">{n.platform}</Badge></td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${n.isVisible ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                      {n.isVisible ? 'Görünür' : 'Gizli'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{n.isPremium && <Badge className="bg-yellow-900 text-yellow-300 text-xs">Premium</Badge>}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(n.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/navigation/${n.id}`}>
                        <Button variant="ghost" size="sm"><Eye className="w-3 h-3" /></Button>
                      </Link>
                      {n.isVisible ? (
                        <Button variant="ghost" size="sm" onClick={() => setConfirm({ type: 'hide', id: n.id, key: n.navKey })}>
                          <EyeOff className="w-3 h-3 text-red-400" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setConfirm({ type: 'show', id: n.id, key: n.navKey })}>
                          <Eye className="w-3 h-3 text-green-400" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.content?.length && <p className="text-gray-500 text-sm text-center py-12">Navigation item bulunamadı.</p>}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
          <span>Sayfa {page + 1} / {data.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Önceki</Button>
            <Button variant="secondary" size="sm" disabled={page >= data.totalPages - 1} onClick={() => setPage(p => p + 1)}>Sonraki →</Button>
          </div>
        </div>
      )}

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={confirm?.type === 'hide' ? 'Tab\'ı Gizle' : 'Tab\'ı Göster'}>
        <p className="text-gray-300 text-sm mb-6"><span className="text-white font-mono">{confirm?.key}</span> için onaylıyor musun?</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setConfirm(null)}>İptal</Button>
          <Button
            variant={confirm?.type === 'hide' ? 'danger' : 'primary'}
            disabled={showMut.isPending || hideMut.isPending}
            onClick={() => { if (!confirm) return; confirm.type === 'show' ? showMut.mutate(confirm.id) : hideMut.mutate(confirm.id); }}
          >Onayla</Button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
