import { NativeModules, Platform, TurboModuleRegistry, type TurboModule } from 'react-native';
import Constants from 'expo-constants';
import { getLocales } from 'expo-localization';
import Purchases, {
  INTRO_ELIGIBILITY_STATUS,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesOfferings,
  type PurchasesPackage,
  type PurchasesStoreProduct,
} from 'react-native-purchases';
import { envConfig } from '../../../config/env';
import { getBuildInfo } from '../../../services/buildInfo';
import type { MonetizationConfig, PaywallProduct } from '../types';
import type {
  ResolvedPaywallProduct,
  RevenueCatDiagnostics,
  RevenueCatOfferingSnapshot,
  RevenueCatSdkConfig,
  RevenueCatRuntimeState,
  RevenueCatSyncPayload,
} from '../types/billing';
import { isTrialEligibilityEligible } from '../utils/trialDisplay';

let configuredAppUserId: string | null = null;

export const REVENUECAT_PREMIUM_ENTITLEMENT_ID = envConfig.revenueCat.premiumEntitlementId;
export const REVENUECAT_DEFAULT_OFFERING_ID = 'default';
export const REVENUECAT_TOKEN_OFFERING_ID = 'guru_tokens';

const SUBSCRIPTION_PACKAGE_IDS_BY_PRODUCT_KEY: Record<string, string> = {
  premium_monthly: '$rc_monthly',
  astroguru_premium_monthly: '$rc_monthly',
  premium_yearly: '$rc_annual',
  astroguru_premium_yearly: '$rc_annual',
};

const TOKEN_PACKAGE_IDS_BY_PRODUCT_KEY: Record<string, string> = {
  token_50: 'guru_tokens_50',
  guru_tokens_50: 'guru_tokens_50',
  token_150: 'guru_tokens_150',
  guru_tokens_150: 'guru_tokens_150',
  token_500: 'guru_tokens_500',
  guru_tokens_500: 'guru_tokens_500',
  token_1200: 'guru_tokens_1200',
  guru_tokens_1200: 'guru_tokens_1200',
};

interface RevenueCatInitialStateOptions {
  remoteConfigResolved?: boolean;
}

type NativeModuleRecord = Record<string, unknown>;

function getRevenueCatNativeModule(): unknown {
  return (NativeModules as { RNPurchases?: unknown }).RNPurchases ?? null;
}

function normalizeOptionalValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeRevenueCatEnvironment(value: string | null | undefined): string {
  const token = value?.trim().toLowerCase();
  return token === 'production' || token === 'prod' ? 'production' : 'sandbox';
}

export function getRevenueCatPriceLocale(): string {
  try {
    const languageTag = getLocales()[0]?.languageTag;
    if (languageTag?.trim()) {
      return languageTag;
    }
  } catch {
    // Fall through to Intl below.
  }

  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    if (locale?.trim()) {
      return locale;
    }
  } catch {
    // Fall through to stable default.
  }

  return 'en-US';
}

function getStoreProductPrice(product: PurchasesStoreProduct, period: StorePricePeriod): number | null {
  if (period === 'month') {
    return product.pricePerMonth;
  }
  if (period === 'year') {
    return product.pricePerYear;
  }
  if (period === 'week') {
    return product.pricePerWeek;
  }
  return product.price;
}

function getStoreProductPriceString(product: PurchasesStoreProduct, period: StorePricePeriod): string | null {
  if (period === 'month') {
    return product.pricePerMonthString;
  }
  if (period === 'year') {
    return product.pricePerYearString;
  }
  if (period === 'week') {
    return product.pricePerWeekString;
  }
  return product.priceString;
}

