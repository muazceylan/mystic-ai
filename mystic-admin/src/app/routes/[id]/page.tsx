'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useQuery } from '@tanstack/react-query';
import { routesApi } from '@/lib/api';
import { AppRoute } from '@/types';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Edit2, Lock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';

export default function RouteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: route, isLoading } = useQuery<AppRoute>({
    queryKey: ['route', id],
    queryFn: () => routesApi.get(Number(id)).then((r) => r.data),
  });

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/routes">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Route Detay</h1>
        {route && (
          <Link href={`/routes/${id}/edit`} className="ml-auto">
            <Button variant="secondary" size="sm"><Edit2 className="w-3 h-3" /> Düzenle</Button>
          </Link>
        )}
      </div>

      {isLoading && <div className="h-48 bg-gray-900 rounded-xl animate-pulse" />}

      {route && (
        <div className="max-w-2xl space-y-4">
          {route.deprecated && (
            <div className="bg-orange-900/30 border border-orange-800 rounded-xl p-4 flex items-center gap-2 text-orange-300">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              Bu route deprecated. Yeni bildirim atamalarında kullanılmamalı.
            </div>
          )}

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-purple-300 text-lg">{route.routeKey}</span>
              {route.requiresAuth && <Badge className="bg-yellow-900 text-yellow-300"><Lock className="w-3 h-3 mr-1" />Auth</Badge>}
              {route.active ? <Badge className="bg-green-900 text-green-300">Aktif</Badge> : <Badge className="bg-gray-700 text-gray-400">Pasif</Badge>}
              {route.deprecated && <Badge className="bg-orange-900 text-orange-300">Deprecated</Badge>}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-0.5">Display Name</p>
                <p className="text-white">{route.displayName}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">Path</p>
                <p className="text-white font-mono">{route.path}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">Module</p>
                <p className="text-white">{route.moduleKey ?? '-'}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">Platform</p>
                <p className="text-white">{route.supportedPlatforms}</p>
              </div>
              {route.fallbackRouteKey && (
                <div>
                  <p className="text-gray-500 mb-0.5">Fallback Route</p>
                  <p className="text-white font-mono">{route.fallbackRouteKey}</p>
                </div>
              )}
              {route.description && (
                <div className="col-span-2">
                  <p className="text-gray-500 mb-0.5">Açıklama</p>
                  <p className="text-white">{route.description}</p>
                </div>
              )}
              <div>
                <p className="text-gray-500 mb-0.5">Oluşturulma</p>
                <p className="text-white">{formatDate(route.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">Güncellenme</p>
                <p className="text-white">{formatDate(route.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
