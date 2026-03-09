'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Bell, Map, ClipboardList, LogOut, Star, Layers, Navigation, Users, GitMerge, Sun, CalendarDays, BookOpen, Library, Zap, History, Type, Home, Compass, CreditCard, Image } from 'lucide-react';
import { cn, roleColor } from '@/lib/utils';
import { getUser, removeToken, canViewAudit, canManageRoutes, canManageNotifications, canManageNameSources, isSuperAdmin } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, always: true },
  { href: '/notifications', label: 'Notifications', icon: Bell, check: canManageNotifications },
  { href: '/notification-catalog', label: 'Notification Catalog', icon: Library, check: canManageNotifications },
  { href: '/notification-triggers', label: 'Trigger Monitor', icon: Zap, check: canManageNotifications },
  { href: '/notification-history', label: 'Delivery History', icon: History, check: canManageNotifications },
  { href: '/home-sections', label: 'Home Sections', icon: Home, check: canManageRoutes },
  { href: '/explore-categories', label: 'Explore Categories', icon: Compass, check: canManageRoutes },
  { href: '/explore-cards', label: 'Explore Cards', icon: CreditCard, check: canManageRoutes },
  { href: '/banners', label: 'Banners', icon: Image, check: canManageRoutes },
  { href: '/daily-horoscopes', label: 'Daily Horoscopes', icon: Sun, check: canManageRoutes },
  { href: '/weekly-horoscopes', label: 'Weekly Horoscopes', icon: CalendarDays, check: canManageRoutes },
  { href: '/prayers', label: 'Prayers', icon: BookOpen, check: canManageRoutes },
  { href: '/modules', label: 'Modules', icon: Layers, check: canManageRoutes },
  { href: '/navigation', label: 'Navigation', icon: Navigation, check: canManageRoutes },
  { href: '/routes', label: 'Route Registry', icon: Map, check: canManageRoutes },
  { href: '/names', label: 'Canonical Names', icon: Type, check: canManageNameSources },
  { href: '/name-review-queue', label: 'Name Review Queue', icon: GitMerge, check: canManageNameSources },
  { href: '/admin-users', label: 'Admin Users', icon: Users, check: isSuperAdmin },
  { href: '/audit-logs', label: 'Audit Logs', icon: ClipboardList, check: canViewAudit },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();

  function logout() {
    removeToken();
    router.push('/login');
  }

  return (
    <aside className="w-64 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-800">
        <Star className="text-purple-400 w-5 h-5" />
        <span className="text-white font-semibold text-lg">Mystic Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          if (!item.always && item.check && !item.check(user)) return null;
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-purple-900/50 text-purple-300'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-gray-800">
        <div className="mb-2">
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          <span className={cn('text-xs px-2 py-0.5 rounded-full', roleColor(user?.role ?? ''))}>
            {user?.role}
          </span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors mt-2"
        >
          <LogOut className="w-4 h-4" />
          Çıkış
        </button>
      </div>
    </aside>
  );
}