function formatCurrencyAmount(
  amount: number | null | undefined,
  currencyCode: string | null | undefined,
): string | null {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return null;
  }

  const currency = currencyCode?.trim().toUpperCase();
  if (!currency) {
    return null;
  }

  try {
    return new Intl.NumberFormat(getRevenueCatPriceLocale(), {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return null;
  }
}

type StorePricePeriod = 'full' | 'week' | 'month' | 'year';

export function formatRevenueCatStorePrice(
  product: PurchasesStoreProduct,
  period: StorePricePeriod = 'full',
): string | null {
  const formatted = formatCurrencyAmount(
    getStoreProductPrice(product, period),
    product.currencyCode,
  );
  return formatted ?? getStoreProductPriceString(product, period) ?? null;
}

function getEnvRevenueCatConfig(): RevenueCatSdkConfig {
  return {
    iosApiKey: envConfig.revenueCat.iosApiKey || null,
    androidApiKey: envConfig.revenueCat.androidApiKey || null,
    testApiKey: envConfig.revenueCat.testApiKey || null,
    environment: envConfig.revenueCat.env,
  };
}

export function getRevenueCatSdkConfigFromMonetizationConfig(
  config: Pick<MonetizationConfig, 'revenueCatIosApiKey' | 'revenueCatAndroidApiKey' | 'revenueCatEnvironment'> | null | undefined,
): RevenueCatSdkConfig | null {
  if (!config) {
    return null;
  }

  return {
    iosApiKey: normalizeOptionalValue(config.revenueCatIosApiKey),
    androidApiKey: normalizeOptionalValue(config.revenueCatAndroidApiKey),
    testApiKey: envConfig.revenueCat.testApiKey || null,
    environment: normalizeOptionalValue(config.revenueCatEnvironment),
  };
}

function isExpoGoRuntime(): boolean {
  return Constants.appOwnership === 'expo';
}

function isRevenueCatNativeModuleAvailable(): boolean {
  return Boolean(getRevenueCatNativeModule());
}

function describeValueType(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  return typeof value;
}

function getObjectKeys(value: unknown): string[] {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
    return [];
  }

  try {
    return Object.keys(value as Record<string, unknown>).sort();
  } catch {
    return ['<keys_unavailable>'];
  }
}

function getRevenueCatNativeModuleProbe(): RevenueCatDiagnostics['nativeModuleProbe'] {
  const nativeModuleRecord = NativeModules as NativeModuleRecord;
  const nativeModuleKeys = Object.keys(nativeModuleRecord).sort();
  const revenueCatLikeModuleKeys = nativeModuleKeys.filter((key) => /purchase|revenue|cat/i.test(key));
  const possibleModuleNames = [
    'RNPurchases',
    'Purchases',
    'RevenueCat',
    'RCPurchases',
    'PurchasesHybridCommon',
  ];
  const foundModuleName = possibleModuleNames.find((moduleName) => Boolean(nativeModuleRecord[moduleName])) ?? null;
  const rnpurchasesModule = getRevenueCatNativeModule();
  const purchasesRecord = Purchases as unknown as Record<string, unknown>;
  const runtimeGlobal = globalThis as typeof globalThis & {
    RN$Bridgeless?: unknown;
    RN$TurboInterop?: unknown;
    RN$UnifiedNativeModuleProxy?: unknown;
    __turboModuleProxy?: unknown;
    nativeModuleProxy?: unknown;
    nativeFabricUIManager?: unknown;
  };
  let turboModuleRegistryRNPurchases: TurboModule | null = null;
  let turboModuleRegistryError: string | null = null;

  try {
    turboModuleRegistryRNPurchases = TurboModuleRegistry.get<TurboModule>('RNPurchases');
  } catch (error) {
    turboModuleRegistryError = error instanceof Error ? error.message : String(error);
  }

  return {
    expectedModuleName: 'RNPurchases',
    nativeModuleAvailable: Boolean(rnpurchasesModule),
    nativeModuleCount: nativeModuleKeys.length,
    nativeModuleKeys,
    revenueCatLikeModuleKeys,
    foundModuleName,
    rnpurchasesModuleType: describeValueType(rnpurchasesModule),
    rnpurchasesModuleKeys: getObjectKeys(rnpurchasesModule),
    purchasesImportType: describeValueType(Purchases),
    purchasesImportKeys: getObjectKeys(Purchases),
    purchasesHasConfigure: typeof purchasesRecord.configure === 'function',
    purchasesHasGetOfferings: typeof purchasesRecord.getOfferings === 'function',
    turboModuleProxyAvailable: Boolean(runtimeGlobal.__turboModuleProxy),
    turboModuleRegistryRNPurchasesAvailable: Boolean(turboModuleRegistryRNPurchases),
    turboModuleRegistryError,
    bridgelessRuntimeAvailable: runtimeGlobal.RN$Bridgeless === true,
    turboInteropAvailable: runtimeGlobal.RN$TurboInterop === true,
    unifiedNativeModuleProxyAvailable: runtimeGlobal.RN$UnifiedNativeModuleProxy === true,
    nativeModuleProxyAvailable: Boolean(runtimeGlobal.nativeModuleProxy),
    nativeFabricUIManagerAvailable: Boolean(runtimeGlobal.nativeFabricUIManager),
  };
}

