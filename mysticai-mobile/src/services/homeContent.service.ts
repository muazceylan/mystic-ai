/**
 * homeContent.service.ts
 *
 * Fetches Home screen CMS content from notification-service public endpoints.
 * Sections and banners are sorted server-side by sortOrder/priority.
 */

import api from './api';

export type HomeSectionType =
  | 'HERO_BANNER' | 'DAILY_HIGHLIGHT' | 'QUICK_ACTIONS' | 'FEATURED_CARD'
  | 'MODULE_PROMO' | 'WEEKLY_SUMMARY' | 'PRAYER_HIGHLIGHT' | 'CUSTOM_CARD_GROUP';

export interface HomeSection {
  id: number;
  sectionKey: string;
  title: string;
  subtitle?: string;
  type: HomeSectionType;
  isActive: boolean;
  sortOrder: number;
  routeKey?: string;
  fallbackRouteKey?: string;
  icon?: string;
  imageUrl?: string;
  ctaLabel?: string;
  badgeLabel?: string;
  startDate?: string;
  endDate?: string;
  payloadJson?: string;
  locale: string;
  publishedAt?: string;
}

export interface CmsBanner {
  id: number;
  bannerKey: string;
  placementType: 'HOME_HERO' | 'HOME_INLINE' | 'EXPLORE_HERO' | 'EXPLORE_INLINE';
  title: string;
  subtitle?: string;
  imageUrl: string;
  ctaLabel?: string;
  routeKey?: string;
  fallbackRouteKey?: string;
  priority: number;
  locale: string;
}

type JsonMap = Record<string, unknown>;

const CMS_KEY_LIKE_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/i;

const HTML_ENTITY_MAP: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&lt;': '<',
  '&gt;': '>',
};

