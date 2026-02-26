/**
 * Content Store — Local JSON esma/dua/breathing verileri + arama/filtre
 */

import { create } from 'zustand';
import type { EsmaItem, DuaItem, BreathingTechnique } from '../types';

// Lazy require — Metro bundler için static import şart
const esmaData: EsmaItem[] = require('../../../assets/data/esma.tr.json');
const duaData: DuaItem[] = require('../../../assets/data/dua.tr.json');
const breathingData: BreathingTechnique[] = require('../../../assets/data/breathing.tr.json');

interface ContentState {
  esmaList: EsmaItem[];
  duaList: DuaItem[];
  sureList: DuaItem[];
  pureDuaList: DuaItem[];
  breathingTechniques: BreathingTechnique[];

  // Getters
  getEsmaById: (id: number) => EsmaItem | undefined;
  getDuaById: (id: number) => DuaItem | undefined;
  getSureById: (id: number) => DuaItem | undefined;
  getBreathingById: (id: string) => BreathingTechnique | undefined;

  // Search/filter
  searchEsma: (query: string, tag?: string) => EsmaItem[];
  searchDua: (query: string, category?: string) => DuaItem[];

  // Categories
  duaCategories: () => string[];
  esmaTags: () => string[];
}

const sureListData = duaData.filter((d) => d.category === 'SURE');
const pureDuaListData = duaData.filter((d) => d.category !== 'SURE');

export const useContentStore = create<ContentState>()(() => ({
  esmaList: esmaData,
  duaList: duaData,
  sureList: sureListData,
  pureDuaList: pureDuaListData,
  breathingTechniques: breathingData,

  getEsmaById: (id) => esmaData.find((e) => e.id === id),

  getDuaById: (id) => duaData.find((d) => d.id === id),

  getSureById: (id) => sureListData.find((d) => d.id === id),

  getBreathingById: (id) => breathingData.find((b) => b.id === id),

  searchEsma: (query, tag) => {
    const q = query.toLowerCase().trim();
    return esmaData.filter((e) => {
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
    return duaData.filter((d) => {
      const matchQuery =
        q === '' ||
        d.title.toLowerCase().includes(q) ||
        d.meaningTr.toLowerCase().includes(q);
      const matchCat = !category || d.category === category;
      return matchQuery && matchCat;
    });
  },

  duaCategories: () => [...new Set(duaData.map((d) => d.category))].sort(),

  esmaTags: () => {
    const tags = new Set<string>();
    esmaData.forEach((e) => e.tags.forEach((t) => tags.add(t)));
    return [...tags].sort();
  },
}));