function getRevenueCatRuntimeDiagnostics(): RevenueCatDiagnostics['runtime'] {
  const constants = Constants as unknown as {
    appOwnership?: string | null;
    executionEnvironment?: string | null;
    easConfig?: { projectId?: string | null } | null;
    expoConfig?: {
      name?: string | null;
      slug?: string | null;
      ios?: { bundleIdentifier?: string | null } | null;
      android?: { package?: string | null } | null;
    } | null;
  };
  const buildInfo = getBuildInfo();
  const expectedApplicationId = Platform.OS === 'ios'
    ? constants.expoConfig?.ios?.bundleIdentifier ?? null
    : Platform.OS === 'android'
      ? constants.expoConfig?.android?.package ?? null
      : null;

  return {
    appOwnership: constants.appOwnership ?? null,
    executionEnvironment: constants.executionEnvironment ?? null,
    isExpoGoRuntime: isExpoGoRuntime(),
    nativeApplicationVersion: buildInfo.appVersion,
    nativeBuildVersion: buildInfo.buildNumber,
    applicationId: buildInfo.applicationId,
    expectedApplicationId,
    nativeApplicationIdMatchesExpoConfig: expectedApplicationId
      ? buildInfo.applicationId === expectedApplicationId
      : null,
    expoName: constants.expoConfig?.name ?? null,
    expoSlug: constants.expoConfig?.slug ?? null,
    expoBundleIdentifier: constants.expoConfig?.ios?.bundleIdentifier ?? null,
    expoAndroidPackage: constants.expoConfig?.android?.package ?? null,
    easProjectId: constants.easConfig?.projectId ?? null,
    updateChannel: buildInfo.updateChannel ?? null,
    runtimeVersion: buildInfo.runtimeVersion ?? null,
    updateId: buildInfo.updateId ?? null,
  };
}

export function stringifyRevenueCatLogPayload(payload: unknown): string {
  try {
    return JSON.stringify(payload, null, 2);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return `[RevenueCat] Unable to stringify diagnostics: ${message}`;
  }
}

function getRevenueCatBuildProfile(): string | null {
  return normalizeOptionalValue(process.env.EAS_BUILD_PROFILE)
    ?? normalizeOptionalValue(process.env.EXPO_PUBLIC_EAS_BUILD_PROFILE)
    ?? normalizeOptionalValue(process.env.EXPO_PUBLIC_BUILD_PROFILE);
}

const missingApiKeyWarnings = new Set<string>();
const diagnosticsWarningKeys = new Set<string>();
const offeringPricingLogKeys = new Set<string>();

function getPlatformRevenueCatEnvVarName(): 'EXPO_PUBLIC_REVENUECAT_IOS_API_KEY' | 'EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY' | null {
  if (Platform.OS === 'ios') {
    return 'EXPO_PUBLIC_REVENUECAT_IOS_API_KEY';
  }
  if (Platform.OS === 'android') {
    return 'EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY';
  }
  return null;
}

