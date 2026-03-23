'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moduleRulesApi } from '@/lib/api';
import { ModuleMonetizationRule } from '@/types';
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

type FormData = Omit<ModuleMonetizationRule, 'id' | 'createdAt' | 'updatedAt' | 'createdByAdminId' | 'updatedByAdminId'>;

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded accent-purple-500" />
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}

export default function ModuleRuleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();

  const { data: rule } = useQuery<ModuleMonetizationRule>({
    queryKey: ['module-rule', id],
    queryFn: () => moduleRulesApi.get(Number(id)).then(r => r.data),
  });

  const { register, handleSubmit, control, reset } = useForm<FormData>();
  useEffect(() => { if (rule) reset(rule); }, [rule, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => moduleRulesApi.update(Number(id), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['module-rules'] });
      qc.invalidateQueries({ queryKey: ['module-rule', id] });
      toast.success('Kural güncellendi.');
      router.push('/monetization/module-rules');
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Güncelleme başarısız.'),
  });

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/monetization/module-rules"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <h1 className="text-2xl font-bold text-white">Modül Kuralı Düzenle</h1>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5 bg-gray-900 border border-gray-800 rounded-xl p-6">
          {/* Temel Ayarlar */}
          <div className="border border-gray-700 rounded-lg p-4 space-y-4">
            <p className="text-xs text-gray-400 uppercase font-semibold">Temel Ayarlar</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Module Key *</label>
                <Input {...register('moduleKey', { required: true })} className="font-mono" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Config Version</label>
                <Input {...register('configVersion', { valueAsNumber: true })} type="number" min={1} />
              </div>
            </div>
            <Controller name="isEnabled" control={control} render={({ field }) => <Checkbox label="Aktif" checked={!!field.value} onChange={field.onChange} />} />
          </div>

          {/* Reklam Ayarları */}
          <div className="border border-gray-700 rounded-lg p-4 space-y-4">
            <p className="text-xs text-gray-400 uppercase font-semibold">Reklam Ayarları</p>
            <Controller name="isAdsEnabled" control={control} render={({ field }) => <Checkbox label="Reklamlar Aktif" checked={!!field.value} onChange={field.onChange} />} />
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
                <Input {...register('adProvider')} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Ad Formats</label>
              <Input {...register('adFormats')} />
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
            <Controller name="isOnlyUserTriggeredOffer" control={control} render={({ field }) => <Checkbox label="Sadece Kullanıcı Tetikli Teklif" checked={!!field.value} onChange={field.onChange} />} />
            <Controller name="isShowOfferOnDetailClick" control={control} render={({ field }) => <Checkbox label="Detay Tıklamasında Teklif Göster" checked={!!field.value} onChange={field.onChange} />} />
            <Controller name="isShowOfferOnSecondEntry" control={control} render={({ field }) => <Checkbox label="İkinci Girişte Teklif Göster" checked={!!field.value} onChange={field.onChange} />} />
          </div>

          {/* Guru Ayarları */}
          <div className="border border-gray-700 rounded-lg p-4 space-y-4">
            <p className="text-xs text-gray-400 uppercase font-semibold">Guru Ayarları</p>
            <Controller name="isGuruEnabled" control={control} render={({ field }) => <Checkbox label="Guru Aktif" checked={!!field.value} onChange={field.onChange} />} />
            <Controller name="isGuruPurchaseEnabled" control={control} render={({ field }) => <Checkbox label="Guru Satın Alma Aktif" checked={!!field.value} onChange={field.onChange} />} />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Reklam Başına Guru Ödülü</label>
              <Input {...register('guruRewardAmountPerCompletedAd', { valueAsNumber: true })} type="number" min={0} />
            </div>
          </div>

          {/* Önizleme */}
          <div className="border border-gray-700 rounded-lg p-4 space-y-4">
            <p className="text-xs text-gray-400 uppercase font-semibold">Önizleme</p>
            <Controller name="isAllowFreePreview" control={control} render={({ field }) => <Checkbox label="Ücretsiz Önizlemeye İzin Ver" checked={!!field.value} onChange={field.onChange} />} />
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

          {rule && (
            <div className="text-xs text-gray-500 space-y-1">
              <p>Oluşturulma: {formatDate(rule.createdAt)}</p>
              <p>Güncelleme: {formatDate(rule.updatedAt)}</p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Link href="/monetization/module-rules"><Button variant="secondary">İptal</Button></Link>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
