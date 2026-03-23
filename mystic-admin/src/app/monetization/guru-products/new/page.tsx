'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { guruProductsApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface FormData {
  productKey: string;
  productType: string;
  title: string;
  description: string;
  guruAmount: number;
  bonusGuruAmount: number;
  price: string;
  currency: string;
  iosProductId: string;
  androidProductId: string;
  isEnabled: boolean;
  sortOrder: number;
  badge: string;
  campaignLabel: string;
  rolloutStatus: string;
}

function Checkbox({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} className="w-4 h-4 rounded accent-purple-500" />
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}

export default function NewGuruProductPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      productKey: '',
      productType: 'CONSUMABLE',
      title: '',
      description: '',
      guruAmount: 0,
      bonusGuruAmount: 0,
      price: '',
      currency: 'TRY',
      iosProductId: '',
      androidProductId: '',
      isEnabled: true,
      sortOrder: 0,
      badge: '',
      campaignLabel: '',
      rolloutStatus: 'DISABLED',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => guruProductsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['guru-products'] }); toast.success('Ürün oluşturuldu.'); router.push('/monetization/guru-products'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Oluşturma başarısız.'),
  });

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/monetization/guru-products"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <h1 className="text-2xl font-bold text-white">Yeni Guru Ürünü</h1>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Product Key *</label>
              <Input {...register('productKey', { required: true })} className="font-mono" placeholder="guru_50" />
              {errors.productKey && <p className="text-red-400 text-xs mt-1">Zorunlu</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Product Type *</label>
              <Select {...register('productType')}>
                <option value="CONSUMABLE">CONSUMABLE</option>
                <option value="BUNDLE">BUNDLE</option>
                <option value="SUBSCRIPTION_BONUS">SUBSCRIPTION_BONUS</option>
                <option value="PROMOTIONAL">PROMOTIONAL</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
              <Input {...register('title', { required: true })} placeholder="50 Guru" />
              {errors.title && <p className="text-red-400 text-xs mt-1">Zorunlu</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <Input {...register('description')} placeholder="50 Guru kredisi" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Guru Amount *</label>
              <Input {...register('guruAmount', { valueAsNumber: true, required: true })} type="number" min={0} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Bonus Guru Amount</label>
              <Input {...register('bonusGuruAmount', { valueAsNumber: true })} type="number" min={0} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Price</label>
              <Input {...register('price')} placeholder="29.99" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Currency</label>
              <Input {...register('currency')} placeholder="TRY" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">iOS Product ID</label>
              <Input {...register('iosProductId')} className="font-mono" placeholder="com.mysticai.guru50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Android Product ID</label>
              <Input {...register('androidProductId')} className="font-mono" placeholder="guru_50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Sort Order</label>
              <Input {...register('sortOrder', { valueAsNumber: true })} type="number" min={0} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Rollout Status</label>
              <Select {...register('rolloutStatus')}>
                <option value="DISABLED">DISABLED</option>
                <option value="INTERNAL_ONLY">INTERNAL_ONLY</option>
                <option value="ENABLED">ENABLED</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Badge</label>
              <Input {...register('badge')} placeholder="En Popüler" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Campaign Label</label>
              <Input {...register('campaignLabel')} placeholder="launch_2026" />
            </div>
          </div>

          <div className="border border-gray-700 rounded-lg p-4 space-y-3">
            <Controller name="isEnabled" control={control} render={({ field }) => <Checkbox label="Aktif" value={!!field.value} onChange={field.onChange} />} />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Link href="/monetization/guru-products"><Button variant="secondary">İptal</Button></Link>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}</Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