function warnMissingRevenueCatApiKeyOnce(): void {
  const envVarName = getPlatformRevenueCatEnvVarName();
  if (!envVarName) {
    return;
  }

  const warningKey = `${Platform.OS}:${envVarName}`;
  if (missingApiKeyWarnings.has(warningKey)) {
    return;
  }

  missingApiKeyWarnings.add(warningKey);
  console.warn(
    `[RevenueCat] Missing ${envVarName}; purchases are disabled for this ${Platform.OS} build.`
  );
}

function getRevenueCatApiKey(runtimeConfig?: RevenueCatSdkConfig | null): {
  key: string | null;
  source: RevenueCatDiagnostics['selectedKeySource'];
} {
  if (!isRevenueCatSupportedPlatform()) {
    return { key: null, source: 'unsupported' };
  }

  if (isExpoGoRuntime()) {
    return { key: null, source: 'expo_go' };
  }

  const envApiKey = getEnvRevenueCatConfig();
  const testKey = normalizeOptionalValue(runtimeConfig?.testApiKey)
    ?? normalizeOptionalValue(envApiKey.testApiKey);
  const androidKey = normalizeOptionalValue(runtimeConfig?.androidApiKey)
    ?? normalizeOptionalValue(envApiKey.androidApiKey);
  const iosKey = normalizeOptionalValue(runtimeConfig?.iosApiKey)
    ?? normalizeOptionalValue(envApiKey.iosApiKey);

  if (!envConfig.isProduction && testKey) {
    return { key: testKey, source: 'test' };
  }

  if (Platform.OS === 'ios') {
    return { key: iosKey, source: iosKey ? 'ios' : 'missing' };
  }

  if (Platform.OS === 'android') {
    return { key: androidKey, source: androidKey ? 'android' : 'missing' };
  }

  if (testKey) {
    return { key: testKey, source: 'test-fallback' };
  }

  return { key: null, source: 'missing' };
}

export function getRevenueCatDiagnostics(
  runtimeConfig?: RevenueCatSdkConfig | null,
): RevenueCatDiagnostics {
  const envApiKey = getEnvRevenueCatConfig();
  const selected = getRevenueCatApiKey(runtimeConfig);
  const testKey = normalizeOptionalValue(runtimeConfig?.testApiKey)
    ?? normalizeOptionalValue(envApiKey.testApiKey);
  const androidKey = normalizeOptionalValue(runtimeConfig?.androidApiKey)
    ?? normalizeOptionalValue(envApiKey.androidApiKey);
  const iosKey = normalizeOptionalValue(runtimeConfig?.iosApiKey)
    ?? normalizeOptionalValue(envApiKey.iosApiKey);
  const nativeModuleProbe = getRevenueCatNativeModuleProbe();
  return {
    platform: Platform.OS,
    appEnv: envConfig.appEnv,
    buildProfile: getRevenueCatBuildProfile(),
    nativeModuleAvailable: nativeModuleProbe.nativeModuleAvailable,
    hasAndroidKey: Boolean(androidKey),
    hasIosKey: Boolean(iosKey),
    hasTestKey: Boolean(testKey),
    selectedKeySource: selected.source,
    entitlementId: REVENUECAT_PREMIUM_ENTITLEMENT_ID,
    offeringId: REVENUECAT_DEFAULT_OFFERING_ID,
    tokenOfferingId: REVENUECAT_TOKEN_OFFERING_ID,
    runtime: getRevenueCatRuntimeDiagnostics(),
    nativeModuleProbe,
  };
}

