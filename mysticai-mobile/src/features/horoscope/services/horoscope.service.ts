import api from '../../../services/api';
import { fetchDailyHoroscopeFromCms, fetchWeeklyHoroscopeFromCms, CmsDailyHoroscope, CmsWeeklyHoroscope } from '../../../services/cmsContent.service';
import { HoroscopeResponse, HoroscopePeriod, ZodiacSign } from '../types/horoscope.types';
import { resolveZodiacSign } from '../utils/zodiacData';

const CACHE_TTL = 30 * 60 * 1000; // 30 min
const cache = new Map<string, { data: HoroscopeResponse; ts: number }>();

/** Track which date the cache belongs to — clear on day change */
let cachedDate: string | null = null;

function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function currentMondayStr(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

function dateKey(period: HoroscopePeriod): string {
  if (period === 'weekly') return currentMondayStr();
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

/** Exported so the store can clear the API fallback cache on day change. */
export function clearHoroscopeCache(): void {
  cache.clear();
  cachedDate = null;
}

/**
 * Map CMS daily horoscope to HoroscopeResponse shape for UI compatibility.
 */
function cmsToHoroscopeResponse(
  cms: CmsDailyHoroscope | CmsWeeklyHoroscope,
  sign: ZodiacSign,
  period: HoroscopePeriod,
  lang: string,
): HoroscopeResponse {
  const date = 'date' in cms ? cms.date : ('weekStartDate' in cms ? cms.weekStartDate : todayStr());
  return {
    date,
    period,
    sign,
    language: lang as 'tr' | 'en',
    highlights: [
      cms.luckyColor ? `Şanslı renk: ${cms.luckyColor}` : '',
      cms.luckyNumber ? `Şanslı sayı: ${cms.luckyNumber}` : '',
      period === 'weekly' && 'luckyDay' in cms ? `Şanslı gün: ${(cms as CmsWeeklyHoroscope).luckyDay ?? ''}` : '',
    ] as [string, string, string],
    sections: {
      general: cms.fullContent ?? cms.shortSummary ?? '',
      love: cms.love ?? '',
      career: cms.career ?? '',
      money: cms.money ?? '',
      health: cms.health ?? '',
      advice: 'social' in cms ? ((cms as CmsWeeklyHoroscope).social ?? '') : '',
    },
    meta: {
      lucky_color: cms.luckyColor,
      lucky_number: cms.luckyNumber,
    },
  };
}

export async function fetchHoroscope(
  sign: ZodiacSign | string,
  period: HoroscopePeriod,
  lang: string,
): Promise<HoroscopeResponse> {
  const normalizedSign = resolveZodiacSign(sign);
  if (!normalizedSign) {
    throw new Error(`Invalid zodiac sign: ${String(sign ?? '')}`);
  }

  clearIfDayChanged();

  const tag = `[Horoscope] ${normalizedSign} ${period} ${lang}`;

  // CMS first — always fetch fresh so admin edits are immediately visible.
  // The CMS endpoint itself falls back to astrology-service ingest on 404.
  // - 200 → use CMS data directly, never call direct API
  // - 404 (null) → CMS + ingest both failed → throw, no direct API fallback
  // - error (5xx, network, CORS) → CMS unavailable → emergency direct API fallback
  let cmsInfraError = false;
  try {
    if (period === 'daily') {
      const cmsRecord = await fetchDailyHoroscopeFromCms(normalizedSign, todayStr(), lang);
      if (cmsRecord) {
        console.log(`${tag} → SOURCE: CMS-DB | sourceType=${cmsRecord.sourceType} | id=${cmsRecord.id}`);
        return cmsToHoroscopeResponse(cmsRecord, normalizedSign, period, lang);
      }
      // 404: CMS has no data and astrology-service ingest also failed — do not call direct API
      console.warn(`${tag} → CMS 404: no data in DB and ingest failed`);
      throw new Error(`No horoscope data available for ${normalizedSign}`);
    } else if (period === 'weekly') {
      const cmsRecord = await fetchWeeklyHoroscopeFromCms(normalizedSign, currentMondayStr(), lang);
      if (cmsRecord) {
        console.log(`${tag} → SOURCE: CMS-DB | sourceType=${cmsRecord.sourceType} | id=${cmsRecord.id}`);
        return cmsToHoroscopeResponse(cmsRecord, normalizedSign, period, lang);
      }
      console.warn(`${tag} → CMS 404: no data in DB and ingest failed`);
      throw new Error(`No horoscope data available for ${normalizedSign}`);
    }
    throw new Error(`Unknown period: ${period}`);
  } catch (err) {
    // Re-throw "no data" errors — these are not infrastructure failures
    if (err instanceof Error && err.message.startsWith('No horoscope data')) throw err;
    if (err instanceof Error && err.message.startsWith('Unknown period')) throw err;
    // Real CMS infrastructure error (5xx, network, CORS) — emergency direct API fallback
    console.error(`${tag} → CMS infrastructure error, emergency API fallback:`, err);
    cmsInfraError = true;
  }

  if (!cmsInfraError) throw new Error(`No horoscope data available for ${normalizedSign}`);

  // Emergency fallback to astrology-service — only when CMS is unreachable
  const key = cacheKey(normalizedSign, period, lang);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    console.log(`${tag} → SOURCE: IN-MEMORY CACHE (emergency API fallback)`);
    return cached.data;
  }

  console.log(`${tag} → SOURCE: ASTROLOGY-SERVICE API (emergency fallback — CMS unreachable)`);
  const res = await api.get<HoroscopeResponse>('/api/v1/horoscope', {
    params: { sign: normalizedSign, period, lang },
  });

  const data = res.data;
  cache.set(key, { data, ts: Date.now() });
  return data;
}
