'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { guruWalletApi } from '@/lib/api';
import { GuruWallet, GuruLedger, Page } from '@/types';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { Search, Plus, Minus } from 'lucide-react';
import { useState } from 'react';

export default function WalletsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [userIdInput, setUserIdInput] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [ledgerPage, setLedgerPage] = useState(0);
  const [grantAmount, setGrantAmount] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [revokeAmount, setRevokeAmount] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const PAGE_SIZE = 20;

  const handleSearch = () => {
    const parsed = parseInt(userIdInput, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setUserId(parsed);
      setLedgerPage(0);
    } else {
      toast.error('Geçerli bir User ID girin.');
    }
  };

  const { data: wallet, isLoading: walletLoading, isError: walletError } = useQuery<GuruWallet>({
    queryKey: ['guru-wallet', userId],
    queryFn: () => guruWalletApi.getWallet(userId!).then(r => r.data),
    enabled: userId !== null,
  });

  const { data: ledger, isLoading: ledgerLoading } = useQuery<Page<GuruLedger>>({
    queryKey: ['guru-ledger', userId, ledgerPage],
    queryFn: () => guruWalletApi.getLedger(userId!, { page: ledgerPage, size: PAGE_SIZE }).then(r => r.data),
    enabled: userId !== null,
  });

  const grantMut = useMutation({
    mutationFn: () => guruWalletApi.grant(userId!, { amount: Number(grantAmount), reason: grantReason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guru-wallet', userId] });
      qc.invalidateQueries({ queryKey: ['guru-ledger', userId] });
      toast.success('Guru eklendi.');
      setGrantAmount('');
      setGrantReason('');
    },
    onError: () => toast.error('Grant başarısız.'),
  });

  const revokeMut = useMutation({
    mutationFn: () => guruWalletApi.revoke(userId!, { amount: Number(revokeAmount), reason: revokeReason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guru-wallet', userId] });
      qc.invalidateQueries({ queryKey: ['guru-ledger', userId] });
      toast.success('Guru düşüldü.');
      setRevokeAmount('');
      setRevokeReason('');
    },
    onError: () => toast.error('Revoke başarısız.'),
  });

  const txTypeColor = (type: string) => {
    switch (type) {
      case 'REWARD_EARNED': return 'bg-green-900 text-green-300';
      case 'GURU_SPENT': return 'bg-red-900 text-red-300';
      case 'PURCHASE_COMPLETED': return 'bg-blue-900 text-blue-300';
      case 'ADMIN_GRANT': return 'bg-purple-900 text-purple-300';
      case 'ADMIN_REVOKE': return 'bg-orange-900 text-orange-300';
      case 'WELCOME_BONUS': return 'bg-yellow-900 text-yellow-300';
      default: return 'bg-gray-800 text-gray-500';
    }
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-white mb-6">Guru Cüzdanları</h1>

      {/* Search */}
      <div className="flex gap-3 mb-6">
        <Input
          value={userIdInput}
          onChange={e => setUserIdInput(e.target.value)}
          placeholder="User ID"
          className="w-48"
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch}><Search className="w-4 h-4" /> Ara</Button>
      </div>

      {userId !== null && walletLoading && (
        <div className="h-24 bg-gray-900 rounded-xl animate-pulse mb-6" />
      )}

      {userId !== null && walletError && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <p className="text-gray-400 text-sm">Bu kullanıcı için cüzdan bulunamadı.</p>
        </div>
      )}

      {/* Wallet Info */}
      {wallet && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Cüzdan Bilgileri</h2>
            <Badge className={`text-xs ${wallet.status === 'ACTIVE' ? 'bg-green-900 text-green-300' : wallet.status === 'SUSPENDED' ? 'bg-yellow-900 text-yellow-300' : 'bg-red-900 text-red-300'}`}>
              {wallet.status}
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-400">Bakiye</p>
              <p className="text-xl font-bold text-white">{wallet.currentBalance}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Toplam Kazanılan</p>
              <p className="text-lg font-semibold text-green-400">{wallet.lifetimeEarned}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Toplam Harcanan</p>
              <p className="text-lg font-semibold text-red-400">{wallet.lifetimeSpent}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Toplam Satın Alınan</p>
              <p className="text-lg font-semibold text-blue-400">{wallet.lifetimePurchased}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3 text-xs text-gray-500">
            {wallet.lastEarnedAt && <span>Son kazanım: {formatDate(wallet.lastEarnedAt)}</span>}
            {wallet.lastSpentAt && <span>Son harcama: {formatDate(wallet.lastSpentAt)}</span>}
          </div>
        </div>
      )}

      {/* Grant / Revoke */}
      {wallet && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-green-400 flex items-center gap-1"><Plus className="w-4 h-4" /> Guru Ekle (Grant)</p>
            <Input value={grantAmount} onChange={e => setGrantAmount(e.target.value)} placeholder="Miktar" type="number" min={1} />
            <Input value={grantReason} onChange={e => setGrantReason(e.target.value)} placeholder="Sebep" />
            <Button
              size="sm"
              disabled={grantMut.isPending || !grantAmount || !grantReason}
              onClick={() => grantMut.mutate()}
            >
              {grantMut.isPending ? 'Ekleniyor...' : 'Ekle'}
            </Button>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-red-400 flex items-center gap-1"><Minus className="w-4 h-4" /> Guru Düş (Revoke)</p>
            <Input value={revokeAmount} onChange={e => setRevokeAmount(e.target.value)} placeholder="Miktar" type="number" min={1} />
            <Input value={revokeReason} onChange={e => setRevokeReason(e.target.value)} placeholder="Sebep" />
            <Button
              variant="danger"
              size="sm"
              disabled={revokeMut.isPending || !revokeAmount || !revokeReason}
              onClick={() => revokeMut.mutate()}
            >
              {revokeMut.isPending ? 'Düşülüyor...' : 'Düş'}
            </Button>
          </div>
        </div>
      )}

      {/* Ledger */}
      {userId !== null && (
        <>
          <h2 className="text-lg font-semibold text-white mb-3">İşlem Geçmişi</h2>
          {ledgerLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-gray-900 rounded-xl animate-pulse" />)}</div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                    <th className="text-left px-4 py-3">Tip</th>
                    <th className="text-left px-4 py-3">Kaynak</th>
                    <th className="text-left px-4 py-3">Miktar</th>
                    <th className="text-left px-4 py-3">Önce</th>
                    <th className="text-left px-4 py-3">Sonra</th>
                    <th className="text-left px-4 py-3">Module</th>
                    <th className="text-left px-4 py-3">Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {ledger?.content?.map(l => (
                    <tr key={l.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${txTypeColor(l.transactionType)}`}>{l.transactionType}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{l.sourceType}</td>
                      <td className="px-4 py-3">
                        <span className={l.amount >= 0 ? 'text-green-400' : 'text-red-400'}>{l.amount >= 0 ? '+' : ''}{l.amount}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{l.balanceBefore}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{l.balanceAfter}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs font-mono">{l.moduleKey || '-'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!ledger?.content?.length && <p className="text-gray-500 text-sm text-center py-12">İşlem bulunamadı.</p>}
            </div>
          )}

          {ledger && ledger.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
              <span>Sayfa {ledgerPage + 1} / {ledger.totalPages}</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={ledgerPage === 0} onClick={() => setLedgerPage(p => p - 1)}>Önceki</Button>
                <Button variant="secondary" size="sm" disabled={ledgerPage >= ledger.totalPages - 1} onClick={() => setLedgerPage(p => p + 1)}>Sonraki</Button>
              </div>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
