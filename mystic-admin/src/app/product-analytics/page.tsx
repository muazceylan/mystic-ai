'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { productAnalyticsApi, usersApi } from '@/lib/api';
import { formatDate, timeAgo } from '@/lib/utils';
import type {
  AppUserStats,
  AppUserSummary,
  Page,
  ProductAnalyticsActiveUser,
  ProductAnalyticsGa4ExportResult,
  ProductAnalyticsOverview,
} from '@/types';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Clock3,
  Eye,
  Send,
  Ghost,
  MailCheck,
  MousePointerClick,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { type ElementType, useDeferredValue, useMemo, useState } from 'react';

function StatCard({
  label,
  value,
  meta,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  meta?: string;
  icon: ElementType;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
        </div>
        <div className={`rounded-2xl border px-3 py-3 ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {meta ? <p className="text-sm text-gray-400">{meta}</p> : <div className="h-[20px]" />}
    </div>
  );
}

export default function ProductAnalyticsPage() {
  const toast = useToast();
  const [windowDays, setWindowDays] = useState('30');
  const [activeWithinDays, setActiveWithinDays] = useState('7');
  const [usersPage, setUsersPage] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const [userType, setUserType] = useState<'REGISTERED' | 'GUEST' | ''>('REGISTERED');
  const [searchInput, setSearchInput] = useState('');
  const [lastGa4Export, setLastGa4Export] = useState<ProductAnalyticsGa4ExportResult | null>(null);
  const deferredSearch = useDeferredValue(searchInput.trim());

  const overviewQuery = useQuery<ProductAnalyticsOverview>({
    queryKey: ['product-analytics-overview', windowDays, activeWithinDays],
    queryFn: () =>
      productAnalyticsApi.overview({
        windowDays: Number(windowDays),
        activeWithinDays: Number(activeWithinDays),
        topScreensLimit: 8,
      }).then((r) => r.data),
    refetchInterval: 60_000,
  });

  const statsQuery = useQuery<AppUserStats>({
    queryKey: ['app-user-stats'],
    queryFn: () => usersApi.stats().then((r) => r.data),
    refetchInterval: 60_000,
  });

  const allUsersQuery = useQuery<Page<AppUserSummary>>({
    queryKey: ['app-users', deferredSearch, userType, usersPage],
    queryFn: () =>
      usersApi.list({
        q: deferredSearch || undefined,
        userType: userType || undefined,
        page: usersPage,
        size: 20,
      }).then((r) => r.data),
    refetchInterval: 60_000,
  });

  const activeUsersQuery = useQuery<Page<ProductAnalyticsActiveUser>>({
    queryKey: ['active-users', activeWithinDays, activePage],
    queryFn: () =>
      productAnalyticsApi.activeUsers({
        withinDays: Number(activeWithinDays),
        page: activePage,
        size: 10,
      }).then((r) => r.data),
    refetchInterval: 60_000,
  });

  const activeUserIds = useMemo(
    () => activeUsersQuery.data?.content.map((item) => item.userId).join(',') ?? '',
    [activeUsersQuery.data]
  );

  const activeUserDetailsQuery = useQuery<Page<AppUserSummary>>({
    queryKey: ['active-user-details', activeUserIds],
    enabled: activeUserIds.length > 0,
    queryFn: () =>
      usersApi.list({
        ids: activeUserIds,
        page: 0,
        size: activeUsersQuery.data?.content.length ?? 10,
      }).then((r) => r.data),
  });

  const activeUsers = useMemo(() => {
    const map = new Map<number, AppUserSummary>();
    for (const user of activeUserDetailsQuery.data?.content ?? []) {
      map.set(user.id, user);
    }

    return (activeUsersQuery.data?.content ?? []).map((activity) => ({
      activity,
      user: map.get(activity.userId),
    }));
  }, [activeUserDetailsQuery.data, activeUsersQuery.data]);

  const exportGa4Mutation = useMutation({
    mutationFn: () =>
      productAnalyticsApi.exportGa4({
        windowDays: Number(windowDays),
        activeWithinDays: Number(activeWithinDays),
      }).then((r) => r.data),
    onSuccess: (result) => {
      setLastGa4Export(result);
      if (result.exported) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'GA4 export başarısız.';
      toast.error(message);
    },
  });

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-purple-400">Product Analytics</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Kullanıcı İçgörüleri</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
            Hangi ekranların daha çok açıldığını, kaç kullanıcının aktif kaldığını ve kullanıcı isim-email
            listelerini tek panelden izleyebilirsin.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href="https://analytics.google.com/analytics/web/"
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="ghost">
              <ArrowUpRight className="h-4 w-4" />
              GA4'i ac
            </Button>
          </a>
          <Button
            variant="secondary"
            onClick={() => exportGa4Mutation.mutate()}
            disabled={exportGa4Mutation.isPending}
          >
            <Send className={`h-4 w-4 ${exportGa4Mutation.isPending ? 'animate-pulse' : ''}`} />
            GA4'e gonder
          </Button>
          <Select
            value={windowDays}
            onChange={(e) => setWindowDays(e.target.value)}
            className="w-[140px]"
          >
            <option value="7">Son 7 gün</option>
            <option value="30">Son 30 gün</option>
            <option value="60">Son 60 gün</option>
            <option value="90">Son 90 gün</option>
          </Select>

          <Select
            value={activeWithinDays}
            onChange={(e) => {
              setActiveWithinDays(e.target.value);
              setActivePage(0);
            }}
            className="w-[160px]"
          >
            <option value="1">Aktiflik: 24 saat</option>
            <option value="7">Aktiflik: 7 gün</option>
            <option value="30">Aktiflik: 30 gün</option>
          </Select>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-800 bg-gray-950/70 px-5 py-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-white">GA4 Aggregate Export</p>
            <p className="mt-1 text-xs leading-5 text-gray-400">
              GA4'e sadece aggregate metrikler gonderilir. Isim, email ve aktif kullanici listeleri burada export edilmez.
            </p>
          </div>
          <div className="text-xs text-gray-400">
            {lastGa4Export?.exportedAt
              ? `Son deneme: ${formatDate(lastGa4Export.exportedAt)}`
              : 'Henuz export tetiklenmedi'}
          </div>
        </div>

        {lastGa4Export ? (
          <div className="mt-4 grid gap-3 rounded-2xl border border-gray-800 bg-gray-900/60 px-4 py-3 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Durum</p>
              <p className={`mt-1 text-sm font-medium ${lastGa4Export.exported ? 'text-emerald-300' : 'text-amber-300'}`}>
                {lastGa4Export.message}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Measurement ID</p>
              <p className="mt-1 text-sm text-white">{lastGa4Export.measurementId || 'Yok'}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Event Sayisi</p>
              <p className="mt-1 text-sm text-white">{lastGa4Export.eventCount}</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="Toplam Kullanıcı"
          value={String(statsQuery.data?.totalUsers ?? 0)}
          meta={`${statsQuery.data?.registeredUsers ?? 0} kayıtlı, ${statsQuery.data?.guestUsers ?? 0} misafir`}
          icon={Users}
          tone="border-purple-800 bg-purple-900/30 text-purple-200"
        />
        <StatCard
          label="Aktif Kullanıcı"
          value={String(overviewQuery.data?.activeUsers ?? 0)}
          meta={`Son ${overviewQuery.data?.activeWithinDays ?? Number(activeWithinDays)} gün`}
          icon={Activity}
          tone="border-emerald-800 bg-emerald-900/30 text-emerald-200"
        />
        <StatCard
          label="Ekran Görüntüleme"
          value={String(overviewQuery.data?.trackedScreenViews ?? 0)}
          meta={`Bugün ${overviewQuery.data?.screenViewsToday ?? 0} view`}
          icon={Eye}
          tone="border-sky-800 bg-sky-900/30 text-sky-200"
        />
        <StatCard
          label="İzlenen Kullanıcı"
          value={String(overviewQuery.data?.trackedUsers ?? 0)}
          meta={`Son ${overviewQuery.data?.windowDays ?? Number(windowDays)} gündeki unique user`}
          icon={BarChart3}
          tone="border-indigo-800 bg-indigo-900/30 text-indigo-200"
        />
        <StatCard
          label="Doğrulanmış Email"
          value={String(statsQuery.data?.verifiedUsers ?? 0)}
          meta="Mail doğrulaması tamamlanan hesap"
          icon={MailCheck}
          tone="border-amber-800 bg-amber-900/30 text-amber-200"
        />
        <StatCard
          label="Son Track"
          value={overviewQuery.data?.latestTrackedAt ? timeAgo(overviewQuery.data.latestTrackedAt) : 'Yok'}
          meta={overviewQuery.data?.latestTrackedAt ? formatDate(overviewQuery.data.latestTrackedAt) : 'Henüz veri toplanmadı'}
          icon={Clock3}
          tone="border-gray-700 bg-gray-900 text-gray-200"
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="overflow-hidden rounded-3xl border border-gray-800 bg-gray-950/80">
          <div className="flex items-center justify-between border-b border-gray-800 px-6 py-5">
            <div>
              <p className="text-sm font-medium text-white">En Çok Ziyaret Edilen Sayfalar</p>
              <p className="mt-1 text-xs text-gray-500">
                Son {overviewQuery.data?.windowDays ?? Number(windowDays)} gundeki ekran acilislari
              </p>
            </div>
            <div className="rounded-2xl border border-purple-800/60 bg-purple-900/20 px-3 py-2 text-xs text-purple-200">
              Top 8
            </div>
          </div>

          {overviewQuery.isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-2xl bg-gray-900" />
              ))}
            </div>
          ) : overviewQuery.data?.topScreens?.length ? (
            <div className="divide-y divide-gray-800">
              {overviewQuery.data.topScreens.map((screen) => (
                <div key={screen.screenKey} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-purple-900/60 bg-purple-900/20 text-purple-200">
                    <MousePointerClick className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{screen.screenKey}</p>
                    <p className="truncate text-xs text-gray-500">{screen.routePath}</p>
                  </div>
                  <div className="grid shrink-0 grid-cols-2 gap-4 text-right">
                    <div>
                      <p className="text-base font-semibold text-white">{screen.visits}</p>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">View</p>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-white">{screen.uniqueUsers}</p>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">User</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-sm text-gray-500">
              Henuz sayfa ziyareti verisi yok. Bu ekran acik kaldikca mobil uygulamadaki yeni screen view'ler burada birikmeye baslayacak.
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-3xl border border-gray-800 bg-gray-950/80">
          <div className="flex items-center justify-between border-b border-gray-800 px-6 py-5">
            <div>
              <p className="text-sm font-medium text-white">Aktif Kullanicilar</p>
              <p className="mt-1 text-xs text-gray-500">
                Son {activeWithinDays} gunde screen view veya push seen alan hesaplar
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-800/60 bg-emerald-900/20 px-3 py-2 text-xs text-emerald-200">
              {activeUsersQuery.data?.totalElements ?? 0} kisi
            </div>
          </div>

          {activeUsersQuery.isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-2xl bg-gray-900" />
              ))}
            </div>
          ) : activeUsers.length ? (
            <>
              <div className="divide-y divide-gray-800">
                {activeUsers.map(({ activity, user }) => (
                  <div key={activity.userId} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {user?.email ?? `#${activity.userId}`}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                          <span className="truncate">{user?.name || 'Isim yok'}</span>
                          <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-gray-400">
                            {user?.userType ?? 'UNKNOWN'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">{activity.screenViews}</p>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Screen view</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-500">
                      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-gray-600">Son Aktivite</p>
                        <p className="mt-1 text-gray-300">{timeAgo(activity.lastActiveAt)}</p>
                      </div>
                      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-gray-600">Push Son Gorme</p>
                        <p className="mt-1 text-gray-300">{activity.pushLastSeenAt ? timeAgo(activity.pushLastSeenAt) : '-'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {activeUsersQuery.data && activeUsersQuery.data.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-800 px-6 py-4">
                  <span className="text-xs text-gray-500">
                    Sayfa {activePage + 1} / {activeUsersQuery.data.totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={activePage === 0}
                      onClick={() => setActivePage((current) => current - 1)}
                    >
                      Onceki
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={activePage >= activeUsersQuery.data.totalPages - 1}
                      onClick={() => setActivePage((current) => current + 1)}
                    >
                      Sonraki
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="px-6 py-12 text-sm text-gray-500">Secilen aralikta aktif kullanici yok.</div>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-3xl border border-gray-800 bg-gray-950/80">
        <div className="flex flex-col gap-4 border-b border-gray-800 px-6 py-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-white">Toplam Kullanici Listesi</p>
            <p className="mt-1 text-xs text-gray-500">
              Isim ve email bazinda tum hesaplari filtreleyebilir, aktif kullanicilarla kiyaslayabilirsin.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setUsersPage(0);
                }}
                placeholder="Email veya isim ara..."
                className="pl-9"
              />
            </div>

            <Select
              value={userType}
              onChange={(e) => {
                setUserType(e.target.value as 'REGISTERED' | 'GUEST' | '');
                setUsersPage(0);
              }}
              className="w-[170px]"
            >
              <option value="">Tum hesaplar</option>
              <option value="REGISTERED">Kayitli kullanici</option>
              <option value="GUEST">Misafir kullanici</option>
            </Select>
          </div>
        </div>

        {allUsersQuery.isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-2xl bg-gray-900" />
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-[11px] uppercase tracking-[0.18em] text-gray-500">
                    <th className="px-6 py-4">Kullanici</th>
                    <th className="px-6 py-4">Tip</th>
                    <th className="px-6 py-4">Dogrulama</th>
                    <th className="px-6 py-4">Olusturulma</th>
                    <th className="px-6 py-4">Son not</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {allUsersQuery.data?.content.map((user) => (
                    <tr key={user.id} className="transition-colors hover:bg-gray-900/60">
                      <td className="px-6 py-4">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{user.email}</p>
                          <p className="truncate text-xs text-gray-500">{user.name || 'Isim girilmedi'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${
                          user.userType === 'REGISTERED'
                            ? 'bg-blue-900/40 text-blue-200'
                            : 'bg-gray-800 text-gray-300'
                        }`}>
                          {user.userType === 'REGISTERED' ? 'Kayitli' : 'Misafir'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.emailVerifiedAt ? (
                          <span className="inline-flex items-center gap-2 text-emerald-300">
                            <ShieldCheck className="h-4 w-4" />
                            {formatDate(user.emailVerifiedAt)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-gray-500">
                            <Ghost className="h-4 w-4" />
                            Dogrulanmadi
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-400">{formatDate(user.createdAt)}</td>
                      <td className="px-6 py-4 text-gray-500">
                        {user.emailVerifiedAt ? 'Email dogrulandi' : 'Guest veya bekleyen hesap'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!allUsersQuery.data?.content?.length && (
              <div className="px-6 py-12 text-sm text-gray-500">Filtreye uygun kullanici bulunamadi.</div>
            )}

            {allUsersQuery.data && allUsersQuery.data.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-800 px-6 py-4">
                <span className="text-xs text-gray-500">
                  Sayfa {usersPage + 1} / {allUsersQuery.data.totalPages} ({allUsersQuery.data.totalElements} kayit)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={usersPage === 0}
                    onClick={() => setUsersPage((current) => current - 1)}
                  >
                    Onceki
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={usersPage >= allUsersQuery.data.totalPages - 1}
                    onClick={() => setUsersPage((current) => current + 1)}
                  >
                    Sonraki
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </AdminLayout>
  );
}
