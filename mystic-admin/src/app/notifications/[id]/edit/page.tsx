'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifApi } from '@/lib/api';
import { AdminNotification } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { RouteSelector } from '@/components/notifications/RouteSelector';
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useEffect, use, useCallback } from 'react';

// datetime-local input requires "YYYY-MM-DDTHH:MM" (no seconds)
function toDatetimeLocal(iso?: string): string {
  if (!iso) return '';
  return iso.slice(0, 16); // "2026-03-08T12:00:00" → "2026-03-08T12:00"
}

export default function EditNotificationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();

  const { data: notif } = useQuery<AdminNotification>({
    queryKey: ['admin-notification', id],
    queryFn: () => notifApi.get(Number(id)).then((r) => r.data),
  });

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<Partial<AdminNotification> & { isActive?: boolean }>();

  useEffect(() => {
    if (notif) {
      reset({
        ...notif,
        isActive: notif.active,
        scheduledAt: toDatetimeLocal(notif.scheduledAt),
      });
    }
  }, [notif, reset]);

  const mutation = useMutation({
    mutationFn: (data: Partial<AdminNotification>) => notifApi.update(Number(id), {
      ...data,
      active: (data as { isActive?: boolean }).isActive,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
      qc.invalidateQueries({ queryKey: ['admin-notification', id] });
      toast.success('Bildirim güncellendi.');
      router.push(`/notifications/${id}`);
    },
    onError: () => toast.error('Güncelleme başarısız.'),
  });

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/notifications/${id}`}>
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Bildirim Düzenle</h1>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Başlık *</label>
            <Input {...register('title', { required: true })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Mesaj *</label>
            <textarea
              {...register('body', { required: true })}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Kategori</label>
              <Select {...register('category')}>
                <option value="DAILY">DAILY</option>
                <option value="WEEKLY">WEEKLY</option>
                <option value="REMINDER">REMINDER</option>
                <option value="SYSTEM">SYSTEM</option>
                <option value="BEHAVIORAL">BEHAVIORAL</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Öncelik</label>
              <Select {...register('priority')}>
                <option value="HIGH">HIGH</option>
                <option value="NORMAL">NORMAL</option>
                <option value="LOW">LOW</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Kanal</label>
              <Select {...register('deliveryChannel')}>
                <option value="BOTH">BOTH</option>
                <option value="PUSH">PUSH</option>
                <option value="IN_APP">IN_APP</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Hedef Kitle</label>
              <Select {...register('targetAudience')}>
                <option value="ALL_USERS">ALL_USERS</option>
                <option value="TEST_USERS">TEST_USERS</option>
                <option value="PREMIUM_USERS">PREMIUM_USERS</option>
              </Select>
            </div>
          </div>

          <Controller
            name="routeKey"
            control={control}
            render={({ field }) => (
              <RouteSelector value={field.value ?? ''} onChange={field.onChange} label="Deeplink Route" />
            )}
          />

          <Controller
            name="fallbackRouteKey"
            control={control}
            render={({ field }) => (
              <RouteSelector value={field.value ?? ''} onChange={field.onChange} label="Fallback Route (opsiyonel)" />
            )}
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notlar</label>
            <Input {...register('notes')} />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Link href={`/notifications/${id}`}><Button variant="secondary">İptal</Button></Link>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
