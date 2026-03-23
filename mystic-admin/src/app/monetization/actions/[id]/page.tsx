'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { monetizationActionsApi } from '@/lib/api';
import { MonetizationAction } from '@/types';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { use, useEffect } from 'react';

type FormData = Omit<MonetizationAction, 'id' | 'createdAt' | 'updatedAt' | 'createdByAdminId' | 'updatedByAdminId'>;

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded accent-purple-500" />
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}

export default function MonetizationActionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();

  const { data: action } = useQuery<MonetizationAction>({
    queryKey: ['monetization-action', id],
    queryFn: () => monetizationActionsApi.get(Number(id)).then(r => r.data),
  });

  const { register, handleSubmit, control, reset } = useForm<FormData>();
  useEffect(() => { if (action) reset(action); }, [action, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => monetizationActionsApi.update(Number(id), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monetization-actions'] });
      qc.invalidateQueries({ queryKey: ['monetization-action', id] });
      toast.success('Aksiyon güncellendi.');
      router.push('/monetization/actions');
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Güncelleme başarısız.'),
  });

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/monetization/actions"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <h1 className="text-2xl font-bold text-white">Aksiyon Düzenle</h1>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Action Key *</label>
              <Input {...register('actionKey', { required: true })} className="font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Module Key *</label>
              <Input {...register('moduleKey', { required: true })} className="font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
              <Input {...register('displayName')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Unlock Type *</label>
              <Select {...register('unlockType')}>
                <option value="FREE">FREE</option>
                <option value="AD_WATCH">AD_WATCH</option>
                <option value="GURU_SPEND">GURU_SPEND</option>
                <option value="AD_OR_GURU">AD_OR_GURU</option>
                <option value="PURCHASE_ONLY">PURCHASE_ONLY</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <Input {...register('description')} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Guru Cost</label>
              <Input {...register('guruCost', { valueAsNumber: true })} type="number" min={0} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Reward Amount</label>
              <Input {...register('rewardAmount', { valueAsNumber: true })} type="number" min={0} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Display Priority</label>
              <Input {...register('displayPriority', { valueAsNumber: true })} type="number" min={0} />
            </div>
          </div>

          <div className="border border-gray-700 rounded-lg p-4 space-y-3">
            <p className="text-xs text-gray-400 uppercase font-semibold">Seçenekler</p>
            <Controller name="isAdRequired" control={control} render={({ field }) => <Checkbox label="Reklam Zorunlu" checked={!!field.value} onChange={field.onChange} />} />
            <Controller name="isPurchaseRequired" control={control} render={({ field }) => <Checkbox label="Satın Alma Zorunlu" checked={!!field.value} onChange={field.onChange} />} />
            <Controller name="isPreviewAllowed" control={control} render={({ field }) => <Checkbox label="Önizlemeye İzin Ver" checked={!!field.value} onChange={field.onChange} />} />
            <Controller name="isEnabled" control={control} render={({ field }) => <Checkbox label="Aktif" checked={!!field.value} onChange={field.onChange} />} />
          </div>

          {action && (
            <div className="text-xs text-gray-500 space-y-1">
              <p>Oluşturulma: {formatDate(action.createdAt)}</p>
              <p>Güncelleme: {formatDate(action.updatedAt)}</p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Link href="/monetization/actions"><Button variant="secondary">İptal</Button></Link>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
