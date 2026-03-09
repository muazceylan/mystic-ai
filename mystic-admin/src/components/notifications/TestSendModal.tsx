'use client';

import { useState, useEffect, useCallback } from 'react';
import { usersApi, UserSummary } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Search, X, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestSendModalProps {
  open: boolean;
  onClose: () => void;
  notificationTitle: string;
  onSend: (userIds: number[]) => void;
  isSending: boolean;
}

export function TestSendModal({ open, onClose, notificationTitle, onSend, isSending }: TestSendModalProps) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const fetchUsers = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await usersApi.search(q, 0, 30);
      setUsers(res.data.content);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchUsers('');
  }, [open, fetchUsers]);

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchUsers]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleClose() {
    setSearch('');
    setSelected(new Set());
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Test Bildirimi Gönder" className="max-w-lg">
      <p className="text-gray-400 text-sm mb-4 truncate">{notificationTitle}</p>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Email veya isim ara..."
          className="pl-9"
        />
      </div>

      {/* Selected badges */}
      {selected.size > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3 p-2 bg-purple-900/20 border border-purple-800 rounded-lg">
          {Array.from(selected).map((id) => {
            const u = users.find((x) => x.id === id);
            if (!u) return null;
            return (
              <span
                key={id}
                className="flex items-center gap-1 bg-purple-800 text-purple-100 text-xs px-2 py-0.5 rounded-full"
              >
                {u.email}
                <button onClick={() => toggle(id)} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* User list */}
      <div className="border border-gray-700 rounded-lg overflow-hidden mb-4 max-h-64 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500 text-sm">Aranıyor...</div>
        ) : users.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">Kullanıcı bulunamadı.</div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {users.map((u) => {
              const isSelected = selected.has(u.id);
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => toggle(u.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-800',
                      isSelected && 'bg-purple-900/30'
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                      isSelected
                        ? 'bg-purple-600 border-purple-600'
                        : 'border-gray-600'
                    )}>
                      {isSelected && <span className="text-white text-[10px]">✓</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{u.email}</p>
                      {u.name && <p className="text-xs text-gray-500 truncate">{u.name}</p>}
                    </div>
                    <span className="ml-auto text-xs text-gray-600 shrink-0">#{u.id}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {selected.size > 0
            ? `${selected.size} kullanıcı seçili`
            : 'Kullanıcı seçin'}
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleClose}>İptal</Button>
          <Button
            onClick={() => onSend(Array.from(selected))}
            disabled={selected.size === 0 || isSending}
          >
            <UserCheck className="w-4 h-4" />
            {isSending
              ? 'Gönderiliyor...'
              : `${selected.size} Kişiye Gönder`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
