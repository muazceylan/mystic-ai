import { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { SafeScreen, TabHeader, BrandLogo } from '../components/ui';
import { Button } from '../components/ui/Button';
import { useTheme } from '../context/ThemeContext';
import { PREMIUM_ICONS } from '../constants/icons';
import { useAuthStore } from '../store/useAuthStore';
import {
  usePaywall,
  usePurchasePremium,
  usePurchaseTokenPack,
  useRestorePurchases,
} from '../features/monetization';
import { trackMonetizationEvent } from '../features/monetization/analytics/monetizationAnalytics';
import { useTrialDisplayState } from '../features/monetization/hooks/useTrialDisplayState';
import type { ResolvedPaywallProduct } from '../features/monetization/types/billing';
import { getSubscriptionPeriod } from '../features/monetization/utils/trialDisplay';
import { ProductEventName, trackProductEvent } from '../services/productAnalytics';
import { envConfig } from '../config/env';

function useBenefitList(fallbackCount = 7) {
  const { t } = useTranslation();
  return useMemo(
    () => Array.from({ length: fallbackCount }, (_, index) => t(`premium.feature${index + 1}`)),
    [fallbackCount, t],
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    content: { paddingHorizontal: 20, paddingBottom: 32, gap: 18 },
    hero: {
      borderRadius: 24,
      padding: 24,
      gap: 12,
      overflow: 'hidden',
    },
    heroTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    heroBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.white,
    },
    heroTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.white,
    },
    heroSubtitle: {
      fontSize: 14,
      lineHeight: 22,
      color: 'rgba(255,255,255,0.84)',
    },
    activePill: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    activePillText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.white,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    sectionSubtitle: {
      fontSize: 13,
      color: colors.subtext,
      lineHeight: 20,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      gap: 14,
    },
    infoCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 10,
    },
    infoTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    infoBody: {
      fontSize: 13,
      lineHeight: 20,
      color: colors.subtext,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    featureIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 21,
      color: colors.text,
    },
    planCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.border,
      padding: 18,
      gap: 12,
    },
    planCardFeatured: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    planTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 10,
    },
    planName: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
    },
    planDescription: {
      fontSize: 13,
      color: colors.subtext,
      lineHeight: 19,
    },
    planPrice: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
    },
    planMeta: {
      fontSize: 12,
      color: colors.subtext,
    },
    badge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.white,
    },
    tokenRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    tokenCopy: {
      flex: 1,
      gap: 4,
    },
    tokenTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    tokenBody: {
      fontSize: 13,
      color: colors.subtext,
      lineHeight: 19,
    },
    tokenMeta: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '700',
    },
    debugText: {
      fontSize: 11,
      lineHeight: 17,
      color: colors.subtext,
      fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: undefined }),
    },
    statusCard: {
      borderRadius: 18,
      padding: 16,
      gap: 8,
    },
    statusSuccess: {
      backgroundColor: colors.successLight,
    },
    statusWarning: {
      backgroundColor: colors.warningBg,
    },
    statusTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    statusBody: {
      fontSize: 13,
      lineHeight: 20,
      color: colors.text,
    },
    legalRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    legalLink: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    legalCopy: {
      fontSize: 11,
      lineHeight: 18,
      textAlign: 'center',
      color: colors.subtext,
    },
    rowBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
  });
}

function isFeaturedProduct(product: ResolvedPaywallProduct): boolean {
  const label = `${product.productKey ?? ''} ${product.title ?? ''}`.toLowerCase();
  return Boolean(product.popular || label.includes('year') || label.includes('annual') || label.includes('yıllık'));
}

interface PremiumPlanPurchaseCardProps {
  product: ResolvedPaywallProduct;
  active: boolean;
  disabled: boolean;
  isProcessing: boolean;
  disabledMessage: string;
  styles: ReturnType<typeof createStyles>;
  onPurchase: (product: ResolvedPaywallProduct) => void;
}

