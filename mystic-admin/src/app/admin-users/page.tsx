'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminUsersApi } from '@/lib/api';
import { AdminUserFull, Page } from '@/types';
import { formatDate, roleColor } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { Plus, Eye, UserCheck, UserX, KeyRound } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(0);
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [confirm, setConfirm] = useState<{ type: 'activate' | 'deactivate' | 'reset'; id: number; email: string } | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const PAGE_SIZE = 20;
  const { data, isLoading } = useQuery<Page<AdminUserFull>>({
    queryKey: ['admin-users', roleFilter, activeFilter, page],
    queryFn: () => adminUsersApi.list({
      role: roleFilter || undefined,
      active: activeFilter !== '' ? activeFilter === 'true' : undefined,
      page, size: PAGE_SIZE,
    }).then(r => r.data),
  });

  const activateMut = useMutation({
    mutationFn: (id: number) => adminUsersApi.activate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Aktif edildi.'); setConfirm(null); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'İşlem başarısız.'),
  });

  const deactivateMut = useMutation({
    mutationFn: (id: number) => adminUsersApi.deactivate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Pasife alındı.'); setConfirm(null); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'İşlem başarısız.'),
  });

  const resetMut = useMutation({
    mutationFn: (id: number) => adminUsersApi.resetPassword(id).then(r => r.data),
    onSuccess: (data: { temporaryPassword: string }) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setConfirm(null);
      setTempPassword(data.temporaryPassword);
    },
    onError: () => toast.error('Şifre sıfırlama başarısız.'),
  });

  const handleRoleFilter = (v: string) => { setRoleFilter(v); setPage(0); };
  const handleActiveFilter = (v: string) => { setActiveFilter(v); setPage(0); };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Users</h1>
          <p className="text-gray-400 text-sm mt-1">{data?.totalElements ?? 0} kullanıcı</p>
        </div>
        <Link href="/admin-users/new">
          <Button><Plus className="w-4 h-4" /> Yeni Admin</Button>
        </Link>
      </div>

      <div className="flex gap-3 mb-4">
        <Select value={roleFilter} onChange={e => handleRoleFilter(e.target.value)} className="w-48">
          <option value="">Tüm Roller</option>
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          <option value="PRODUCT_ADMIN">PRODUCT_ADMIN</option>
          <option value="NOTIFICATION_MANAGER">NOTIFICATION_MANAGER</option>
        </Select>
        <Select value={activeFilter} onChange={e => handleActiveFilter(e.target.value)} className="w-36">
          <option value="">Tüm Durum</option>
          <option value="true">Aktif</option>
          <option value="false">Pasif</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-gray-900 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                <th className="text-left px-4 py-3">Email / Ad</th>
                <th className="text-left px-4 py-3">Rol</th>
                <th className="text-left px-4 py-3">Durum</th>
                <th className="text-left px-4 py-3">Son Giriş</th>
                <th className="text-left px-4 py-3">Oluşturulma</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {data?.content?.map(u => (
                <tr key={u.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{u.email}</p>
                    {u.fullName && <p className="text-gray-500 text-xs">{u.fullName}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={roleColor(u.role)}>{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                      {u.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{u.lastLoginAt ? formatDate(u.lastLoginAt) : '-'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/admin-users/${u.id}`}>
                        <Button variant="ghost" size="sm"><Eye className="w-3 h-3" /></Button>
                      </Link>
                      {u.isActive ? (
                        <Button variant="ghost" size="sm" onClick={() => setConfirm({ type: 'deactivate', id: u.id, email: u.email })}>
                          <UserX className="w-3 h-3 text-red-400" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setConfirm({ type: 'activate', id: u.id, email: u.email })}>
                          <UserCheck className="w-3 h-3 text-green-400" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setConfirm({ type: 'reset', id: u.id, email: u.email })}>
                        <KeyRound className="w-3 h-3 text-yellow-400" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.content?.length && <p className="text-gray-500 text-sm text-center py-12">Kullanıcı bulunamadı.</p>}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
          <span>Sayfa {page + 1} / {data.totalPages} ({data.totalElements} kayıt)</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Önceki</Button>
            <Button variant="secondary" size="sm" disabled={page >= data.totalPages - 1} onClick={() => setPage(p => p + 1)}>Sonraki →</Button>
          </div>
        </div>
      )}

      <Modal open={!!confirm} onClose={() => setConfirm(null)}
        title={confirm?.type === 'reset' ? 'Şifre Sıfırla' : confirm?.type === 'activate' ? 'Aktif Et' : 'Pasife Al'}>
        <p className="text-gray-300 text-sm mb-6">
          <span className="text-white font-medium">{confirm?.email}</span> için bu işlemi onaylıyor musun?
          {confirm?.type === 'deactivate' && <span className="block text-red-400 text-xs mt-1">Son SUPER_ADMIN pasife alınamaz.</span>}
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setConfirm(null)}>İptal</Button>
          <Button
            variant={confirm?.type === 'deactivate' ? 'danger' : 'primary'}
            disabled={activateMut.isPending || deactivateMut.isPending || resetMut.isPending}
            onClick={() => {
              if (!confirm) return;
              if (confirm.type === 'activate') activateMut.mutate(confirm.id);
              else if (confirm.type === 'deactivate') deactivateMut.mutate(confirm.id);
              else resetMut.mutate(confirm.id);
            }}
          >
            Onayla
          </Button>
        </div>
      </Modal>

      <Modal open={!!tempPassword} onClose={() => setTempPassword(null)} title="Geçici Şifre">
        <p className="text-gray-400 text-sm mb-3">Bu şifreyi güvenli bir şekilde ilet. Bir daha gösterilmeyecek.</p>
        <div className="bg-gray-800 rounded-lg px-4 py-3 font-mono text-white text-lg tracking-widest text-center select-all">
          {tempPassword}
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={() => setTempPassword(null)}>Tamam</Button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
