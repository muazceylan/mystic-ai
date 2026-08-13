import type { CustomerInfo, PurchasesOffering, PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';
import type { PaywallProduct } from '../types';

export type RevenueCatDisabledReason =
  | 'unsupported_platform'
  | 'expo_go'
  | 'missing_api_key'
  | 'native_module_unavailable'
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

export type SubscriptionResolutionStatus = 'loading' | 'premium' | 'free' | 'error' | 'unavailable';

export interface SubscriptionSnapshot {
  status: SubscriptionResolutionStatus;
  isPremium: boolean;
  isTrialing: boolean;
  entitlementId?: string | null;
  productId?: string | null;
  expirationDate?: string | null;
  willRenew?: boolean | null;
  managementURL?: string | null;
  periodType?: string | null;
  appUserId?: string | null;
  lastUpdatedAt?: string | null;
  error?: string | null;
}

export interface RevenueCatSdkConfig {
  iosApiKey?: string | null;
  androidApiKey?: string | null;
  testApiKey?: string | null;
  environment?: string | null;
}

export interface RevenueCatNativeModuleProbe {
  expectedModuleName: 'RNPurchases';
  nativeModuleAvailable: boolean;
  nativeModuleCount: number;
  nativeModuleKeys: string[];
  revenueCatLikeModuleKeys: string[];
  foundModuleName?: string | null;
  rnpurchasesModuleType: string;
  rnpurchasesModuleKeys: string[];
  purchasesImportType: string;
  purchasesImportKeys: string[];
  purchasesHasConfigure: boolean;
  purchasesHasGetOfferings: boolean;
  turboModuleProxyAvailable: boolean;
  turboModuleRegistryRNPurchasesAvailable: boolean;
  turboModuleRegistryError?: string | null;
  bridgelessRuntimeAvailable: boolean;
  turboInteropAvailable: boolean;
  unifiedNativeModuleProxyAvailable: boolean;
  nativeModuleProxyAvailable: boolean;
  nativeFabricUIManagerAvailable: boolean;
}

export interface RevenueCatRuntimeDiagnostics {
  appOwnership?: string | null;
  executionEnvironment?: string | null;
  isExpoGoRuntime: boolean;
  nativeApplicationVersion?: string | null;
  nativeBuildVersion?: string | null;
  applicationId?: string | null;
  expectedApplicationId?: string | null;
  nativeApplicationIdMatchesExpoConfig?: boolean | null;
  expoName?: string | null;
  expoSlug?: string | null;
  expoBundleIdentifier?: string | null;
  expoAndroidPackage?: string | null;
  easProjectId?: string | null;
  updateChannel?: string | null;
  runtimeVersion?: string | null;
  updateId?: string | null;
}

export interface RevenueCatDiagnostics {
  platform: string;
  appEnv: string;
  buildProfile?: string | null;
  nativeModuleAvailable: boolean;
  hasAndroidKey: boolean;
  hasIosKey: boolean;
  hasTestKey: boolean;
  selectedKeySource: 'android' | 'ios' | 'test' | 'test-fallback' | 'missing' | 'unsupported' | 'expo_go';
  entitlementId: string;
  offeringId: 'default';
  tokenOfferingId: 'guru_tokens';
  runtime: RevenueCatRuntimeDiagnostics;
  nativeModuleProbe: RevenueCatNativeModuleProbe;
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
  storeCurrencyCode?: string | null;
  storeRawPrice?: number | null;
  storePriceLocale?: string | null;
  verifiedTrialEligible?: boolean;
  verifiedTrialDurationIso8601?: string | null;
  availableForPurchase: boolean;
}

export interface RevenueCatCustomerSnapshot {
  customerInfo: CustomerInfo;
  syncedAt: string;
}
