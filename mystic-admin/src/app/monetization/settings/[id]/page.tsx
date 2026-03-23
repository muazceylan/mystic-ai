'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { monetizationSettingsApi } from '@/lib/api';
import { MonetizationSettings } from '@/types';
import { formatDate, statusColor } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { use, useEffect } from 'react';

type FormData = Omit<MonetizationSettings, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'configVersion' | 'publishedByAdminId' | 'publishedAt' | 'createdByAdminId' | 'updatedByAdminId'>;

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded accent-purple-500" />
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}

export default function MonetizationSettingsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();

  const { data: settings } = useQuery<MonetizationSettings>({
    queryKey: ['monetization-setting', id],
    queryFn: () => monetizationSettingsApi.get(Number(id)).then(r => r.data),
  });

  const { register, handleSubmit, control, reset } = useForm<FormData>();
  useEffect(() => { if (settings) reset(settings); }, [settings, reset]);

  const updateMut = useMutation({
    mutationFn: (data: FormData) => monetizationSettingsApi.update(Number(id), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monetization-settings'] });
      qc.invalidateQueries({ queryKey: ['monetization-setting', id] });
      toast.success('Ayar güncellendi.');
      router.push('/monetization/settings');
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Güncelleme başarısız.'),
  });

  const publishMut = useMutation({
    mutationFn: () => monetizationSettingsApi.publish(Number(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monetization-settings'] });
      qc.invalidateQueries({ queryKey: ['monetization-setting', id] });
      toast.success('Yayınlandı.');
      router.push('/monetization/settings');
    },
    onError: () => toast.error('Yayınlama başarısız.'),
  });

  const archiveMut = useMutation({
    mutationFn: () => monetizationSettingsApi.archive(Number(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monetization-settings'] });
      qc.invalidateQueries({ queryKey: ['monetization-setting', id] });
      toast.success('Arşivlendi.');
      router.push('/monetization/settings');
    },
    onError: () => toast.error('Arşivleme başarısız.'),
  });

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/monetization/settings"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <h1 className="text-2xl font-bold text-white">Monetization Ayar Detay</h1>
        {settings && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(settings.status)}`}>{settings.status}</span>
        )}
        {settings && (
          <span className="text-xs text-gray-500">v{settings.configVersion}</span>
        )}
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit(d => updateMut.mutate(d))} className="space-y-5 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Settings Key *</label>
            <Input {...register('settingsKey', { required: true })} className="font-mono" />
          </div>

          <div className="border border-gray-700 rounded-lg p-4 space-y-3">
            <p className="text-xs text-gray-400 uppercase font-semibold">Genel Ayarlar</p>
            <Controller name="isEnabled" control={control} render={({ field }) => <Checkbox label="Monetization Aktif" checked={!!field.value} onChange={field.onChange} />} />
            <Controller name="isAdsEnabled" control={control} render={({ field }) => <Checkbox label="Reklamlar Aktif" checked={!!field.value} onChange={field.onChange} />} />
            <Controller name="isGuruEnabled" control={control} render={({ field }) => <Checkbox label="Guru Sistemi Aktif" checked={!!field.value} onChange={field.onChange} />} />
            <Controller name="isGuruPurchaseEnabled" control={control} render={({ field }) => <Checkbox label="Guru Satın Alma Aktif" checked={!!field.value} onChange={field.onChange} />} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Default Ad Provider</label>
              <Input {...register('defaultAdProvider')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Default Currency</label>
              <Input {...register('defaultCurrency')} />
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

          {settings && (
            <div className="text-xs text-gray-500 space-y-1">
              <p>Oluşturulma: {formatDate(settings.createdAt)}</p>
              <p>Güncelleme: {formatDate(settings.updatedAt)}</p>
              {settings.publishedAt && <p>Yayınlanma: {formatDate(settings.publishedAt)}</p>}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Link href="/monetization/settings"><Button variant="secondary">İptal</Button></Link>
            {settings?.status === 'DRAFT' && (
              <Button type="button" variant="primary" disabled={publishMut.isPending} onClick={() => publishMut.mutate()}>
                {publishMut.isPending ? 'Yayınlanıyor...' : 'Yayınla'}
              </Button>
            )}
            {settings?.status === 'PUBLISHED' && (
              <Button type="button" variant="danger" disabled={archiveMut.isPending} onClick={() => archiveMut.mutate()}>
                {archiveMut.isPending ? 'Arşivleniyor...' : 'Arşivle'}
              </Button>
            )}
            <Button type="submit" disabled={updateMut.isPending}>
              {updateMut.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
