import { GA_MEASUREMENT_ID, ENABLE_ANALYTICS } from './constants';
import type { Locale } from './constants';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type Primitive = string | number | boolean;
type SearchParamsInput =
  | string
  | URLSearchParams
  | { toString(): string }
  | null
  | undefined;

export type PageType =
  | 'home'
  | 'feature_page'
  | 'blog_index'
  | 'blog_article'
  | 'contact'
  | 'legal'
  | 'unknown';

export type ContentGroup =
  | 'marketing'
  | 'feature'
  | 'blog'
  | 'support'
  | 'legal'
  | 'site';

export type CommonParams = {
  locale?: Locale;
  page_type?: PageType;
  content_group?: ContentGroup;
  translation_group?: string;
};

const FEATURE_PATHS = new Set([
  '/astroloji',
  '/numeroloji',
  '/ruya-yorumu',
  '/uyum-analizi',
  '/spirituel-rehberlik',
  '/en/astrology',
  '/en/numerology',
  '/en/dream-interpretation',
  '/en/compatibility-analysis',
  '/en/spiritual-guidance',
]);

const LEGAL_PATHS = new Set([
  '/gizlilik',
  '/kullanim-sartlari',
  '/account-deletion',
  '/en/privacy',
  '/en/terms',
  '/en/account-deletion',
]);

const SUPPORT_PATHS = new Set(['/iletisim', '/en/contact']);

type EventParams = Record<string, Primitive | undefined>;

function isAnalyticsReady() {
  return ENABLE_ANALYTICS && Boolean(GA_MEASUREMENT_ID) && typeof window !== 'undefined' && Boolean(window.gtag);
}

function sanitizeEventParams(params?: EventParams) {
  if (!params) {
    return undefined;
  }

  const cleanedEntries = Object.entries(params).filter(([, value]) => {
    if (value === undefined) {
      return false;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value);
    }

    return true;
  });

  return cleanedEntries.length > 0
    ? (Object.fromEntries(cleanedEntries) as Record<string, Primitive>)
    : undefined;
}

function sendEvent(action: string, params?: EventParams) {
  if (!isAnalyticsReady()) {
    return;
  }

  const sanitizedParams = sanitizeEventParams(params);
  window.gtag?.('event', action, sanitizedParams);
}

export function getLocaleFromPathname(pathname: string): Locale {
  return pathname.startsWith('/en') ? 'en' : 'tr';
}

export function getAnalyticsContextFromPath(pathname: string): CommonParams {
  const locale = getLocaleFromPathname(pathname);

  if (pathname === '/' || pathname === '/en') {
    return {
      locale,
      page_type: 'home',
      content_group: 'marketing',
    };
  }

  if (pathname === '/blog' || pathname === '/en/blog') {
    return {
      locale,
      page_type: 'blog_index',
      content_group: 'blog',
    };
  }

  if (/^\/(?:en\/)?blog\/[^/]+$/.test(pathname)) {
    return {
      locale,
      page_type: 'blog_article',
      content_group: 'blog',
    };
  }

  if (FEATURE_PATHS.has(pathname)) {
    return {
      locale,
      page_type: 'feature_page',
      content_group: 'feature',
    };
  }

  if (SUPPORT_PATHS.has(pathname)) {
    return {
      locale,
      page_type: 'contact',
      content_group: 'support',
    };
  }

  if (LEGAL_PATHS.has(pathname)) {
    return {
      locale,
      page_type: 'legal',
      content_group: 'legal',
    };
  }

  return {
    locale,
    page_type: 'unknown',
    content_group: 'site',
  };
}

export function withPageAnalyticsContext<T extends CommonParams>(pathname: string, params: T): T {
  return {
    ...getAnalyticsContextFromPath(pathname),
    ...params,
  };
}

export function buildTrackedUrl(pathname: string, searchParams?: SearchParamsInput) {
  const queryString =
    typeof searchParams === 'string'
      ? searchParams.replace(/^\?/, '')
      : searchParams?.toString() ?? '';

  return queryString ? `${pathname}?${queryString}` : pathname;
}

// ─── Generic low-level helper ────────────────────────────────────────────────

type GTagEvent = {
  action: string;
  category?: string;
  label?: string;
  value?: number;
  [key: string]: Primitive | undefined;
};

export function trackEvent({ action, category, label, value, ...rest }: GTagEvent) {
  sendEvent(action, { event_category: category, event_label: label, value, ...rest });
}

export function trackPageView(
  url: string,
  params: (CommonParams & { page_title?: string }) | undefined = undefined,
) {
  if (!ENABLE_ANALYTICS || !GA_MEASUREMENT_ID || typeof window === 'undefined' || !window.gtag) {
    return;
  }

  sendEvent('page_view', {
    page_location: new URL(url, window.location.origin).toString(),
    page_path: url,
    page_title: params?.page_title,
    locale: params?.locale,
    page_type: params?.page_type,
    content_group: params?.content_group,
    translation_group: params?.translation_group,
  });
}

// ─── Navigation / locale ─────────────────────────────────────────────────────

export function trackLocaleSwitch(params: {
  from_locale: string;
  to_locale: string;
  source?: string;
} & CommonParams) {
  sendEvent('locale_switch', params);
}

// ─── Content ─────────────────────────────────────────────────────────────────

export function trackFeatureClick(params: {
  feature_name: string;
  source?: string;
} & CommonParams) {
  sendEvent('feature_click', params);
}

export function trackBlogCardClick(params: {
  slug: string;
  title?: string;
  category?: string;
  source?: string;
} & CommonParams) {
  sendEvent('blog_card_click', params);
}

