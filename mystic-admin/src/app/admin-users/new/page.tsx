'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminUsersApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface FormData {
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'PRODUCT_ADMIN' | 'NOTIFICATION_MANAGER';
}

export default function NewAdminUserPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: { role: 'NOTIFICATION_MANAGER' },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => adminUsersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Admin kullanıcı oluşturuldu. Geçici şifre konsol loglarında.');
      router.push('/admin-users');
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Oluşturma başarısız.'),
  });

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin-users">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Yeni Admin Kullanıcı</h1>
      </div>

      <div className="max-w-lg">
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
            <Input {...register('email', { required: true })} type="email" placeholder="admin@example.com" />
            {errors.email && <p className="text-red-400 text-xs mt-1">Zorunlu alan</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Ad Soyad</label>
            <Input {...register('fullName')} placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Rol *</label>
            <Select {...register('role', { required: true })}>
              <option value="NOTIFICATION_MANAGER">NOTIFICATION_MANAGER</option>
              <option value="PRODUCT_ADMIN">PRODUCT_ADMIN</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            </Select>
          </div>
          <p className="text-xs text-gray-500">Geçici şifre otomatik oluşturulur ve servis loglarına yazılır. İlk girişte değiştirilmesi gerekir.</p>
          <div className="flex gap-3 justify-end pt-2">
            <Link href="/admin-users"><Button variant="secondary">İptal</Button></Link>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
