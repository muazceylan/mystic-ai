'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useMutation } from '@tanstack/react-query';
import { monetizationSimulationApi } from '@/lib/api';
import { SimulationRequest, SimulationResult } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useForm } from 'react-hook-form';
import { FlaskConical, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

export default function SimulationPage() {
  const toast = useToast();
  const [result, setResult] = useState<SimulationResult | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<SimulationRequest>({
    defaultValues: {
      moduleKey: '',
      actionKey: '',
      entryCount: 1,
      dailyAdCount: 0,
      weeklyAdCount: 0,
      hoursSinceLastOffer: 2,
      walletBalance: 0,
      platform: 'IOS',
      locale: 'tr',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: SimulationRequest) => monetizationSimulationApi.simulate(data).then(r => r.data),
    onSuccess: (data: SimulationResult) => { setResult(data); toast.success('Simülasyon tamamlandı.'); },
    onError: () => toast.error('Simülasyon başarısız.'),
  });

  const StatusBadge = ({ active, label }: { active: boolean; label: string }) => (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${active ? 'bg-green-900/30 border border-green-800' : 'bg-gray-800 border border-gray-700'}`}>
      {active ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-gray-500" />}
      <span className={`text-sm ${active ? 'text-green-300' : 'text-gray-500'}`}>{label}</span>
    </div>
  );

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <FlaskConical className="w-6 h-6 text-purple-400" />
        <h1 className="text-2xl font-bold text-white">Monetization Simülasyonu</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div>
          <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5 bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Module Key *</label>
                <Input {...register('moduleKey', { required: true })} className="font-mono" placeholder="dream_analysis" />
                {errors.moduleKey && <p className="text-red-400 text-xs mt-1">Zorunlu</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Action Key</label>
                <Input {...register('actionKey')} className="font-mono" placeholder="dream_interpret" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Entry Count</label>
                <Input {...register('entryCount', { valueAsNumber: true })} type="number" min={0} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Wallet Balance</label>
                <Input {...register('walletBalance', { valueAsNumber: true })} type="number" min={0} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Daily Ad Count</label>
                <Input {...register('dailyAdCount', { valueAsNumber: true })} type="number" min={0} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Weekly Ad Count</label>
                <Input {...register('weeklyAdCount', { valueAsNumber: true })} type="number" min={0} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Hours Since Last Offer</label>
              <Input {...register('hoursSinceLastOffer', { valueAsNumber: true })} type="number" min={0} step={0.5} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Platform</label>
                <Input {...register('platform')} placeholder="IOS" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Locale</label>
                <Input {...register('locale')} placeholder="tr" />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={mutation.isPending}>
                <FlaskConical className="w-4 h-4" />
                {mutation.isPending ? 'Simüle ediliyor...' : 'Simüle Et'}
              </Button>
            </div>
          </form>
        </div>

        {/* Results */}
        <div>
          {result ? (
            <div className="space-y-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Sonuçlar</h2>
                <div className="grid grid-cols-2 gap-3">
                  <StatusBadge active={result.monetizationActive} label="Monetization Aktif" />
                  <StatusBadge active={result.adOfferEligible} label="Reklam Teklifi Uygun" />
                  <StatusBadge active={result.guruUnlockAvailable} label="Guru Unlock Mevcut" />
                  <StatusBadge active={result.purchaseFallbackAvailable} label="Satın Alma Fallback" />
                </div>
              </div>

              {result.decisions.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-white mb-3">Kararlar</h3>
                  <ul className="space-y-2">
                    {result.decisions.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.warnings.length > 0 && (
                <div className="bg-gray-900 border border-yellow-800/50 rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-yellow-400 mb-3">Uyarılar</h3>
                  <ul className="space-y-2">
                    {result.warnings.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-yellow-300">
                        <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
              <FlaskConical className="w-12 h-12 text-gray-700 mb-4" />
              <p className="text-gray-500 text-sm">Simülasyon sonuçları burada görüntülenecek.</p>
              <p className="text-gray-600 text-xs mt-1">Formu doldurup &quot;Simüle Et&quot; butonuna basın.</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
