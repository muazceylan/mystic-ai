'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { routesApi } from '@/lib/api';
import { AppRoute } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useEffect, use } from 'react';

export default function EditRoutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();

  const { data: route } = useQuery<AppRoute>({
    queryKey: ['route', id],
    queryFn: () => routesApi.get(Number(id)).then((r) => r.data),
  });

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<Partial<AppRoute>>();

  useEffect(() => {
    if (route) reset(route);
  }, [route, reset]);

  const path = watch('path');

  const mutation = useMutation({
    mutationFn: (data: Partial<AppRoute>) => routesApi.update(Number(id), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      qc.invalidateQueries({ queryKey: ['route', id] });
      toast.success('Route güncellendi.');
      router.push(`/routes/${id}`);
    },
    onError: () => toast.error('Güncelleme başarısız.'),
  });

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/routes/${id}`}>
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Route Düzenle</h1>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Route Key *</label>
              <Input {...register('routeKey', { required: true })} />
              {errors.routeKey && <p className="text-red-400 text-xs mt-1">Zorunlu</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Display Name *</label>
              <Input {...register('displayName', { required: true })} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Path *</label>
            <Input {...register('path', { required: true })} />
            {path && <p className="text-xs text-purple-400 mt-1 font-mono">Preview: {path}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Module Key</label>
              <Input {...register('moduleKey')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Fallback Route Key</label>
              <Input {...register('fallbackRouteKey')} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Açıklama</label>
            <Input {...register('description')} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Platform</label>
            <Select {...register('supportedPlatforms')}>
              <option value="BOTH">BOTH</option>
              <option value="IOS">IOS</option>
              <option value="ANDROID">ANDROID</option>
            </Select>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('requiresAuth')} className="w-4 h-4 accent-purple-500" />
              <span className="text-sm text-gray-300">Auth Gerekli</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('active')} className="w-4 h-4 accent-purple-500" />
              <span className="text-sm text-gray-300">Aktif</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('deprecated')} className="w-4 h-4 accent-orange-500" />
              <span className="text-sm text-gray-300">Deprecated</span>
            </label>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Link href={`/routes/${id}`}><Button variant="secondary">İptal</Button></Link>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
