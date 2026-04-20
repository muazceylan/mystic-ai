'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { monetizationActionsApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface FormData {
  actionKey: string;
  moduleKey: string;
  displayName: string;
  description: string;
  dialogTitle: string;
  dialogDescription: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  analyticsKey: string;
  unlockType: string;
  guruCost: number;
  rewardAmount: number;
  isRewardFallbackEnabled: boolean;
  isAdRequired: boolean;
  isPurchaseRequired: boolean;
  isPreviewAllowed: boolean;
  isEnabled: boolean;
  displayPriority: number;
  dailyLimit: number;
  weeklyLimit: number;
}

function Checkbox({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} className="w-4 h-4 rounded accent-purple-500" />
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}

export default function NewMonetizationActionPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      actionKey: '',
      moduleKey: '',
      displayName: '',
      description: '',
      dialogTitle: '',
      dialogDescription: '',
      primaryCtaLabel: '',
      secondaryCtaLabel: '',
      analyticsKey: '',
      unlockType: 'FREE',
      guruCost: 0,
      rewardAmount: 0,
      isRewardFallbackEnabled: false,
      isAdRequired: false,
      isPurchaseRequired: false,
      isPreviewAllowed: true,
      isEnabled: true,
      displayPriority: 0,
      dailyLimit: 0,
      weeklyLimit: 0,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => monetizationActionsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['monetization-actions'] }); toast.success('Aksiyon oluşturuldu.'); router.push('/monetization/actions'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Oluşturma başarısız.'),
  });

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/monetization/actions"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <h1 className="text-2xl font-bold text-white">Yeni Aksiyon</h1>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Action Key *</label>
              <Input {...register('actionKey', { required: true })} className="font-mono" placeholder="dream_interpret" />
              {errors.actionKey && <p className="text-red-400 text-xs mt-1">Zorunlu</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Module Key *</label>
              <Input {...register('moduleKey', { required: true })} className="font-mono" placeholder="dream_analysis" />
              {errors.moduleKey && <p className="text-red-400 text-xs mt-1">Zorunlu</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
              <Input {...register('displayName')} placeholder="Rüya Yorumu" />
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
            <Input {...register('description')} placeholder="Aksiyon açıklaması" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Dialog Title</label>
              <Input {...register('dialogTitle')} placeholder="1 Guru Token ile aç" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Analytics Key</label>
              <Input {...register('analyticsKey')} className="font-mono" placeholder="SHAREABLE_CARD_CREATE" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Dialog Description</label>
            <textarea
              {...register('dialogDescription')}
              rows={3}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
              placeholder="Yetersiz bakiyede video izleme fallback metni dahil açıklama"
            />
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Primary CTA</label>
              <Input {...register('primaryCtaLabel')} placeholder="1 Guru Token ile aç" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Secondary CTA</label>
              <Input {...register('secondaryCtaLabel')} placeholder="Video izle, Guru kazan" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Daily Limit</label>
              <Input {...register('dailyLimit', { valueAsNumber: true })} type="number" min={0} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Weekly Limit</label>
              <Input {...register('weeklyLimit', { valueAsNumber: true })} type="number" min={0} />
            </div>
          </div>

          <div className="border border-gray-700 rounded-lg p-4 space-y-3">
            <p className="text-xs text-gray-400 uppercase font-semibold">Seçenekler</p>
            <Controller name="isRewardFallbackEnabled" control={control} render={({ field }) => <Checkbox label="Yetersiz Bakiye Reward Fallback" value={!!field.value} onChange={field.onChange} />} />
            <Controller name="isAdRequired" control={control} render={({ field }) => <Checkbox label="Reklam Zorunlu" value={!!field.value} onChange={field.onChange} />} />
            <Controller name="isPurchaseRequired" control={control} render={({ field }) => <Checkbox label="Satın Alma Zorunlu" value={!!field.value} onChange={field.onChange} />} />
            <Controller name="isPreviewAllowed" control={control} render={({ field }) => <Checkbox label="Önizlemeye İzin Ver" value={!!field.value} onChange={field.onChange} />} />
            <Controller name="isEnabled" control={control} render={({ field }) => <Checkbox label="Aktif" value={!!field.value} onChange={field.onChange} />} />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Link href="/monetization/actions"><Button variant="secondary">İptal</Button></Link>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}</Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
