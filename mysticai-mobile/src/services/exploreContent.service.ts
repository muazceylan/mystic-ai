/**
 * exploreContent.service.ts
 *
 * Fetches Explore screen CMS content from notification-service public endpoints.
 * Categories are sorted by sortOrder, cards by sortOrder within their category.
 */

import api from './api';

export interface ExploreCategory {
  id: number;
  categoryKey: string;
  title: string;
  subtitle?: string;
  icon?: string;
  isActive: boolean;
  sortOrder: number;
  locale: string;
}

export interface ExploreCard {
  id: number;
  cardKey: string;
  categoryKey: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  routeKey?: string;
  fallbackRouteKey?: string;
  ctaLabel?: string;
  isActive: boolean;
  isFeatured: boolean;
  isPremium: boolean;
  sortOrder: number;
  locale: string;
}

/**
 * Fetch all published explore categories for the given locale.
 */
export async function fetchExploreCategories(locale = 'tr'): Promise<ExploreCategory[]> {
  try {
    const response = await api.get('/api/v1/content/explore-categories', { params: { locale } });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.warn('[exploreContent] fetchExploreCategories failed:', error);
    return [];
  }
}

/**
 * Fetch published explore cards, optionally filtered by categoryKey.
 */
export async function fetchExploreCards(locale = 'tr', categoryKey?: string): Promise<ExploreCard[]> {
  try {
    const response = await api.get('/api/v1/content/explore-cards', {
      params: { locale, ...(categoryKey ? { categoryKey } : {}) },
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.warn('[exploreContent] fetchExploreCards failed:', error);
    return [];
  }
}

/**
 * Convenience: fetch full explore bundle — categories, all cards, and hero/inline banners.
 */
export async function fetchExploreContentBundle(locale = 'tr') {
  const [categories, cards, heroBanners, inlineBanners] = await Promise.allSettled([
    fetchExploreCategories(locale),
    fetchExploreCards(locale),
    api.get<unknown[]>('/api/v1/content/banners', { params: { placementType: 'EXPLORE_HERO', locale } }).then((r) => Array.isArray(r.data) ? r.data : []).catch(() => []),
    api.get<unknown[]>('/api/v1/content/banners', { params: { placementType: 'EXPLORE_INLINE', locale } }).then((r) => Array.isArray(r.data) ? r.data : []).catch(() => []),
  ]);

  return {
    categories: categories.status === 'fulfilled' ? categories.value : [],
    cards: cards.status === 'fulfilled' ? cards.value : [],
    heroBanners: heroBanners.status === 'fulfilled' ? heroBanners.value : [],
    inlineBanners: inlineBanners.status === 'fulfilled' ? inlineBanners.value : [],
  };
}

/**
 * Group cards by their categoryKey for convenient rendering.
 */
export function groupCardsByCategory(cards: ExploreCard[]): Record<string, ExploreCard[]> {
  return cards.reduce((acc, card) => {
    if (!acc[card.categoryKey]) acc[card.categoryKey] = [];
    acc[card.categoryKey].push(card);
    return acc;
  }, {} as Record<string, ExploreCard[]>);
}
