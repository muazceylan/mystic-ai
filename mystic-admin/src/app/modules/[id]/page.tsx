'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modulesApi } from '@/lib/api';
import { AppModule } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { use, useEffect } from 'react';

type FormData = Omit<AppModule, 'id' | 'createdAt' | 'updatedAt'>;

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded accent-purple-500" />
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}

export default function ModuleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();

  const { data: module } = useQuery<AppModule>({
    queryKey: ['module', id],
    queryFn: () => modulesApi.get(Number(id)).then(r => r.data),
  });

  const { register, handleSubmit, control, reset } = useForm<FormData>();
  useEffect(() => { if (module) reset(module); }, [module, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => modulesApi.update(Number(id), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modules'] });
      qc.invalidateQueries({ queryKey: ['module', id] });
      toast.success('Modül güncellendi.');
      router.push('/modules');
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Güncelleme başarısız.'),
  });

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/modules"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <h1 className="text-2xl font-bold text-white">Modül Düzenle</h1>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Module Key *</label>
              <Input {...register('moduleKey', { required: true })} className="font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Display Name *</label>
              <Input {...register('displayName', { required: true })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Icon</label>
              <Input {...register('icon')} placeholder="home-icon" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Sort Order</label>
              <Input {...register('sortOrder', { valueAsNumber: true })} type="number" min={0} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Badge Label</label>
            <Input {...register('badgeLabel')} placeholder="Yeni, Beta, v.s." />
          </div>
          <div className="border border-gray-700 rounded-lg p-4 space-y-3">
            <p className="text-xs text-gray-400 uppercase font-semibold">Görünürlük</p>
            <Controller name="isActive" control={control} render={({ field }) => (
              <Checkbox label="Aktif" checked={!!field.value} onChange={field.onChange} />
            )} />
            <Controller name="showOnHome" control={control} render={({ field }) => (
              <Checkbox label="Ana Sayfada Göster" checked={!!field.value} onChange={field.onChange} />
            )} />
            <Controller name="showOnExplore" control={control} render={({ field }) => (
              <Checkbox label="Explore'da Göster" checked={!!field.value} onChange={field.onChange} />
            )} />
            <Controller name="showInTabBar" control={control} render={({ field }) => (
              <Checkbox label="Tab Bar'da Göster" checked={!!field.value} onChange={field.onChange} />
            )} />
            <Controller name="hiddenButDeepLinkable" control={control} render={({ field }) => (
              <Checkbox label="Gizle ama Deeplink Çalışsın" checked={!!field.value} onChange={field.onChange} />
            )} />
            <Controller name="isPremium" control={control} render={({ field }) => (
              <Checkbox label="Premium" checked={!!field.value} onChange={field.onChange} />
            )} />
            <Controller name="maintenanceMode" control={control} render={({ field }) => (
              <Checkbox label="Bakım Modu" checked={!!field.value} onChange={field.onChange} />
            )} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Link href="/modules"><Button variant="secondary">İptal</Button></Link>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