export function trackArticleOpen(params: {
  slug: string;
  title?: string;
  category?: string;
} & CommonParams) {
  sendEvent('article_open', params);
}

// ─── CTA / store ─────────────────────────────────────────────────────────────

export function trackCtaClick(params: {
  cta_label: string;
  placement?: string;
  source?: string;
} & CommonParams) {
  sendEvent('cta_click', params);
}

export function trackStoreClick(params: {
  store: 'app_store' | 'play_store';
  placement?: string;
  source?: string;
} & CommonParams) {
  sendEvent('store_click', params);
}

// ─── Rewarded video funnel ───────────────────────────────────────────────────

export type RewardSource = 'admob' | 'house_ads' | 'partner';
export type RewardPlacement = 'earn_page' | 'feature_gate' | 'popup';
export type RewardFailureReason =
  | 'no_fill'
  | 'timeout'
  | 'validation_failed'
  | 'reward_not_granted';
export type RewardGrantTrackingOrigin = 'backend_confirmed' | 'frontend_fallback';

export type RewardSessionBase = {
  reward_source: RewardSource;
  reward_placement: RewardPlacement;
  token_name: string;
} & CommonParams;

export function trackRewardedVideoClick(params: {
  reward_source: RewardSource;
  reward_placement: RewardPlacement;
  token_name?: string;
} & CommonParams) {
  sendEvent('rewarded_video_click', params);
}

export function trackRewardedVideoStart(params: {
  reward_source: RewardSource;
  reward_placement: RewardPlacement;
  token_name?: string;
} & CommonParams) {
  sendEvent('rewarded_video_start', params);
}

export function trackRewardedVideoComplete(params: {
  reward_source: RewardSource;
  reward_placement: RewardPlacement;
  token_name?: string;
} & CommonParams) {
  sendEvent('rewarded_video_complete', params);
}

/**
 * Fire ONLY after backend confirms the reward was granted.
 * Never fire this on video complete alone.
 */
export function trackAstroTokenRewardGranted(params: {
  reward_source: RewardSource;
  reward_placement: RewardPlacement;
  token_name: string;
  token_amount: number;
  success: true;
} & CommonParams) {
  sendEvent('astro_token_reward_granted', params);
}

export function trackAstroTokenRewardFailed(params: {
  reward_source: RewardSource;
  reward_placement: RewardPlacement;
  token_name: string;
  failure_reason: RewardFailureReason;
  success: false;
} & CommonParams) {
  sendEvent('astro_token_reward_failed', params);
}

export type RewardGrantResolution =
  | {
      status: 'granted';
      token_amount: number;
      tracking_origin: RewardGrantTrackingOrigin;
    }
  | {
      status: 'failed';
      failure_reason: RewardFailureReason;
    };

export function trackRewardGrantResolution(
  params: RewardSessionBase,
  resolution: RewardGrantResolution,
) {
  if (resolution.status === 'granted') {
    if (resolution.tracking_origin === 'frontend_fallback') {
      // TODO(prod): replace this temporary frontend fallback with a backend-confirmed
      // Measurement Protocol event emitted after the reward service credits the wallet.
    }

    trackAstroTokenRewardGranted({
      ...params,
      token_amount: resolution.token_amount,
      success: true,
    });
    return;
  }

  trackAstroTokenRewardFailed({
    ...params,
    failure_reason: resolution.failure_reason,
    success: false,
  });
}

export function createRewardedVideoAnalyticsSession(params: RewardSessionBase) {
  return {
    trackClick() {
      trackRewardedVideoClick(params);
    },
    trackStart() {
      trackRewardedVideoStart(params);
    },
    trackComplete() {
      trackRewardedVideoComplete(params);
    },
    trackGrantResolution(resolution: RewardGrantResolution) {
      trackRewardGrantResolution(params, resolution);
    },
  };
}

export type AnalyticsInteractionEvent =
  | { type: 'cta_click'; params: Parameters<typeof trackCtaClick>[0] }
  | { type: 'feature_click'; params: Parameters<typeof trackFeatureClick>[0] }
  | { type: 'blog_card_click'; params: Parameters<typeof trackBlogCardClick>[0] }
  | { type: 'store_click'; params: Parameters<typeof trackStoreClick>[0] }
  | { type: 'locale_switch'; params: Parameters<typeof trackLocaleSwitch>[0] };

export function dispatchAnalyticsInteraction(
  event: AnalyticsInteractionEvent,
  pathname: string,
) {
  switch (event.type) {
    case 'cta_click':
      trackCtaClick(withPageAnalyticsContext(pathname, event.params));
      return;
    case 'feature_click':
      trackFeatureClick(withPageAnalyticsContext(pathname, event.params));
      return;
    case 'blog_card_click':
      trackBlogCardClick(withPageAnalyticsContext(pathname, event.params));
      return;
    case 'store_click':
      trackStoreClick(withPageAnalyticsContext(pathname, event.params));
      return;
    case 'locale_switch':
      trackLocaleSwitch(withPageAnalyticsContext(pathname, event.params));
      return;
    default: {
      const exhaustiveCheck: never = event;
      return exhaustiveCheck;
    }
  }
}

/*
 * Event naming convention (snake_case):
 *
 * Navigation:      locale_switch
 * Features:        feature_click
 * Blog:            blog_card_click, article_open
 * CTA/store:       cta_click, store_click
 * Reward funnel:   rewarded_video_click → rewarded_video_start → rewarded_video_complete
 *                  → astro_token_reward_granted | astro_token_reward_failed
 *
 * Key event for GA4: astro_token_reward_granted
 */
