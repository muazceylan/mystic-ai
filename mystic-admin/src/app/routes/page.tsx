'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { routesApi, routeSyncApi } from '@/lib/api';
import { AppRoute, RouteSyncResult } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { formatDate } from '@/lib/utils';
import { Plus, Eye, Edit2, PowerOff, AlertTriangle, Lock, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

type SyncFilter = '' | 'stale' | 'discovered';

export default function RoutesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(0);
  const [syncFilter, setSyncFilter] = useState<SyncFilter>('');
  const [confirmModal, setConfirmModal] = useState<{ type: 'deactivate' | 'deprecate'; id: number } | null>(null);
  const [syncResultModal, setSyncResultModal] = useState<RouteSyncResult | null>(null);
  const [applyConfirm, setApplyConfirm] = useState(false);

  const PAGE_SIZE = 25;
  const { data, isLoading } = useQuery<{ content: AppRoute[]; totalElements: number; totalPages: number; number: number }>({
    queryKey: ['routes', syncFilter, page],
    queryFn: () => {
      if (syncFilter === 'stale') return routeSyncApi.stale().then(r => ({ content: r.data, totalElements: r.data.length, totalPages: 1, number: 0 }));
      if (syncFilter === 'discovered') return routeSyncApi.discovered().then(r => ({ content: r.data, totalElements: r.data.length, totalPages: 1, number: 0 }));
      return routesApi.list({ page, size: PAGE_SIZE }).then(r => r.data);
    },
  });

  const deactivateMut = useMutation({
    mutationFn: (id: number) => routesApi.deactivate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['routes'] }); toast.success('Route pasife alındı.'); setConfirmModal(null); },
    onError: () => toast.error('İşlem başarısız.'),
  });

  const deprecateMut = useMutation({
    mutationFn: (id: number) => routesApi.deprecate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['routes'] }); toast.success('Route deprecated işaretlendi.'); setConfirmModal(null); },
    onError: () => toast.error('İşlem başarısız.'),
  });

  // Dry-run with an empty manifest (just detects stale routes from existing registry)
  const dryRunMut = useMutation({
    mutationFn: () => routeSyncApi.dryRun([]).then(r => r.data as RouteSyncResult),
    onSuccess: (result) => setSyncResultModal(result),
    onError: () => toast.error('Dry-run başarısız.'),
  });

  const applyMut = useMutation({
    mutationFn: () => routeSyncApi.apply([]).then(r => r.data as RouteSyncResult),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      setApplyConfirm(false);
      setSyncResultModal(result);
      toast.success('Sync uygulandı.');
    },
    onError: () => toast.error('Sync başarısız.'),
  });

  function handleConfirm() {
    if (!confirmModal) return;
    if (confirmModal.type === 'deactivate') deactivateMut.mutate(confirmModal.id);
    else deprecateMut.mutate(confirmModal.id);
  }

  const handleSyncFilter = (v: string) => { setSyncFilter(v as SyncFilter); setPage(0); };

  const syncStatusBadge = (route: AppRoute & { syncStatus?: string; isStale?: boolean }) => {
    if (route.isStale) return <Badge className="bg-red-900 text-red-300 text-xs">Stale</Badge>;
    if (route.syncStatus === 'DISCOVERED') return <Badge className="bg-blue-900 text-blue-300 text-xs">Discovered</Badge>;
    return null;
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Route Registry</h1>
          <p className="text-gray-400 text-sm mt-1">Uygulama deeplink rotaları · {data?.totalElements ?? 0} kayıt</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => dryRunMut.mutate()} disabled={dryRunMut.isPending}>
            <RefreshCw className={`w-4 h-4 ${dryRunMut.isPending ? 'animate-spin' : ''}`} /> Sync Dry-Run
          </Button>
          <Link href="/routes/new">
            <Button><Plus className="w-4 h-4" /> Yeni Route</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <Select value={syncFilter} onChange={e => handleSyncFilter(e.target.value)} className="w-48">
          <option value="">Tüm Routes</option>
          <option value="discovered">Discovered</option>
          <option value="stale">Stale</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-gray-900 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                <th className="text-left px-4 py-3">Route Key</th>
                <th className="text-left px-4 py-3">Path</th>
                <th className="text-left px-4 py-3">Module</th>
                <th className="text-left px-4 py-3">Platform</th>
                <th className="text-left px-4 py-3">Durum</th>
                <th className="text-left px-4 py-3">Güncelleme</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {(data?.content as (AppRoute & { syncStatus?: string; isStale?: boolean })[])?.map(r => (
                <tr key={r.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-purple-300 text-xs">{r.routeKey}</span>
                      {r.requiresAuth && <Lock className="w-3 h-3 text-gray-500" />}
                    </div>
                    <p className="text-gray-400 text-xs mt-0.5">{r.displayName}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-300">{r.path}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{r.moduleKey ?? '-'}</td>
                  <td className="px-4 py-3"><Badge className="bg-gray-700 text-gray-300">{r.supportedPlatforms}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {r.active ? <Badge className="bg-green-900 text-green-300">Aktif</Badge> : <Badge className="bg-gray-700 text-gray-400">Pasif</Badge>}
                      {r.deprecated && <Badge className="bg-orange-900 text-orange-300"><AlertTriangle className="w-3 h-3 mr-1" />Deprecated</Badge>}
                      {syncStatusBadge(r)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(r.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/routes/${r.id}`}><Button variant="ghost" size="sm"><Eye className="w-3 h-3" /></Button></Link>
                      <Link href={`/routes/${r.id}/edit`}><Button variant="ghost" size="sm"><Edit2 className="w-3 h-3" /></Button></Link>
                      {r.active && (
                        <Button variant="ghost" size="sm" onClick={() => setConfirmModal({ type: 'deactivate', id: r.id })}>
                          <PowerOff className="w-3 h-3 text-red-400" />
                        </Button>
                      )}
                      {!r.deprecated && (
                        <Button variant="ghost" size="sm" onClick={() => setConfirmModal({ type: 'deprecate', id: r.id })}>
                          <AlertTriangle className="w-3 h-3 text-orange-400" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.content?.length && <p className="text-gray-500 text-sm text-center py-12">Route bulunamadı.</p>}
        </div>
      )}

      {data && (data.totalPages ?? 1) > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
          <span>Sayfa {page + 1} / {data.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Önceki</Button>
            <Button variant="secondary" size="sm" disabled={page >= (data.totalPages ?? 1) - 1} onClick={() => setPage(p => p + 1)}>Sonraki →</Button>
          </div>
        </div>
      )}

      {/* Confirm deactivate/deprecate */}
      <Modal open={!!confirmModal} onClose={() => setConfirmModal(null)}
        title={confirmModal?.type === 'deactivate' ? 'Route Pasife Al' : 'Route Deprecated İşaretle'}>
        <p className="text-gray-300 text-sm mb-6">
          Bu işlemi onaylıyor musun?{' '}
          {confirmModal?.type === 'deactivate' ? 'Route pasife alınacak.' : 'Route deprecated işaretlenecek.'}
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setConfirmModal(null)}>İptal</Button>
          <Button variant="danger" onClick={handleConfirm} disabled={deactivateMut.isPending || deprecateMut.isPending}>Onayla</Button>
        </div>
      </Modal>

      {/* Sync dry-run result */}
      <Modal open={!!syncResultModal} onClose={() => setSyncResultModal(null)} title={`Route Sync ${syncResultModal?.dryRun ? 'Dry-Run' : 'Sonucu'}`} className="max-w-lg">
        {syncResultModal && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-900/20 border border-green-800 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-400">{syncResultModal.newRoutes.length}</p>
                <p className="text-green-300 text-xs mt-1">Yeni Route</p>
              </div>
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-400">{syncResultModal.staleRoutes.length}</p>
                <p className="text-red-300 text-xs mt-1">Stale Route</p>
              </div>
              <div className="bg-orange-900/20 border border-orange-800 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-orange-400">{syncResultModal.conflicts.length}</p>
                <p className="text-orange-300 text-xs mt-1">Conflict</p>
              </div>
            </div>
            {syncResultModal.newRoutes.length > 0 && (
              <div><p className="text-gray-400 text-xs mb-1 uppercase">Yeni Routelar</p>
                <div className="flex flex-wrap gap-1">{syncResultModal.newRoutes.map(r => <Badge key={r} className="bg-green-900 text-green-300 font-mono text-xs">{r}</Badge>)}</div></div>
            )}
            {syncResultModal.staleRoutes.length > 0 && (
              <div><p className="text-gray-400 text-xs mb-1 uppercase">Stale Routelar</p>
                <div className="flex flex-wrap gap-1">{syncResultModal.staleRoutes.map(r => <Badge key={r} className="bg-red-900 text-red-300 font-mono text-xs">{r}</Badge>)}</div></div>
            )}
            {syncResultModal.conflicts.length > 0 && (
              <div><p className="text-gray-400 text-xs mb-1 uppercase">Conflictler</p>
                <div className="space-y-1">{syncResultModal.conflicts.map(c => <p key={c} className="text-orange-300 text-xs font-mono">{c}</p>)}</div></div>
            )}
            {syncResultModal.dryRun && (
              <div className="flex gap-3 justify-end pt-2 border-t border-gray-800">
                <Button variant="secondary" onClick={() => setSyncResultModal(null)}>Kapat</Button>
                <Button onClick={() => { setSyncResultModal(null); setApplyConfirm(true); }}>Uygula</Button>
              </div>
            )}
            {!syncResultModal.dryRun && <div className="flex justify-end"><Button onClick={() => setSyncResultModal(null)}>Kapat</Button></div>}
          </div>
        )}
      </Modal>

      {/* Apply confirm */}
      <Modal open={applyConfirm} onClose={() => setApplyConfirm(false)} title="Sync Uygula">
        <p className="text-gray-300 text-sm mb-6">Sync uygulanacak. Stale route'lar işaretlenecek, yeni route'lar eklenecek. Onaylıyor musun?</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setApplyConfirm(false)}>İptal</Button>
          <Button disabled={applyMut.isPending} onClick={() => applyMut.mutate()}>
            {applyMut.isPending ? 'Uygulanıyor...' : 'Uygula'}
          </Button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
