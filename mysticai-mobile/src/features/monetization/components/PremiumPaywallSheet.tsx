import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { ACCESSIBILITY } from '../../../constants/tokens';
import { useAuthStore } from '../../../store/useAuthStore';
import { trackEvent } from '../../../services/analytics';
import { useEntitlements } from '../hooks/useEntitlements';
import { usePaywall } from '../hooks/usePaywall';
import { usePurchasePremium } from '../hooks/usePurchasePremium';
import { useRestorePurchases } from '../hooks/useRestorePurchases';
import {
  normalizeStoreProductId,
  packageMatchesProductId,
  stringifyRevenueCatLogPayload,
} from '../services/revenueCatService';
import { openSubscriptionManagement } from '../services/subscriptionManagement';
import type { ResolvedPaywallProduct } from '../types/billing';
import { PremiumBenefitRow } from './PremiumBenefitRow';
import { PremiumPlanCard } from './PremiumPlanCard';

interface PremiumPaywallSheetProps {
  visible: boolean;
  onClose: () => void;
  source?: string;
}

type PlanId = '$rc_monthly' | '$rc_annual';

type PremiumPlanModel = {
  packageId: PlanId;
  title: string;
  subtitle: string;
  note: string;
  price: string | null;
  priceSuffix: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  recommended?: boolean;
  product: ResolvedPaywallProduct;
};

const MONTHLY_PACKAGE_ID: PlanId = '$rc_monthly';
const ANNUAL_PACKAGE_ID: PlanId = '$rc_annual';

const PACKAGE_IDENTIFIER_CANDIDATES_BY_PACKAGE_ID: Record<PlanId, string[]> = {
  [MONTHLY_PACKAGE_ID]: ['$rc_monthly', 'monthly', 'month', 'premium_monthly', 'astroguru_premium_monthly'],
  [ANNUAL_PACKAGE_ID]: ['$rc_annual', 'annual', 'yearly', 'year', 'premium_yearly', 'astroguru_premium_yearly'],
};

const PRODUCT_KEYS_BY_PACKAGE_ID: Record<PlanId, string> = {
  [MONTHLY_PACKAGE_ID]: 'astroguru_premium_monthly',
  [ANNUAL_PACKAGE_ID]: 'astroguru_premium_yearly',
};

const EXPECTED_STORE_PRODUCT_IDS_BY_PACKAGE_ID: Record<PlanId, string> = {
  [MONTHLY_PACKAGE_ID]: 'astroguru_premium_monthly',
  [ANNUAL_PACKAGE_ID]: 'astroguru_premium_yearly',
};

const PREMIUM_TRIAL_DAYS = 3;

const COLORS = {
  sheet: '#120026',
  deepPurple: '#16002F',
  purple900: '#21034D',
  purple800: '#35106D',
  purple700: '#4B10A8',
  neonPurple: '#A855F7',
  softPurple: '#C084FC',
  gold: '#FFD76A',
  white: '#FFFFFF',
  textSoft: 'rgba(255,255,255,0.78)',
  textMuted: 'rgba(255,255,255,0.60)',
  border: 'rgba(255,255,255,0.16)',
  danger: '#FCA5A5',
} as const;

function resolvePackageProductTitle(
  revenueCatPackage: PurchasesPackage,
  fallbackTitle: string,
): string {
  const productTitle = revenueCatPackage.product.title?.trim();
  return productTitle || fallbackTitle;
}

