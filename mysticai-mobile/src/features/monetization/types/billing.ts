import type { CustomerInfo, PurchasesOffering, PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';
import type { PaywallProduct } from '../types';

export type RevenueCatDisabledReason =
  | 'unsupported_platform'
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
}

export interface RevenueCatSyncPayload {
  appUserId?: string | null;
  originalAppUserId?: string | null;
  activeEntitlements: string[];
  activeProductIds: string[];
  environment: string;
  fetchedAt?: string;
}

export interface RevenueCatOfferingSnapshot {
  offerings: PurchasesOfferings | null;
  currentOffering: PurchasesOffering | null;
  availablePackages: PurchasesPackage[];
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
