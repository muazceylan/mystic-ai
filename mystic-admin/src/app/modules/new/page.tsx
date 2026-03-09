'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { modulesApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface FormData {
  moduleKey: string;
  displayName: string;
  description: string;
  icon: string;
  isActive: boolean;
  isPremium: boolean;
  showOnHome: boolean;
  showOnExplore: boolean;
  showInTabBar: boolean;
  sortOrder: number;
  maintenanceMode: boolean;
  hiddenButDeepLinkable: boolean;
}

function Checkbox({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} className="w-4 h-4 rounded accent-purple-500" />
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}

export default function NewModulePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    defaultValues: { isActive: true, isPremium: false, showOnHome: true, showOnExplore: false, showInTabBar: false, maintenanceMode: false, hiddenButDeepLinkable: false, sortOrder: 0 },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => modulesApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['modules'] }); toast.success('Modül oluşturuldu.'); router.push('/modules'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Oluşturma başarısız.'),
  });

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/modules"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <h1 className="text-2xl font-bold text-white">Yeni Modül</h1>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Module Key *</label>
              <Input {...register('moduleKey', { required: true })} className="font-mono" placeholder="dream_analysis" />
              {errors.moduleKey && <p className="text-red-400 text-xs mt-1">Zorunlu</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Display Name *</label>
              <Input {...register('displayName', { required: true })} placeholder="Rüya Analizi" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Icon</label>
              <Input {...register('icon')} placeholder="moon-icon" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Sort Order</label>
              <Input {...register('sortOrder', { valueAsNumber: true })} type="number" min={0} />
            </div>
          </div>
          <div className="border border-gray-700 rounded-lg p-4 space-y-3">
            <p className="text-xs text-gray-400 uppercase font-semibold">Görünürlük & Davranış</p>
            <Controller name="isActive" control={control} render={({ field }) => <Checkbox label="Aktif" value={!!field.value} onChange={field.onChange} />} />
            <Controller name="showOnHome" control={control} render={({ field }) => <Checkbox label="Ana Sayfada Göster" value={!!field.value} onChange={field.onChange} />} />
            <Controller name="showOnExplore" control={control} render={({ field }) => <Checkbox label="Explore'da Göster" value={!!field.value} onChange={field.onChange} />} />
            <Controller name="showInTabBar" control={control} render={({ field }) => <Checkbox label="Tab Bar'da Göster" value={!!field.value} onChange={field.onChange} />} />
            <Controller name="hiddenButDeepLinkable" control={control} render={({ field }) => <Checkbox label="Gizle ama Deeplink Çalışsın" value={!!field.value} onChange={field.onChange} />} />
            <Controller name="isPremium" control={control} render={({ field }) => <Checkbox label="Premium" value={!!field.value} onChange={field.onChange} />} />
            <Controller name="maintenanceMode" control={control} render={({ field }) => <Checkbox label="Bakım Modu" value={!!field.value} onChange={field.onChange} />} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Link href="/modules"><Button variant="secondary">İptal</Button></Link>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}</Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
