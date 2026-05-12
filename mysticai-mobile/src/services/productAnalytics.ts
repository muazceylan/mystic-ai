import { Platform } from 'react-native';
import type { UserProfile } from '../store/useAuthStore';
import type { EntitlementSnapshot, PaywallResponse } from '../features/monetization/types';
import { identifyAmplitudeUserProperties, trackAmplitudeEvent, type AnalyticsPrimitive } from './analytics';

export const ProductEventName = {
  APP_ENTRY_STARTED: 'App Entry Started',
  SIGNUP_STARTED: 'Signup Started',
  SIGNUP_COMPLETED: 'Signup Completed',
  LOGIN_STARTED: 'Login Started',
  LOGIN_COMPLETED: 'Login Completed',
  GUEST_MODE_STARTED: 'Guest Mode Started',
  PASSWORD_RESET_REQUESTED: 'Password Reset Requested',
  BIRTH_DETAILS_SAVED: 'Birth Details Saved',
  GUIDANCE_VIEWED: 'Guidance Viewed',
  GUIDANCE_SHARED: 'Guidance Shared',
  PAYWALL_VIEWED: 'Paywall Viewed',
  SUBSCRIPTION_STARTED: 'Subscription Started',
  ACCOUNT_DELETION_REQUESTED: 'Account Deletion Requested',
  ACCOUNT_DELETED: 'Account Deleted',
  ERROR_ENCOUNTERED: 'Error Encountered',
} as const;

type ProductEventNameValue = (typeof ProductEventName)[keyof typeof ProductEventName];
type ProductAnalyticsProperties = Record<string, AnalyticsPrimitive>;

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

export function trackProductEvent(
  eventName: ProductEventNameValue,
  properties?: ProductAnalyticsProperties,
): void {
  trackAmplitudeEvent(eventName, properties);
}

export function setProductUserProperties(
  properties: ProductAnalyticsProperties,
): void {
  identifyAmplitudeUserProperties(properties);
}

export function resolveReferrerDomain(): string | null {
  if (!hasWindow() || typeof document === 'undefined') {
    return null;
  }

  const referrer = document.referrer?.trim();
  if (!referrer) {
    return null;
  }

  try {
    return new URL(referrer).hostname;
  } catch {
    return null;
  }
}

export function resolveCampaignId(): string | null {
  if (!hasWindow()) {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  return (
    params.get('campaign_id')
    ?? params.get('utm_id')
    ?? params.get('cid')
    ?? null
  );
}

export function resolveCountryCode(locale?: string | null): string | null {
  const source = (locale ?? '').trim();
  if (!source) {
    return null;
  }

  const parts = source.replace('_', '-').split('-').filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1]?.toUpperCase() ?? null : null;
}

export function hasBirthDetails(user: UserProfile | null | undefined): boolean {
  return Boolean(
    user?.birthDate
    && (user.birthLocation || user.birthCity || user.birthCountry),
  );
}

export function resolveOnboardingStatus(user: UserProfile | null | undefined): string {
  if (!user) {
    return 'anonymous';
  }

  if (!hasBirthDetails(user)) {
    return 'birth_details_pending';
  }

  return 'completed';
}

export function resolveSubscriptionStatus(
  entitlements: EntitlementSnapshot | null | undefined,
  paywall: PaywallResponse | null | undefined,
): string {
  if (entitlements?.status) {
    return entitlements.status.toLowerCase();
  }

  if (paywall?.entitlementStatus) {
    return paywall.entitlementStatus.toLowerCase();
  }

  return 'none';
}

export function hasActiveSubscription(
  entitlements: EntitlementSnapshot | null | undefined,
  paywall: PaywallResponse | null | undefined,
): boolean {
  return Boolean(entitlements?.premiumActive || paywall?.premiumActive);
}

export function resolveSubscriptionTier(
  entitlements: EntitlementSnapshot | null | undefined,
  paywall: PaywallResponse | null | undefined,
): string | null {
  const productId = entitlements?.productId ?? null;
  if (!productId) {
    if (paywall?.premiumActive) {
      return 'premium';
    }
    return null;
  }

  const normalized = productId.toLowerCase();
  if (normalized.includes('trial')) return 'trial';
  if (normalized.includes('premium')) return 'premium';
  if (normalized.includes('pro')) return 'pro';
  if (normalized.includes('year')) return 'premium_yearly';
  if (normalized.includes('month')) return 'premium_monthly';
  return productId;
}

export function resolveBillingCycle(rawValue?: string | null): string | null {
  const normalized = (rawValue ?? '').trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (
    normalized.includes('year')
    || normalized.includes('annual')
    || normalized.includes('yil')
    || normalized.includes('yıll')
  ) {
    return 'annual';
  }

  if (normalized.includes('month') || normalized.includes('ay')) {
    return 'monthly';
  }

  if (normalized.includes('week') || normalized.includes('haft')) {
    return 'weekly';
  }

  return normalized;
}

export function resolveShareChannel(channel: string): string {
  switch (channel) {
    case 'instagram_story':
      return 'instagram_story';
    case 'gallery':
      return 'gallery';
    default:
      return 'system';
  }
}

export function computeDaysSince(dateString?: string | null): number | null {
  if (!dateString) {
    return null;
  }

  const timestamp = Date.parse(dateString);
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  const diff = Date.now() - timestamp;
  if (diff < 0) {
    return 0;
  }

  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function buildBirthDetailsProperties(input: {
  birthTime?: string | null;
  birthTimeUnknown?: boolean;
  birthLocation?: string | null;
  birthCity?: string | null;
  birthCountry?: string | null;
  zodiacSign?: string | null;
  isFirstTime: boolean;
}): ProductAnalyticsProperties {
  return {
    'has birth time': Boolean(!input.birthTimeUnknown && input.birthTime),
    'birth place provided': Boolean(input.birthLocation || input.birthCity || input.birthCountry),
    'zodiac sign': input.zodiacSign ?? null,
    'is first time': input.isFirstTime,
  };
}

export function updateCoreUserProperties(user: UserProfile | null | undefined): void {
  if (!user) {
    return;
  }

  setProductUserProperties({
    'Account Type': user.userType === 'GUEST' || user.isAnonymous ? 'guest' : 'registered',
    'Onboarding Status': resolveOnboardingStatus(user),
    'Zodiac Sign': user.zodiacSign ?? null,
    'Has Birth Details': hasBirthDetails(user),
    'Preferred Language': user.preferredLanguage ?? null,
  });
}

export function updateSubscriptionUserProperties(
  entitlements: EntitlementSnapshot | null | undefined,
  paywall: PaywallResponse | null | undefined,
): void {
  setProductUserProperties({
    'Subscription Status': resolveSubscriptionStatus(entitlements, paywall),
    'Subscription Tier': resolveSubscriptionTier(entitlements, paywall),
    'Billing Cycle': resolveBillingCycle(entitlements?.productId),
  });
}

export function resolveSourceSurface(defaultSurface: string): string {
  if (Platform.OS !== 'web') {
    return defaultSurface;
  }

  return defaultSurface;
}
