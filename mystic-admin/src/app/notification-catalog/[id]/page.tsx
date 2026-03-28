'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import { notifCatalogApi } from '@/lib/api';
import type { NotificationDefinition } from '@/types';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Lock, Power, PowerOff, Edit, X, Save } from 'lucide-react';

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{label}</span>;
}

function InfoRow({ label, value }: { label: string; value?: string | boolean | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500 uppercase font-semibold">{label}</span>
      <span className="text-sm text-gray-200">{String(value)}</span>
    </div>
  );
}

export default function NotificationCatalogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<NotificationDefinition>>({});

  const { data: def, isLoading, isError } = useQuery<NotificationDefinition>({
    queryKey: ['notif-catalog-detail', id],
    queryFn: () => notifCatalogApi.get(Number(id)).then(r => r.data),
  });

  useEffect(() => {
    if (def) {
      setForm({
        displayName: def.displayName,
        description: def.description ?? '',
        category: def.category ?? '',
        defaultRouteKey: def.defaultRouteKey ?? '',
        defaultFallbackRouteKey: def.defaultFallbackRouteKey ?? '',
        ownerModule: def.ownerModule ?? '',
      });
    }
  }, [def?.id]);

  const inv = () => {
    queryClient.invalidateQueries({ queryKey: ['notif-catalog-detail', id] });
    queryClient.invalidateQueries({ queryKey: ['notif-catalog'] });
  };

  const activateMut = useMutation({
    mutationFn: () => notifCatalogApi.activate(Number(id)),
    onSuccess: () => { inv(); toast.success('Aktif edildi.'); },
    onError: () => toast.error('Aktif etme başarısız.'),
  });
  const deactivateMut = useMutation({
    mutationFn: () => notifCatalogApi.deactivate(Number(id)),
    onSuccess: () => { inv(); toast.success('Pasif edildi.'); },
    onError: () => toast.error('Pasif etme başarısız.'),
  });
  const updateMut = useMutation({
    mutationFn: (data: Partial<NotificationDefinition>) => notifCatalogApi.update(Number(id), data),
    onSuccess: () => { inv(); setIsEditing(false); toast.success('Tanım güncellendi.'); },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Güncelleme başarısız.'),
  });

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => router.push('/notification-catalog')}
          className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Notification Definition</h1>
          <p className="text-gray-400 text-sm">{def?.definitionKey}</p>
        </div>
        {def && def.isEditable && !isEditing && (
          <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
            <Edit className="w-3 h-3" /> Düzenle
          </Button>
        )}
      </div>

      {isLoading && <div className="animate-pulse bg-gray-900 rounded-xl h-64" />}
      {isError && <p className="text-red-400">Tanım yüklenemedi.</p>}

      {def && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-4">
            {isEditing ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold text-white">Tanımı Düzenle</h2>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}><X className="w-4 h-4" /> İptal</Button>
                    <Button size="sm" onClick={() => updateMut.mutate(form)} disabled={updateMut.isPending}>
                      <Save className="w-4 h-4" /> {updateMut.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Görünen Ad</label>
                    <Input value={form.displayName ?? ''} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Kategori</label>
                    <Input value={form.category ?? ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Owner Module</label>
                    <Input value={form.ownerModule ?? ''} onChange={e => setForm(f => ({ ...f, ownerModule: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Default Route Key</label>
                    <Input value={form.defaultRouteKey ?? ''} onChange={e => setForm(f => ({ ...f, defaultRouteKey: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Fallback Route Key</label>
                    <Input value={form.defaultFallbackRouteKey ?? ''} onChange={e => setForm(f => ({ ...f, defaultFallbackRouteKey: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Açıklama</label>
                  <textarea value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    {def.isSystemCritical && <Lock className="w-4 h-4 text-red-400" aria-label="Sistem Kritik — devre dışı bırakılamaz" />}
                    {def.displayName}
                  </h2>
                  {!def.isSystemCritical && (
                    <button
                      onClick={() => def.isActive ? deactivateMut.mutate() : activateMut.mutate()}
                      disabled={activateMut.isPending || deactivateMut.isPending}
                      className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors ${
                        def.isActive
                          ? 'bg-red-900/40 text-red-300 hover:bg-red-900/60'
                          : 'bg-green-900/40 text-green-300 hover:bg-green-900/60'
                      }`}>
                      {def.isActive ? <><PowerOff className="w-4 h-4" /> Pasif Et</> : <><Power className="w-4 h-4" /> Aktif Et</>}
                    </button>
                  )}
                </div>

                <p className="text-gray-400 text-sm mb-6">{def.description ?? '—'}</p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <InfoRow label="Definition Key" value={def.definitionKey} />
                  <InfoRow label="Kategori" value={def.category} />
                  <InfoRow label="Owner Module" value={def.ownerModule} />
                  <InfoRow label="Default Route" value={def.defaultRouteKey} />
                  <InfoRow label="Fallback Route" value={def.defaultFallbackRouteKey} />
                  <InfoRow label="Code Reference" value={def.codeReference} />
                  <InfoRow label="Oluşturulma" value={formatDate(def.createdAt)} />
                  <InfoRow label="Son Güncelleme" value={formatDate(def.updatedAt)} />
                </div>
              </div>
            )}

            {def.codeReference && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Kod Referansı</h3>
                <code className="text-xs text-green-400 bg-gray-800 px-3 py-2 rounded block">
                  {def.codeReference}
                </code>
                <p className="text-xs text-gray-500 mt-2">
                  Bu statik backend tanımının implementasyonu bu Java sınıf/metot içindedir.
                </p>
              </div>
            )}
          </div>

          {/* Sidebar badges */}
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase">Özellikler</h3>
              <div className="flex flex-wrap gap-2">
                <Badge label={def.channelType} color="bg-blue-900/40 text-blue-300" />
                <Badge label={def.cadenceType} color="bg-green-900/40 text-green-300" />
                <Badge label={def.sourceType} color="bg-gray-800 text-gray-300" />
                <Badge label={def.triggerType} color="bg-indigo-900/40 text-indigo-300" />
                {def.isActive
                  ? <Badge label="Aktif" color="bg-green-900/40 text-green-300" />
                  : <Badge label="Pasif" color="bg-red-900/40 text-red-300" />}
                {def.isEditable
                  ? <Badge label="Düzenlenebilir" color="bg-purple-900/40 text-purple-300" />
                  : <Badge label="Salt Okunur" color="bg-gray-800 text-gray-500" />}
                {def.isSystemCritical && <Badge label="Sistem Kritik" color="bg-red-900/60 text-red-300" />}
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Durum</h3>
              {def.isSystemCritical ? (
                <p className="text-xs text-red-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Sistem kritik tanımlar devre dışı bırakılamaz
                </p>
              ) : def.isEditable ? (
                <p className="text-xs text-purple-300">Admin panelden düzenlenebilir ve aktif/pasif yapılabilir.</p>
              ) : (
                <p className="text-xs text-gray-500">Statik backend tanımı. Sadece aktif/pasif durumu yönetilebilir.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
