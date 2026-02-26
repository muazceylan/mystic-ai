/**
 * Journal Store — AsyncStorage'a persist edilen günlük kayıtlar
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from '../../utils/storage';
import type { JournalEntry, DhikrSessionLocal } from '../types';

interface JournalState {
  entries: JournalEntry[];
  sessions: DhikrSessionLocal[];

  // Entry actions
  addEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => JournalEntry;
  updateEntry: (id: string, patch: Partial<Pick<JournalEntry, 'note' | 'completed'>>) => void;
  deleteEntry: (id: string) => void;
  getEntriesByDate: (dateISO: string) => JournalEntry[];
  getEntriesByDateRange: (from: string, to: string) => JournalEntry[];

  // Session actions
  addSession: (session: Omit<DhikrSessionLocal, 'id'>) => DhikrSessionLocal;
  getSessionsByDate: (dateISO: string) => DhikrSessionLocal[];

  // Stats helpers
  getStreakDays: () => number;
  getTotalByDateRange: (from: string, to: string) => { prayerTotal: number; esmaTotal: number; dayCount: number };
  getTopItems: (from: string, to: string, limit?: number) => Array<{ itemId: number; itemType: 'esma' | 'dua'; itemName: string; total: number }>;
  getDailyTotals: (from: string, to: string) => Array<{ dateISO: string; total: number }>;
}

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      entries: [],
      sessions: [],

      addEntry: (entry) => {
        const newEntry: JournalEntry = {
          ...entry,
          id: genId(),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ entries: [newEntry, ...s.entries] }));
        return newEntry;
      },

      updateEntry: (id, patch) => {
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        }));
      },

      deleteEntry: (id) => {
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
      },

      getEntriesByDate: (dateISO) => {
        return get().entries.filter((e) => e.dateISO === dateISO);
      },

      getEntriesByDateRange: (from, to) => {
        return get().entries.filter((e) => e.dateISO >= from && e.dateISO <= to);
      },

      addSession: (session) => {
        const newSession: DhikrSessionLocal = { ...session, id: genId() };
        set((s) => ({ sessions: [newSession, ...s.sessions] }));
        return newSession;
      },

      getSessionsByDate: (dateISO) => {
        return get().sessions.filter((s) => {
          const d = new Date(s.startedAt).toISOString().slice(0, 10);
          return d === dateISO;
        });
      },

      getStreakDays: () => {
        const entries = get().entries;
        if (entries.length === 0) return 0;

        const uniqueDates = [...new Set(entries.map((e) => e.dateISO))].sort().reverse();
        const today = new Date().toISOString().slice(0, 10);

        let streak = 0;
        let cursor = today;

        for (const d of uniqueDates) {
          if (d === cursor) {
            streak++;
            const prev = new Date(cursor);
            prev.setDate(prev.getDate() - 1);
            cursor = prev.toISOString().slice(0, 10);
          } else if (d < cursor) {
            break;
          }
        }
        return streak;
      },

      getTotalByDateRange: (from, to) => {
        const entries = get().getEntriesByDateRange(from, to);
        const prayerTotal = entries.filter((e) => e.itemType === 'dua').reduce((sum, e) => sum + e.completed, 0);
        const esmaTotal = entries.filter((e) => e.itemType === 'esma').reduce((sum, e) => sum + e.completed, 0);
        const dayCount = new Set(entries.map((e) => e.dateISO)).size;
        return { prayerTotal, esmaTotal, dayCount };
      },

      getTopItems: (from, to, limit = 3) => {
        const entries = get().getEntriesByDateRange(from, to);
        const map: Record<string, { itemId: number; itemType: 'esma' | 'dua'; itemName: string; total: number }> = {};

        for (const e of entries) {
          const key = `${e.itemType}-${e.itemId}`;
          if (!map[key]) {
            map[key] = { itemId: e.itemId, itemType: e.itemType, itemName: e.itemName, total: 0 };
          }
          map[key].total += e.completed;
        }

        return Object.values(map).sort((a, b) => b.total - a.total).slice(0, limit);
      },

      getDailyTotals: (from, to) => {
        const entries = get().getEntriesByDateRange(from, to);
        const map: Record<string, number> = {};

        for (const e of entries) {
          map[e.dateISO] = (map[e.dateISO] ?? 0) + e.completed;
        }

        // from→to arasındaki tüm günleri doldur (boş günler 0)
        const result: Array<{ dateISO: string; total: number }> = [];
        const cursor = new Date(from);
        const end = new Date(to);

        while (cursor <= end) {
          const d = cursor.toISOString().slice(0, 10);
          result.push({ dateISO: d, total: map[d] ?? 0 });
          cursor.setDate(cursor.getDate() + 1);
        }
        return result;
      },
    }),
    {
      name: 'spiritual-journal-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({ entries: s.entries, sessions: s.sessions }),
    },
  ),
);
