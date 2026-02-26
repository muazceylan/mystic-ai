/**
 * Custom Set Store — Kullanicinin kendi ruhsal setleri
 * Zustand + AsyncStorage persist
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from '../../utils/storage';
import type { CustomSet, CustomSetItem, SpiritualItemType } from '../types';

interface CustomSetState {
  sets: CustomSet[];

  createSet: (name: string) => CustomSet;
  deleteSet: (id: string) => void;
  renameSet: (id: string, name: string) => void;
  addItem: (setId: string, itemType: SpiritualItemType, itemId: number) => void;
  removeItem: (setId: string, itemType: SpiritualItemType, itemId: number) => void;
  reorderItems: (setId: string, items: CustomSetItem[]) => void;
  getSetById: (id: string) => CustomSet | undefined;
  isItemInSet: (setId: string, itemType: SpiritualItemType, itemId: number) => boolean;
}

export const useCustomSetStore = create<CustomSetState>()(
  persist(
    (set, get) => ({
      sets: [],

      createSet: (name: string): CustomSet => {
        const now = new Date().toISOString();
        const newSet: CustomSet = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          name,
          items: [],
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ sets: [...state.sets, newSet] }));
        return newSet;
      },

      deleteSet: (id: string) => {
        set((state) => ({ sets: state.sets.filter((s) => s.id !== id) }));
      },

      renameSet: (id: string, name: string) => {
        set((state) => ({
          sets: state.sets.map((s) =>
            s.id === id ? { ...s, name, updatedAt: new Date().toISOString() } : s,
          ),
        }));
      },

      addItem: (setId: string, itemType: SpiritualItemType, itemId: number) => {
        set((state) => ({
          sets: state.sets.map((s) => {
            if (s.id !== setId) return s;
            // No-op if item already exists
            const exists = s.items.some(
              (it) => it.itemType === itemType && it.itemId === itemId,
            );
            if (exists) return s;
            const nextOrder = s.items.length;
            const newItem: CustomSetItem = { itemType, itemId, order: nextOrder };
            return {
              ...s,
              items: [...s.items, newItem],
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      removeItem: (setId: string, itemType: SpiritualItemType, itemId: number) => {
        set((state) => ({
          sets: state.sets.map((s) => {
            if (s.id !== setId) return s;
            const filtered = s.items.filter(
              (it) => !(it.itemType === itemType && it.itemId === itemId),
            );
            // Reindex orders
            const reindexed = filtered.map((it, i) => ({ ...it, order: i }));
            return {
              ...s,
              items: reindexed,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      reorderItems: (setId: string, items: CustomSetItem[]) => {
        set((state) => ({
          sets: state.sets.map((s) =>
            s.id === setId
              ? { ...s, items, updatedAt: new Date().toISOString() }
              : s,
          ),
        }));
      },

      getSetById: (id: string): CustomSet | undefined => {
        return get().sets.find((s) => s.id === id);
      },

      isItemInSet: (setId: string, itemType: SpiritualItemType, itemId: number): boolean => {
        const s = get().sets.find((s) => s.id === setId);
        if (!s) return false;
        return s.items.some((it) => it.itemType === itemType && it.itemId === itemId);
      },
    }),
    {
      name: 'spiritual-custom-set-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ sets: state.sets }),
    },
  ),
);
