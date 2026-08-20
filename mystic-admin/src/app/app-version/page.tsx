'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { AlertTriangle, Apple, Smartphone, Save } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { appVersionApi } from '@/lib/api';
import {
  buildUpdateBands,
  hasErrors,
  validateAppVersionPolicy,
  type AppVersionFieldErrors,
} from '@/lib/appVersionPolicy';
import type { AppUpdateStatus, AppVersionPlatform, AppVersionPolicy, AppVersionPolicyPayload } from '@/types';

const PLATFORMS: { key: AppVersionPlatform; label: string; icon: typeof Apple }[] = [
  { key: 'ios', label: 'iOS', icon: Apple },
  { key: 'android', label: 'Android', icon: Smartphone },
];

const STATUS_STYLES: Record<AppUpdateStatus, { label: string; className: string }> = {
  UP_TO_DATE: { label: 'Güncel', className: 'bg-green-900/60 text-green-300 border-green-700' },
  OPTIONAL_UPDATE: { label: 'Opsiyonel güncelleme', className: 'bg-amber-900/60 text-amber-300 border-amber-700' },
  FORCE_UPDATE: { label: 'Zorunlu güncelleme', className: 'bg-red-900/60 text-red-300 border-red-700' },
};

const EMPTY_POLICY: AppVersionPolicyPayload = {
  latestVersion: '0.0.0',
  latestBuild: 0,
  minimumSupportedVersion: '0.0.0',
  minimumSupportedBuild: 0,
  forceUpdateEnabled: false,
  optionalUpdateEnabled: true,
  storeUrl: '',
  androidStoreUrl: '',
  titleTr: '',
  messageTr: '',
  titleEn: '',
  messageEn: '',
};

function toFormValues(policy: AppVersionPolicy): AppVersionPolicyPayload {
  return {
    latestVersion: policy.latestVersion ?? '0.0.0',
    latestBuild: policy.latestBuild ?? 0,
    minimumSupportedVersion: policy.minimumSupportedVersion ?? '0.0.0',
    minimumSupportedBuild: policy.minimumSupportedBuild ?? 0,
    forceUpdateEnabled: policy.forceUpdateEnabled,
    optionalUpdateEnabled: policy.optionalUpdateEnabled,
    storeUrl: policy.storeUrl ?? '',
    androidStoreUrl: policy.androidStoreUrl ?? '',
    titleTr: policy.titleTr ?? '',
    messageTr: policy.messageTr ?? '',
    titleEn: policy.titleEn ?? '',
    messageEn: policy.messageEn ?? '',
  };
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 w-4 h-4 rounded accent-purple-500"
      />
      <span>
        <span className="block text-sm font-medium text-gray-200">{label}</span>
        <span className="block text-xs text-gray-500">{hint}</span>
      </span>
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-400">{message}</p>;
}

