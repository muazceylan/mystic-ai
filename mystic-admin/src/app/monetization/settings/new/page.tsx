'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { monetizationSettingsApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { mergeWebAdsEnabled } from '@/lib/monetizationEnvironmentRules';

interface FormData {
  settingsKey: string;
  isEnabled: boolean;
  isAdsEnabled: boolean;
  webAdsEnabled: boolean;
  isGuruEnabled: boolean;
  isGuruPurchaseEnabled: boolean;
  isSignupBonusEnabled: boolean;
  signupBonusTokenAmount: number;
  signupBonusLedgerReason: string;
  isSignupBonusOneTimeOnly: boolean;
  signupBonusRegistrationSource: string;
  signupBonusHelperText: string;
  defaultAdProvider: string;
  defaultCurrency: string;
  globalDailyAdCap: number;
  globalWeeklyAdCap: number;
  globalMinHoursBetweenOffers: number;
  globalMinSessionsBetweenOffers: number;
  environmentRulesJson?: string;
}

function Checkbox({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} className="w-4 h-4 rounded accent-purple-500" />
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}

export default function NewMonetizationSettingsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      settingsKey: 'default',
      isEnabled: true,
      isAdsEnabled: true,
      webAdsEnabled: true,
      isGuruEnabled: true,
      isGuruPurchaseEnabled: false,
      isSignupBonusEnabled: true,
      signupBonusTokenAmount: 10,
      signupBonusLedgerReason: 'SIGNUP_BONUS',
      isSignupBonusOneTimeOnly: true,
      signupBonusRegistrationSource: '',
      signupBonusHelperText: 'Yeni üyeler için tek seferlik hoş geldin bakiyesi.',
      defaultAdProvider: 'admob',
      defaultCurrency: 'TRY',
      globalDailyAdCap: 10,
      globalWeeklyAdCap: 50,
      globalMinHoursBetweenOffers: 1,
      globalMinSessionsBetweenOffers: 1,
    },
  });

  const mutation = useMutation({
    mutationFn: ({ webAdsEnabled, ...data }: FormData) =>
      monetizationSettingsApi.create({
        ...data,
        environmentRulesJson: mergeWebAdsEnabled(data.environmentRulesJson, webAdsEnabled),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['monetization-settings'] }); toast.success('Ayar oluşturuldu.'); router.push('/monetization/settings'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Oluşturma başarısız.'),
  });

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/monetization/settings"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <h1 className="text-2xl font-bold text-white">Yeni Monetization Ayarı</h1>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Settings Key *</label>
            <Input {...register('settingsKey', { required: true })} className="font-mono" placeholder="default" />
            {errors.settingsKey && <p className="text-red-400 text-xs mt-1">Zorunlu</p>}
          </div>

          <div className="border border-gray-700 rounded-lg p-4 space-y-3">
            <p className="text-xs text-gray-400 uppercase font-semibold">Genel Ayarlar</p>
            <Controller name="isEnabled" control={control} render={({ field }) => <Checkbox label="Monetization Aktif" value={!!field.value} onChange={field.onChange} />} />
            <Controller name="isAdsEnabled" control={control} render={({ field }) => <Checkbox label="Reklamlar Aktif" value={!!field.value} onChange={field.onChange} />} />
            <Controller
              name="webAdsEnabled"
              control={control}
              render={({ field }) => (
                <Checkbox
                  label="Web'de Reklamlar Aktif"
                  value={!!field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <p className="text-xs text-gray-500">
              Web tarafında rewarded ads desteklenmiyorsa bu seçeneği kapatıp reklam tekliflerini gizleyebilirsiniz.
            </p>
            <Controller name="isGuruEnabled" control={control} render={({ field }) => <Checkbox label="Guru Sistemi Aktif" value={!!field.value} onChange={field.onChange} />} />
            <Controller name="isGuruPurchaseEnabled" control={control} render={({ field }) => <Checkbox label="Guru Satın Alma Aktif" value={!!field.value} onChange={field.onChange} />} />
          </div>

          <div className="border border-gray-700 rounded-lg p-4 space-y-3">
            <p className="text-xs text-gray-400 uppercase font-semibold">Signup Bonus</p>
            <Controller name="isSignupBonusEnabled" control={control} render={({ field }) => <Checkbox label="Signup Bonus Aktif" value={!!field.value} onChange={field.onChange} />} />
            <Controller name="isSignupBonusOneTimeOnly" control={control} render={({ field }) => <Checkbox label="Sadece Bir Kez Ver" value={!!field.value} onChange={field.onChange} />} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Default Ad Provider</label>
              <Input {...register('defaultAdProvider')} placeholder="admob" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Default Currency</label>
              <Input {...register('defaultCurrency')} placeholder="TRY" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Günlük Reklam Limiti</label>
              <Input {...register('globalDailyAdCap', { valueAsNumber: true })} type="number" min={0} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Haftalık Reklam Limiti</label>
              <Input {...register('globalWeeklyAdCap', { valueAsNumber: true })} type="number" min={0} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Teklifler Arası Min Saat</label>
              <Input {...register('globalMinHoursBetweenOffers', { valueAsNumber: true })} type="number" min={0} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Teklifler Arası Min Oturum</label>
              <Input {...register('globalMinSessionsBetweenOffers', { valueAsNumber: true })} type="number" min={0} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Signup Bonus Token</label>
              <Input {...register('signupBonusTokenAmount', { valueAsNumber: true })} type="number" min={0} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Ledger Reason</label>
              <Input {...register('signupBonusLedgerReason')} className="font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Registration Source Filter</label>
              <Input {...register('signupBonusRegistrationSource')} placeholder="SOCIAL_GOOGLE / EMAIL_REGISTER" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Helper Text</label>
              <Input {...register('signupBonusHelperText')} />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Link href="/monetization/settings"><Button variant="secondary">İptal</Button></Link>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}</Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
