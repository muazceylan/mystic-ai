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

/**
 * Fetch published home sections for the given locale.
 * Returns empty array on error (graceful degradation).
 */
export async function fetchHomeSections(locale = 'tr'): Promise<HomeSection[]> {
  try {
    const response = await api.get('/api/v1/content/home-sections', { params: { locale } });
    return Array.isArray(response.data) ? response.data : [];
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
    return Array.isArray(response.data) ? response.data : [];
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
