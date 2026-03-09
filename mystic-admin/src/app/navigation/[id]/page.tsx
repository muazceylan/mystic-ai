'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { navigationApi, routesApi } from '@/lib/api';
import { NavigationItem, AppRoute } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { use, useEffect } from 'react';

type FormData = Omit<NavigationItem, 'id' | 'createdAt' | 'updatedAt'>;

export default function NavigationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();

  const { data: item } = useQuery<NavigationItem>({
    queryKey: ['nav-item', id],
    queryFn: () => navigationApi.get(Number(id)).then(r => r.data),
  });

  const { data: activeRoutes } = useQuery<AppRoute[]>({
    queryKey: ['routes-active'],
    queryFn: () => routesApi.listActive().then(r => r.data),
  });

  const { register, handleSubmit, control, reset } = useForm<FormData>();
  useEffect(() => { if (item) reset(item as FormData); }, [item, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => navigationApi.update(Number(id), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['navigation'] });
      qc.invalidateQueries({ queryKey: ['nav-item', id] });
      toast.success('Navigation item güncellendi.');
      router.push('/navigation');
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Güncelleme başarısız.'),
  });

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/navigation"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <h1 className="text-2xl font-bold text-white">Navigation Item Düzenle</h1>
      </div>

      <div className="max-w-lg">
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nav Key *</label>
              <Input {...register('navKey', { required: true })} className="font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Label *</label>
              <Input {...register('label', { required: true })} />
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
              {activeRoutes?.map(r => (
                <option key={r.routeKey} value={r.routeKey}>{r.routeKey} — {r.path}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Platform</label>
              <Select {...register('platform')}>
                <option value="BOTH">BOTH</option>
                <option value="IOS">IOS</option>
                <option value="ANDROID">ANDROID</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Min App Version</label>
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
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
