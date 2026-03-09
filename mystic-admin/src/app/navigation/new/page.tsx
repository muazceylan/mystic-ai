'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { navigationApi, routesApi } from '@/lib/api';
import { AppRoute } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface FormData {
  navKey: string;
  label: string;
  icon: string;
  routeKey: string;
  isVisible: boolean;
  sortOrder: number;
  platform: 'IOS' | 'ANDROID' | 'BOTH';
  isPremium: boolean;
  minAppVersion: string;
}

export default function NewNavigationPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();

  const { data: activeRoutes } = useQuery<AppRoute[]>({
    queryKey: ['routes-active'],
    queryFn: () => routesApi.listActive().then(r => r.data),
  });

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    defaultValues: { isVisible: true, sortOrder: 0, platform: 'BOTH', isPremium: false },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => navigationApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['navigation'] }); toast.success('Navigation item oluşturuldu.'); router.push('/navigation'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Oluşturma başarısız.'),
  });

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/navigation"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <h1 className="text-2xl font-bold text-white">Yeni Navigation Item</h1>
      </div>

      <div className="max-w-lg">
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nav Key *</label>
              <Input {...register('navKey', { required: true })} className="font-mono" placeholder="home" />
              {errors.navKey && <p className="text-red-400 text-xs mt-1">Zorunlu</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Label *</label>
              <Input {...register('label', { required: true })} placeholder="Ana Sayfa" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Icon</label>
              <Input {...register('icon')} placeholder="home, bell, user..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Sort Order</label>
              <Input {...register('sortOrder', { valueAsNumber: true })} type="number" min={0} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Route Key *</label>
            <Select {...register('routeKey', { required: true })}>
              <option value="">Seçin...</option>
              {activeRoutes?.map(r => <option key={r.routeKey} value={r.routeKey}>{r.routeKey} — {r.path}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Platform</label>
              <Select {...register('platform')}><option value="BOTH">BOTH</option><option value="IOS">IOS</option><option value="ANDROID">ANDROID</option></Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Min Version</label>
              <Input {...register('minAppVersion')} placeholder="1.0.0" />
            </div>
          </div>
          <div className="flex gap-4">
            <Controller name="isVisible" control={control} render={({ field }) => (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!field.value} onChange={e => field.onChange(e.target.checked)} className="w-4 h-4 rounded accent-purple-500" />
                <span className="text-sm text-gray-300">Görünür</span>
              </label>
            )} />
            <Controller name="isPremium" control={control} render={({ field }) => (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!field.value} onChange={e => field.onChange(e.target.checked)} className="w-4 h-4 rounded accent-purple-500" />
                <span className="text-sm text-gray-300">Premium</span>
              </label>
            )} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Link href="/navigation"><Button variant="secondary">İptal</Button></Link>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}</Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
