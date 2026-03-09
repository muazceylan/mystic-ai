'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { routesApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useForm } from 'react-hook-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface FormData {
  routeKey: string;
  displayName: string;
  path: string;
  description: string;
  moduleKey: string;
  requiresAuth: boolean;
  fallbackRouteKey: string;
  isActive: boolean;
  isDeprecated: boolean;
  supportedPlatforms: string;
}

export default function NewRoutePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: { requiresAuth: true, isActive: true, isDeprecated: false, supportedPlatforms: 'BOTH' },
  });

  const path = watch('path');

  const mutation = useMutation({
    mutationFn: (data: FormData) => routesApi.create({
      ...data,
      active: data.isActive,
      deprecated: data.isDeprecated,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Route oluşturuldu.');
      router.push('/routes');
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Route oluşturulamadı.');
    },
  });

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/routes">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Yeni Route</h1>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Route Key <span className="text-red-400">*</span>
              </label>
              <Input
                {...register('routeKey', { required: 'Zorunlu' })}
                placeholder="home"
              />
              <p className="text-xs text-gray-500 mt-1">Slug formatında, benzersiz. Örn: home, dreams, spiritual</p>
              {errors.routeKey && <p className="text-red-400 text-xs mt-1">{errors.routeKey.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Display Name <span className="text-red-400">*</span>
              </label>
              <Input
                {...register('displayName', { required: 'Zorunlu' })}
                placeholder="Ana Sayfa"
              />
              {errors.displayName && <p className="text-red-400 text-xs mt-1">{errors.displayName.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Path <span className="text-red-400">*</span>
            </label>
            <Input
              {...register('path', { required: 'Zorunlu' })}
              placeholder="/(tabs)/home"
            />
            {path && (
              <p className="text-xs text-purple-400 mt-1 font-mono">Preview: {path}</p>
            )}
            {errors.path && <p className="text-red-400 text-xs mt-1">{errors.path.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Module Key</label>
              <Input {...register('moduleKey')} placeholder="core" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Fallback Route Key</label>
              <Input {...register('fallbackRouteKey')} placeholder="home" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Açıklama</label>
            <Input {...register('description')} placeholder="Bu route ne için..." />
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
              <input type="checkbox" {...register('isActive')} className="w-4 h-4 accent-purple-500" />
              <span className="text-sm text-gray-300">Aktif</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('isDeprecated')} className="w-4 h-4 accent-orange-500" />
              <span className="text-sm text-gray-300">Deprecated</span>
            </label>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Link href="/routes"><Button variant="secondary">İptal</Button></Link>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Kaydediliyor...' : 'Oluştur'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