function warnRevenueCatDiagnosticsOnce(
  stage: string,
  diagnostics: RevenueCatDiagnostics,
  extra?: Record<string, unknown>,
): void {
  const probe = diagnostics.nativeModuleProbe;
  const runtime = diagnostics.runtime;
  const warningKey = [
    stage,
    diagnostics.platform,
    diagnostics.selectedKeySource,
    diagnostics.nativeModuleAvailable ? 'native:on' : 'native:off',
    runtime.applicationId ?? 'unknown-app',
    runtime.nativeBuildVersion ?? 'unknown-build',
    probe.foundModuleName ?? 'no-found-module',
    probe.revenueCatLikeModuleKeys.join('|') || 'no-revenuecat-like-modules',
  ].join(':');

  if (diagnosticsWarningKeys.has(warningKey)) {
    return;
  }

  diagnosticsWarningKeys.add(warningKey);
  const payload = {
    stage,
    diagnostics,
    extra: extra ?? null,
  };
  console.warn('[RevenueCat] Detailed diagnostics', payload);
  console.warn('[RevenueCat] Detailed diagnostics JSON', stringifyRevenueCatLogPayload(payload));
}

export function getRevenueCatInitialState(
  runtimeConfig?: RevenueCatSdkConfig | null,
  options?: RevenueCatInitialStateOptions,
): RevenueCatRuntimeState {
  if (Platform.OS === 'web') {
    return {
      supported: false,
      configured: false,
      ready: false,
      disabledReason: 'unsupported_platform',
      diagnostics: getRevenueCatDiagnostics(runtimeConfig),
    };
  }

  if (isExpoGoRuntime()) {
    return {
      supported: false,
      configured: false,
      ready: false,
      disabledReason: 'expo_go',
      diagnostics: getRevenueCatDiagnostics(runtimeConfig),
    };
  }

  if (!getRevenueCatApiKey(runtimeConfig).key) {
    if (options?.remoteConfigResolved) {
      warnMissingRevenueCatApiKeyOnce();
    }
    return {
      supported: true,
      configured: false,
      ready: false,
      disabledReason: options?.remoteConfigResolved ? 'missing_api_key' : 'not_initialized',
      diagnostics: getRevenueCatDiagnostics(runtimeConfig),
    };
  }

  if (!isRevenueCatNativeModuleAvailable()) {
    const diagnostics = getRevenueCatDiagnostics(runtimeConfig);
    warnRevenueCatDiagnosticsOnce('initial_state_native_module_unavailable', diagnostics, {
      remoteConfigResolved: Boolean(options?.remoteConfigResolved),
    });
    return {
      supported: true,
      configured: false,
      ready: false,
      disabledReason: 'native_module_unavailable',
      diagnostics,
    };
  }

  return {
    supported: true,
    configured: false,
    ready: false,
    disabledReason: 'user_not_authenticated',
    diagnostics: getRevenueCatDiagnostics(runtimeConfig),
  };
}

export function isRevenueCatSupportedPlatform(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export function getRevenueCatAppUserId(userId: string | number | null | undefined): string | null {
  if (typeof userId === 'number' && Number.isFinite(userId) && userId > 0) {
    return String(Math.trunc(userId));
  }

  if (typeof userId === 'string' && userId.trim()) {
    return userId.trim();
  }

  return null;
}

export function getConfiguredRevenueCatUserId(): string | null {
  return configuredAppUserId;
}

export function isRevenueCatPremiumActive(customerInfo: CustomerInfo): boolean {
  return Boolean(customerInfo.entitlements.active?.[REVENUECAT_PREMIUM_ENTITLEMENT_ID]);
}

export async function configureRevenueCat(
  appUserId: string,
  runtimeConfig?: RevenueCatSdkConfig | null,
): Promise<void> {
  const { key: apiKey } = getRevenueCatApiKey(runtimeConfig);
  if (!isRevenueCatSupportedPlatform()) {
    throw new Error('RevenueCat is only supported on native mobile builds.');
  }
  if (!apiKey) {
    warnMissingRevenueCatApiKeyOnce();
    throw new Error('RevenueCat API key is missing for this platform.');
  }
  if (!isRevenueCatNativeModuleAvailable()) {
    warnRevenueCatDiagnosticsOnce('configure_native_module_unavailable', getRevenueCatDiagnostics(runtimeConfig), {
      appUserId,
    });
    throw new Error('RevenueCat native module is not available in this build. Rebuild the development or store app after installing react-native-purchases.');
  }

  if (!configuredAppUserId) {
    Purchases.configure({
      apiKey,
      appUserID: appUserId,
    });
    configuredAppUserId = appUserId;
    return;
  }

  if (configuredAppUserId !== appUserId) {
    await Purchases.logIn(appUserId);
    configuredAppUserId = appUserId;
  }
}

export async function logoutRevenueCat(): Promise<void> {
  if (!configuredAppUserId) {
    return;
  }

  try {
    await Purchases.logOut();
  } finally {
    configuredAppUserId = null;
  }
}

export async function getRevenueCatCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo();
}

