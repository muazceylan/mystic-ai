'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, guestApi } from '@/lib/api';
import { DashboardSummary, GuestStats } from '@/types';
import { formatDate, timeAgo, statusColor } from '@/lib/utils';
import { Bell, Map, CheckCircle, AlertCircle, Calendar, TrendingUp, Layers, Navigation, Users, Wrench, Sun, CalendarDays, BookOpen, Star, Zap, Activity, Home, Compass, CreditCard, Image, UserX, ArrowRight, Percent, Ghost } from 'lucide-react';

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">{label}</span>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.summary().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: guestStats } = useQuery<GuestStats>({
    queryKey: ['guest-stats'],
    queryFn: () => guestApi.stats().then((r) => r.data),
    refetchInterval: 60_000,
  });

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Genel sistem durumu</p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse h-24" />
          ))}
        </div>
      )}

      {isError && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 text-red-300 mb-8">
          Dashboard verisi yüklenemedi.
        </div>
      )}

      {data && (
        <>
          {/* Stat cards — Notifications */}
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Bildirimler</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Bugün Oluşturulan" value={data.todayCreated} icon={Bell} color="bg-purple-900/50 text-purple-300" />
            <StatCard label="Planlanmış" value={data.scheduled} icon={Calendar} color="bg-blue-900/50 text-blue-300" />
            <StatCard label="Gönderilmiş" value={data.sent} icon={CheckCircle} color="bg-green-900/50 text-green-300" />
            <StatCard label="Başarısız" value={data.failed} icon={AlertCircle} color="bg-red-900/50 text-red-300" />
          </div>

          {/* Stat cards — Modules & Navigation */}
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Modüller & Navigasyon</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Aktif Modül" value={data.activeModules} icon={Layers} color="bg-indigo-900/50 text-indigo-300" />
            <StatCard label="Pasif Modül" value={data.inactiveModules} icon={Layers} color="bg-gray-800 text-gray-400" />
            <StatCard label="Bakım Modunda" value={data.maintenanceModeModules} icon={Wrench} color="bg-orange-900/50 text-orange-300" />
            <StatCard label="Görünür Tab" value={data.visibleTabs} icon={Navigation} color="bg-teal-900/50 text-teal-300" />
          </div>

          {/* Stat cards — CMS */}
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">İçerik CMS</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <StatCard label="Günlük Burç (Yayında)" value={data.publishedDailyHoroscopes} icon={Sun} color="bg-yellow-900/50 text-yellow-300" />
            <StatCard label="Haftalık Burç (Yayında)" value={data.publishedWeeklyHoroscopes} icon={CalendarDays} color="bg-blue-900/50 text-blue-300" />
            <StatCard label="Bu Hf. Eksik Burç" value={data.missingWeeklyHoroscopesThisWeek} icon={AlertCircle} color={data.missingWeeklyHoroscopesThisWeek > 0 ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'} />
            <StatCard label="Yayında Dua" value={data.publishedPrayers} icon={BookOpen} color="bg-teal-900/50 text-teal-300" />
            <StatCard label="Öne Çıkan Dua" value={data.featuredPrayers} icon={Star} color="bg-amber-900/50 text-amber-300" />
          </div>

          {/* Stat cards — Trigger Monitor */}
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Trigger Monitor</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Aktif Trigger" value={data.activeTriggers} icon={Zap} color="bg-green-900/50 text-green-300" />
            <StatCard label="Pasif Trigger" value={data.disabledTriggers} icon={Zap} color="bg-red-900/50 text-red-300" />
            <StatCard label="Son 24s Çalışan" value={data.triggersRanLast24h} icon={Activity} color="bg-blue-900/50 text-blue-300" />
            <StatCard label="Başarısız Trigger" value={data.failedTriggers} icon={AlertCircle} color={data.failedTriggers > 0 ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'} />
          </div>

          {/* Stat cards — Content CMS */}
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Content CMS — Home & Explore</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Home Section" value={data.publishedHomeSections ?? 0} icon={Home} color="bg-blue-900/50 text-blue-300" />
            <StatCard label="Explore Category" value={data.publishedExploreCategories ?? 0} icon={Compass} color="bg-cyan-900/50 text-cyan-300" />
            <StatCard label="Explore Card" value={data.publishedExploreCards ?? 0} icon={CreditCard} color="bg-indigo-900/50 text-indigo-300" />
            <StatCard label="Aktif Banner" value={data.activeBanners ?? 0} icon={Image} color="bg-orange-900/50 text-orange-300" />
          </div>

          {/* Stat cards — Routes & Admin */}
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Routes & Yönetim</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Aktif Route" value={data.activeRoutes} icon={Map} color="bg-indigo-900/50 text-indigo-300" />
            <StatCard label="Deprecated Route" value={data.deprecatedRoutes} icon={TrendingUp} color="bg-yellow-900/50 text-yellow-300" />
            <StatCard label="Stale Route" value={data.staleRoutes} icon={AlertCircle} color="bg-red-900/50 text-red-300" />
            <StatCard label="Admin Kullanıcı" value={data.totalAdminUsers} icon={Users} color="bg-purple-900/50 text-purple-300" />
          </div>

          {/* Stat cards — Guest Funnel */}
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Misafir Dönüşümü</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Aktif Misafir"
              value={guestStats?.totalGuests ?? 0}
              icon={Ghost}
              color="bg-slate-800 text-slate-300"
            />
            <StatCard
              label="Bugün Hesap Bağlayan"
              value={guestStats?.convertedToday ?? 0}
              icon={ArrowRight}
              color="bg-emerald-900/50 text-emerald-300"
            />
            <StatCard
              label="Eski Misafir (30g+)"
              value={guestStats?.staleGuests ?? 0}
              icon={UserX}
              color={(guestStats?.staleGuests ?? 0) > 100 ? 'bg-orange-900/50 text-orange-300' : 'bg-gray-800 text-gray-400'}
            />
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">Dönüşüm Oranı</span>
                <div className="p-2 rounded-lg bg-blue-900/50 text-blue-300">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">
                {guestStats ? `${guestStats.conversionRatePct.toFixed(1)}%` : '—'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent notifications */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl">
              <div className="px-5 py-4 border-b border-gray-800">
                <h2 className="font-semibold text-white text-sm">Son Bildirimler</h2>
              </div>
              {data.recentNotifications.length === 0 ? (
                <p className="text-gray-500 text-sm p-5">Henüz bildirim yok.</p>
              ) : (
                <ul className="divide-y divide-gray-800">
                  {data.recentNotifications.map((n) => (
                    <li key={n.id} className="px-5 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm text-white font-medium truncate">{n.title}</p>
                          <p className="text-xs text-gray-500">{timeAgo(n.createdAt)}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${statusColor(n.status)}`}>
                          {n.status}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Recent audit logs */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl">
              <div className="px-5 py-4 border-b border-gray-800">
                <h2 className="font-semibold text-white text-sm">Son Aktiviteler</h2>
              </div>
              {data.recentAuditLogs.length === 0 ? (
                <p className="text-gray-500 text-sm p-5">Henüz aktivite yok.</p>
              ) : (
                <ul className="divide-y divide-gray-800">
                  {data.recentAuditLogs.map((a) => (
                    <li key={a.id} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm text-white font-mono truncate">{a.actionType}</p>
                          <p className="text-xs text-gray-500">
                            {a.actorEmail} · {a.entityDisplay}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500 shrink-0">{timeAgo(a.createdAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
