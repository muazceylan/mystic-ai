import type { CustomerInfo, PurchasesOffering, PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';
import type { PaywallProduct } from '../types';

export type RevenueCatDisabledReason =
  | 'unsupported_platform'
  | 'expo_go'
  | 'missing_api_key'
  | 'user_not_authenticated'
  | 'backend_disabled'
  | 'sdk_error'
  | 'not_initialized'
  | 'offerings_unavailable';

export interface RevenueCatRuntimeState {
  supported: boolean;
  configured: boolean;
  ready: boolean;
  initializedAt?: string | null;
  activeAppUserId?: string | null;
  currentOfferingId?: string | null;
  disabledReason?: RevenueCatDisabledReason | null;
  error?: string | null;
  lastCustomerInfoAt?: string | null;
  diagnostics?: RevenueCatDiagnostics;
}

export interface RevenueCatSdkConfig {
  iosApiKey?: string | null;
  androidApiKey?: string | null;
  testApiKey?: string | null;
  environment?: string | null;
}

export interface RevenueCatDiagnostics {
  platform: string;
  appEnv: string;
  buildProfile?: string | null;
  hasAndroidKey: boolean;
  hasIosKey: boolean;
  hasTestKey: boolean;
  selectedKeySource: 'android' | 'ios' | 'test' | 'test-fallback' | 'missing' | 'unsupported' | 'expo_go';
  entitlementId: string;
  offeringId: 'default';
  tokenOfferingId: 'guru_tokens';
}

export interface RevenueCatSyncPayload {
  appUserId?: string | null;
  originalAppUserId?: string | null;
  activeEntitlements: string[];
  activeProductIds: string[];
  environment: string;
  fetchedAt?: string;
  purchaseIdempotencyKey?: string | null;
  purchasedProductId?: string | null;
  storeTransactionId?: string | null;
  store?: 'APP_STORE' | 'PLAY_STORE' | null;
}

export interface RevenueCatOfferingSnapshot {
  offerings: PurchasesOfferings | null;
  currentOffering: PurchasesOffering | null;
  defaultOffering: PurchasesOffering | null;
  tokenOffering: PurchasesOffering | null;
  availablePackages: PurchasesPackage[];
  tokenPackages: PurchasesPackage[];
}

export interface ResolvedPaywallProduct extends PaywallProduct {
  offeringId?: string | null;
  revenueCatPackage?: PurchasesPackage | null;
  localizedPrice?: string | null;
  localizedPeriodPrice?: string | null;
  storeProductId?: string | null;
  availableForPurchase: boolean;
}

export interface RevenueCatCustomerSnapshot {
  customerInfo: CustomerInfo;
  syncedAt: string;
}
