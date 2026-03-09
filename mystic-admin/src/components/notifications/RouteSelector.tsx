'use client';

import { useState, useEffect } from 'react';
import { routesApi } from '@/lib/api';
import { AppRoute } from '@/types';
import { Input } from '@/components/ui/Input';
import { AlertTriangle, Info, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RouteSelectorProps {
  value?: string;
  onChange: (key: string) => void;
  label?: string;
  required?: boolean;
}

export function RouteSelector({ value, onChange, label = 'Route', required }: RouteSelectorProps) {
  const [routes, setRoutes] = useState<AppRoute[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const selected = routes.find((r) => r.routeKey === value);

  useEffect(() => {
    routesApi.listActive().then((res) => setRoutes(res.data));
  }, []);

  const filtered = routes.filter((r) =>
    r.routeKey.includes(search.toLowerCase()) ||
    r.displayName.toLowerCase().includes(search.toLowerCase()) ||
    r.path.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-left text-white focus:outline-none focus:border-purple-500"
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <span className="font-mono text-purple-300 text-xs">{selected.routeKey}</span>
            <span className="text-gray-400">— {selected.displayName}</span>
          </span>
        ) : (
          <span className="text-gray-500">Route seç...</span>
        )}
      </button>

      {open && (
        <div className="absolute z-20 top-full mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
          <div className="p-2">
            <Input
              placeholder="Ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <ul className="max-h-48 overflow-y-auto divide-y divide-gray-700">
            <li>
              <button
                type="button"
                className="w-full px-3 py-2 text-sm text-gray-400 hover:bg-gray-700 text-left"
                onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
              >
                — Seçme
              </button>
            </li>
            {filtered.map((r) => (
              <li key={r.routeKey}>
                <button
                  type="button"
                  onClick={() => { onChange(r.routeKey); setOpen(false); setSearch(''); }}
                  className={cn(
                    'w-full px-3 py-2 text-sm text-left hover:bg-gray-700 flex items-center justify-between gap-2',
                    r.routeKey === value && 'bg-purple-900/40'
                  )}
                >
                  <div>
                    <span className="font-mono text-purple-300 text-xs">{r.routeKey}</span>
                    <p className="text-gray-300">{r.displayName}</p>
                    <p className="text-gray-500 text-xs">{r.path}</p>
                  </div>
                  {r.requiresAuth && <Lock className="w-3 h-3 text-gray-500 shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Info card for selected route */}
      {selected && (
        <div className="mt-2 p-3 bg-gray-800 border border-gray-700 rounded-lg text-xs space-y-1">
          <div className="flex items-center gap-2 text-gray-400">
            <Info className="w-3 h-3" />
            <span className="font-mono text-purple-300">{selected.path}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selected.requiresAuth && (
              <span className="text-yellow-400 flex items-center gap-1"><Lock className="w-3 h-3" /> Auth gerekli</span>
            )}
            {!selected.active && (
              <span className="text-red-400">Pasif route</span>
            )}
            {selected.deprecated && (
              <span className="flex items-center gap-1 text-orange-400"><AlertTriangle className="w-3 h-3" /> Deprecated</span>
            )}
            {selected.fallbackRouteKey && (
              <span className="text-gray-400">Fallback: {selected.fallbackRouteKey}</span>
            )}
          </div>
        </div>
      )}

      {/* Warning for deprecated */}
      {selected?.deprecated && (
        <div className="mt-2 p-2 bg-orange-900/30 border border-orange-800 rounded-lg flex items-center gap-2 text-xs text-orange-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Bu route deprecated. Lütfen güncel bir route seç veya fallback tanımla.
        </div>
      )}
    </div>
  );
}
