import api from '../../../services/api';
import { HoroscopeResponse, HoroscopePeriod, ZodiacSign } from '../types/horoscope.types';

const CACHE_TTL = 30 * 60 * 1000; // 30 min
const cache = new Map<string, { data: HoroscopeResponse; ts: number }>();

/** Track which date the cache belongs to — clear on day change */
let cachedDate: string | null = null;

function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function dateKey(period: HoroscopePeriod): string {
  const now = new Date();
  if (period === 'weekly') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return `${monday.getFullYear()}-W${String(Math.ceil(monday.getDate() / 7)).padStart(2, '0')}`;
  }
  return todayStr();
}

function cacheKey(sign: ZodiacSign, period: HoroscopePeriod, lang: string): string {
  return `horoscope:${period}:${sign}:${lang}:${dateKey(period)}`;
}

/** Auto-clear cache if the day has changed since last fetch */
function clearIfDayChanged(): void {
  const today = todayStr();
  if (cachedDate !== null && cachedDate !== today) {
    cache.clear();
  }
  cachedDate = today;
}

export async function fetchHoroscope(
  sign: ZodiacSign,
  period: HoroscopePeriod,
  lang: string,
): Promise<HoroscopeResponse> {
  clearIfDayChanged();

  const key = cacheKey(sign, period, lang);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const res = await api.get<HoroscopeResponse>('/api/v1/horoscope', {
    params: { sign, period, lang },
  });

  const data = res.data;
  cache.set(key, { data, ts: Date.now() });
  return data;
}

export function clearHoroscopeCache(): void {
  cache.clear();
  cachedDate = null;
}