function decodeHtmlEntities(value: string): string {
  return value.replace(/&nbsp;|&amp;|&quot;|&#39;|&lt;|&gt;/g, (entity) => HTML_ENTITY_MAP[entity] ?? entity);
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\r/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function asText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = stripHtml(value).trim();
  return trimmed || null;
}

function parsePayloadJson(payloadJson: unknown): JsonMap {
  if (!payloadJson) return {};
  if (typeof payloadJson === 'string') {
    try {
      const parsed = JSON.parse(payloadJson);
      return parsed && typeof parsed === 'object' ? (parsed as JsonMap) : {};
    } catch {
      return {};
    }
  }
  if (typeof payloadJson === 'object') {
    return payloadJson as JsonMap;
  }
  return {};
}

function looksLikeCmsKey(value: string | null): boolean {
  return Boolean(value && CMS_KEY_LIKE_PATTERN.test(value));
}

function humanizeCmsKey(value: string | null): string {
  if (!value) return 'Öne Çıkan Bölüm';
  const words = value
    .replace(/^home[._-]/i, '')
    .replace(/^cms[._-]/i, '')
    .replace(/^section[._-]/i, '')
    .split(/[._-]+/)
    .filter(Boolean);

  if (!words.length) return 'Öne Çıkan Bölüm';
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function normalizeHomeSection(raw: any): HomeSection | null {
  if (!raw || typeof raw !== 'object') return null;
  const payload = parsePayloadJson(raw.payloadJson);

  const sectionKey = asText(raw.sectionKey) ?? '';
  const rawTitle = asText(raw.title);
  const payloadTitle = asText(payload.title);
  const payloadHeading = asText(payload.heading);
  const payloadDescription = asText(payload.description);

  const primaryTitle = rawTitle ?? payloadTitle ?? payloadHeading;
  const title = looksLikeCmsKey(primaryTitle)
    ? humanizeCmsKey(payloadTitle ?? payloadHeading ?? sectionKey ?? primaryTitle)
    : (primaryTitle ?? humanizeCmsKey(sectionKey));

  const rawSubtitle = asText(raw.subtitle);
  const subtitleCandidate = rawSubtitle ?? payloadDescription ?? null;
  const subtitle = looksLikeCmsKey(subtitleCandidate) ? undefined : subtitleCandidate ?? undefined;

  return {
    id: Number(raw.id ?? 0),
    sectionKey,
    title,
    subtitle,
    type: raw.type as HomeSectionType,
    isActive: Boolean(raw.isActive),
    sortOrder: Number(raw.sortOrder ?? 0),
    routeKey: asText(raw.routeKey) ?? undefined,
    fallbackRouteKey: asText(raw.fallbackRouteKey) ?? undefined,
    icon: asText(raw.icon) ?? undefined,
    imageUrl: asText(raw.imageUrl) ?? undefined,
    ctaLabel: asText(raw.ctaLabel) ?? undefined,
    badgeLabel: asText(raw.badgeLabel) ?? undefined,
    startDate: asText(raw.startDate) ?? undefined,
    endDate: asText(raw.endDate) ?? undefined,
    payloadJson: typeof raw.payloadJson === 'string' ? raw.payloadJson : (Object.keys(payload).length ? JSON.stringify(payload) : undefined),
    locale: asText(raw.locale) ?? 'tr',
    publishedAt: asText(raw.publishedAt) ?? undefined,
  };
}

function normalizeBanner(raw: any): CmsBanner | null {
  if (!raw || typeof raw !== 'object') return null;
  const bannerKey = asText(raw.bannerKey) ?? '';
  const rawTitle = asText(raw.title);
  const title = looksLikeCmsKey(rawTitle)
    ? humanizeCmsKey(bannerKey || rawTitle)
    : (rawTitle ?? humanizeCmsKey(bannerKey));
  const subtitleCandidate = asText(raw.subtitle);
  const subtitle = looksLikeCmsKey(subtitleCandidate) ? undefined : subtitleCandidate ?? undefined;

  return {
    id: Number(raw.id ?? 0),
    bannerKey,
    placementType: raw.placementType as CmsBanner['placementType'],
    title,
    subtitle,
    imageUrl: asText(raw.imageUrl) ?? '',
    ctaLabel: asText(raw.ctaLabel) ?? undefined,
    routeKey: asText(raw.routeKey) ?? undefined,
    fallbackRouteKey: asText(raw.fallbackRouteKey) ?? undefined,
    priority: Number(raw.priority ?? 0),
    locale: asText(raw.locale) ?? 'tr',
  };
}

/**
 * Fetch published home sections for the given locale.
 * Returns empty array on error (graceful degradation).
 */
export async function fetchHomeSections(locale = 'tr'): Promise<HomeSection[]> {
  try {
    const response = await api.get('/api/v1/content/home-sections', { params: { locale } });
    if (!Array.isArray(response.data)) return [];
    return response.data
      .map((item) => normalizeHomeSection(item))
      .filter((item): item is HomeSection => Boolean(item?.id && item.title));
  } catch (error) {
    console.warn('[homeContent] fetchHomeSections failed:', error);
    return [];
  }
}

/**
 * Fetch banners for a specific placement type.
 */
export async function fetchBanners(
  placementType: 'HOME_HERO' | 'HOME_INLINE' | 'EXPLORE_HERO' | 'EXPLORE_INLINE',
  locale = 'tr'
): Promise<CmsBanner[]> {
  try {
    const response = await api.get('/api/v1/content/banners', { params: { placementType, locale } });
    if (!Array.isArray(response.data)) return [];
    return response.data
      .map((item) => normalizeBanner(item))
      .filter((item): item is CmsBanner => Boolean(item?.id && item.title));
  } catch (error) {
    console.warn('[homeContent] fetchBanners failed:', error);
    return [];
  }
}

/**
 * Convenience: fetch everything needed for the Home screen at once.
 */
export async function fetchHomeContentBundle(locale = 'tr') {
  const [sections, herobanners, inlineBanners] = await Promise.allSettled([
    fetchHomeSections(locale),
    fetchBanners('HOME_HERO', locale),
    fetchBanners('HOME_INLINE', locale),
  ]);

  return {
    sections: sections.status === 'fulfilled' ? sections.value : [],
    heroBanners: herobanners.status === 'fulfilled' ? herobanners.value : [],
    inlineBanners: inlineBanners.status === 'fulfilled' ? inlineBanners.value : [],
  };
}
