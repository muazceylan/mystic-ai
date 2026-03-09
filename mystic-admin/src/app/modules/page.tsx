'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modulesApi } from '@/lib/api';
import { AppModule, Page } from '@/types';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { Plus, Eye, Power, PowerOff, Wrench } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export default function ModulesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(0);
  const [activeFilter, setActiveFilter] = useState('');
  const [maintenanceFilter, setMaintenanceFilter] = useState('');
  const [confirm, setConfirm] = useState<{ type: 'activate' | 'deactivate' | 'maintenance-on' | 'maintenance-off'; id: number; key: string } | null>(null);

  const PAGE_SIZE = 20;
  const { data, isLoading } = useQuery<Page<AppModule>>({
    queryKey: ['modules', activeFilter, maintenanceFilter, page],
    queryFn: () => modulesApi.list({
      active: activeFilter !== '' ? activeFilter === 'true' : undefined,
      maintenance: maintenanceFilter !== '' ? maintenanceFilter === 'true' : undefined,
      page, size: PAGE_SIZE,
    }).then(r => r.data),
  });

  const mutOpts = (msg: string) => ({
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['modules'] }); toast.success(msg); setConfirm(null); },
    onError: () => toast.error('İşlem başarısız.'),
  });

  const activateMut = useMutation({ mutationFn: (id: number) => modulesApi.activate(id), ...mutOpts('Aktif edildi.') });
  const deactivateMut = useMutation({ mutationFn: (id: number) => modulesApi.deactivate(id), ...mutOpts('Pasife alındı.') });
  const mainOnMut = useMutation({ mutationFn: (id: number) => modulesApi.maintenanceOn(id), ...mutOpts('Bakım modu açıldı.') });
  const mainOffMut = useMutation({ mutationFn: (id: number) => modulesApi.maintenanceOff(id), ...mutOpts('Bakım modu kapatıldı.') });

  const handleFilter = (setter: (v: string) => void) => (v: string) => { setter(v); setPage(0); };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Modules</h1>
          <p className="text-gray-400 text-sm mt-1">{data?.totalElements ?? 0} modül</p>
        </div>
        <Link href="/modules/new">
          <Button><Plus className="w-4 h-4" /> Yeni Modül</Button>
        </Link>
      </div>

      <div className="flex gap-3 mb-4">
        <Select value={activeFilter} onChange={e => handleFilter(setActiveFilter)(e.target.value)} className="w-36">
          <option value="">Tüm Durum</option>
          <option value="true">Aktif</option>
          <option value="false">Pasif</option>
        </Select>
        <Select value={maintenanceFilter} onChange={e => handleFilter(setMaintenanceFilter)(e.target.value)} className="w-44">
          <option value="">Tüm Bakım</option>
          <option value="true">Bakım Modunda</option>
          <option value="false">Normal</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-gray-900 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                <th className="text-left px-4 py-3">Modül</th>
                <th className="text-left px-4 py-3">Durum</th>
                <th className="text-left px-4 py-3">Görünürlük</th>
                <th className="text-left px-4 py-3">Premium</th>
                <th className="text-left px-4 py-3">Sıra</th>
                <th className="text-left px-4 py-3">Bakım</th>
                <th className="text-left px-4 py-3">Güncellendi</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {data?.content?.map(m => (
                <tr key={m.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{m.displayName}</p>
                    <p className="text-gray-500 text-xs font-mono">{m.moduleKey}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.isActive ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                      {m.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {m.showOnHome && <Badge className="bg-blue-900 text-blue-300 text-xs">Home</Badge>}
                      {m.showOnExplore && <Badge className="bg-indigo-900 text-indigo-300 text-xs">Explore</Badge>}
                      {m.showInTabBar && <Badge className="bg-purple-900 text-purple-300 text-xs">Tab</Badge>}
                      {m.hiddenButDeepLinkable && <Badge className="bg-gray-700 text-gray-400 text-xs">DL Only</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {m.isPremium && <Badge className="bg-yellow-900 text-yellow-300 text-xs">Premium</Badge>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{m.sortOrder}</td>
                  <td className="px-4 py-3">
                    {m.maintenanceMode && <Badge className="bg-orange-900 text-orange-300 text-xs">Bakım</Badge>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(m.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/modules/${m.id}`}>
                        <Button variant="ghost" size="sm"><Eye className="w-3 h-3" /></Button>
                      </Link>
                      {m.isActive ? (
                        <Button variant="ghost" size="sm" onClick={() => setConfirm({ type: 'deactivate', id: m.id, key: m.moduleKey })}>
                          <PowerOff className="w-3 h-3 text-red-400" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setConfirm({ type: 'activate', id: m.id, key: m.moduleKey })}>
                          <Power className="w-3 h-3 text-green-400" />
                        </Button>
                      )}
                      {m.maintenanceMode ? (
                        <Button variant="ghost" size="sm" onClick={() => setConfirm({ type: 'maintenance-off', id: m.id, key: m.moduleKey })}>
                          <Wrench className="w-3 h-3 text-gray-400" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setConfirm({ type: 'maintenance-on', id: m.id, key: m.moduleKey })}>
                          <Wrench className="w-3 h-3 text-orange-400" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.content?.length && <p className="text-gray-500 text-sm text-center py-12">Modül bulunamadı.</p>}
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

      <Modal open={!!confirm} onClose={() => setConfirm(null)}
        title={confirm?.type === 'maintenance-on' ? 'Bakım Modunu Aç' : confirm?.type === 'maintenance-off' ? 'Bakım Modunu Kapat' : confirm?.type === 'activate' ? 'Aktif Et' : 'Pasife Al'}>
        <p className="text-gray-300 text-sm mb-6"><span className="text-white font-mono">{confirm?.key}</span> için onaylıyor musun?</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setConfirm(null)}>İptal</Button>
          <Button
            variant={confirm?.type === 'deactivate' || confirm?.type === 'maintenance-on' ? 'danger' : 'primary'}
            disabled={activateMut.isPending || deactivateMut.isPending || mainOnMut.isPending || mainOffMut.isPending}
            onClick={() => {
              if (!confirm) return;
              if (confirm.type === 'activate') activateMut.mutate(confirm.id);
              else if (confirm.type === 'deactivate') deactivateMut.mutate(confirm.id);
              else if (confirm.type === 'maintenance-on') mainOnMut.mutate(confirm.id);
              else mainOffMut.mutate(confirm.id);
            }}
          >Onayla</Button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