function toResolvedSubscriptionProduct({
  revenueCatPackage,
  configuredProduct,
  packageId,
  trialDays,
  fallbackTitle,
  fallbackDescription,
  sortOrder,
  recommended,
}: {
  revenueCatPackage: PurchasesPackage;
  configuredProduct?: ResolvedPaywallProduct | null;
  packageId: PlanId;
  trialDays: number;
  fallbackTitle: string;
  fallbackDescription: string;
  sortOrder: number;
  recommended?: boolean;
}): ResolvedPaywallProduct {
  const product = revenueCatPackage.product;
  const normalizedProductId = normalizeStoreProductId(product.identifier);

  return {
    productKey: configuredProduct?.productKey ?? PRODUCT_KEYS_BY_PACKAGE_ID[packageId],
    productType: configuredProduct?.productType ?? 'subscription',
    title: configuredProduct?.title ?? resolvePackageProductTitle(revenueCatPackage, fallbackTitle),
    description: configuredProduct?.description ?? product.description ?? fallbackDescription,
    iosProductId: configuredProduct?.iosProductId ?? normalizedProductId,
    androidProductId: configuredProduct?.androidProductId ?? normalizedProductId,
    revenueCatProductId: configuredProduct?.revenueCatProductId ?? normalizedProductId ?? product.identifier,
    entitlementKey: configuredProduct?.entitlementKey ?? null,
    tokenAmount: null,
    bonusTokenAmount: null,
    price: product.priceString,
    currency: configuredProduct?.currency ?? product.currencyCode ?? null,
    trialDurationDays: configuredProduct?.trialDurationDays ?? trialDays,
    sortOrder: configuredProduct?.sortOrder ?? sortOrder,
    badge: configuredProduct?.badge ?? null,
    popular: configuredProduct?.popular ?? Boolean(recommended),
    campaignLabel: configuredProduct?.campaignLabel ?? null,
    offeringId: revenueCatPackage.offeringIdentifier
      ?? revenueCatPackage.presentedOfferingContext?.offeringIdentifier
      ?? null,
    revenueCatPackage,
    localizedPrice: product.priceString,
    localizedPeriodPrice: packageId === ANNUAL_PACKAGE_ID
      ? product.pricePerYearString ?? product.priceString
      : product.pricePerMonthString ?? product.priceString,
    storeProductId: product.identifier,
    availableForPurchase: true,
  };
}

function getProductIdentifiers(product: ResolvedPaywallProduct | null | undefined): string[] {
  return [
    product?.storeProductId,
    product?.revenueCatProductId,
    product?.iosProductId,
    product?.androidProductId,
    product?.productKey,
  ].filter((value): value is string => Boolean(value && value.trim()));
}

function productLooksLikePlan(product: ResolvedPaywallProduct, packageId: PlanId): boolean {
  const identifiers = getProductIdentifiers(product)
    .map((value) => normalizeStoreProductId(value) ?? value)
    .join(' ')
    .toLowerCase();

  if (packageId === ANNUAL_PACKAGE_ID) {
    return identifiers.includes('annual')
      || identifiers.includes('yearly')
      || identifiers.includes('premium_year')
      || identifiers.includes('premium_yillik');
  }

  return identifiers.includes('monthly')
    || identifiers.includes('premium_month')
    || identifiers.includes('premium_aylik');
}

function resolveConfiguredProductForPlan(
  products: ResolvedPaywallProduct[],
  packageId: PlanId,
): ResolvedPaywallProduct | null {
  const expectedStoreProductId = EXPECTED_STORE_PRODUCT_IDS_BY_PACKAGE_ID[packageId];
  return products.find((product) => product.revenueCatPackage?.identifier === packageId)
    ?? products.find((product) => getProductIdentifiers(product)
      .some((identifier) => normalizeStoreProductId(identifier) === expectedStoreProductId))
    ?? products.find((product) => productLooksLikePlan(product, packageId))
    ?? null;
}

function resolvePackageForPlan(
  offering: PurchasesOffering | null | undefined,
  packageId: PlanId,
  configuredProduct: ResolvedPaywallProduct | null,
): PurchasesPackage | null {
  if (!offering) {
    return null;
  }

  const typedPackage = packageId === ANNUAL_PACKAGE_ID ? offering.annual : offering.monthly;
  if (typedPackage) {
    return typedPackage;
  }

  const packageIdentifierCandidates = new Set(
    PACKAGE_IDENTIFIER_CANDIDATES_BY_PACKAGE_ID[packageId]
      .map((identifier) => normalizeStoreProductId(identifier) ?? identifier),
  );
  const productIdentifierCandidates = new Set([
    EXPECTED_STORE_PRODUCT_IDS_BY_PACKAGE_ID[packageId],
    ...getProductIdentifiers(configuredProduct),
  ].map((identifier) => normalizeStoreProductId(identifier) ?? identifier));

  return offering.availablePackages.find((entry) => {
    const normalizedIdentifier = normalizeStoreProductId(entry.identifier) ?? entry.identifier;
    return packageIdentifierCandidates.has(normalizedIdentifier);
  })
    ?? offering.availablePackages.find((entry) =>
      Array.from(productIdentifierCandidates).some((candidate) => packageMatchesProductId(entry, candidate)))
    ?? null;
}

