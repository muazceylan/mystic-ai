'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { numerologyConfigApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Hash, Info, ToggleLeft, ToggleRight } from 'lucide-react';

export default function NumerologyConfigPage() {
  const qc = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['numerology-config'],
    queryFn: () => numerologyConfigApi.getConfig().then((r) => r.data),
  });

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      numerologyConfigApi.setPremium(enabled).then((r) => r.data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['numerology-config'] });
      toast.success(
        result.premiumEnabled
          ? 'Premium kilit aktif. Destiny, Soul Urge ve Combined Profile kilitlendi.'
          : 'Premium kilit devre dışı. Tüm bölümler ücretsiz.',
      );
    },
    onError: () => {
      toast.error('Ayar kaydedilemedi. Servise ulaşılamıyor olabilir.');
    },
  });

  const premiumEnabled = data?.premiumEnabled ?? false;

  return (
    <AdminLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Hash className="w-6 h-6 text-purple-500" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Numeroloji Yapılandırması
          </h1>
        </div>

        {/* Premium Toggle Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Premium Bölüm Kilidi
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Etkinleştirildiğinde{' '}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Kader Sayısı, Ruh Güdüsü ve Birleşik Profil
                </span>{' '}
                bölümleri premium kilit altına alınır. Ücretsiz kullanıcılar bu bölümleri önizleme
                modunda görür.
              </p>
            </div>

            {isLoading ? (
              <div className="w-12 h-6 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            ) : (
              <button
                onClick={() => toggleMutation.mutate(!premiumEnabled)}
                disabled={toggleMutation.isPending}
                aria-label={premiumEnabled ? 'Premium kilidi kapat' : 'Premium kilidi aç'}
                className="flex-shrink-0 transition-opacity disabled:opacity-50"
              >
                {premiumEnabled ? (
                  <ToggleRight className="w-10 h-6 text-purple-600" />
                ) : (
                  <ToggleLeft className="w-10 h-6 text-gray-400" />
                )}
              </button>
            )}
          </div>

          {/* Current status badge */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                premiumEnabled
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              }`}
            >
              {premiumEnabled ? 'Premium Aktif' : 'Tümü Ücretsiz'}
            </span>
            {toggleMutation.isPending && (
              <span className="text-xs text-gray-400">Kaydediliyor...</span>
            )}
          </div>

          {/* Locked sections list — shown only when premium is on */}
          {premiumEnabled && (
            <div className="mt-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-sm text-purple-700 dark:text-purple-300 space-y-1">
              <p className="font-medium">Kilitli bölümler:</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>coreNumbers.destiny (Kader Sayısı)</li>
                <li>coreNumbers.soulUrge (Ruh Güdüsü)</li>
                <li>combinedProfile (Birleşik Profil)</li>
                <li>profile.growthEdges</li>
                <li>profile.relationshipStyle</li>
                <li>timing.advanced</li>
              </ul>
              <p className="text-xs mt-1 text-purple-500 dark:text-purple-400">
                Önizleme erişimi: combinedProfile, coreNumbers.destiny, coreNumbers.soulUrge
              </p>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
            <p className="font-medium">Kalıcı değişiklik için</p>
            <p>
              Bu toggle yalnızca runtime&apos;ı etkiler — servis yeniden başlatıldığında{' '}
              <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs">
                NUMEROLOGY_PREMIUM_ENABLED
              </code>{' '}
              env değişkenine döner. Kalıcı değişiklik için env&apos;i güncelleyip servisi yeniden
              başlatın.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
