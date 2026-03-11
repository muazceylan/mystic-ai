/**
 * exploreContent.service.ts
 *
 * Fetches Explore screen CMS content from notification-service public endpoints.
 * Categories are sorted by sortOrder, cards by sortOrder within their category.
 */

import { i18n } from '../i18n';
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
function resolveLocale(locale?: string): 'en' | 'tr' {
  const candidate = locale ?? i18n.resolvedLanguage ?? i18n.language ?? 'tr';
  return candidate.toLowerCase().startsWith('en') ? 'en' : 'tr';
}

/**
 * Fetch all published explore categories for the given locale.
 */
export async function fetchExploreCategories(locale?: string): Promise<ExploreCategory[]> {
  const normalizedLocale = resolveLocale(locale);
  try {
    const response = await api.get('/api/v1/content/explore-categories', { params: { locale: normalizedLocale } });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.warn('[exploreContent] fetchExploreCategories failed:', error);
    return [];
  }
}

/**
 * Fetch published explore cards, optionally filtered by categoryKey.
 */
export async function fetchExploreCards(locale?: string, categoryKey?: string): Promise<ExploreCard[]> {
  const normalizedLocale = resolveLocale(locale);
  try {
    const response = await api.get('/api/v1/content/explore-cards', {
      params: { locale: normalizedLocale, ...(categoryKey ? { categoryKey } : {}) },
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
export async function fetchExploreContentBundle(locale?: string) {
  const normalizedLocale = resolveLocale(locale);
  const [categories, cards, heroBanners, inlineBanners] = await Promise.allSettled([
    fetchExploreCategories(normalizedLocale),
    fetchExploreCards(normalizedLocale),
    api.get<unknown[]>('/api/v1/content/banners', { params: { placementType: 'EXPLORE_HERO', locale: normalizedLocale } }).then((r) => Array.isArray(r.data) ? r.data : []).catch(() => []),
    api.get<unknown[]>('/api/v1/content/banners', { params: { placementType: 'EXPLORE_INLINE', locale: normalizedLocale } }).then((r) => Array.isArray(r.data) ? r.data : []).catch(() => []),
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
