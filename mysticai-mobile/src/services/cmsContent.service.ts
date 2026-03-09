import api from './api';

export interface CmsDailyHoroscope {
  id: number;
  zodiacSign: string;
  date: string;
  locale: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  sourceType: 'EXTERNAL_API' | 'ADMIN_CREATED' | 'ADMIN_OVERRIDDEN';
  title?: string;
  shortSummary?: string;
  fullContent?: string;
  love?: string;
  career?: string;
  money?: string;
  health?: string;
  luckyColor?: string;
  luckyNumber?: string;
  isOverrideActive: boolean;
}

export interface CmsWeeklyHoroscope {
  id: number;
  zodiacSign: string;
  weekStartDate: string;
  weekEndDate: string;
  locale: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  sourceType: 'EXTERNAL_API' | 'ADMIN_CREATED' | 'ADMIN_OVERRIDDEN';
  title?: string;
  shortSummary?: string;
  fullContent?: string;
  love?: string;
  career?: string;
  money?: string;
  health?: string;
  social?: string;
  luckyDay?: string;
  cautionDay?: string;
  luckyColor?: string;
  luckyNumber?: string;
  isOverrideActive: boolean;
}

export interface CmsPrayer {
  id: number;
  title: string;
  arabicText?: string;
  transliteration?: string;
  meaning?: string;
  contentType?: 'DUA' | 'ESMA' | 'SURE';
  category: string;
  locale: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  suggestedCount?: number;
  tags?: string;
  isFeatured: boolean;
  isPremium: boolean;
  isActive: boolean;
  audioUrl?: string;
}

/**
 * Fetches daily horoscope from CMS.
 * Returns null on 404 (no data yet — caller may fallback to API).
 * Throws on any other error (5xx, network failure — caller should also fallback to API).
 */
export async function fetchDailyHoroscopeFromCms(
  sign: string,
  date: string,
  locale: string,
): Promise<CmsDailyHoroscope | null> {
  const res = await api.get<CmsDailyHoroscope>('/api/v1/content/horoscope/daily', {
    params: { sign: sign.toUpperCase(), date, locale },
    validateStatus: (status) => status === 200 || status === 404,
  });
  if (res.status === 404) return null;
  return res.data;
}

/**
 * Fetches weekly horoscope from CMS.
 * Returns null on 404. Throws on other errors.
 */
export async function fetchWeeklyHoroscopeFromCms(
  sign: string,
  weekStart: string,
  locale: string,
): Promise<CmsWeeklyHoroscope | null> {
  const res = await api.get<CmsWeeklyHoroscope>('/api/v1/content/horoscope/weekly', {
    params: { sign: sign.toUpperCase(), weekStart, locale },
    validateStatus: (status) => status === 200 || status === 404,
  });
  if (res.status === 404) return null;
  return res.data;
}

export async function fetchPrayers(
  locale: string,
  category?: string,
): Promise<CmsPrayer[]> {
  const params: Record<string, string> = { locale };
  if (category) params.category = category;
  const res = await api.get<CmsPrayer[]>('/api/v1/content/prayers', { params });
  return res.data;
}

export async function fetchFeaturedPrayers(locale: string): Promise<CmsPrayer[]> {
  const res = await api.get<CmsPrayer[]>('/api/v1/content/prayers/featured', {
    params: { locale },
  });
  return res.data;
}
