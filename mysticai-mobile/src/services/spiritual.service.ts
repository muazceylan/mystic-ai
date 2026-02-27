import axios from 'axios/dist/browser/axios.cjs';
import { Platform } from 'react-native';
import type { EsmaItem, DuaItem, BreathingTechnique } from '../spiritual/types';

// Spiritual service runs on port 8091 directly (not through gateway)
const SPIRITUAL_BASE_URL =
  process.env.EXPO_PUBLIC_SPIRITUAL_API_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:8091' : 'http://localhost:8091');

const spiritualApi = axios.create({
  baseURL: SPIRITUAL_BASE_URL,
  timeout: 10000,
});

// API endpoints for spiritual content
const SPIRITUAL_BASE = '/api/v1/spiritual';

export interface AsmaApiResponse {
  id: number;
  orderNo: number;
  arabicName: string;
  nameTr: string;
  transliterationTr: string;
  meaningTr: string;
  reflectionTextTr?: string;
  theme?: string;
  tagsJson?: string;
  recommendedDhikrCount?: number;
  sourceProvider?: string;
  sourceNote?: string;
}

export interface PrayerApiResponse {
  id: number;
  slug: string;
  title: string;
  category: string;
  sourceLabel?: string;
  sourceNote?: string;
  arabicText?: string;
  transliterationTr?: string;
  meaningTr?: string;
  shortBenefitTr?: string;
  tagsJson?: string;
  recommendedRepeatCount?: number;
  estimatedReadSeconds?: number;
  isFavoritable?: boolean;
}

export interface MeditationApiResponse {
  id: number;
  slug: string;
  title?: string;
  titleTr?: string;
  description?: string;
  benefitsJson?: string;
  type?: string;
  focusTheme?: string;
  difficulty?: string;
  icon?: string;
  durationSec?: number;
  stepsJson?: string;
  breathingPatternJson?: string;
  animationMode?: string;
}

// Transform API response to EsmaItem format
function transformAsmaToEsmaItem(asma: AsmaApiResponse): EsmaItem {
  let tags: string[] = [];
  if (asma.tagsJson) {
    try {
      tags = JSON.parse(asma.tagsJson);
    } catch {
      tags = [];
    }
  } else if (asma.theme) {
    tags = [asma.theme];
  }

  return {
    id:asma.orderNo ||asma.id,
    nameAr:asma.arabicName,
    nameTr:asma.nameTr || '',
    transliteration:asma.transliterationTr || '',
    meaningTr:asma.meaningTr || '',
    reflectionText:asma.reflectionTextTr || '',
    tags,
    defaultTargetCount:asma.recommendedDhikrCount || 33,
  };
}

// Transform API response to DuaItem format
function transformPrayerToDuaItem(prayer: PrayerApiResponse): DuaItem {
  let tags: string[] = [];
  if (prayer.tagsJson) {
    try {
      tags = JSON.parse(prayer.tagsJson);
    } catch {
      tags = [];
    }
  }

  return {
    id: prayer.id,
    title: prayer.title,
    arabic: prayer.arabicText || '',
    transliteration: prayer.transliterationTr || '',
    meaningTr: prayer.meaningTr || '',
    category: prayer.category,
    shortBenefit: prayer.shortBenefitTr,
    tags,
    sources: prayer.sourceLabel ? [{ provider: prayer.sourceLabel, ref: prayer.sourceNote || '' }] : [],
    defaultTargetCount: prayer.recommendedRepeatCount || 1,
  };
}

// Transform API response to BreathingTechnique format
function transformMeditationToBreathing(meditation: MeditationApiResponse): BreathingTechnique {
  let benefits: string[] = [];
  if (meditation.benefitsJson) {
    try {
      benefits = JSON.parse(meditation.benefitsJson);
    } catch {
      benefits = [];
    }
  }

  let pattern = { inhale: 4, hold: 4, exhale: 4 };
  if (meditation.breathingPatternJson) {
    try {
      pattern = JSON.parse(meditation.breathingPatternJson);
    } catch {
      // keep default
    }
  }

  return {
    id: meditation.slug || String(meditation.id),
    titleTr: meditation.titleTr || meditation.title || '',
    description: meditation.description || '',
    difficulty: meditation.difficulty || 'BEGINNER',
    icon: meditation.icon || 'wind',
    benefits,
    pattern,
    defaultDurationSec: meditation.durationSec || 60,
  };
}

// Fetch all Esma (AsmaulHusna) from database
export async function fetchAllEsma(): Promise<EsmaItem[]> {
  try {
    const response = await spiritualApi.get<AsmaApiResponse[]>(`${SPIRITUAL_BASE}/asma/all`);
    return response.data.map(transformAsmaToEsmaItem);
  } catch (error) {
    console.error('Failed to fetch Esma from API:', error);
    // Return empty array - UI will handle loading state
    return [];
  }
}

// Fetch all Prayers/Dua from database
export async function fetchAllPrayers(): Promise<DuaItem[]> {
  try {
    const response = await spiritualApi.get<PrayerApiResponse[]>(`${SPIRITUAL_BASE}/prayers/all`);
    return response.data.map(transformPrayerToDuaItem);
  } catch (error) {
    console.error('Failed to fetch Prayers from API:', error);
    return [];
  }
}

// Fetch all Breathing/Meditation from database
export async function fetchAllBreathing(): Promise<BreathingTechnique[]> {
  try {
    const response = await spiritualApi.get<MeditationApiResponse[]>(`${SPIRITUAL_BASE}/meditations/all`);
    return response.data.map(transformMeditationToBreathing);
  } catch (error) {
    console.error('Failed to fetch Breathing from API:', error);
    return [];
  }
}