function serializeRevenueCatError(error: unknown): Record<string, unknown> {
  const serialized: Record<string, unknown> = {
    type: describeValueType(error),
    message: toSafeRevenueCatErrorMessage(error),
  };

  if (error instanceof Error) {
    serialized.name = error.name;
  }

  if (!error || (typeof error !== 'object' && typeof error !== 'function')) {
    return serialized;
  }

  const record = error as Record<string, unknown>;
  for (const key of Object.keys(record).sort()) {
    const value = record[key];
    if (
      value === null
      || typeof value === 'string'
      || typeof value === 'number'
      || typeof value === 'boolean'
    ) {
      serialized[key] = value;
      continue;
    }

    if (Array.isArray(value)) {
      serialized[key] = value.map((entry) =>
        entry === null
        || typeof entry === 'string'
        || typeof entry === 'number'
        || typeof entry === 'boolean'
          ? entry
          : describeValueType(entry));
      continue;
    }

    serialized[key] = describeValueType(value);
  }

  return serialized;
}

function getPackagePricingSnapshot(revenueCatPackage: PurchasesPackage): Record<string, unknown> {
  const product = revenueCatPackage.product;
  return {
    packageIdentifier: revenueCatPackage.identifier,
    productIdentifier: product.identifier,
    price: product.price,
    priceString: product.priceString,
    formattedPrice: formatRevenueCatStorePrice(product),
    currencyCode: product.currencyCode,
    priceLocale: getRevenueCatPriceLocale(),
    pricePerMonth: product.pricePerMonth,
    pricePerMonthString: product.pricePerMonthString,
    formattedPricePerMonth: formatRevenueCatStorePrice(product, 'month'),
    pricePerYear: product.pricePerYear,
    pricePerYearString: product.pricePerYearString,
    formattedPricePerYear: formatRevenueCatStorePrice(product, 'year'),
  };
}

function logRevenueCatOfferingPricingOnce(snapshot: RevenueCatOfferingSnapshot): void {
  if (envConfig.isProduction && !__DEV__) {
    return;
  }

  const defaultPackages = snapshot.availablePackages.map(getPackagePricingSnapshot);
  const tokenPackages = snapshot.tokenPackages.map(getPackagePricingSnapshot);
  const signature = JSON.stringify({
    currentOfferingId: snapshot.currentOffering?.identifier ?? null,
    defaultOfferingId: snapshot.defaultOffering?.identifier ?? null,
    tokenOfferingId: snapshot.tokenOffering?.identifier ?? null,
    defaultPackages,
    tokenPackages,
  });

  if (offeringPricingLogKeys.has(signature)) {
    return;
  }

  offeringPricingLogKeys.add(signature);
  const payload = {
    priceLocale: getRevenueCatPriceLocale(),
    currentOfferingId: snapshot.currentOffering?.identifier ?? null,
    defaultOfferingId: snapshot.defaultOffering?.identifier ?? null,
    tokenOfferingId: snapshot.tokenOffering?.identifier ?? null,
    defaultPackages,
    tokenPackages,
  };

  console.info('[RevenueCat] Offering pricing', payload);
  console.info('[RevenueCat] Offering pricing JSON', stringifyRevenueCatLogPayload(payload));
}

