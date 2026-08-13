import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';

type SubscriptionManagementResult =
  | { status: 'opened'; url: string }
  | { status: 'unavailable' }
  | { status: 'failed'; error: string };

const IOS_SUBSCRIPTION_MANAGEMENT_URLS = [
  'itms-apps://apps.apple.com/account/subscriptions',
  'https://apps.apple.com/account/subscriptions',
] as const;

function getAndroidPackageName(): string {
  return Constants.expoConfig?.android?.package
    ?? Constants.manifest2?.extra?.expoClient?.android?.package
    ?? 'com.astroguru.mmc';
}

function normalizeProductId(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.split(':', 1)[0] || trimmed;
}

function getAndroidSubscriptionUrls(productId?: string | null): string[] {
  const packageName = getAndroidPackageName();
  const normalizedProductId = normalizeProductId(productId);
  const packageParam = encodeURIComponent(packageName);

  if (normalizedProductId) {
    return [
      `https://play.google.com/store/account/subscriptions?sku=${encodeURIComponent(normalizedProductId)}&package=${packageParam}`,
      `https://play.google.com/store/account/subscriptions?package=${packageParam}`,
      'https://play.google.com/store/account/subscriptions',
    ];
  }

  return [
    `https://play.google.com/store/account/subscriptions?package=${packageParam}`,
    'https://play.google.com/store/account/subscriptions',
  ];
}

async function openFirstAvailableUrl(urls: readonly string[]): Promise<SubscriptionManagementResult> {
  let lastError: unknown = null;

  for (const url of urls) {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen && !url.startsWith('https://')) {
        continue;
      }

      await Linking.openURL(url);
      return { status: 'opened', url };
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error && lastError.message.trim()) {
    return { status: 'failed', error: lastError.message.trim() };
  }

  return { status: 'unavailable' };
}

export async function openSubscriptionManagement(
  productId?: string | null,
  managementURL?: string | null,
): Promise<SubscriptionManagementResult> {
  if (managementURL?.trim()) {
    const directResult = await openFirstAvailableUrl([managementURL.trim()]);
    if (directResult.status === 'opened') {
      return directResult;
    }
  }

  if (Platform.OS === 'ios') {
    return openFirstAvailableUrl(IOS_SUBSCRIPTION_MANAGEMENT_URLS);
  }

  if (Platform.OS === 'android') {
    return openFirstAvailableUrl(getAndroidSubscriptionUrls(productId));
  }

  return { status: 'unavailable' };
}