export default function AppVersionPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [platform, setPlatform] = useState<AppVersionPlatform>('android');
  const [errors, setErrors] = useState<AppVersionFieldErrors>({});
  const [pendingSave, setPendingSave] = useState<AppVersionPolicyPayload | null>(null);

  const { data: policy, isLoading } = useQuery<AppVersionPolicy>({
    queryKey: ['app-version', platform],
    queryFn: () => appVersionApi.get(platform).then((r) => r.data),
  });

  const { register, control, handleSubmit, reset } = useForm<AppVersionPolicyPayload>({
    defaultValues: EMPTY_POLICY,
  });

  // Reset per platform so switching tabs never carries one platform's values into the other.
  useEffect(() => {
    if (policy) reset(toFormValues(policy));
  }, [policy, reset]);

  const values = useWatch({ control }) as AppVersionPolicyPayload;
  const bands = useMemo(() => buildUpdateBands({ ...EMPTY_POLICY, ...values }), [values]);

  const mutation = useMutation({
    mutationFn: (data: AppVersionPolicyPayload) => appVersionApi.save(platform, data),
    onSuccess: (response) => {
      // The public check reads these rows directly, so the new policy is live immediately.
      qc.invalidateQueries({ queryKey: ['app-version'] });
      reset(toFormValues(response.data));
      setPendingSave(null);
      toast.success('Mobil uygulama sürüm ayarları başarıyla güncellendi.');
    },
    onError: (e: unknown) => {
      // The form keeps its current values — the admin can correct and retry.
      const err = e as { response?: { data?: { error?: string; message?: string } } };
      setPendingSave(null);
      toast.error(err?.response?.data?.error ?? err?.response?.data?.message ?? 'Kaydedilemedi.');
    },
  });

  const previousMinBuild = policy?.minimumSupportedBuild ?? 0;

  function onSubmit(data: AppVersionPolicyPayload) {
    const normalized: AppVersionPolicyPayload = {
      ...data,
      latestBuild: Number(data.latestBuild),
      minimumSupportedBuild: Number(data.minimumSupportedBuild),
      latestVersion: (data.latestVersion ?? '').trim(),
      minimumSupportedVersion: (data.minimumSupportedVersion ?? '').trim(),
    };

    const validation = validateAppVersionPolicy(normalized);
    setErrors(validation);
    if (hasErrors(validation)) {
      toast.error('Lütfen işaretli alanları düzeltin.');
      return;
    }

    // Raising the floor with enforcement on locks production users out on their next launch.
    const locksUsersOut =
      normalized.forceUpdateEnabled && normalized.minimumSupportedBuild > previousMinBuild;

    if (locksUsersOut) {
      setPendingSave(normalized);
      return;
    }
    mutation.mutate(normalized);
  }

  const platformLabel = platform === 'ios' ? 'iOS' : 'Android';
  const storeLabel = platform === 'ios' ? 'App Store URL' : 'Google Play URL';

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Mobil Uygulama Sürümü</h1>
        <p className="text-sm text-gray-400 mt-1">
          Güncelleme politikasını yönetin. Kullanıcının yüklü sürümünü girmeyin — uygulama bunu
          kendi paket bilgisinden okur ve sunucuya kendisi bildirir.
        </p>
      </div>

      {/* Platform tabs */}
      <div className="flex gap-2 mb-6">
        {PLATFORMS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => {
              setPlatform(key);
              setErrors({});
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              platform === key
                ? 'bg-purple-900/50 text-purple-200 border-purple-700'
                : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-64 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="xl:col-span-2 space-y-6 bg-gray-900 border border-gray-800 rounded-xl p-6"
          >
            <div>
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
                {platformLabel} sürüm bilgisi
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">En Son Sürüm *</label>
                  <Input {...register('latestVersion')} placeholder="1.2.0" className="font-mono" />
                  <FieldError message={errors.latestVersion} />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">En Son Build *</label>
                  <Input
                    {...register('latestBuild', { valueAsNumber: true })}
                    type="number"
                    min={0}
                    step={1}
                    className="font-mono"
                  />
                  <FieldError message={errors.latestBuild} />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Minimum Desteklenen Sürüm *
                  </label>
                  <Input
                    {...register('minimumSupportedVersion')}
                    placeholder="1.1.0"
                    className="font-mono"
                  />
                  <FieldError message={errors.minimumSupportedVersion} />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Minimum Desteklenen Build *
                  </label>
                  <Input
                    {...register('minimumSupportedBuild', { valueAsNumber: true })}
                    type="number"
                    min={0}
                    step={1}
                    className="font-mono"
                  />
                  <FieldError message={errors.minimumSupportedBuild} />
                </div>
              </div>
            </div>

            <div className="border border-gray-800 rounded-lg p-4 space-y-4">
              <Controller
                name="forceUpdateEnabled"
                control={control}
                render={({ field }) => (
                  <Toggle
                    label="Zorunlu Güncelleme Aktif"
                    hint="Minimum desteklenen build'in altındaki kullanıcılar uygulamayı kullanamaz."
                    checked={!!field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <Controller
                name="optionalUpdateEnabled"
                control={control}
                render={({ field }) => (
                  <Toggle
                    label="Opsiyonel Güncelleme Aktif"
                    hint="Desteklenen ama en son build'in altındaki kullanıcılara kapatılabilir bir hatırlatma gösterilir."
                    checked={!!field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">{storeLabel} *</label>
              <Input
                {...register('storeUrl')}
                placeholder={
                  platform === 'ios'
                    ? 'https://apps.apple.com/app/id...'
                    : 'https://play.google.com/store/apps/details?id=com.astroguru.mmc'
                }
              />
              <FieldError message={errors.storeUrl} />
            </div>

            {platform === 'android' && (
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Play Store Deep Link (opsiyonel)
                </label>
                <Input
                  {...register('androidStoreUrl')}
                  placeholder="market://details?id=com.astroguru.mmc"
                  className="font-mono"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Play uygulamasını doğrudan açar; açılamazsa yukarıdaki https bağlantısına düşülür.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase">Türkçe metin</p>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Başlık</label>
                  <Input {...register('titleTr')} placeholder="AstroGuru'nun yeni sürümü hazır" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Mesaj</label>
                  <textarea
                    {...register('messageTr')}
                    rows={3}
                    placeholder="Devam etmek için AstroGuru'yu güncelle."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase">İngilizce metin</p>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Başlık</label>
                  <Input {...register('titleEn')} placeholder="A new version of AstroGuru is ready" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Mesaj</label>
                  <textarea
                    {...register('messageEn')}
                    rows={3}
                    placeholder="Please update AstroGuru to continue."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-800">
              <p className="text-xs text-gray-500">
                {policy?.updatedAt
                  ? `Son güncelleme: ${new Date(policy.updatedAt).toLocaleString('tr-TR')}`
                  : 'Henüz kaydedilmedi.'}
              </p>
              <Button type="submit" disabled={mutation.isPending}>
                <Save className="w-4 h-4" />
                {mutation.isPending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </Button>
            </div>
          </form>

          {/* Live preview — UI only; the backend decides the real status. */}
          <aside className="bg-gray-900 border border-gray-800 rounded-xl p-6 h-fit">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">
              {platformLabel} güncelleme politikası
            </h2>

            <dl className="space-y-3 text-sm mb-5">
              <div>
                <dt className="text-gray-500">En son</dt>
                <dd className="text-white font-mono">
                  {values.latestVersion || '—'} (Build {values.latestBuild ?? 0})
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Minimum desteklenen</dt>
                <dd className="text-white font-mono">
                  {values.minimumSupportedVersion || '—'} (Build {values.minimumSupportedBuild ?? 0})
                </dd>
              </div>
            </dl>

            <div className="space-y-2">
              {bands.map((band) => (
                <div
                  key={band.status}
                  className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-xs ${STATUS_STYLES[band.status].className}`}
                >
                  <span className="font-mono">{band.range}</span>
                  <span className="font-semibold">{STATUS_STYLES[band.status].label}</span>
                </div>
              ))}
            </div>

            {!values.forceUpdateEnabled && (
              <p className="mt-4 text-xs text-gray-500">
                Zorunlu güncelleme kapalı — hiçbir kullanıcı engellenmez.
              </p>
            )}
            {!values.optionalUpdateEnabled && (
              <p className="mt-2 text-xs text-gray-500">
                Opsiyonel güncelleme kapalı — desteklenen kullanıcılara hatırlatma gösterilmez.
              </p>
            )}
            <p className="mt-4 text-xs text-gray-600">
              Bu alan yalnızca önizlemedir. Gerçek karar her zaman sunucuda verilir.
            </p>
          </aside>
        </div>
      )}

      {/* Confirmation — raising the floor takes effect on the user's very next launch. */}
      <Modal
        open={pendingSave !== null}
        onClose={() => setPendingSave(null)}
        title="Minimum desteklenen build yükseltiliyor"
      >
        <div className="space-y-4">
          <div className="flex gap-3 p-3 rounded-lg bg-red-950/50 border border-red-800">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">
              {platformLabel} için minimum desteklenen build&apos;i {previousMinBuild} değerinden{' '}
              {pendingSave?.minimumSupportedBuild} değerine yükseltiyorsunuz.
            </p>
          </div>
          <p className="text-sm text-gray-300">
            Build {(pendingSave?.minimumSupportedBuild ?? 1) - 1} ve altını kullanan kullanıcılar,
            güncelleyene kadar AstroGuru&apos;yu kullanamayacak. Bu değişiklik kaydedildiği anda
            geçerli olur.
          </p>
          <p className="text-sm text-gray-400">Devam edilsin mi?</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setPendingSave(null)}>
              Vazgeç
            </Button>
            <Button
              variant="danger"
              disabled={mutation.isPending}
              onClick={() => pendingSave && mutation.mutate(pendingSave)}
            >
              {mutation.isPending ? 'Kaydediliyor...' : 'Onayla'}
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
