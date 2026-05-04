'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { ArrowLeft, Search, ShieldCheck } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { userEntitlementsApi, usersApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { AppUserSummary, Page, UserEntitlementSnapshot } from '@/types';

type GrantForm = {
  entitlementKey: string;
  productId: string;
  currentPeriodEndAt: string;
  reason: string;
};

type RevokeForm = {
  entitlementKey: string;
  reason: string;
};

function statusClass(status: string) {
  switch (status) {
    case 'ACTIVE':
    case 'TRIALING':
    case 'GRACE_PERIOD':
    case 'CANCELLED_ACTIVE':
      return 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20';
    case 'REFUNDED':
    case 'REVOKED':
    case 'EXPIRED':
      return 'bg-red-500/10 text-red-300 border border-red-500/20';
    case 'BILLING_RETRY':
    case 'PAUSED':
      return 'bg-amber-500/10 text-amber-300 border border-amber-500/20';
    default:
      return 'bg-slate-500/10 text-slate-300 border border-slate-500/20';
  }
}

export default function UserEntitlementsPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const grantForm = useForm<GrantForm>({
    defaultValues: {
      entitlementKey: 'premium',
      productId: 'admin_premium_grant',
      currentPeriodEndAt: '',
      reason: '',
    },
  });
  const revokeForm = useForm<RevokeForm>({
    defaultValues: {
      entitlementKey: 'premium',
      reason: '',
    },
  });

  const userSearch = useQuery<Page<AppUserSummary>>({
    queryKey: ['monetization-users-search', searchTerm],
    queryFn: () => usersApi.search(searchTerm, 0, 8).then((response) => response.data),
    enabled: searchTerm.trim().length >= 2,
  });

  const entitlementQuery = useQuery<UserEntitlementSnapshot>({
    queryKey: ['user-entitlements', selectedUserId],
    queryFn: () => userEntitlementsApi.get(selectedUserId as number).then((response) => response.data),
    enabled: selectedUserId !== null,
  });

  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return userSearch.data?.content.find((user) => user.id === selectedUserId) ?? null;
  }, [selectedUserId, userSearch.data?.content]);

  const grantMutation = useMutation({
    mutationFn: (data: GrantForm) => userEntitlementsApi.grant(selectedUserId as number, {
      entitlementKey: data.entitlementKey || 'premium',
      productId: data.productId || undefined,
      currentPeriodEndAt: data.currentPeriodEndAt || null,
      reason: data.reason,
    }),
    onSuccess: async () => {
      toast.success('Manual premium grant kaydedildi.');
      grantForm.reset({
        entitlementKey: 'premium',
        productId: 'admin_premium_grant',
        currentPeriodEndAt: '',
        reason: '',
      });
      await qc.invalidateQueries({ queryKey: ['user-entitlements', selectedUserId] });
    },
    onError: (error: unknown) => {
      toast.error((error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Grant başarısız.');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (data: RevokeForm) => userEntitlementsApi.revoke(selectedUserId as number, {
      entitlementKey: data.entitlementKey || 'premium',
      reason: data.reason,
    }),
    onSuccess: async () => {
      toast.success('Entitlement revoke kaydedildi.');
      revokeForm.reset({
        entitlementKey: 'premium',
        reason: '',
      });
      await qc.invalidateQueries({ queryKey: ['user-entitlements', selectedUserId] });
    },
    onError: (error: unknown) => {
      toast.error((error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Revoke başarısız.');
    },
  });

  const snapshot = entitlementQuery.data;

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/monetization/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-purple-400" />
          User Entitlements
        </h1>
      </div>

      <div className="space-y-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-white">Kullanıcı ara ve entitlement durumunu incele</p>
            <p className="text-xs text-gray-400 mt-1">
              Bu ekran aktif entitlement snapshot, cüzdan özeti, recent purchase events ve manual grant/revoke akışını tek yerde toplar.
            </p>
          </div>

          <div className="flex gap-3">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="User ID, email veya isim ara"
            />
            <Button type="button" variant="secondary">
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {userSearch.isLoading ? (
            <p className="text-sm text-gray-400">Kullanıcılar aranıyor...</p>
          ) : null}

          {userSearch.data?.content?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {userSearch.data.content.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setSelectedUserId(user.id)}
                  className={`text-left rounded-lg border px-4 py-3 transition ${
                    selectedUserId === user.id
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-800 bg-gray-950 hover:border-gray-700'
                  }`}
                >
                  <div className="text-sm font-medium text-white">{user.name || user.email}</div>
                  <div className="text-xs text-gray-400 mt-1">{user.email}</div>
                  <div className="text-xs text-gray-500 mt-2">User #{user.id}</div>
                </button>
              ))}
            </div>
          ) : null}

          {searchTerm.trim().length >= 2 && !userSearch.isLoading && !userSearch.data?.content?.length ? (
            <p className="text-sm text-gray-400">Bu aramaya uygun kullanıcı bulunamadı.</p>
          ) : null}
        </div>

        {selectedUserId ? (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {selectedUser?.name || selectedUser?.email || `User #${selectedUserId}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Snapshot ve tüm entitlement kayıtları
                    </p>
                  </div>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusClass(snapshot?.active.status ?? 'NONE')}`}>
                    {snapshot?.active.status ?? (entitlementQuery.isLoading ? 'LOADING' : 'NONE')}
                  </span>
                </div>

                {entitlementQuery.isLoading ? (
                  <p className="text-sm text-gray-400">Entitlement snapshot yükleniyor...</p>
                ) : null}

                {snapshot ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
                        <p className="text-xs text-gray-500">Premium</p>
                        <p className="text-sm font-semibold text-white mt-1">{snapshot.active.premiumActive ? 'Aktif' : 'Pasif'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
                        <p className="text-xs text-gray-500">Trial</p>
                        <p className="text-sm font-semibold text-white mt-1">{snapshot.active.trialing ? 'Aktif' : 'Yok'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
                        <p className="text-xs text-gray-500">Wallet</p>
                        <p className="text-sm font-semibold text-white mt-1">{snapshot.walletBalance} Guru</p>
                      </div>
                      <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
                        <p className="text-xs text-gray-500">Lifetime Purchased</p>
                        <p className="text-sm font-semibold text-white mt-1">{snapshot.lifetimePurchased}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg border border-gray-800 bg-gray-950 p-4 space-y-2">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Aktif Snapshot</p>
                        <p className="text-gray-300">Entitlement: <span className="text-white font-medium">{snapshot.active.entitlementKey ?? '—'}</span></p>
                        <p className="text-gray-300">Product: <span className="text-white font-medium">{snapshot.active.productId ?? '—'}</span></p>
                        <p className="text-gray-300">Provider/Store: <span className="text-white font-medium">{snapshot.active.provider ?? '—'} / {snapshot.active.store ?? '—'}</span></p>
                        <p className="text-gray-300">Period End: <span className="text-white font-medium">{snapshot.active.currentPeriodEndAt ? formatDate(snapshot.active.currentPeriodEndAt) : '—'}</span></p>
                      </div>
                      <div className="rounded-lg border border-gray-800 bg-gray-950 p-4 space-y-2">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Cüzdan Özeti</p>
                        <p className="text-gray-300">Lifetime Earned: <span className="text-white font-medium">{snapshot.lifetimeEarned}</span></p>
                        <p className="text-gray-300">Lifetime Spent: <span className="text-white font-medium">{snapshot.lifetimeSpent}</span></p>
                        <p className="text-gray-300">Active Keys: <span className="text-white font-medium">{snapshot.active.entitlements.join(', ') || '—'}</span></p>
                        <p className="text-gray-300">Last Event: <span className="text-white font-medium">{snapshot.active.lastEventAt ? formatDate(snapshot.active.lastEventAt) : '—'}</span></p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-white mb-3">Entitlement kayıtları</p>
                      <div className="space-y-3">
                        {snapshot.entitlements.length === 0 ? (
                          <p className="text-sm text-gray-400">Bu kullanıcı için entitlement kaydı yok.</p>
                        ) : snapshot.entitlements.map((entitlement) => (
                          <div key={entitlement.id} className="rounded-lg border border-gray-800 bg-gray-950 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-white">{entitlement.entitlementKey}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {entitlement.productId ?? '—'} • {entitlement.provider} / {entitlement.store ?? '—'}
                                </p>
                              </div>
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusClass(entitlement.status)}`}>
                                {entitlement.status}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-500 mt-3">
                              <p>Trial End: {entitlement.trialEndAt ? formatDate(entitlement.trialEndAt) : '—'}</p>
                              <p>Period End: {entitlement.currentPeriodEndAt ? formatDate(entitlement.currentPeriodEndAt) : '—'}</p>
                              <p>Updated: {formatDate(entitlement.updatedAt)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="space-y-6">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-white">Manual Grant</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Audit log’a reason ile birlikte yazar. Period end verilirse active entitlement olarak açılır.
                    </p>
                  </div>
                  <form onSubmit={grantForm.handleSubmit((data) => grantMutation.mutate(data))} className="space-y-3">
                    <Input {...grantForm.register('entitlementKey')} placeholder="premium" />
                    <Input {...grantForm.register('productId')} placeholder="admin_premium_grant" />
                    <Input {...grantForm.register('currentPeriodEndAt')} type="datetime-local" />
                    <Input {...grantForm.register('reason', { required: true })} placeholder="Neden grant verildi?" />
                    <Button type="submit" disabled={grantMutation.isPending} className="w-full">
                      {grantMutation.isPending ? 'Grant kaydediliyor...' : 'Grant Ver'}
                    </Button>
                  </form>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-white">Manual Revoke</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Premium erişimi hemen kaldırır ve audit log’a reason yazar.
                    </p>
                  </div>
                  <form onSubmit={revokeForm.handleSubmit((data) => revokeMutation.mutate(data))} className="space-y-3">
                    <Input {...revokeForm.register('entitlementKey')} placeholder="premium" />
                    <Input {...revokeForm.register('reason', { required: true })} placeholder="Neden revoke edildi?" />
                    <Button type="submit" variant="danger" disabled={revokeMutation.isPending} className="w-full">
                      {revokeMutation.isPending ? 'Revoke kaydediliyor...' : 'Entitlement Kaldır'}
                    </Button>
                  </form>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-sm font-semibold text-white">Recent Purchase Events</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Bu kullanıcıya ait son webhook ve purchase event kayıtları
                  </p>
                </div>
                <Link href="/monetization/purchase-events">
                  <Button variant="secondary">Tüm event listesine git</Button>
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <tr>
                      <th className="pb-3">Event</th>
                      <th className="pb-3">Product</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot?.recentPurchaseEvents.length ? snapshot.recentPurchaseEvents.map((event) => (
                      <tr key={event.id} className="border-t border-gray-800">
                        <td className="py-3 pr-4">
                          <div className="text-sm text-white">{event.eventType}</div>
                          <div className="text-xs text-gray-500 mt-1 font-mono break-all">{event.eventId}</div>
                        </td>
                        <td className="py-3 pr-4 text-sm text-gray-300">
                          {event.productId ?? '—'}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusClass(event.processedStatus)}`}>
                            {event.processedStatus}
                          </span>
                        </td>
                        <td className="py-3 text-sm text-gray-300">
                          {formatDate(event.createdAt)}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="py-6 text-sm text-gray-400">
                          Bu kullanıcı için recent purchase event bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
}
