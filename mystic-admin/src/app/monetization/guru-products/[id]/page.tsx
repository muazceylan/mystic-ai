'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { guruProductsApi } from '@/lib/api';
import { GuruProductCatalog } from '@/types';
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

type FormData = Omit<GuruProductCatalog, 'id' | 'createdAt' | 'updatedAt' | 'createdByAdminId' | 'updatedByAdminId' | 'localeTargetingJson' | 'regionTargetingJson' | 'startDate' | 'endDate'>;

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded accent-purple-500" />
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}

export default function GuruProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();

  const { data: product } = useQuery<GuruProductCatalog>({
    queryKey: ['guru-product', id],
    queryFn: () => guruProductsApi.get(Number(id)).then(r => r.data),
  });

  const { register, handleSubmit, control, reset } = useForm<FormData>();
  useEffect(() => { if (product) reset(product); }, [product, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => guruProductsApi.update(Number(id), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guru-products'] });
      qc.invalidateQueries({ queryKey: ['guru-product', id] });
      toast.success('Ürün güncellendi.');
      router.push('/monetization/guru-products');
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Güncelleme başarısız.'),
  });

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/monetization/guru-products"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <h1 className="text-2xl font-bold text-white">Guru Ürünü Düzenle</h1>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Product Key *</label>
              <Input {...register('productKey', { required: true })} className="font-mono" />
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
              <Input {...register('title', { required: true })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <Input {...register('description')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Guru Amount *</label>
              <Input {...register('guruAmount', { valueAsNumber: true })} type="number" min={0} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Bonus Guru Amount</label>
              <Input {...register('bonusGuruAmount', { valueAsNumber: true })} type="number" min={0} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Price</label>
              <Input {...register('price')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Currency</label>
              <Input {...register('currency')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">iOS Product ID</label>
              <Input {...register('iosProductId')} className="font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Android Product ID</label>
              <Input {...register('androidProductId')} className="font-mono" />
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
              <Input {...register('badge')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Campaign Label</label>
              <Input {...register('campaignLabel')} />
            </div>
          </div>

          <div className="border border-gray-700 rounded-lg p-4 space-y-3">
            <Controller name="isEnabled" control={control} render={({ field }) => <Checkbox label="Aktif" checked={!!field.value} onChange={field.onChange} />} />
          </div>

          {product && (
            <div className="text-xs text-gray-500 space-y-1">
              <p>Oluşturulma: {formatDate(product.createdAt)}</p>
              <p>Güncelleme: {formatDate(product.updatedAt)}</p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Link href="/monetization/guru-products"><Button variant="secondary">İptal</Button></Link>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
