'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '@/lib/api';
import { AuditLog, Page } from '@/types';
import { formatDate, roleColor } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useState } from 'react';
import { Eye } from 'lucide-react';

const ACTION_TYPES = [
  'ADMIN_LOGIN', 'ADMIN_LOGOUT',
  'NOTIFICATION_CREATE', 'NOTIFICATION_UPDATE', 'NOTIFICATION_STATUS_CHANGE',
  'NOTIFICATION_TEST_SEND', 'NOTIFICATION_CANCEL', 'NOTIFICATION_DEACTIVATE',
  'ROUTE_CREATE', 'ROUTE_UPDATE', 'ROUTE_DEACTIVATE', 'ROUTE_DEPRECATE', 'ROUTE_FALLBACK_CHANGE',
];

export default function AuditLogsPage() {
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [detail, setDetail] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(0);

  const handleActionFilter = (value: string) => { setActionFilter(value); setPage(0); };
  const handleEntityFilter = (value: string) => { setEntityFilter(value); setPage(0); };

  const PAGE_SIZE = 25;
  const { data, isLoading } = useQuery<Page<AuditLog>>({
    queryKey: ['audit-logs', actionFilter, entityFilter, page],
    queryFn: () => auditApi.list({
      actionType: actionFilter || undefined,
      entityType: entityFilter || undefined,
      page,
      size: PAGE_SIZE,
    }).then((r) => r.data),
  });

  function formatJson(raw?: string) {
    if (!raw) return 'null';
    try { return JSON.stringify(JSON.parse(raw), null, 2); }
    catch { return raw; }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
          <p className="text-gray-400 text-sm mt-1">{data?.totalElements ?? 0} kayıt</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <Select value={actionFilter} onChange={(e) => handleActionFilter(e.target.value)} className="w-56">
          <option value="">Tüm Aksiyonlar</option>
          {ACTION_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
        </Select>
        <Select value={entityFilter} onChange={(e) => handleEntityFilter(e.target.value)} className="w-40">
          <option value="">Tüm Entity</option>
          <option value="NOTIFICATION">NOTIFICATION</option>
          <option value="ROUTE">ROUTE</option>
          <option value="ADMIN_USER">ADMIN_USER</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                <th className="text-left px-4 py-3">Tarih</th>
                <th className="text-left px-4 py-3">Kullanıcı</th>
                <th className="text-left px-4 py-3">Rol</th>
                <th className="text-left px-4 py-3">Aksiyon</th>
                <th className="text-left px-4 py-3">Entity</th>
                <th className="text-left px-4 py-3">Hedef</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {data?.content?.map((log) => (
                <tr key={log.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                  <td className="px-4 py-3 text-xs text-white">{log.actorEmail ?? '-'}</td>
                  <td className="px-4 py-3">
                    {log.actorRole && (
                      <Badge className={roleColor(log.actorRole)}>{log.actorRole}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-purple-300">{log.actionType}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className="bg-gray-700 text-gray-300">{log.entityType}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-300 max-w-[200px] truncate">{log.entityDisplay ?? '-'}</td>
                  <td className="px-4 py-3">
                    {(log.oldValueJson || log.newValueJson) && (
                      <Button variant="ghost" size="sm" onClick={() => setDetail(log)}>
                        <Eye className="w-3 h-3" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.content?.length && (
            <p className="text-gray-500 text-sm text-center py-12">Log bulunamadı.</p>
          )}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
          <span>Sayfa {page + 1} / {data.totalPages} ({data.totalElements} kayıt)</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              ← Önceki
            </Button>
            <Button variant="secondary" size="sm" disabled={page >= data.totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Sonraki →
            </Button>
          </div>
        </div>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Değişiklik Detayı" className="max-w-2xl">
        {detail && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-1 uppercase">Önceki Değer</p>
              <pre className="bg-gray-800 rounded-lg p-3 text-xs text-gray-300 overflow-auto max-h-48">{formatJson(detail.oldValueJson)}</pre>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1 uppercase">Yeni Değer</p>
              <pre className="bg-gray-800 rounded-lg p-3 text-xs text-gray-300 overflow-auto max-h-48">{formatJson(detail.newValueJson)}</pre>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