export function PremiumPaywallSheet({
  visible,
  onClose,
  source = 'profile',
}: PremiumPaywallSheetProps) {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [selectedPackageId, setSelectedPackageId] = useState<PlanId>(ANNUAL_PACKAGE_ID);
  const [inlineMessage, setInlineMessage] = useState<string | null>(null);
  const openedTrackedRef = useRef(false);
  const missingPackagesWarnKeyRef = useRef<string | null>(null);
  const entitlementState = useEntitlements();
  const paywallQuery = usePaywall();
  const {
    status: purchaseStatus,
    error: purchaseError,
    isProcessing: purchaseProcessing,
    purchasePremium,
    reset: resetPurchase,
  } = usePurchasePremium();
  const {
    status: restoreStatus,
    error: restoreError,
    isProcessing: restoreProcessing,
    restorePurchases,
    reset: resetRestore,
  } = useRestorePurchases();

  const paywall = paywallQuery.paywall;
  const entitlementPremiumActive = Boolean(
    entitlementState.premiumActive
    || entitlementState.trialing
    || paywall?.premiumActive
    || paywall?.trialing,
  );
  const trialDays = PREMIUM_TRIAL_DAYS;

  const configuredMonthlyProduct = useMemo(
    () => resolveConfiguredProductForPlan(paywallQuery.subscriptionProducts, MONTHLY_PACKAGE_ID),
    [paywallQuery.subscriptionProducts],
  );
  const configuredAnnualProduct = useMemo(
    () => resolveConfiguredProductForPlan(paywallQuery.subscriptionProducts, ANNUAL_PACKAGE_ID),
    [paywallQuery.subscriptionProducts],
  );
  const activeOffering = paywallQuery.defaultOffering ?? paywallQuery.currentOffering ?? null;
  const monthlyPackage = useMemo(
    () => resolvePackageForPlan(activeOffering, MONTHLY_PACKAGE_ID, configuredMonthlyProduct),
    [activeOffering, configuredMonthlyProduct],
  );
  const annualPackage = useMemo(
    () => resolvePackageForPlan(activeOffering, ANNUAL_PACKAGE_ID, configuredAnnualProduct),
    [activeOffering, configuredAnnualProduct],
  );

  const monthlyPlan = useMemo<PremiumPlanModel | null>(() => {
    if (!monthlyPackage) {
      return null;
    }
    return {
      packageId: MONTHLY_PACKAGE_ID,
      title: t('premium.paywall.monthlyTitle'),
      subtitle: t('premium.paywall.monthlySubtitle'),
      note: t('premium.paywall.monthlyNote', { count: trialDays }),
      price: monthlyPackage.product.priceString,
      priceSuffix: t('premium.periodMonth'),
      iconName: 'calendar-outline',
      product: toResolvedSubscriptionProduct({
        revenueCatPackage: monthlyPackage,
        configuredProduct: configuredMonthlyProduct,
        packageId: MONTHLY_PACKAGE_ID,
        trialDays,
        fallbackTitle: t('premium.paywall.monthlySubtitle'),
        fallbackDescription: t('premium.paywall.monthlyNote', { count: trialDays }),
        sortOrder: 10,
      }),
    };
  }, [configuredMonthlyProduct, monthlyPackage, t, trialDays]);

  const annualPlan = useMemo<PremiumPlanModel | null>(() => {
    if (!annualPackage) {
      return null;
    }
    return {
      packageId: ANNUAL_PACKAGE_ID,
      title: t('premium.paywall.yearlyTitle'),
      subtitle: t('premium.paywall.yearlySubtitle'),
      note: t('premium.paywall.yearlyNote', { count: trialDays }),
      price: annualPackage.product.priceString,
      priceSuffix: t('premium.periodYear'),
      iconName: 'calendar',
      recommended: true,
      product: toResolvedSubscriptionProduct({
        revenueCatPackage: annualPackage,
        configuredProduct: configuredAnnualProduct,
        packageId: ANNUAL_PACKAGE_ID,
        trialDays,
        fallbackTitle: t('premium.paywall.yearlySubtitle'),
        fallbackDescription: t('premium.paywall.yearlyNote', { count: trialDays }),
        sortOrder: 20,
        recommended: true,
      }),
    };
  }, [annualPackage, configuredAnnualProduct, t, trialDays]);

  const selectedPlan = (selectedPackageId === ANNUAL_PACKAGE_ID ? annualPlan : monthlyPlan)
    ?? annualPlan
    ?? monthlyPlan;
  const isInitialLoading = Boolean(
    visible
    && (
      (paywallQuery.isLoading && !paywall)
      || paywallQuery.offeringsLoading
    )
    && !monthlyPlan
    && !annualPlan,
  );
  const packagesMissing = !isInitialLoading && !monthlyPlan && !annualPlan;
  const storeDisabled = Boolean(
    paywall?.premiumEnabled === false
    || paywall?.revenueCatEnabled === false
    || paywallQuery.revenueCatDisabledReason
    || !paywallQuery.revenueCatState.ready
  );
  const showPackageError = Boolean(!isInitialLoading && (packagesMissing || storeDisabled));
  const packageErrorMessage = useMemo(() => {
    const reason = paywallQuery.revenueCatDisabledReason;
    if (reason === 'backend_disabled') {
      return t('premium.backendDisabledMessage');
    }
    if (reason === 'missing_api_key') {
      return t('premium.apiKeyMissingMessage');
    }
    if (reason === 'expo_go' || reason === 'unsupported_platform') {
      return t('premium.buildRequiredMessage');
    }
    if (reason === 'native_module_unavailable') {
      return t('premium.nativeModuleUnavailableMessage');
    }
    if (reason === 'offerings_unavailable') {
      return t('premium.paywall.offeringMissing');
    }
    if (packagesMissing) {
      return t('premium.paywall.packageMappingError');
    }
    return t('premium.paywall.packageError');
  }, [packagesMissing, paywallQuery.revenueCatDisabledReason, t]);
  const purchaseDisabled = Boolean(
    !selectedPlan
    || !selectedPlan.product.availableForPurchase
    || storeDisabled
    || purchaseProcessing
    || entitlementPremiumActive
  );

  useEffect(() => {
    if (!visible) {
      openedTrackedRef.current = false;
      setSelectedPackageId(ANNUAL_PACKAGE_ID);
      setInlineMessage(null);
      resetPurchase();
      resetRestore();
      return;
    }

    if (!openedTrackedRef.current) {
      openedTrackedRef.current = true;
      trackEvent('premium_paywall_opened', {
        source,
        selected_package_id: ANNUAL_PACKAGE_ID,
        has_free_trial: true,
      });
    }
  }, [resetPurchase, resetRestore, source, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (selectedPackageId === ANNUAL_PACKAGE_ID && !annualPlan && monthlyPlan) {
      setSelectedPackageId(MONTHLY_PACKAGE_ID);
      return;
    }

    if (selectedPackageId === MONTHLY_PACKAGE_ID && !monthlyPlan && annualPlan) {
      setSelectedPackageId(ANNUAL_PACKAGE_ID);
    }
  }, [annualPlan, monthlyPlan, selectedPackageId, visible]);

  useEffect(() => {
    if (!visible || isInitialLoading || !showPackageError) {
      return;
    }

    const offeringId = paywallQuery.defaultOffering?.identifier
      ?? paywallQuery.currentOffering?.identifier
      ?? 'default';
    const availablePackages = paywallQuery.defaultOffering?.availablePackages.map((entry) => ({
      identifier: entry.identifier,
      productIdentifier: entry.product.identifier,
    })) ?? [];
    const warnKey = `${offeringId}:${availablePackages.map((entry) => entry.identifier).join('|')}`;
    if (warnKey === missingPackagesWarnKeyRef.current) {
      return;
    }

    missingPackagesWarnKeyRef.current = warnKey;
    const payload = {
      offeringId,
      availablePackages,
      disabledReason: paywallQuery.revenueCatDisabledReason ?? null,
      diagnostics: paywallQuery.revenueCatState.diagnostics ?? null,
    };
    console.warn('[PremiumPaywall] Missing RevenueCat packages', payload);
    console.warn('[PremiumPaywall] Missing RevenueCat packages JSON', stringifyRevenueCatLogPayload(payload));
  }, [
    isInitialLoading,
    paywallQuery.currentOffering?.identifier,
    paywallQuery.defaultOffering,
    paywallQuery.revenueCatDisabledReason,
    paywallQuery.revenueCatState.diagnostics,
    showPackageError,
    visible,
  ]);

  useEffect(() => {
    if (!visible || !monthlyPackage || !annualPackage) {
      return;
    }

    const mismatches = [
      [MONTHLY_PACKAGE_ID, monthlyPackage] as const,
      [ANNUAL_PACKAGE_ID, annualPackage] as const,
    ].flatMap(([packageId, revenueCatPackage]) => {
      const actualProductId = normalizeStoreProductId(revenueCatPackage.product.identifier);
      const expectedProductId = EXPECTED_STORE_PRODUCT_IDS_BY_PACKAGE_ID[packageId];
      return actualProductId === expectedProductId
        ? []
        : [{ packageId, expectedProductId, actualProductId }];
    });

    if (mismatches.length === 0) {
      return;
    }

    console.warn('[PremiumPaywall] Unexpected RevenueCat product identifiers', {
      offeringId: paywallQuery.defaultOffering?.identifier
        ?? paywallQuery.currentOffering?.identifier
        ?? 'default',
      mismatches,
    });
  }, [
    annualPackage,
    monthlyPackage,
    paywallQuery.currentOffering?.identifier,
    paywallQuery.defaultOffering?.identifier,
    visible,
  ]);

  const handleClose = useCallback(() => {
    trackEvent('premium_paywall_closed', {
      source,
      selected_package_id: selectedPackageId,
    });
    onClose();
  }, [onClose, selectedPackageId, source]);

  const handleSelectPlan = useCallback((packageId: PlanId) => {
    if (packageId === selectedPackageId) {
      return;
    }
    setSelectedPackageId(packageId);
    setInlineMessage(null);
    const plan = packageId === ANNUAL_PACKAGE_ID ? annualPlan : monthlyPlan;
    trackEvent('premium_plan_selected', {
      source,
      selected_package_id: packageId,
      product_id: normalizeStoreProductId(plan?.product.storeProductId ?? plan?.product.revenueCatProductId),
      has_free_trial: true,
    });
  }, [annualPlan, monthlyPlan, selectedPackageId, source]);

  const handlePurchase = useCallback(async () => {
    if (!isAuthenticated) {
      router.push('/(auth)/welcome');
      return;
    }

    if (!selectedPlan || purchaseDisabled) {
      return;
    }

    const productId = normalizeStoreProductId(
      selectedPlan.product.storeProductId ?? selectedPlan.product.revenueCatProductId,
    );
    const payload = {
      source,
      selected_package_id: selectedPlan.packageId,
      product_id: productId,
      has_free_trial: true,
    };

    setInlineMessage(null);
    trackEvent('premium_trial_cta_clicked', payload);
    trackEvent('premium_purchase_started', payload);

    const result = await purchasePremium(selectedPlan.product);
    if (result.status === 'success') {
      trackEvent('premium_purchase_success', payload);
      Alert.alert(t('premium.paywall.purchaseSuccessTitle'), t('premium.paywall.purchaseSuccessBody'));
      handleClose();
      return;
    }

    if (result.status === 'pending_backend') {
      trackEvent('premium_purchase_success', {
        ...payload,
        pending_backend: true,
      });
      Alert.alert(t('premium.pendingTitle'), t('premium.pendingBody'));
      return;
    }

    if (result.status === 'cancelled') {
      trackEvent('premium_purchase_cancelled', payload);
      setInlineMessage(t('premium.paywall.purchaseCancelled'));
      return;
    }

    trackEvent('premium_purchase_failed', {
      ...payload,
      reason: result.error ?? purchaseError ?? 'purchase_failed',
    });
    setInlineMessage(t('premium.paywall.purchaseFailed'));
  }, [
    handleClose,
    isAuthenticated,
    purchaseError,
    purchasePremium,
    purchaseDisabled,
    selectedPlan,
    source,
    t,
  ]);

  const handleRestore = useCallback(async () => {
    if (restoreProcessing) {
      return;
    }

    setInlineMessage(null);
    trackEvent('premium_restore_clicked', { source });
    const result = await restorePurchases();
    if (result.status === 'success') {
      trackEvent('premium_restore_success', { source });
      Alert.alert(t('premium.restoreSuccessTitle'), t('premium.restoreSuccessBody'));
      return;
    }

    trackEvent('premium_restore_failed', {
      source,
      reason: result.error ?? restoreError ?? 'restore_failed',
    });
    setInlineMessage(t('premium.paywall.restoreFailed'));
  }, [restoreError, restoreProcessing, restorePurchases, source, t]);

  const handleManageSubscription = useCallback(async () => {
    const productId = entitlementState.snapshot?.productId
      ?? selectedPlan?.product.storeProductId
      ?? selectedPlan?.product.revenueCatProductId
      ?? null;
    const normalizedProductId = normalizeStoreProductId(productId);
    const payload = {
      source,
      selected_package_id: selectedPackageId,
      product_id: normalizedProductId,
    };

    trackEvent('premium_manage_subscription_clicked', payload);
    const result = await openSubscriptionManagement(productId);
    if (result.status === 'opened') {
      trackEvent('premium_manage_subscription_opened', payload);
      return;
    }

    trackEvent('premium_manage_subscription_failed', {
      ...payload,
      reason: result.status === 'failed' ? result.error : 'unavailable',
    });
    Alert.alert(t('premium.paywall.manageUnavailableTitle'), t('premium.paywall.manageUnavailableBody'));
  }, [
    entitlementState.snapshot?.productId,
    selectedPackageId,
    selectedPlan,
    source,
    t,
  ]);

  const plans = useMemo(
    () => [monthlyPlan, annualPlan].filter((plan): plan is PremiumPlanModel => Boolean(plan)),
    [annualPlan, monthlyPlan],
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      sheetStyle={styles.sheet}
      contentStyle={styles.sheetContent}
      dragHandleStyle={styles.dragHandle}
      blurBackdrop
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <CosmicBackdrop />
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          activeOpacity={0.82}
        >
          <Ionicons name="close" size={26} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.header}>
          <PremiumCrownStage />
          <Text
            style={styles.title}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {t('premium.paywall.title')}
          </Text>
          <Text
            style={styles.subtitle}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {t('premium.paywall.subtitle')}
          </Text>
        </View>

        <LinearGradient
          colors={['rgba(255,215,106,0.15)', 'rgba(168,85,247,0.13)'] as const}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.trialBanner}
        >
          <Ionicons name="sparkles" size={28} color={COLORS.gold} />
          <View style={styles.trialCopy}>
            <Text
              style={styles.trialTitle}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {t('premium.paywall.trialTitle', { count: trialDays })}
            </Text>
            <Text style={styles.trialSubtitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              {t('premium.paywall.cancelAnytime')}
            </Text>
          </View>
        </LinearGradient>

        {entitlementPremiumActive ? (
          <View style={styles.activeCard}>
            <Ionicons name="checkmark-circle" size={22} color={COLORS.gold} />
            <View style={styles.activeCopy}>
              <Text style={styles.activeTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                {t('premium.activeState')}
              </Text>
              <Text style={styles.activeBody} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                {t('premium.activeGenericBody')}
              </Text>
            </View>
          </View>
        ) : null}

        {isInitialLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={COLORS.gold} />
            <Text style={styles.loadingText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              {t('premium.paywall.loading')}
            </Text>
          </View>
        ) : null}

        {showPackageError ? (
          <View style={styles.errorCard}>
            <Ionicons name="cloud-offline-outline" size={24} color={COLORS.gold} />
            <Text style={styles.errorText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              {packageErrorMessage}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => void paywallQuery.refresh()}
              accessibilityRole="button"
              activeOpacity={0.82}
            >
              <Text style={styles.retryText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                {t('premium.retry')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!showPackageError && plans.length > 0 ? (
          <View style={styles.planStack}>
            {plans.map((plan) => (
              <PremiumPlanCard
                key={plan.packageId}
                title={plan.title}
                subtitle={plan.subtitle}
                note={plan.note}
                price={plan.price}
                priceSuffix={plan.priceSuffix}
                iconName={plan.iconName}
                selected={selectedPackageId === plan.packageId}
                recommended={plan.recommended}
                recommendedLabel={t('premium.paywall.recommended')}
                disabled={purchaseProcessing || entitlementPremiumActive}
                onPress={() => handleSelectPlan(plan.packageId)}
              />
            ))}
          </View>
        ) : null}

        <View style={styles.benefits}>
          <PremiumBenefitRow iconName="ban-outline" label={t('premium.paywall.benefitAdFree')} />
          <PremiumBenefitRow iconName="analytics-outline" label={t('premium.paywall.benefitAnalyses')} />
          <PremiumBenefitRow iconName="star" label={t('premium.paywall.benefitContent')} />
          <PremiumBenefitRow iconName="planet-outline" label={t('premium.paywall.benefitNatal')} />
        </View>

        {inlineMessage ? (
          <Text
            style={[
              styles.inlineMessage,
              purchaseStatus === 'failed' || restoreStatus === 'failed'
                ? styles.inlineMessageError
                : undefined,
            ]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {inlineMessage}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.primaryCta,
            purchaseDisabled && !entitlementPremiumActive && styles.primaryCtaDisabled,
          ]}
          onPress={entitlementPremiumActive ? handleManageSubscription : handlePurchase}
          disabled={!entitlementPremiumActive && purchaseDisabled}
          accessibilityRole="button"
          accessibilityLabel={
            entitlementPremiumActive
              ? t('profile.premium.manageCta')
              : t('premium.paywall.cta', { count: trialDays })
          }
          activeOpacity={0.86}
        >
          {purchaseProcessing ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Crown size={25} color={COLORS.white} strokeWidth={2.4} />
              <Text
                style={styles.primaryCtaText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              >
                {entitlementPremiumActive
                  ? t('profile.premium.manageCta')
                  : t('premium.paywall.cta', { count: trialDays })}
              </Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.trustText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
          {t('premium.paywall.trust')}
        </Text>

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={restoreProcessing}
          accessibilityRole="button"
          accessibilityLabel={t('premium.accessibilityRestore')}
          activeOpacity={0.82}
        >
          {restoreProcessing ? (
            <ActivityIndicator color={COLORS.softPurple} size="small" />
          ) : (
            <Ionicons name="refresh-outline" size={19} color={COLORS.softPurple} />
          )}
          <Text style={styles.restoreText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            {t('premium.paywall.restore')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.closeLink}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          activeOpacity={0.82}
        >
          <Text style={styles.closeLinkText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            {t('common.close')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </BottomSheet>
  );
}

function PremiumCrownStage() {
  return (
    <View style={styles.crownStage}>
      <View style={styles.crownGlow} />
      <LinearGradient
        colors={['#FFF7B8', '#FFD76A', '#A855F7'] as const}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.crownShell}
      >
        <Crown size={62} color="#FFFFFF" strokeWidth={2.35} />
        <Ionicons name="moon" size={16} color={COLORS.gold} style={styles.headerMoon} />
      </LinearGradient>
      <View style={styles.crownBase} />
    </View>
  );
}

function CosmicBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <View style={[styles.starDot, styles.starOne]} />
      <View style={[styles.starDot, styles.starTwo]} />
      <View style={[styles.starDot, styles.starThree]} />
      <View style={[styles.starDot, styles.starFour]} />
      <Ionicons name="sparkles" size={16} color="rgba(255,255,255,0.62)" style={styles.sheetSparkleA} />
      <Ionicons name="sparkles" size={13} color="rgba(255,215,106,0.70)" style={styles.sheetSparkleB} />
      <View style={styles.sheetPlanet}>
        <View style={styles.sheetPlanetRing} />
      </View>
      <View style={styles.sheetGlowTop} />
      <View style={styles.sheetGlowBottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    marginHorizontal: 10,
    marginBottom: 8,
    backgroundColor: COLORS.sheet,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.44)',
    overflow: 'hidden',
    shadowColor: COLORS.neonPurple,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.32,
    shadowRadius: 24,
    elevation: 12,
  },
  sheetContent: {
    paddingHorizontal: 0,
  },
  dragHandle: {
    width: 56,
    height: 6,
    borderRadius: 999,
    backgroundColor: COLORS.neonPurple,
    opacity: 0.76,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 22,
    gap: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 20,
    zIndex: 5,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  header: {
    alignItems: 'center',
    paddingTop: 4,
    paddingHorizontal: 46,
    gap: 8,
  },
  crownStage: {
    width: 126,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crownGlow: {
    position: 'absolute',
    width: 118,
    height: 82,
    borderRadius: 48,
    backgroundColor: 'rgba(168,85,247,0.22)',
    shadowColor: COLORS.neonPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 24,
  },
  crownShell: {
    width: 86,
    height: 72,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.38)',
  },
  headerMoon: {
    position: 'absolute',
    bottom: 22,
    right: 27,
  },
  crownBase: {
    width: 102,
    height: 13,
    borderRadius: 999,
    marginTop: -8,
    backgroundColor: 'rgba(192,132,252,0.48)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  title: {
    color: COLORS.white,
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.textSoft,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    textAlign: 'center',
  },
  trialBanner: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  trialCopy: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  trialTitle: {
    color: COLORS.gold,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  trialSubtitle: {
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  activeCard: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,106,0.34)',
    backgroundColor: 'rgba(255,215,106,0.10)',
  },
  activeCopy: {
    flex: 1,
    gap: 3,
  },
  activeTitle: {
    color: COLORS.gold,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
  },
  activeBody: {
    color: COLORS.textSoft,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  loadingCard: {
    minHeight: 94,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  loadingText: {
    color: COLORS.textSoft,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  errorCard: {
    minHeight: 118,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,215,106,0.28)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  errorText: {
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  retryText: {
    color: COLORS.gold,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  planStack: {
    gap: 12,
  },
  benefits: {
    gap: 0,
    paddingHorizontal: 6,
  },
  inlineMessage: {
    color: COLORS.textSoft,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  inlineMessageError: {
    color: COLORS.danger,
  },
  primaryCta: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 20,
    paddingHorizontal: 18,
    backgroundColor: COLORS.neonPurple,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
    shadowColor: COLORS.neonPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 17,
    elevation: 8,
  },
  primaryCtaDisabled: {
    opacity: 0.56,
  },
  primaryCtaText: {
    color: COLORS.white,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  trustText: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: -8,
  },
  restoreButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  restoreText: {
    color: COLORS.softPurple,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
  },
  closeLink: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -6,
  },
  closeLinkText: {
    color: COLORS.softPurple,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  starDot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  starOne: { top: 50, left: 26 },
  starTwo: { top: 120, right: 88 },
  starThree: { bottom: 110, left: 58 },
  starFour: { bottom: 220, right: 32 },
  sheetSparkleA: {
    position: 'absolute',
    top: 108,
    left: 62,
  },
  sheetSparkleB: {
    position: 'absolute',
    bottom: 190,
    right: 68,
  },
  sheetPlanet: {
    position: 'absolute',
    right: 26,
    bottom: 176,
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(168,85,247,0.32)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  sheetPlanetRing: {
    position: 'absolute',
    top: 38,
    left: -24,
    width: 130,
    height: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    transform: [{ rotate: '-20deg' }],
  },
  sheetGlowTop: {
    position: 'absolute',
    top: -90,
    left: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(168,85,247,0.12)',
  },
  sheetGlowBottom: {
    position: 'absolute',
    right: -110,
    bottom: -120,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(75,16,168,0.24)',
  },
});
