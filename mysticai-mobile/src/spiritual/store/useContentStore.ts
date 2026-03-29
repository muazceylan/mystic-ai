/**
 * Content Store — esma/dua/sure data
 *
 * Priority: CMS API (admin-editable) → local JSON (bundled fallback)
 * IDs come from CMS after first load; local JSON IDs used as initial state.
 */

import { create } from 'zustand';
import type { EsmaItem, DuaItem, BreathingTechnique } from '../types';
import { fetchPrayers, type CmsPrayer } from '../../services/cmsContent.service';

// Static fallbacks — always available, used until CMS loads
const localEsma: EsmaItem[] = require('../../../assets/data/esma.tr.json');
const localDua: DuaItem[] = require('../../../assets/data/dua.tr.json');
const breathingData: BreathingTechnique[] = require('../../../assets/data/breathing.tr.json');

// ─── CMS → local type mappers ──────────────────────────────────────────────

function cmsToEsma(p: CmsPrayer): EsmaItem {
  return {
    id: p.id,
    order: p.id,
    nameAr: p.arabicText ?? '',
    nameTr: p.title,
    transliteration: p.transliteration ?? '',
    meaningTr: p.meaning ?? '',
    meaningEn: p.meaningEn ?? undefined,
    shortBenefit: p.meaning ?? '',
    defaultTargetCount: p.suggestedCount ?? 33,
    tags: p.tags ? p.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    sources: [],
  };
}

function cmsToDua(p: CmsPrayer): DuaItem {
  return {
    id: p.id,
    title: p.title,
    category: p.category,
    arabic: p.arabicText ?? '',
    transliteration: p.transliteration ?? '',
    meaningTr: p.meaning ?? '',
    meaningEn: p.meaningEn ?? undefined,
    shortBenefit: p.meaning ?? '',
    defaultTargetCount: p.suggestedCount ?? 3,
    tags: p.tags ? p.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    relatedAyahRef: null,
    sources: [],
  };
}

// ─── Store types ───────────────────────────────────────────────────────────

interface ContentState {
  esmaList: EsmaItem[];
  duaList: DuaItem[];
  sureList: DuaItem[];
  pureDuaList: DuaItem[];
  breathingTechniques: BreathingTechnique[];
  source: 'local' | 'cms';

  loadFromCms: (locale?: string) => Promise<void>;

  getEsmaById: (id: number) => EsmaItem | undefined;
  getDuaById: (id: number) => DuaItem | undefined;
  getSureById: (id: number) => DuaItem | undefined;
  getBreathingById: (id: string) => BreathingTechnique | undefined;

  searchEsma: (query: string, tag?: string) => EsmaItem[];
  searchDua: (query: string, category?: string) => DuaItem[];

  duaCategories: () => string[];
  esmaTags: () => string[];
}

// ─── Store ─────────────────────────────────────────────────────────────────

const localSure = localDua.filter((d) => d.category === 'SURE');
const localPureDua = localDua.filter((d) => d.category !== 'SURE');

export const useContentStore = create<ContentState>()((set, get) => ({
  esmaList: localEsma,
  duaList: localDua,
  sureList: localSure,
  pureDuaList: localPureDua,
  breathingTechniques: breathingData,
  source: 'local',

  loadFromCms: async (locale = 'tr') => {
    try {
      const all = await fetchPrayers(locale);
      if (!all || all.length === 0) return;

      const esmaList = all
        .filter((p) => p.contentType === 'ESMA')
        .map(cmsToEsma)
        .sort((a, b) => a.id - b.id)
        .map((e, i) => ({ ...e, order: i + 1 }));

      const sureList = all
        .filter((p) => p.contentType === 'SURE')
        .map(cmsToDua)
        .sort((a, b) => a.id - b.id);

      const pureDuaList = all
        .filter((p) => p.contentType === 'DUA' || !p.contentType)
        .map(cmsToDua)
        .sort((a, b) => a.id - b.id);

      const duaList = [...pureDuaList, ...sureList];

      console.log(
        `[ContentStore] Loaded from CMS: ${esmaList.length} esma, ${pureDuaList.length} dua, ${sureList.length} sure`
      );

      set({ esmaList, duaList, sureList, pureDuaList, source: 'cms' });
    } catch (err) {
      console.warn('[ContentStore] CMS load failed, keeping local JSON:', err);
    }
  },

  getEsmaById: (id) => get().esmaList.find((e) => e.id === id),
  getDuaById: (id) => get().duaList.find((d) => d.id === id),
  getSureById: (id) => get().sureList.find((d) => d.id === id),
  getBreathingById: (id) => breathingData.find((b) => b.id === id),

  searchEsma: (query, tag) => {
    const q = query.toLowerCase().trim();
    return get().esmaList.filter((e) => {
      const matchQuery =
        q === '' ||
        e.nameTr.toLowerCase().includes(q) ||
        e.transliteration.toLowerCase().includes(q) ||
        e.meaningTr.toLowerCase().includes(q);
      const matchTag = !tag || e.tags.includes(tag);
      return matchQuery && matchTag;
    });
  },

  searchDua: (query, category) => {
    const q = query.toLowerCase().trim();
    return get().duaList.filter((d) => {
      const matchQuery =
        q === '' ||
        d.title.toLowerCase().includes(q) ||
        d.meaningTr.toLowerCase().includes(q);
      const matchCat = !category || d.category === category;
      return matchQuery && matchCat;
    });
  },

  duaCategories: () => [...new Set(get().duaList.map((d) => d.category))].sort(),

  esmaTags: () => {
    const tags = new Set<string>();
    get().esmaList.forEach((e) => e.tags.forEach((t) => tags.add(t)));
    return [...tags].sort();
  },
}));
