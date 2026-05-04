'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, Receipt, RotateCcw, Search } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { purchaseEventsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type {
  BillingProvider,
  BillingStore,
  Page,
  PurchaseEventProcessedStatus,
  PurchaseEventRecord,
  PurchaseEventType,
} from '@/types';

const PAGE_SIZE = 20;

type Filters = {
  userId: string;
  provider: string;
  store: string;
  productId: string;
  eventType: string;
  processedStatus: string;
  transactionId: string;
};

const EMPTY_FILTERS: Filters = {
  userId: '',
  provider: '',
  store: '',
  productId: '',
  eventType: '',
  processedStatus: '',
  transactionId: '',
};

const PROVIDERS: BillingProvider[] = ['REVENUECAT', 'APPLE_DIRECT', 'GOOGLE_DIRECT', 'ADMIN_GRANT'];
const STORES: BillingStore[] = ['APP_STORE', 'PLAY_STORE', 'STRIPE', 'PROMOTIONAL', 'ADMIN'];
const EVENT_TYPES: PurchaseEventType[] = [
  'INITIAL_PURCHASE',
  'RENEWAL',
  'CANCELLATION',
  'UNCANCELLATION',
  'EXPIRATION',
  'BILLING_ISSUE',
  'PRODUCT_CHANGE',
  'NON_RENEWING_PURCHASE',
  'SUBSCRIPTION_PAUSED',
  'REFUND',
  'REVOCATION',
  'TRIAL_STARTED',
  'TRIAL_CONVERTED',
  'ADMIN_GRANT',
  'ADMIN_REVOKE',
  'IGNORED',
];
const PROCESSED_STATUSES: PurchaseEventProcessedStatus[] = ['PENDING', 'PROCESSED', 'DUPLICATE', 'FAILED', 'IGNORED'];

function statusClass(status: PurchaseEventProcessedStatus) {
  switch (status) {
    case 'PROCESSED':
      return 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20';
    case 'FAILED':
      return 'bg-red-500/10 text-red-300 border border-red-500/20';
    case 'DUPLICATE':
      return 'bg-amber-500/10 text-amber-300 border border-amber-500/20';
    case 'IGNORED':
      return 'bg-slate-500/10 text-slate-300 border border-slate-500/20';
    default:
      return 'bg-blue-500/10 text-blue-300 border border-blue-500/20';
  }
}

export default function PurchaseEventsPage() {
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const params = useMemo(() => {
    const next: Record<string, unknown> = { page, size: PAGE_SIZE };
    if (filters.userId.trim()) next.userId = Number(filters.userId);
    if (filters.provider) next.provider = filters.provider;
    if (filters.store) next.store = filters.store;
    if (filters.productId.trim()) next.productId = filters.productId.trim();
    if (filters.eventType) next.eventType = filters.eventType;
    if (filters.processedStatus) next.processedStatus = filters.processedStatus;
    if (filters.transactionId.trim()) next.transactionId = filters.transactionId.trim();
    return next;
  }, [filters, page]);

  const query = useQuery<Page<PurchaseEventRecord>>({
    queryKey: ['purchase-events', params],
    queryFn: () => purchaseEventsApi.list(params).then((response) => response.data),
  });

  const rows = query.data?.content ?? [];

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/monetization/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Receipt className="w-5 h-5 text-purple-400" />
          Purchase Events
        </h1>
      </div>

      <div className="space-y-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-white font-semibold">Webhook ve satın alma event gözlemi</p>
              <p className="text-xs text-gray-400 mt-1">
                RevenueCat event logu, token grant referansları ve refund/revocation sonuçları burada izlenir.
              </p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {query.data?.totalElements ?? 0} kayıt
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              placeholder="User ID"
              value={draft.userId}
              onChange={(event) => setDraft((current) => ({ ...current, userId: event.target.value }))}
            />
            <Select
              value={draft.provider}
              onChange={(event) => setDraft((current) => ({ ...current, provider: event.target.value }))}
            >
              <option value="">Tüm sağlayıcılar</option>
              {PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>{provider}</option>
              ))}
            </Select>
            <Select
              value={draft.store}
              onChange={(event) => setDraft((current) => ({ ...current, store: event.target.value }))}
            >
              <option value="">Tüm mağazalar</option>
              {STORES.map((store) => (
                <option key={store} value={store}>{store}</option>
              ))}
            </Select>
            <Select
              value={draft.processedStatus}
              onChange={(event) => setDraft((current) => ({ ...current, processedStatus: event.target.value }))}
            >
              <option value="">Tüm sonuçlar</option>
              {PROCESSED_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </Select>
            <Input
              placeholder="Product ID"
              value={draft.productId}
              onChange={(event) => setDraft((current) => ({ ...current, productId: event.target.value }))}
            />
            <Select
              value={draft.eventType}
              onChange={(event) => setDraft((current) => ({ ...current, eventType: event.target.value }))}
            >
              <option value="">Tüm event tipleri</option>
              {EVENT_TYPES.map((eventType) => (
                <option key={eventType} value={eventType}>{eventType}</option>
              ))}
            </Select>
            <Input
              placeholder="Transaction / Original Tx"
              value={draft.transactionId}
              onChange={(event) => setDraft((current) => ({ ...current, transactionId: event.target.value }))}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => {
                  setPage(0);
                  setFilters(draft);
                }}
                className="w-full"
              >
                <Search className="w-4 h-4" />
                Filtrele
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setPage(0);
                  setDraft(EMPTY_FILTERS);
                  setFilters(EMPTY_FILTERS);
                }}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="bg-gray-950/60">
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Token</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {query.isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                      Kayıtlar yükleniyor...
                    </td>
                  </tr>
                ) : null}

                {!query.isLoading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                      Filtreye uyan purchase event bulunamadı.
                    </td>
                  </tr>
                ) : null}

                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-gray-800 align-top">
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-white">{row.eventType}</div>
                      <div className="text-xs text-gray-500 mt-1 font-mono break-all">{row.eventId}</div>
                      {row.failureReason ? (
                        <div className="text-xs text-red-300 mt-2">{row.failureReason}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-300">
                      {row.userId ?? '—'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-200">{row.productId ?? '—'}</div>
                      <div className="text-xs text-gray-500 mt-1">{row.productType ?? '—'}</div>
                      {row.transactionId || row.originalTransactionId ? (
                        <div className="text-xs text-gray-500 mt-2 font-mono">
                          {row.transactionId ?? row.originalTransactionId}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-300">
                      <div>{row.provider}</div>
                      <div className="text-xs text-gray-500 mt-1">{row.store ?? '—'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusClass(row.processedStatus)}`}>
                        {row.processedStatus}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-300">
                      {row.tokenAmountGranted ?? '—'}
                      {row.ledgerEntryId ? (
                        <div className="text-xs text-gray-500 mt-1 font-mono break-all">{row.ledgerEntryId}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-300">
                      <div>{formatDate(row.createdAt)}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {row.processedAt ? `Processed ${formatDate(row.processedAt)}` : 'Henüz işlenmedi'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Sayfa {query.data ? query.data.number + 1 : 1} / {Math.max(query.data?.totalPages ?? 1, 1)}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={page === 0}
                onClick={() => setPage((current) => Math.max(current - 1, 0))}
              >
                Önceki
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!query.data || page >= query.data.totalPages - 1}
                onClick={() => setPage((current) => current + 1)}
              >
                Sonraki
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
