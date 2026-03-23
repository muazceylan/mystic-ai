'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { monetizationSettingsApi } from '@/lib/api';
import { MonetizationSettings } from '@/types';
import { formatDate, statusColor } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Plus, Eye, Send, Archive } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export default function MonetizationSettingsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [confirm, setConfirm] = useState<{ type: 'publish' | 'archive'; id: number; key: string } | null>(null);

  const { data: settings, isLoading } = useQuery<MonetizationSettings[]>({
    queryKey: ['monetization-settings'],
    queryFn: () => monetizationSettingsApi.list().then(r => r.data),
  });

  const mutOpts = (msg: string) => ({
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['monetization-settings'] }); toast.success(msg); setConfirm(null); },
    onError: () => toast.error('İşlem başarısız.'),
  });

  const publishMut = useMutation({ mutationFn: (id: number) => monetizationSettingsApi.publish(id), ...mutOpts('Yayınlandı.') });
  const archiveMut = useMutation({ mutationFn: (id: number) => monetizationSettingsApi.archive(id), ...mutOpts('Arşivlendi.') });

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Monetization Settings</h1>
          <p className="text-gray-400 text-sm mt-1">{settings?.length ?? 0} ayar versiyonu</p>
        </div>
        <Link href="/monetization/settings/new">
          <Button><Plus className="w-4 h-4" /> Yeni Ayar</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-gray-900 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                <th className="text-left px-4 py-3">Key</th>
                <th className="text-left px-4 py-3">Durum</th>
                <th className="text-left px-4 py-3">Versiyon</th>
                <th className="text-left px-4 py-3">Enabled</th>
                <th className="text-left px-4 py-3">Ads</th>
                <th className="text-left px-4 py-3">Guru</th>
                <th className="text-left px-4 py-3">Guru Purchase</th>
                <th className="text-left px-4 py-3">Güncellendi</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {settings?.map(s => (
                <tr key={s.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium font-mono">{s.settingsKey}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(s.status)}`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">v{s.configVersion}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.isEnabled ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                      {s.isEnabled ? 'Evet' : 'Hayır'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.isAdsEnabled ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                      {s.isAdsEnabled ? 'Evet' : 'Hayır'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.isGuruEnabled ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                      {s.isGuruEnabled ? 'Evet' : 'Hayır'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.isGuruPurchaseEnabled ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                      {s.isGuruPurchaseEnabled ? 'Evet' : 'Hayır'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(s.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/monetization/settings/${s.id}`}>
                        <Button variant="ghost" size="sm"><Eye className="w-3 h-3" /></Button>
                      </Link>
                      {s.status === 'DRAFT' && (
                        <Button variant="ghost" size="sm" onClick={() => setConfirm({ type: 'publish', id: s.id, key: s.settingsKey })}>
                          <Send className="w-3 h-3 text-green-400" />
                        </Button>
                      )}
                      {s.status === 'PUBLISHED' && (
                        <Button variant="ghost" size="sm" onClick={() => setConfirm({ type: 'archive', id: s.id, key: s.settingsKey })}>
                          <Archive className="w-3 h-3 text-orange-400" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!settings?.length && <p className="text-gray-500 text-sm text-center py-12">Ayar bulunamadı.</p>}
        </div>
      )}

      <Modal open={!!confirm} onClose={() => setConfirm(null)}
        title={confirm?.type === 'publish' ? 'Yayınla' : 'Arşivle'}>
        <p className="text-gray-300 text-sm mb-6"><span className="text-white font-mono">{confirm?.key}</span> için onaylıyor musun?</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setConfirm(null)}>İptal</Button>
          <Button
            variant={confirm?.type === 'archive' ? 'danger' : 'primary'}
            disabled={publishMut.isPending || archiveMut.isPending}
            onClick={() => {
              if (!confirm) return;
              if (confirm.type === 'publish') publishMut.mutate(confirm.id);
              else archiveMut.mutate(confirm.id);
            }}
          >Onayla</Button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