function PremiumPlanPurchaseCard({
  product,
  active,
  disabled,
  isProcessing,
  disabledMessage,
  styles,
  onPurchase,
}: PremiumPlanPurchaseCardProps) {
  const { t } = useTranslation();
  const trialDisplay = useTrialDisplayState(product);
  const featured = isFeaturedProduct(product);
  const revenueCatPackage = product.revenueCatPackage;
  const subscriptionPeriod = revenueCatPackage ? getSubscriptionPeriod(revenueCatPackage) : null;
  const recurringPriceText = revenueCatPackage && subscriptionPeriod
    ? t('premium.recurringPrice', {
        price: revenueCatPackage.product.priceString,
        period: t(`premium.period.${subscriptionPeriod}`),
      })
    : product.localizedPrice || product.price || '—';
  const offerText = trialDisplay.status === 'eligible'
    ? t('premium.trialMainOffer', {
        duration: trialDisplay.durationText,
        recurringPrice: trialDisplay.recurringPriceText,
      })
    : recurringPriceText;
  const ctaLabel = active
    ? t('premium.activeState')
    : trialDisplay.status === 'eligible'
      ? t('premium.startTrial')
      : t('premium.continuePremium');
  const renewalText = trialDisplay.status === 'eligible'
    ? t('premium.trialRenewalFooter', { recurringPrice: trialDisplay.recurringPriceText })
    : t('premium.standardRenewalFooter');

  return (
    <View style={[styles.planCard, featured && styles.planCardFeatured]}>
      {featured ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{product.badge || t('premium.mostPopular')}</Text>
        </View>
      ) : null}

      <View style={styles.planTopRow}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.planName}>{product.title || product.productKey}</Text>
          <Text style={styles.planDescription}>
            {product.description || t('premium.planFallbackDescription')}
          </Text>
        </View>
        <Text style={styles.planPrice}>{product.localizedPrice || product.price || '—'}</Text>
      </View>

      <Text style={styles.planMeta}>{offerText}</Text>

      <Button
        title={ctaLabel}
        onPress={() => {
          onPurchase({
            ...product,
            verifiedTrialEligible: trialDisplay.status === 'eligible',
            verifiedTrialDurationIso8601: trialDisplay.status === 'eligible'
              ? trialDisplay.durationIso8601
              : null,
          });
        }}
        disabled={disabled || active}
        loading={isProcessing}
        fullWidth
        leftIcon={PREMIUM_ICONS.purchase}
      />
      <Text style={styles.legalCopy}>{renewalText}</Text>
      {disabled && !active ? (
        <Text style={styles.sectionSubtitle}>{disabledMessage}</Text>
      ) : null}
    </View>
  );
}

