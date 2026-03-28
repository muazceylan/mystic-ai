'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminUsersApi } from '@/lib/api';
import { AdminUserFull } from '@/types';
import { formatDate, roleColor } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, KeyRound, UserCheck, UserX } from 'lucide-react';
import Link from 'next/link';
import { useState, use, useEffect } from 'react';
import { useForm } from 'react-hook-form';

interface FormData {
  email: string;
  fullName: string;
  role: string;
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const toast = useToast();
  const [resetModal, setResetModal] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const { data: user } = useQuery<AdminUserFull>({
    queryKey: ['admin-user', id],
    queryFn: () => adminUsersApi.get(Number(id)).then(r => r.data),
  });

  const { register, handleSubmit, reset } = useForm<FormData>();
  useEffect(() => {
    if (user) reset({ email: user.email, fullName: user.fullName ?? '', role: user.role });
  }, [user, reset]);

  const updateMut = useMutation({
    mutationFn: (data: FormData) => adminUsersApi.update(Number(id), data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-user', id] }); toast.success('Güncellendi.'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Güncelleme başarısız.'),
  });

  const resetMut = useMutation({
    mutationFn: () => adminUsersApi.resetPassword(Number(id)).then(r => r.data),
    onSuccess: (data: { temporaryPassword: string }) => { setResetModal(false); setTempPassword(data.temporaryPassword); },
    onError: () => toast.error('Şifre sıfırlama başarısız.'),
  });

  const activateMut = useMutation({
    mutationFn: () => adminUsersApi.activate(Number(id)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-user', id] }); qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Kullanıcı aktif edildi.'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Aktif etme başarısız.'),
  });

  const deactivateMut = useMutation({
    mutationFn: () => adminUsersApi.deactivate(Number(id)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-user', id] }); qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Kullanıcı pasif edildi.'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Pasif etme başarısız.'),
  });

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin-users">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Admin Kullanıcı Detay</h1>
        {user && (
          <div className="ml-auto flex gap-2">
            {user.isActive ? (
              <Button variant="danger" size="sm" onClick={() => deactivateMut.mutate()} disabled={deactivateMut.isPending}>
                <UserX className="w-3 h-3" /> {deactivateMut.isPending ? 'İşleniyor...' : 'Pasif Et'}
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={() => activateMut.mutate()} disabled={activateMut.isPending}>
                <UserCheck className="w-3 h-3" /> {activateMut.isPending ? 'İşleniyor...' : 'Aktif Et'}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setResetModal(true)}>
              <KeyRound className="w-3 h-3" /> Şifre Sıfırla
            </Button>
          </div>
        )}
      </div>

      {user && (
        <div className="max-w-lg space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-3">
            <div className="flex items-center gap-3">
              <Badge className={roleColor(user.role)}>{user.role}</Badge>
              <span className={`text-xs px-2 py-0.5 rounded-full ${user.isActive ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                {user.isActive ? 'Aktif' : 'Pasif'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm border-t border-gray-800 pt-3">
              <div><p className="text-gray-500">Son Giriş</p><p className="text-white">{user.lastLoginAt ? formatDate(user.lastLoginAt) : '-'}</p></div>
              <div><p className="text-gray-500">Oluşturulma</p><p className="text-white">{formatDate(user.createdAt)}</p></div>
            </div>
          </div>

          <form onSubmit={handleSubmit(d => updateMut.mutate(d))} className="space-y-4 bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-300">Düzenle</h2>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <Input {...register('email', { required: true })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Ad Soyad</label>
              <Input {...register('fullName')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Rol</label>
              <Select {...register('role')}>
                <option value="NOTIFICATION_MANAGER">NOTIFICATION_MANAGER</option>
                <option value="PRODUCT_ADMIN">PRODUCT_ADMIN</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={updateMut.isPending}>
                {updateMut.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <Modal open={resetModal} onClose={() => setResetModal(false)} title="Şifreyi Sıfırla">
        <p className="text-gray-300 text-sm mb-6">Kullanıcının şifresi sıfırlanacak ve yeni geçici şifre oluşturulacak. Onaylıyor musun?</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setResetModal(false)}>İptal</Button>
          <Button variant="danger" disabled={resetMut.isPending} onClick={() => resetMut.mutate()}>Sıfırla</Button>
        </div>
      </Modal>

      <Modal open={!!tempPassword} onClose={() => setTempPassword(null)} title="Geçici Şifre">
        <p className="text-gray-400 text-sm mb-3">Bu şifreyi güvenli bir şekilde ilet. Bir daha gösterilmeyecek.</p>
        <div className="bg-gray-800 rounded-lg px-4 py-3 font-mono text-white text-lg tracking-widest text-center select-all">{tempPassword}</div>
        <div className="flex justify-end mt-4"><Button onClick={() => setTempPassword(null)}>Tamam</Button></div>
      </Modal>
    </AdminLayout>
  );
}
