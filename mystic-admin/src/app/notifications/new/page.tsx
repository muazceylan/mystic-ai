'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notifApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { RouteSelector } from '@/components/notifications/RouteSelector';
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface FormData {
  title: string;
  body: string;
  category: string;
  priority: string;
  deliveryChannel: string;
  targetAudience: string;
  routeKey: string;
  fallbackRouteKey: string;
  scheduledAt: string;
  isActive: boolean;
  notes: string;
}

export default function NewNotificationPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      category: 'SYSTEM',
      priority: 'NORMAL',
      deliveryChannel: 'BOTH',
      targetAudience: 'ALL_USERS',
      isActive: true,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => notifApi.create({
      ...data,
      active: data.isActive,
      status: 'DRAFT',
      scheduledAt: data.scheduledAt || undefined,
      routeKey: data.routeKey || undefined,
      fallbackRouteKey: data.fallbackRouteKey || undefined,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
      toast.success('Bildirim oluşturuldu.');
      router.push(`/notifications/${res.data.id}`);
    },
    onError: () => toast.error('Oluşturma başarısız.'),
  });

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/notifications">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Yeni Bildirim</h1>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Başlık <span className="text-red-400">*</span></label>
            <Input {...register('title', { required: 'Zorunlu' })} placeholder="Günlük yorumun hazır" />
            {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Mesaj <span className="text-red-400">*</span></label>
            <textarea
              {...register('body', { required: 'Zorunlu' })}
              rows={3}
              placeholder="Bugünkü kozmik enerjini keşfet..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
            />
            {errors.body && <p className="text-red-400 text-xs mt-1">{errors.body.message}</p>}
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

          {/* Route Selector */}
          <Controller
            name="routeKey"
            control={control}
            render={({ field }) => (
              <RouteSelector value={field.value} onChange={field.onChange} label="Deeplink Route" />
            )}
          />

          <Controller
            name="fallbackRouteKey"
            control={control}
            render={({ field }) => (
              <RouteSelector value={field.value} onChange={field.onChange} label="Fallback Route (opsiyonel)" />
            )}
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Planlanmış Gönderim (opsiyonel)</label>
            <Input
              type="datetime-local"
              {...register('scheduledAt', {
                validate: (v) => !v || new Date(v) > new Date() || 'Geçmiş tarih olamaz',
              })}
            />
            {errors.scheduledAt && <p className="text-red-400 text-xs mt-1">{errors.scheduledAt.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notlar (iç kullanım)</label>
            <Input {...register('notes')} placeholder="Bu bildirim neden oluşturuldu..." />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" {...register('isActive')} className="w-4 h-4 accent-purple-500" />
            <label className="text-sm text-gray-300">Aktif</label>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Link href="/notifications"><Button variant="secondary">İptal</Button></Link>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Kaydediliyor...' : 'Taslak Olarak Kaydet'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