export default function PremiumScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const benefitsFallback = useBenefitList();
  const paywallQuery = usePaywall();
  const premiumPurchase = usePurchasePremium();
  const tokenPurchase = usePurchaseTokenPack();
  const restorePurchases = useRestorePurchases();

  useEffect(() => {
    trackMonetizationEvent('paywall_viewed', {
      source: 'premium_screen',
    });
    trackProductEvent(ProductEventName.PAYWALL_VIEWED, {
      'paywall placement': 'premium_screen',
      'offer id': paywallQuery.subscriptionProducts[0]?.productKey ?? null,
      'offer type': paywallQuery.paywall?.trialEligible ? 'trial_or_paid' : 'paid',
      'eligibility state': paywallQuery.paywall?.trialEligible ? 'trial_eligible' : 'standard',
      'source event': 'direct_navigation',
    });
  }, []);

  const benefits = paywallQuery.paywall?.benefits?.length
    ? paywallQuery.paywall.benefits
    : benefitsFallback;

  const purchaseDisabledMessage = useMemo(() => {
    if (!isAuthenticated) {
      return t('premium.loginRequiredMessage');
    }
    if (!paywallQuery.paywall?.revenueCatEnabled) {
      return t('premium.backendDisabledMessage');
    }
    if (paywallQuery.revenueCatDisabledReason === 'missing_api_key') {
      return t('premium.apiKeyMissingMessage');
    }
    if (paywallQuery.revenueCatDisabledReason === 'unsupported_platform') {
      return t('premium.buildRequiredMessage');
    }
    if (paywallQuery.revenueCatDisabledReason === 'expo_go') {
      return t('premium.buildRequiredMessage');
    }
    if (paywallQuery.revenueCatDisabledReason === 'native_module_unavailable') {
      return t('premium.nativeModuleUnavailableMessage');
    }
    if (paywallQuery.revenueCatDisabledReason === 'offerings_unavailable') {
      return t('premium.offeringsUnavailableMessage');
    }
    if (paywallQuery.revenueCatState.error) {
      return paywallQuery.revenueCatState.error;
    }
    return t('premium.purchaseTemporarilyUnavailable');
  }, [
    isAuthenticated,
    paywallQuery.paywall?.revenueCatEnabled,
    paywallQuery.revenueCatDisabledReason,
    paywallQuery.revenueCatState.error,
    t,
  ]);

  const revenueCatDebugLines = useMemo(() => {
    if (envConfig.isProduction && !__DEV__) {
      return [];
    }
    const diagnostics = paywallQuery.revenueCatState.diagnostics;
    if (!diagnostics) {
      return [];
    }
    return [
      `Platform: ${diagnostics.platform}`,
      `App env: ${diagnostics.appEnv}`,
      `Build profile: ${diagnostics.buildProfile ?? 'unknown'}`,
      `nativeModuleAvailable: ${String(diagnostics.nativeModuleAvailable)}`,
      `applicationId: ${diagnostics.runtime.applicationId ?? 'unknown'}`,
      `expectedApplicationId: ${diagnostics.runtime.expectedApplicationId ?? 'unknown'}`,
      `nativeApplicationIdMatchesExpoConfig: ${String(diagnostics.runtime.nativeApplicationIdMatchesExpoConfig)}`,
      `hasAndroidKey: ${String(diagnostics.hasAndroidKey)}`,
      `hasIosKey: ${String(diagnostics.hasIosKey)}`,
      `selectedKeySource: ${diagnostics.selectedKeySource}`,
      `entitlementId: ${diagnostics.entitlementId}`,
      `offeringId: ${diagnostics.offeringId}`,
      `tokenOfferingId: ${diagnostics.tokenOfferingId}`,
    ];
  }, [paywallQuery.revenueCatState.diagnostics]);

  const handlePremiumPurchase = async (product: ResolvedPaywallProduct) => {
    if (!isAuthenticated) {
      router.push('/(auth)/welcome');
      return;
    }

    const result = await premiumPurchase.purchasePremium(product);
    if (result.status === 'pending_backend') {
      Alert.alert(t('premium.pendingTitle'), t('premium.pendingBody'));
    }
  };

  const handleTokenPurchase = async (product: ResolvedPaywallProduct) => {
    if (!isAuthenticated) {
      router.push('/(auth)/welcome');
      return;
    }

    const result = await tokenPurchase.purchaseTokenPack(product);
    if (result.status === 'pending_backend') {
      Alert.alert(t('premium.pendingTitle'), t('premium.pendingTokenBody'));
    }
  };

  const handleRestore = async () => {
    if (!isAuthenticated) {
      router.push('/(auth)/welcome');
      return;
    }

    const result = await restorePurchases.restorePurchases();
    if (result.status === 'success') {
      Alert.alert(t('premium.restoreSuccessTitle'), t('premium.restoreSuccessBody'));
    }
  };

  const plans = useMemo(
    () => [...paywallQuery.subscriptionProducts].sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)),
    [paywallQuery.subscriptionProducts],
  );
  const tokenProducts = useMemo(
    () => [...paywallQuery.tokenProducts].sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)),
    [paywallQuery.tokenProducts],
  );

  const isLoading = paywallQuery.isLoading && !paywallQuery.paywall;
  const isOfferingsLoading = paywallQuery.offeringsLoading;

  return (
    <SafeScreen>
      <View style={styles.container}>
        <TabHeader title={t('premium.title')} />
        <ScrollView contentContainerStyle={styles.content}>
          <LinearGradient
            colors={[colors.primary700, colors.primary, colors.gold]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroTop}>
              <View style={styles.heroBadge}>
                <Ionicons name="sparkles" size={14} color={colors.white} />
                <Text style={styles.heroBadgeText}>{t('premium.title')}</Text>
              </View>
              <BrandLogo variant="icon-transparent" size={52} rounded={false} />
            </View>

            <Text style={styles.heroTitle}>{t('premium.heroTitle')}</Text>
            <Text style={styles.heroSubtitle}>{t('premium.heroSub')}</Text>

            {paywallQuery.paywall?.premiumActive ? (
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>{t('premium.activeState')}</Text>
              </View>
            ) : null}
          </LinearGradient>

          {isLoading ? (
            <View style={styles.infoCard}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.infoBody}>{t('premium.loadingBody')}</Text>
            </View>
          ) : null}

          {!isLoading && paywallQuery.error && !paywallQuery.paywall ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>{t('premium.errorTitle')}</Text>
              <Text style={styles.infoBody}>{t('premium.errorBody')}</Text>
              <Button title={t('premium.retry')} onPress={() => void paywallQuery.refresh()} />
            </View>
          ) : null}

          {!isAuthenticated ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>{t('premium.loginRequiredTitle')}</Text>
              <Text style={styles.infoBody}>{t('premium.loginRequiredMessage')}</Text>
              <Button title={t('premium.loginRequiredCta')} onPress={() => router.push('/(auth)/welcome')} />
            </View>
          ) : null}

          {paywallQuery.paywall?.premiumActive ? (
            <View style={[styles.statusCard, styles.statusSuccess]}>
              <Text style={styles.statusTitle}>{t('premium.activeTitle')}</Text>
              <Text style={styles.statusBody}>
                {paywallQuery.paywall.currentPeriodEndsAt
                  ? t('premium.activeUntilBody', { date: paywallQuery.paywall.currentPeriodEndsAt })
                  : t('premium.activeGenericBody')}
              </Text>
            </View>
          ) : null}

          {premiumPurchase.status === 'pending_backend' || tokenPurchase.status === 'pending_backend' ? (
            <View style={[styles.statusCard, styles.statusWarning]}>
              <Text style={styles.statusTitle}>{t('premium.pendingTitle')}</Text>
              <Text style={styles.statusBody}>
                {tokenPurchase.status === 'pending_backend'
                  ? t('premium.pendingTokenBody')
                  : t('premium.pendingBody')}
              </Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('premium.featuresTitle')}</Text>
            {benefits.map((benefit, index) => (
              <View key={`${benefit}-${index}`} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Ionicons name="checkmark" size={14} color={colors.primary} />
                </View>
                <Text style={styles.featureText}>{benefit}</Text>
              </View>
            ))}
          </View>

          <View style={{ gap: 12 }}>
            <Text style={styles.sectionTitle}>{t('premium.selectPlan')}</Text>
            {plans.length === 0 ? (
              isOfferingsLoading ? (
                <View style={styles.infoCard}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : (
                <View style={styles.infoCard}>
                  <Text style={styles.infoTitle}>{t('premium.noPlansTitle')}</Text>
                  <Text style={styles.infoBody}>{purchaseDisabledMessage}</Text>
                  {revenueCatDebugLines.map((line) => (
                    <Text key={line} style={styles.debugText}>{line}</Text>
                  ))}
                </View>
              )
            ) : (
              plans.map((product) => {
                const disabled = !paywallQuery.canPurchasePremium || !product.availableForPurchase || premiumPurchase.isProcessing;

                return (
                  <PremiumPlanPurchaseCard
                    key={product.productKey}
                    product={product}
                    active={Boolean(paywallQuery.paywall?.premiumActive)}
                    disabled={disabled}
                    isProcessing={premiumPurchase.isProcessing}
                    disabledMessage={purchaseDisabledMessage}
                    styles={styles}
                    onPurchase={(selectedProduct) => {
                      void handlePremiumPurchase(selectedProduct);
                    }}
                  />
                );
              })
            )}
          </View>

          {paywallQuery.paywall?.tokenPurchaseEnabled ? (
            <View style={{ gap: 12 }}>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>{t('monetization.storeTitle')}</Text>
                <Text style={styles.sectionSubtitle}>
                  {t('premium.tokenBalanceLabel', { count: paywallQuery.paywall?.tokenBalance ?? 0 })}
                </Text>
              </View>

              {tokenProducts.map((product) => (
                <View key={product.productKey} style={styles.card}>
                  <View style={styles.tokenRow}>
                    <View style={styles.tokenCopy}>
                      <Text style={styles.tokenTitle}>{product.title || product.productKey}</Text>
                      <Text style={styles.tokenBody}>
                        {product.description || t('monetization.packageFallbackDescription', { count: product.tokenAmount ?? 0 })}
                      </Text>
                      <Text style={styles.tokenMeta}>
                        {product.localizedPrice || product.price || '—'}
                      </Text>
                    </View>
                    <Button
                      title={t('premium.buyTokens')}
                      onPress={() => {
                        void handleTokenPurchase(product);
                      }}
                      disabled={!paywallQuery.canPurchaseTokens || !product.availableForPurchase || tokenPurchase.isProcessing}
                      loading={tokenPurchase.isProcessing}
                      leftIcon={PREMIUM_ICONS.purchase}
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.infoCard}>
            <Button
              title={t('premium.restorePurchases')}
              onPress={() => {
                void handleRestore();
              }}
              loading={restorePurchases.isProcessing}
              fullWidth
              leftIcon={PREMIUM_ICONS.restore}
            />

            <View style={styles.legalRow}>
              <TouchableOpacity onPress={() => router.push('/terms')}>
                <Text style={styles.legalLink}>{t('premium.termsLink')}</Text>
              </TouchableOpacity>
              <Text style={styles.legalCopy}>•</Text>
              <TouchableOpacity onPress={() => router.push('/privacy')}>
                <Text style={styles.legalLink}>{t('premium.privacyLink')}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.legalCopy}>{t('premium.legalText')}</Text>
          </View>
        </ScrollView>
      </View>
    </SafeScreen>
  );
}