export async function getRevenueCatOfferings(): Promise<RevenueCatOfferingSnapshot> {
  try {
    const offerings = await Purchases.getOfferings();
    const defaultOffering = offerings.current ?? offerings.all?.[REVENUECAT_DEFAULT_OFFERING_ID] ?? null;
    const tokenOffering = offerings.all?.[REVENUECAT_TOKEN_OFFERING_ID] ?? null;
    const snapshot = {
      offerings,
      currentOffering: defaultOffering,
      defaultOffering,
      tokenOffering,
      availablePackages: defaultOffering?.availablePackages ?? [],
      tokenPackages: tokenOffering?.availablePackages ?? [],
    };
    logRevenueCatOfferingPricingOnce(snapshot);
    return snapshot;
  } catch (error) {
    warnRevenueCatDiagnosticsOnce('offerings_fetch_failed', getRevenueCatDiagnostics(), {
      error: serializeRevenueCatError(error),
    });
    throw error;
  }
}

export async function purchaseRevenueCatPackage(
  revenueCatPackage: PurchasesPackage,
): Promise<{
  customerInfo: CustomerInfo;
  productIdentifier: string;
  transactionIdentifier: string | null;
  purchaseToken: string | null;
}> {
  const result = await Purchases.purchasePackage(revenueCatPackage);
  return {
    customerInfo: result.customerInfo,
    productIdentifier: result.productIdentifier,
    transactionIdentifier: result.transaction?.transactionIdentifier ?? null,
    purchaseToken: result.transaction?.purchaseToken ?? null,
  };
}

export async function checkRevenueCatTrialEligibility(productId: string): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return false;
  }

  try {
    const eligibilityByProduct = await Purchases.checkTrialOrIntroductoryPriceEligibility([productId]);
    const status = eligibilityByProduct[productId]?.status
      ?? INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_UNKNOWN;
    console.info('[RevenueCat] Trial eligibility', { productId, status });
    return isTrialEligibilityEligible(status);
  } catch (error) {
    console.warn('[RevenueCat] Trial eligibility check failed', {
      productId,
      error: serializeRevenueCatError(error),
    });
    return false;
  }
}

export async function restoreRevenueCatPurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

export function addRevenueCatCustomerInfoListener(
  listener: (customerInfo: CustomerInfo) => void,
): () => void {
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}

export function isRevenueCatPurchaseCancelled(error: unknown): boolean {
  return Boolean(
    error
      && typeof error === 'object'
      && 'code' in error
      && (error as { code?: string }).code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR,
  );
}

function resolveStoreForPlatform(): 'APP_STORE' | 'PLAY_STORE' | null {
  if (Platform.OS === 'ios') return 'APP_STORE';
  if (Platform.OS === 'android') return 'PLAY_STORE';
  return null;
}

export function toRevenueCatSyncPayload(
  customerInfo: CustomerInfo,
  runtimeConfig?: RevenueCatSdkConfig | null,
  purchase?: {
    productIdentifier?: string | null;
    transactionIdentifier?: string | null;
    purchaseToken?: string | null;
  },
): RevenueCatSyncPayload {
  const storeTransactionId = purchase?.transactionIdentifier ?? purchase?.purchaseToken ?? null;
  const purchasedProductId = purchase?.productIdentifier ?? null;
  return {
    appUserId: getConfiguredRevenueCatUserId(),
    originalAppUserId: customerInfo.originalAppUserId,
    activeEntitlements: Object.keys(customerInfo.entitlements.active ?? {}),
    activeProductIds: customerInfo.activeSubscriptions ?? [],
    environment: normalizeRevenueCatEnvironment(runtimeConfig?.environment ?? getEnvRevenueCatConfig().environment),
    fetchedAt: customerInfo.requestDate ?? new Date().toISOString(),
    purchaseIdempotencyKey: storeTransactionId || purchasedProductId
      ? `revenuecat:${storeTransactionId ?? 'no-transaction'}:${purchasedProductId ?? 'no-product'}`
      : null,
    purchasedProductId,
    storeTransactionId,
    store: resolveStoreForPlatform(),
  };
}

