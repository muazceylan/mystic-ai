'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { moduleRulesApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getPremiumRuleWarnings, PREMIUM_BEHAVIOR_OPTIONS } from '@/lib/monetizationPremiumRules';

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
  rewardedAdEnabled: boolean;
  rewardedAdViewsRequired: number | null;
  rewardedAdHourlyLimit: number;
  rewardedAdDailyLimit: number;
  rewardedAdCooldownMinutes: number;
  rewardedAdWindowMinutes: number;
  isAllowFreePreview: boolean;
  previewDepthMode: string;
  premiumBehavior: string;
  premiumTokenCost: number;
  isPremiumAdFree: boolean;
  isTrialUnlockEnabled: boolean;
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
      rewardedAdEnabled: true,
      rewardedAdViewsRequired: null,
      rewardedAdHourlyLimit: 3,
      rewardedAdDailyLimit: 10,
      rewardedAdCooldownMinutes: 60,
      rewardedAdWindowMinutes: 60,
      isAllowFreePreview: true,
      previewDepthMode: 'SUMMARY_ONLY',
      premiumBehavior: 'NO_CHANGE',
      premiumTokenCost: 0,
      isPremiumAdFree: false,
      isTrialUnlockEnabled: false,
      rolloutStatus: 'DISABLED',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => moduleRulesApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['module-rules'] }); toast.success('Kural oluşturuldu.'); router.push('/monetization/module-rules'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Oluşturma başarısız.'),
  });

  const premiumBehavior = useWatch({ control, name: 'premiumBehavior' });
  const premiumTokenCost = useWatch({ control, name: 'premiumTokenCost' });
  const isPremiumAdFree = useWatch({ control, name: 'isPremiumAdFree' });
  const premiumWarnings = getPremiumRuleWarnings({
    premiumBehavior: premiumBehavior as FormData['premiumBehavior'],
    premiumTokenCost,
    isPremiumAdFree,
  });

  const sanitizePayload = (data: FormData): FormData => ({
    ...data,
    rewardedAdViewsRequired: Number.isFinite(data.rewardedAdViewsRequired)
      ? data.rewardedAdViewsRequired
      : null,
  });

  const submitForm = (data: FormData) => {
    const payload = sanitizePayload(data);
    if (payload.rewardedAdDailyLimit < payload.rewardedAdHourlyLimit) {
      toast.error('Daily Ad Limit, Hourly Ad Limit değerinden küçük olamaz.');
      return;
    }
    mutation.mutate(payload);
  };

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/monetization/module-rules"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <h1 className="text-2xl font-bold text-white">Yeni Modül Kuralı</h1>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit(submitForm)} className="space-y-5 bg-gray-900 border border-gray-800 rounded-xl p-6">
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

          {/* Rewarded Unlock */}
          <div className="border border-purple-800/60 rounded-lg p-4 space-y-4 bg-purple-950/20">
            <p className="text-xs text-purple-200 uppercase font-semibold">Rewarded Unlock</p>
            <Controller name="rewardedAdEnabled" control={control} render={({ field }) => <Checkbox label="Rewarded Ad Enabled" value={!!field.value} onChange={field.onChange} />} />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Rewarded Ad Views Required</label>
              <Input
                {...register('rewardedAdViewsRequired', {
                  setValueAs: (value) => value === '' || value === null ? null : Number(value),
                  min: 1,
                })}
                type="number"
                min={1}
                placeholder="Action Guru cost kadar"
              />
              <p className="text-xs text-gray-500 mt-1">
                Boş bırakılırsa action Guru cost kadar reklam izletilir.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Hourly Ad Limit</label>
                <Input {...register('rewardedAdHourlyLimit', { valueAsNumber: true, min: 1 })} type="number" min={1} />
                <p className="text-xs text-gray-500 mt-1">Kullanıcının bu modül/action için pencere içinde izleyebileceği maksimum reklam sayısı.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Daily Ad Limit</label>
                <Input {...register('rewardedAdDailyLimit', { valueAsNumber: true, min: 1 })} type="number" min={1} />
                <p className="text-xs text-gray-500 mt-1">Kullanıcının bir günde izleyebileceği maksimum reklam sayısı.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Cooldown Minutes</label>
                <Input {...register('rewardedAdCooldownMinutes', { valueAsNumber: true, min: 1 })} type="number" min={1} />
                <p className="text-xs text-gray-500 mt-1">Limit dolunca tekrar reklam izlemek için bekleme süresi.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Window Minutes</label>
                <Input {...register('rewardedAdWindowMinutes', { valueAsNumber: true, min: 1 })} type="number" min={1} />
                <p className="text-xs text-gray-500 mt-1">Hourly limit hesabında kullanılacak hareketli zaman penceresi.</p>
              </div>
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

          {/* Premium / Trial */}
          <div className="border border-gray-700 rounded-lg p-4 space-y-4">
            <p className="text-xs text-gray-400 uppercase font-semibold">Premium &amp; Trial</p>
            <p className="text-xs text-gray-500">
              Aktif premium veya trial entitlement&apos;ı olan kullanıcılar için bu modülün davranışı. Trial kullanıcıların premium kuralına dahil olması için ayrıca trial unlock açılmalıdır.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Premium Davranışı</label>
              <Select {...register('premiumBehavior')}>
                {PREMIUM_BEHAVIOR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} — {option.description}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Premium Token Cost (DISCOUNT için)</label>
              <Input
                {...register('premiumTokenCost', { valueAsNumber: true })}
                type="number"
                min={0}
                disabled={premiumBehavior !== 'DISCOUNT_TOKEN_COST'}
              />
              <p className="text-xs text-gray-500 mt-1">
                Sadece `DISCOUNT_TOKEN_COST` seçiliyken anlamlıdır. `0` girilirse premium kullanıcı fiilen ücretsiz unlock alır.
              </p>
            </div>
            <Controller name="isPremiumAdFree" control={control} render={({ field }) => <Checkbox label="Premium kullanıcı reklam görmesin" value={!!field.value} onChange={field.onChange} />} />
            <Controller name="isTrialUnlockEnabled" control={control} render={({ field }) => <Checkbox label="Trial kullanıcılar için de unlock" value={!!field.value} onChange={field.onChange} />} />
            <p className="text-xs text-gray-500">
              Trial unlock kapalıysa `TRIALING` kullanıcı free kullanıcı gibi davranır; açık olduğunda premium behavior tablosuna dahil edilir.
            </p>
            {premiumWarnings.map((warning) => (
              <div
                key={warning.id}
                className={`rounded-lg border px-3 py-2 text-xs ${
                  warning.tone === 'warning'
                    ? 'border-amber-700/60 bg-amber-950/40 text-amber-200'
                    : 'border-sky-800/60 bg-sky-950/30 text-sky-200'
                }`}
              >
                {warning.message}
              </div>
            ))}
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
