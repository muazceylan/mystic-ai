'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { canManageNameSources, getUser } from '@/lib/auth';
import { namesApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { AdminNameListItem, NameGender, NameStatus, Page } from '@/types';
import { mapAdminNamesPage } from '@/lib/names-mapper';

const PAGE_SIZE = 25;

function boolParam(value: string) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function statusBadge(status: NameStatus) {
  switch (status) {
    case 'ACTIVE': return 'bg-green-900/40 text-green-300';
    case 'PENDING_REVIEW': return 'bg-yellow-900/40 text-yellow-300';
    case 'HIDDEN': return 'bg-blue-900/40 text-blue-300';
    case 'REJECTED': return 'bg-red-900/40 text-red-300';
    default: return 'bg-gray-700 text-gray-300';
  }
}

function genderLabel(gender: NameGender | null) {
  if (!gender) return '-';
  switch (gender) {
    case 'MALE': return 'Erkek';
    case 'FEMALE': return 'Kadın';
    case 'UNISEX': return 'Unisex';
    default: return 'Bilinmiyor';
  }
}

function shortText(value?: string | null, max = 120) {
  if (!value) return '-';
  return value.length <= max ? value : `${value.slice(0, max)}...`;
}

export default function NamesPage() {
  const router = useRouter();
  const user = getUser();

  const [page, setPage] = useState(0);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [gender, setGender] = useState('');
  const [origin, setOrigin] = useState('');
  const [hasTags, setHasTags] = useState('');
  const [hasAliases, setHasAliases] = useState('');

  const params = useMemo(() => ({
    q: q || undefined,
    status: status || undefined,
    gender: gender || undefined,
    origin: origin || undefined,
    hasTags: boolParam(hasTags),
    hasAliases: boolParam(hasAliases),
    page,
    size: PAGE_SIZE,
  }), [q, status, gender, origin, hasTags, hasAliases, page]);

  const namesQuery = useQuery<Page<AdminNameListItem>>({
    queryKey: ['admin-names', params],
    queryFn: () => namesApi.list(params).then((res) => mapAdminNamesPage(res.data)),
  });

  const errorMessage = (() => {
    const error = namesQuery.error as { response?: { data?: { message?: string } }; message?: string } | null;
    if (!error) return null;
    return error.response?.data?.message || error.message || 'İsim listesi alınamadı.';
  })();

  if (!canManageNameSources(user)) {
    return (
      <AdminLayout>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-sm text-gray-300">
          Bu ekranı görüntülemek için yetkiniz yok.
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Canonical Names</h1>
          <p className="text-gray-400 text-sm mt-1">Approve edilmiş canonical isim kayıtları</p>
        </div>
        <div className="text-sm text-gray-400">
          {namesQuery.data?.totalElements ?? 0} kayıt
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-7 gap-3">
          <div className="md:col-span-2 xl:col-span-2">
            <Input
              placeholder="İsim / normalized / anlam ara"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setQ(qInput.trim());
                  setPage(0);
                }
              }}
            />
          </div>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
            <option value="ACTIVE">Status: ACTIVE</option>
            <option value="PENDING_REVIEW">Status: PENDING_REVIEW</option>
            <option value="HIDDEN">Status: HIDDEN</option>
            <option value="REJECTED">Status: REJECTED</option>
            <option value="">Status: All</option>
          </Select>
          <Select value={gender} onChange={(e) => { setGender(e.target.value); setPage(0); }}>
            <option value="">Gender: All</option>
            <option value="MALE">MALE</option>
            <option value="FEMALE">FEMALE</option>
            <option value="UNISEX">UNISEX</option>
            <option value="UNKNOWN">UNKNOWN</option>
          </Select>
          <Input
            placeholder="Origin filtre"
            value={origin}
            onChange={(e) => { setOrigin(e.target.value); setPage(0); }}
          />
          <Select value={hasTags} onChange={(e) => { setHasTags(e.target.value); setPage(0); }}>
            <option value="">Tags: All</option>
            <option value="true">Tags: Var</option>
            <option value="false">Tags: Yok</option>
          </Select>
          <Select value={hasAliases} onChange={(e) => { setHasAliases(e.target.value); setPage(0); }}>
            <option value="">Aliases: All</option>
            <option value="true">Aliases: Var</option>
            <option value="false">Aliases: Yok</option>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              setQ(qInput.trim());
              setPage(0);
            }}
          >
            Ara
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setQInput('');
              setQ('');
              setStatus('ACTIVE');
              setGender('');
              setOrigin('');
              setHasTags('');
              setHasAliases('');
              setPage(0);
            }}
          >
            Sıfırla
          </Button>
        </div>
      </div>

      {namesQuery.isError && (
        <div className="mb-4 rounded-xl border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-800/50">
            <tr>
              {['İsim', 'Cinsiyet', 'Köken', 'Kısa Anlam', 'Durum', 'Güncellenme', 'Alias', 'Detay'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-semibold uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {namesQuery.isLoading && Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td></tr>
            ))}
            {!namesQuery.isLoading && (namesQuery.data?.content ?? []).map((item) => (
              <tr key={item.id} className="hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-white font-medium">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.normalizedName}</p>
                </td>
                <td className="px-4 py-3 text-gray-300">{genderLabel(item.gender)}</td>
                <td className="px-4 py-3 text-gray-300">{item.origin || '-'}</td>
                <td className="px-4 py-3 text-gray-300 max-w-[360px]">{shortText(item.meaningShort)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(item.status)}`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(item.updatedAt)}</td>
                <td className="px-4 py-3 text-gray-300">
                  {item.hasAliases ? `${item.aliasCount}` : '-'}
                </td>
                <td className="px-4 py-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => router.push(`/names/${item.id}`)}
                  >
                    Detay
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!namesQuery.isLoading && !namesQuery.isError && (namesQuery.data?.content?.length ?? 0) === 0 && (
          <div className="px-4 py-10 text-center text-sm text-gray-500">
            Filtrelere uygun isim bulunamadı.
          </div>
        )}

        {namesQuery.data && namesQuery.data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 text-xs text-gray-500">
            <span>Sayfa {page + 1} / {namesQuery.data.totalPages} ({namesQuery.data.totalElements} kayıt)</span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((current) => current - 1)}
              >
                Önceki
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= namesQuery.data.totalPages - 1}
                onClick={() => setPage((current) => current + 1)}
              >
                Sonraki
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