function getCandidateProductIds(product: PaywallProduct): string[] {
  const ids = [
    product.revenueCatProductId,
    Platform.OS === 'ios' ? product.iosProductId : product.androidProductId,
    product.iosProductId,
    product.androidProductId,
  ];

  return ids.filter((value): value is string => Boolean(value && value.trim()));
}

export function normalizeStoreProductId(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.split(':', 1)[0] || trimmed;
}

function getCandidatePackageIds(product: PaywallProduct): string[] {
  const keys = [
    product.productKey,
    product.revenueCatProductId,
    Platform.OS === 'ios' ? product.iosProductId : product.androidProductId,
    product.iosProductId,
    product.androidProductId,
  ]
    .map(normalizeStoreProductId)
    .filter((value): value is string => Boolean(value));

  const packageIds = keys
    .map((key) => SUBSCRIPTION_PACKAGE_IDS_BY_PRODUCT_KEY[key] ?? TOKEN_PACKAGE_IDS_BY_PRODUCT_KEY[key])
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(packageIds));
}

export function packageMatchesProductId(entry: PurchasesPackage, productId: string): boolean {
  const entryId = entry.product.identifier;
  const normalizedEntry = normalizeStoreProductId(entryId);
  const normalizedProduct = normalizeStoreProductId(productId);
  return entryId === productId
    || normalizedEntry === normalizedProduct
    || Boolean(normalizedEntry && normalizedProduct && normalizedEntry.startsWith(normalizedProduct))
    || Boolean(normalizedEntry && normalizedProduct && normalizedProduct.startsWith(normalizedEntry));
}

export function resolveOfferingFromOfferings(offerings: PurchasesOfferings | null): PurchasesOffering | null {
  return offerings?.current ?? offerings?.all?.[REVENUECAT_DEFAULT_OFFERING_ID] ?? null;
}

export function resolveRevenueCatProduct(
  product: PaywallProduct,
  offering: PurchasesOffering | null,
): ResolvedPaywallProduct {
  const availablePackages = offering?.availablePackages ?? [];
  const candidates = new Set(getCandidateProductIds(product));
  const packageCandidates = new Set(getCandidatePackageIds(product));
  const matchedPackage = availablePackages.find((entry) => packageCandidates.has(entry.identifier))
    ?? availablePackages.find((entry) =>
      Array.from(candidates).some((candidate) => packageMatchesProductId(entry, candidate)))
    ?? null;
  const storeProduct = matchedPackage?.product ?? null;
  const localizedPrice = storeProduct?.priceString ?? null;
  const localizedPeriodPrice = storeProduct
    ? formatRevenueCatStorePrice(storeProduct, 'month')
      ?? formatRevenueCatStorePrice(storeProduct, 'year')
      ?? localizedPrice
    : null;

  return {
    ...product,
    offeringId: offering?.identifier ?? null,
    revenueCatPackage: matchedPackage,
    localizedPrice: localizedPrice ?? product.price ?? null,
    localizedPeriodPrice: localizedPeriodPrice ?? product.price ?? null,
    storeProductId: storeProduct?.identifier ?? null,
    storeCurrencyCode: storeProduct?.currencyCode ?? product.currency ?? null,
    storeRawPrice: storeProduct?.price ?? null,
    storePriceLocale: storeProduct ? getRevenueCatPriceLocale() : null,
    availableForPurchase: Boolean(matchedPackage),
  };
}

export function toSafeRevenueCatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? '').trim();
    if (message) {
      return message;
    }
  }

  return 'RevenueCat request failed';
}
