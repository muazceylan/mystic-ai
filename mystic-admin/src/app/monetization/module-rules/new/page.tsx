'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { moduleRulesApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface FormData {
  moduleKey: string;
  isEnabled: boolean;
  configVersion: number;
  isAdsEnabled: boolean;
  adStrategy: string;
  adProvider: string;
  adFormats: string;
  firstNEntriesWithoutAd: number;
  adOfferStartEntry: number;
  adOfferFrequencyMode: string;
  minimumSessionsBetweenOffers: number;
  minimumHoursBetweenOffers: number;
  dailyOfferCap: number;
  weeklyOfferCap: number;
  isOnlyUserTriggeredOffer: boolean;
  isShowOfferOnDetailClick: boolean;
  isShowOfferOnSecondEntry: boolean;
  isGuruEnabled: boolean;
  isGuruPurchaseEnabled: boolean;
  guruRewardAmountPerCompletedAd: number;
  isAllowFreePreview: boolean;
  previewDepthMode: string;
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

export default function NewModuleRulePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      moduleKey: '',
      isEnabled: true,
      configVersion: 1,
      isAdsEnabled: true,
      adStrategy: 'ON_ENTRY',
      adProvider: 'admob',
      adFormats: 'REWARDED_VIDEO',
      firstNEntriesWithoutAd: 2,
      adOfferStartEntry: 3,
      adOfferFrequencyMode: 'EVERY_N_ENTRIES',
      minimumSessionsBetweenOffers: 1,
      minimumHoursBetweenOffers: 1,
      dailyOfferCap: 10,
      weeklyOfferCap: 50,
      isOnlyUserTriggeredOffer: false,
      isShowOfferOnDetailClick: false,
      isShowOfferOnSecondEntry: false,
      isGuruEnabled: true,
      isGuruPurchaseEnabled: false,
      guruRewardAmountPerCompletedAd: 5,
      isAllowFreePreview: true,
      previewDepthMode: 'SUMMARY_ONLY',
      rolloutStatus: 'DISABLED',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => moduleRulesApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['module-rules'] }); toast.success('Kural oluşturuldu.'); router.push('/monetization/module-rules'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Oluşturma başarısız.'),
  });

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/monetization/module-rules"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <h1 className="text-2xl font-bold text-white">Yeni Modül Kuralı</h1>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5 bg-gray-900 border border-gray-800 rounded-xl p-6">
          {/* Temel Ayarlar */}
          <div className="border border-gray-700 rounded-lg p-4 space-y-4">
            <p className="text-xs text-gray-400 uppercase font-semibold">Temel Ayarlar</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Module Key *</label>
                <Input {...register('moduleKey', { required: true })} className="font-mono" placeholder="dream_analysis" />
                {errors.moduleKey && <p className="text-red-400 text-xs mt-1">Zorunlu</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Config Version</label>
                <Input {...register('configVersion', { valueAsNumber: true })} type="number" min={1} />
              </div>
            </div>
            <Controller name="isEnabled" control={control} render={({ field }) => <Checkbox label="Aktif" value={!!field.value} onChange={field.onChange} />} />
          </div>

          {/* Reklam Ayarları */}
          <div className="border border-gray-700 rounded-lg p-4 space-y-4">
            <p className="text-xs text-gray-400 uppercase font-semibold">Reklam Ayarları</p>
            <Controller name="isAdsEnabled" control={control} render={({ field }) => <Checkbox label="Reklamlar Aktif" value={!!field.value} onChange={field.onChange} />} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Ad Strategy</label>
                <Select {...register('adStrategy')}>
                  <option value="ON_ENTRY">ON_ENTRY</option>
                  <option value="ON_DETAIL_CLICK">ON_DETAIL_CLICK</option>
                  <option value="ON_CTA_CLICK">ON_CTA_CLICK</option>
                  <option value="USER_TRIGGERED_ONLY">USER_TRIGGERED_ONLY</option>
                  <option value="MIXED">MIXED</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Ad Provider</label>
                <Input {...register('adProvider')} placeholder="admob" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Ad Formats</label>
              <Input {...register('adFormats')} placeholder="REWARDED_VIDEO,INTERSTITIAL" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">İlk N Giriş Reklamsız</label>
                <Input {...register('firstNEntriesWithoutAd', { valueAsNumber: true })} type="number" min={0} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Reklam Başlangıç Girişi</label>
                <Input {...register('adOfferStartEntry', { valueAsNumber: true })} type="number" min={0} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Teklif Frekans Modu</label>
              <Select {...register('adOfferFrequencyMode')}>
                <option value="EVERY_N_ENTRIES">EVERY_N_ENTRIES</option>
                <option value="TIME_BASED">TIME_BASED</option>
                <option value="SESSION_BASED">SESSION_BASED</option>
                <option value="COMBINED">COMBINED</option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Min Oturum Arası</label>
                <Input {...register('minimumSessionsBetweenOffers', { valueAsNumber: true })} type="number" min={0} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Min Saat Arası</label>
                <Input {...register('minimumHoursBetweenOffers', { valueAsNumber: true })} type="number" min={0} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Günlük Teklif Limiti</label>
                <Input {...register('dailyOfferCap', { valueAsNumber: true })} type="number" min={0} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Haftalık Teklif Limiti</label>
                <Input {...register('weeklyOfferCap', { valueAsNumber: true })} type="number" min={0} />
              </div>
            </div>
            <Controller name="isOnlyUserTriggeredOffer" control={control} render={({ field }) => <Checkbox label="Sadece Kullanıcı Tetikli Teklif" value={!!field.value} onChange={field.onChange} />} />
            <Controller name="isShowOfferOnDetailClick" control={control} render={({ field }) => <Checkbox label="Detay Tıklamasında Teklif Göster" value={!!field.value} onChange={field.onChange} />} />
            <Controller name="isShowOfferOnSecondEntry" control={control} render={({ field }) => <Checkbox label="İkinci Girişte Teklif Göster" value={!!field.value} onChange={field.onChange} />} />
          </div>

          {/* Guru Ayarları */}
          <div className="border border-gray-700 rounded-lg p-4 space-y-4">
            <p className="text-xs text-gray-400 uppercase font-semibold">Guru Ayarları</p>
            <Controller name="isGuruEnabled" control={control} render={({ field }) => <Checkbox label="Guru Aktif" value={!!field.value} onChange={field.onChange} />} />
            <Controller name="isGuruPurchaseEnabled" control={control} render={({ field }) => <Checkbox label="Guru Satın Alma Aktif" value={!!field.value} onChange={field.onChange} />} />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Reklam Başına Guru Ödülü</label>
              <Input {...register('guruRewardAmountPerCompletedAd', { valueAsNumber: true })} type="number" min={0} />
            </div>
          </div>

          {/* Önizleme */}
          <div className="border border-gray-700 rounded-lg p-4 space-y-4">
            <p className="text-xs text-gray-400 uppercase font-semibold">Önizleme</p>
            <Controller name="isAllowFreePreview" control={control} render={({ field }) => <Checkbox label="Ücretsiz Önizlemeye İzin Ver" value={!!field.value} onChange={field.onChange} />} />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Önizleme Derinlik Modu</label>
              <Select {...register('previewDepthMode')}>
                <option value="NONE">NONE</option>
                <option value="SUMMARY_ONLY">SUMMARY_ONLY</option>
                <option value="PARTIAL_CONTENT">PARTIAL_CONTENT</option>
                <option value="FULL_WITH_BLUR">FULL_WITH_BLUR</option>
              </Select>
            </div>
          </div>

          {/* Rollout */}
          <div className="border border-gray-700 rounded-lg p-4 space-y-4">
            <p className="text-xs text-gray-400 uppercase font-semibold">Rollout</p>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Rollout Status</label>
              <Select {...register('rolloutStatus')}>
                <option value="DISABLED">DISABLED</option>
                <option value="INTERNAL_ONLY">INTERNAL_ONLY</option>
                <option value="PERCENTAGE_ROLLOUT">PERCENTAGE_ROLLOUT</option>
                <option value="ENABLED">ENABLED</option>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Link href="/monetization/module-rules"><Button variant="secondary">İptal</Button></Link>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}</Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
