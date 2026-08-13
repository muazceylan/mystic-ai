import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { ClipPath, Defs, Polygon, Image as SvgImage } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { TYPOGRAPHY, SPACING, RADIUS, ACCESSIBILITY } from '../../../constants/tokens';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { PREMIUM_ICONS } from '../../../constants/icons';
import { useGuruWalletStore } from '../store/useGuruWalletStore';
import { MonetizationEvents } from '../analytics/monetizationAnalytics';
import { usePaywall } from '../hooks/usePaywall';
import { usePurchaseTokenPack } from '../hooks/usePurchaseTokenPack';
import type { ResolvedPaywallProduct } from '../types/billing';
import type { PaywallProduct } from '../types';

interface PurchaseCatalogSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

type GuruPackagePresentation = {
  title: string;
  amountLabel: string;
  description: string;
  badge?: string;
};

type GuruCatalogProduct = GuruPackagePresentation & {
  key: string;
  amount: number;
  price?: string | null;
  campaignLabel?: string | null;
  resolvedProduct?: ResolvedPaywallProduct;
  availableForPurchase: boolean;
  highlighted: boolean;
};

const STORE_COLORS = {
  pageBg: '#FAF7FF',
  deepPurple: '#1B0738',
  purple900: '#2B0A57',
  purple800: '#3B0F74',
  purple700: '#5B21B6',
  purple600: '#7C3AED',
  purple500: '#A855F7',
  lavender: '#F3E8FF',
  lavenderSoft: '#F8F3FF',
  border: 'rgba(124,58,237,0.18)',
  borderStrong: 'rgba(168,85,247,0.42)',
  textPrimary: '#1F1733',
  textSecondary: '#7A718A',
  white: '#FFFFFF',
  disabledText: '#A49AB6',
} as const;

const FALLBACK_TOKEN_AMOUNTS = [50, 150];

function normalizeProductId(value: string | null | undefined): string {
  return (value ?? '').trim().split(':', 1)[0].toLowerCase();
}

function resolveProductAmount(product: PaywallProduct): number {
  const directAmount = (product.tokenAmount ?? 0) + (product.bonusTokenAmount ?? 0);
  if (directAmount > 0) {
    return directAmount;
  }

  const ids = [
    product.productKey,
    product.revenueCatProductId,
    product.iosProductId,
    product.androidProductId,
  ].map(normalizeProductId);

  for (const id of ids) {
    const match = id.match(/(?:^|_)(50|150|500|1200)(?:_|$)/);
    if (match?.[1]) {
      return Number(match[1]);
    }
  }

  return 0;
}

function resolvePresentation(
  amount: number,
  presentationByAmount: Record<number, GuruPackagePresentation>,
  product?: PaywallProduct,
): GuruPackagePresentation {
  const known = presentationByAmount[amount];
  if (known) {
    return known;
  }

  const fallbackTitle = amount > 0
    ? `${amount} Guru Token`
    : product?.title || product?.productKey || 'Guru Token';
  const fallbackAmount = amount > 0
    ? `${amount} Guru`
    : product?.title || 'Guru';

  return {
    title: product?.title || fallbackTitle,
    amountLabel: fallbackAmount,
    description: product?.description || 'Premium yorumlar için Guru bakiyeni güvenle yükselt.',
    badge: product?.badge ?? undefined,
  };
}

function toCatalogProduct(
  product: ResolvedPaywallProduct,
  presentationByAmount: Record<number, GuruPackagePresentation>,
): GuruCatalogProduct {
  const amount = resolveProductAmount(product);
  const presentation = resolvePresentation(amount, presentationByAmount, product);

  return {
    ...presentation,
    key: product.productKey,
    amount,
    price: product.localizedPrice || product.price,
    campaignLabel: product.campaignLabel,
    resolvedProduct: product,
    availableForPurchase: product.availableForPurchase,
    highlighted: amount === 150 || Boolean(product.popular),
  };
}

function toFallbackCatalogProduct(
  amount: number,
  presentationByAmount: Record<number, GuruPackagePresentation>,
  product?: PaywallProduct,
): GuruCatalogProduct {
  const resolvedAmount = product ? resolveProductAmount(product) || amount : amount;
  const presentation = resolvePresentation(resolvedAmount, presentationByAmount, product);

  return {
    ...presentation,
    key: product?.productKey || `fallback_guru_${resolvedAmount}`,
    amount: resolvedAmount,
    price: product?.price,
    campaignLabel: product?.campaignLabel,
    availableForPurchase: false,
    highlighted: resolvedAmount === 150 || Boolean(product?.popular),
  };
}

function buildFallbackProducts(
  paywallProducts: PaywallProduct[] | undefined,
  presentationByAmount: Record<number, GuruPackagePresentation>,
): GuruCatalogProduct[] {
  if (paywallProducts?.length) {
    return paywallProducts
      .slice()
      .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
      .map((product, index) =>
        toFallbackCatalogProduct(FALLBACK_TOKEN_AMOUNTS[index] ?? 0, presentationByAmount, product));
  }

  return FALLBACK_TOKEN_AMOUNTS.map((amount) =>
    toFallbackCatalogProduct(amount, presentationByAmount));
}

function formatPurchaseTitle(price: string | null | undefined, buyLabel: string): string {
  return price ? `${price} ${buyLabel}` : buyLabel;
}

export function PurchaseCatalogSheet({ visible, onDismiss }: PurchaseCatalogSheetProps) {
  const { t } = useTranslation();
  const s = styles;
  const balance = useGuruWalletStore((state) => state.getBalance());
  const {
    paywall,
    tokenProducts,
    canPurchaseTokens,
    revenueCatDisabledReason,
    offeringsLoading,
    isLoading: paywallLoading,
  } = usePaywall();
  const purchaseTokenPack = usePurchaseTokenPack();
  const trackedRef = useRef(false);
  const [purchasingKey, setPurchasingKey] = useState<string | null>(null);

  const products = useMemo(
    () => [...tokenProducts].sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)),
    [tokenProducts],
  );
  const isPurchaseEnabled = canPurchaseTokens && Boolean(paywall?.tokenPurchaseEnabled);
  const isInitialLoading = (paywallLoading || offeringsLoading) && products.length === 0;

  const presentationByAmount = useMemo<Record<number, GuruPackagePresentation>>(() => ({
    50: {
      title: t('monetization.package50Title'),
      amountLabel: t('monetization.package50Amount'),
      description: t('monetization.package50Description'),
    },
    150: {
      title: t('monetization.package150Title'),
      amountLabel: t('monetization.package150Amount'),
      description: t('monetization.package150Description'),
      badge: t('monetization.popularBadge'),
    },
    500: {
      title: t('monetization.package500Title'),
      amountLabel: t('monetization.package500Amount'),
      description: t('monetization.package500Description'),
    },
    1200: {
      title: t('monetization.package1200Title'),
      amountLabel: t('monetization.package1200Amount'),
      description: t('monetization.package1200Description'),
    },
  }), [t]);

  const catalogProducts = useMemo(() => {
    if (products.length > 0) {
      return products.map((product) => toCatalogProduct(product, presentationByAmount));
    }

    if (isInitialLoading) {
      return [];
    }

    return buildFallbackProducts(paywall?.tokenProducts, presentationByAmount);
  }, [isInitialLoading, paywall?.tokenProducts, presentationByAmount, products]);

  const showStoreStatus = !isInitialLoading && (
    !isPurchaseEnabled
    || catalogProducts.length === 0
    || revenueCatDisabledReason === 'offerings_unavailable'
  );

  useEffect(() => {
    if (visible && !trackedRef.current) {
      MonetizationEvents.purchaseCatalogViewed();
      trackedRef.current = true;
    }
    if (!visible) {
      trackedRef.current = false;
      setPurchasingKey(null);
    }
  }, [visible]);

  const handlePurchase = async (product: ResolvedPaywallProduct) => {
    if (!isPurchaseEnabled || purchasingKey || !product.availableForPurchase) return;

    const totalGuru = (product.tokenAmount ?? 0) + (product.bonusTokenAmount ?? 0);
    try {
      setPurchasingKey(product.productKey);
      MonetizationEvents.purchaseClicked(product.productKey, product.localizedPrice ?? product.price ?? undefined);

      const result = await purchaseTokenPack.purchaseTokenPack(product);
      if (result.status === 'success') {
        onDismiss();
        Alert.alert(
          t('monetization.packageAddedTitle'),
          t('monetization.packageAddedBody', { count: totalGuru }),
        );
        return;
      }

      if (result.status === 'pending_backend') {
        Alert.alert(
          t('premium.pendingTitle'),
          t('premium.pendingTokenBody'),
        );
        return;
      }

      if (result.status === 'cancelled') {
        return;
      }
    } catch {
      Alert.alert(
        t('monetization.purchaseFailedTitle'),
        t('monetization.purchaseFailedBody'),
      );
    } finally {
      setPurchasingKey(null);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onDismiss} dragHandleOnly>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        directionalLockEnabled
      >
        <GuruStoreHeader onBack={onDismiss} title={t('monetization.storeTitle')} />
        <GuruBalanceHeroCard
          balance={balance}
          eyebrow={t('monetization.storeEyebrow')}
          title={t('monetization.storeTitle')}
          subtitle={t('monetization.storeSubtitle')}
          balanceLabel={t('monetization.balance')}
        />

        {isInitialLoading ? (
          <StoreLoadingCard
            title={t('monetization.storeLoadingTitle')}
            body={t('monetization.storeLoadingBody')}
          />
        ) : null}

        {showStoreStatus ? (
          <StoreStatusCard
            title={t('monetization.storeUnavailableTitle')}
            body={t('monetization.storeUnavailableBody')}
          />
        ) : null}

        {isInitialLoading ? (
          <>
            <ProductSkeletonCard />
            <ProductSkeletonCard featured />
          </>
        ) : (
          catalogProducts.map((product) => {
            const isProcessing = purchasingKey === product.key;
            const hasActivePurchase = Boolean(purchasingKey) || purchaseTokenPack.isProcessing;
            const isDisabled = !isPurchaseEnabled
              || !product.availableForPurchase
              || isProcessing
              || hasActivePurchase;

            return (
              <GuruProductCard
                key={product.key}
                product={product}
                buyLabel={formatPurchaseTitle(product.price, t('monetization.buy'))}
                disabled={isDisabled}
                storeDisabled={!isPurchaseEnabled || !product.availableForPurchase}
                loading={isProcessing}
                onPress={() => {
                  if (product.resolvedProduct) {
                    void handlePurchase(product.resolvedProduct);
                  }
                }}
              />
            );
          })
        )}

        <PurchaseTrustCard
          title={t('monetization.trustTitle')}
          body={t('monetization.trustBody')}
        />
      </ScrollView>
    </BottomSheet>
  );
}

function GuruStoreHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const s = styles;

  return (
    <LinearGradient
      colors={[STORE_COLORS.deepPurple, STORE_COLORS.purple900, STORE_COLORS.purple800] as const}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.storeHeader}
    >
      <CosmicDecor />
      <TouchableOpacity
        style={s.backButton}
        onPress={onBack}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel="Geri"
      >
        <Ionicons name="chevron-back" size={24} color={STORE_COLORS.white} />
      </TouchableOpacity>

      <Text
        style={s.headerTitle}
        maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {title}
      </Text>
      <View style={s.headerSpacer} />
    </LinearGradient>
  );
}

function GuruBalanceHeroCard({
  balance,
  eyebrow,
  title,
  subtitle,
  balanceLabel,
}: {
  balance: number;
  eyebrow: string;
  title: string;
  subtitle: string;
  balanceLabel: string;
}) {
  const s = styles;

  return (
    <LinearGradient
      colors={[STORE_COLORS.purple900, STORE_COLORS.purple800, STORE_COLORS.deepPurple] as const}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.heroCard}
    >
      <CosmicDecor compact />

      <View style={s.heroCopy}>
        <Text
          style={s.heroEyebrow}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          numberOfLines={1}
        >
          {eyebrow}
        </Text>
        <Text
          style={s.heroTitle}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          numberOfLines={2}
        >
          {title}
        </Text>
        <Text
          style={s.heroSubtitle}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          {subtitle}
        </Text>
      </View>

      <View style={s.heroRight}>
        <HexSplashBadge />
        <View style={s.heroBalancePill}>
          <Text
            style={s.heroBalanceLabel}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            numberOfLines={1}
          >
            {balanceLabel}
          </Text>
          <Text
            style={s.heroBalanceValue}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {balance} Guru
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function StoreLoadingCard({ title, body }: { title: string; body: string }) {
  const s = styles;

  return (
    <View style={s.statusCard}>
      <View style={s.statusIconShell}>
        <ActivityIndicator color={STORE_COLORS.purple700} />
      </View>
      <View style={s.statusCopy}>
        <Text style={s.statusTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
          {title}
        </Text>
        <Text style={s.statusBody} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
          {body}
        </Text>
      </View>
    </View>
  );
}

function StoreStatusCard({ title, body }: { title: string; body: string }) {
  const s = styles;

  return (
    <View style={s.statusCard}>
      <LinearGradient
        colors={['#F5E9FF', '#FFFFFF'] as const}
        style={s.statusIconShell}
      >
        <Ionicons name="cloud-offline-outline" size={32} color={STORE_COLORS.purple700} />
        <Ionicons name="sparkles" size={13} color={STORE_COLORS.purple600} style={s.statusSparkle} />
      </LinearGradient>
      <View style={s.statusCopy}>
        <Text style={s.statusTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
          {title}
        </Text>
        <Text style={s.statusBody} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
          {body}
        </Text>
      </View>
    </View>
  );
}

function GuruProductCard({
  product,
  buyLabel,
  disabled,
  storeDisabled,
  loading,
  onPress,
}: {
  product: GuruCatalogProduct;
  buyLabel: string;
  disabled: boolean;
  storeDisabled: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  const s = styles;

  return (
    <View
      style={[
        s.productCard,
        product.highlighted && s.productCardFeatured,
        storeDisabled && s.productCardDisabled,
      ]}
    >
      <View style={s.productMain}>
        <TokenCoinIcon featured={product.highlighted} />

        <View style={s.productCopy}>
          {product.badge ? (
            <LinearGradient
              colors={[STORE_COLORS.purple500, STORE_COLORS.purple600, STORE_COLORS.purple700] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.productBadge}
            >
              <Ionicons name="star" size={11} color={STORE_COLORS.white} />
              <Text style={s.productBadgeText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                {product.badge}
              </Text>
            </LinearGradient>
          ) : null}
          <Text
            style={s.productTitle}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            numberOfLines={2}
          >
            {product.title}
          </Text>
          <Text
            style={s.productAmount}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {product.amountLabel}
          </Text>
          <Text
            style={s.productDescription}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {product.description}
          </Text>
        </View>
      </View>

      {product.campaignLabel ? (
        <Text
          style={s.productCampaign}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          numberOfLines={2}
        >
          {product.campaignLabel}
        </Text>
      ) : null}

      <PurchaseGradientButton
        title={buyLabel}
        disabled={disabled}
        loading={loading}
        onPress={onPress}
      />
    </View>
  );
}

function TokenCoinIcon({ featured }: { featured?: boolean }) {
  const s = styles;

  return (
    <View style={s.coinStage}>
      <View style={s.coinShadow} />
      <LinearGradient
        colors={featured
          ? ['#E9C7FF', '#8B5CF6', '#4C1D95'] as const
          : ['#F2D7FF', '#A855F7', '#5B21B6'] as const}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.coin}
      >
        <View style={s.coinInset}>
          <Ionicons name="sparkles" size={30} color={STORE_COLORS.white} />
        </View>
      </LinearGradient>
      <Ionicons name="sparkles" size={13} color={STORE_COLORS.purple500} style={s.coinSparkleLeft} />
      <Ionicons name="sparkles" size={10} color={STORE_COLORS.purple500} style={s.coinSparkleRight} />
    </View>
  );
}

function PurchaseGradientButton({
  title,
  disabled,
  loading,
  onPress,
}: {
  title: string;
  disabled: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  const s = styles;
  const content = loading ? (
    <ActivityIndicator color={disabled ? STORE_COLORS.disabledText : STORE_COLORS.white} />
  ) : (
    <>
      <Ionicons
        name={PREMIUM_ICONS.purchase}
        size={20}
        color={disabled ? STORE_COLORS.disabledText : STORE_COLORS.white}
      />
      <Text
        style={[s.purchaseButtonText, disabled && s.purchaseButtonTextDisabled]}
        maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {title}
      </Text>
    </>
  );

  if (disabled) {
    return (
      <TouchableOpacity
        style={[s.purchaseButton, s.purchaseButtonDisabled]}
        disabled
        accessibilityRole="button"
        accessibilityState={{ disabled: true, busy: loading }}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: false, busy: loading }}
    >
      <LinearGradient
        colors={['#C084FC', '#8B5CF6', '#5B21B6'] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.purchaseButton}
      >
        {content}
      </LinearGradient>
    </TouchableOpacity>
  );
}

function PurchaseTrustCard({ title, body }: { title: string; body: string }) {
  const s = styles;

  return (
    <View style={s.trustCard}>
      <View style={s.trustIconShell}>
        <Ionicons name="shield-checkmark" size={22} color={STORE_COLORS.purple700} />
      </View>
      <View style={s.trustCopy}>
        <Text style={s.trustTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
          {title}
        </Text>
        <Text style={s.trustBody} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
          {body}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#8A829A" />
    </View>
  );
}

function ProductSkeletonCard({ featured }: { featured?: boolean }) {
  const s = styles;

  return (
    <View style={[s.productCard, featured && s.productCardFeatured]}>
      <View style={s.productMain}>
        <View style={[s.skeletonCoin, s.skeletonBlock]} />
        <View style={s.skeletonCopy}>
          <View style={[s.skeletonTitle, s.skeletonBlock]} />
          <View style={[s.skeletonAmount, s.skeletonBlock]} />
          <View style={[s.skeletonLine, s.skeletonBlock]} />
          <View style={[s.skeletonLineShort, s.skeletonBlock]} />
        </View>
      </View>
      <View style={[s.skeletonButton, s.skeletonBlock]} />
    </View>
  );
}

function HexSplashBadge() {
  const s = styles;
  return (
    <View style={s.hexBadgeWrap}>
      <Svg width={70} height={70} viewBox="0 0 70 70">
        <Defs>
          <ClipPath id="hexClip">
            <Polygon points="35,2 63,18.5 63,51.5 35,68 7,51.5 7,18.5" />
          </ClipPath>
        </Defs>
        {/* Görsel altıgeni doldurur */}
        <SvgImage
          href={require('../../../../assets/splash-icon.png')}
          x={0}
          y={0}
          width={70}
          height={70}
          preserveAspectRatio="xMidYMid slice"
          clipPath="url(#hexClip)"
        />
        {/* Premium kenarlık stroke üstte */}
        <Polygon
          points="35,2 63,18.5 63,51.5 35,68 7,51.5 7,18.5"
          fill="none"
          stroke="rgba(255,255,255,0.38)"
          strokeWidth={2}
        />
      </Svg>
    </View>
  );
}

function CosmicDecor({ compact = false }: { compact?: boolean }) {
  const s = styles;
  const stars: Array<ViewStyle> = compact
    ? [s.starOne, s.starThree, s.starFive]
    : [s.starOne, s.starTwo, s.starThree, s.starFour, s.starFive];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {stars.map((style, index) => (
        <View key={index} style={[s.starDot, style]} />
      ))}
      <View style={s.orbitLine} />
      <View style={s.orbitLineAlt} />
    </View>
  );
}

const styles = StyleSheet.create({
    scrollContent: {
      paddingBottom: SPACING.xl,
      gap: SPACING.lg,
      backgroundColor: STORE_COLORS.pageBg,
    },
    storeHeader: {
      borderRadius: 28,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.lgXl,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.28)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      overflow: 'hidden',
      shadowColor: STORE_COLORS.purple700,
      shadowOpacity: 0.28,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 14 },
      elevation: 8,
    },
    backButton: {
      width: 54,
      height: 54,
      borderRadius: 27,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.10)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.16)',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 20,
      lineHeight: 26,
      fontWeight: '800',
      color: STORE_COLORS.white,
    },
    headerSpacer: {
      width: 54,
      height: 54,
    },
    heroCard: {
      marginTop: 0,
      minHeight: 198,
      borderRadius: 28,
      padding: SPACING.lgXl,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.28)',
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.lg,
      shadowColor: STORE_COLORS.purple700,
      shadowOpacity: 0.28,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 14 },
      elevation: 8,
    },
    heroRight: {
      alignItems: 'center',
      gap: SPACING.sm,
    },
    hexBadgeWrap: {
      width: 70,
      height: 70,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hexSplashIcon: {
      width: 38,
      height: 38,
    },
    heroCopy: {
      flex: 1,
      minWidth: 0,
    },
    heroEyebrow: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '800',
      color: '#D7A7FF',
      textTransform: 'uppercase',
      marginBottom: 5,
    },
    heroTitle: {
      fontSize: 29,
      lineHeight: 34,
      fontWeight: '800',
      color: STORE_COLORS.white,
      marginBottom: 6,
    },
    heroSubtitle: {
      fontSize: 16,
      lineHeight: 23,
      color: 'rgba(255,255,255,0.78)',
    },
    heroBalancePill: {
      minWidth: 104,
      borderRadius: 20,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.13)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
    },
    heroBalanceLabel: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '800',
      color: 'rgba(255,255,255,0.64)',
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    heroBalanceValue: {
      fontSize: 21,
      lineHeight: 27,
      fontWeight: '800',
      color: STORE_COLORS.white,
      textAlign: 'center',
    },
    statusCard: {
      borderRadius: 24,
      padding: SPACING.lg,
      backgroundColor: 'rgba(255,255,255,0.86)',
      borderWidth: 1,
      borderColor: STORE_COLORS.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.lg,
      shadowColor: STORE_COLORS.purple700,
      shadowOpacity: 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    statusIconShell: {
      width: 76,
      height: 76,
      borderRadius: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(168,85,247,0.22)',
      backgroundColor: STORE_COLORS.lavenderSoft,
    },
    statusSparkle: {
      position: 'absolute',
      top: 16,
      right: 14,
    },
    statusCopy: {
      flex: 1,
      gap: 4,
    },
    statusTitle: {
      ...TYPOGRAPHY.H3,
      color: STORE_COLORS.textPrimary,
      fontWeight: '800',
    },
    statusBody: {
      ...TYPOGRAPHY.BodyMid,
      color: STORE_COLORS.textSecondary,
      lineHeight: 23,
    },
    productCard: {
      borderRadius: 26,
      padding: SPACING.lg,
      backgroundColor: 'rgba(255,255,255,0.94)',
      borderWidth: 1,
      borderColor: STORE_COLORS.border,
      gap: SPACING.md,
      overflow: 'hidden',
      shadowColor: STORE_COLORS.purple700,
      shadowOpacity: 0.10,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    productCardFeatured: {
      borderColor: STORE_COLORS.borderStrong,
      shadowOpacity: 0.16,
      shadowRadius: 20,
    },
    productCardDisabled: {
      opacity: 0.82,
    },
    productMain: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.lg,
    },
    coinStage: {
      width: 114,
      height: 114,
      alignItems: 'center',
      justifyContent: 'center',
    },
    coinShadow: {
      position: 'absolute',
      bottom: 13,
      width: 86,
      height: 18,
      borderRadius: 999,
      backgroundColor: 'rgba(124,58,237,0.18)',
      transform: [{ scaleX: 1.18 }],
    },
    coin: {
      width: 74,
      height: 74,
      borderRadius: 37,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.58)',
      transform: [{ rotate: '-9deg' }],
      shadowColor: STORE_COLORS.purple700,
      shadowOpacity: 0.28,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 5,
    },
    coinInset: {
      width: 54,
      height: 54,
      borderRadius: 27,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.56)',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    coinSparkleLeft: {
      position: 'absolute',
      top: 20,
      left: 8,
    },
    coinSparkleRight: {
      position: 'absolute',
      top: 24,
      right: 13,
    },
    productCopy: {
      flex: 1,
      minWidth: 0,
      gap: 6,
    },
    productTitle: {
      fontSize: 21,
      lineHeight: 27,
      fontWeight: '800',
      color: STORE_COLORS.textPrimary,
    },
    productAmount: {
      fontSize: 38,
      lineHeight: 44,
      color: STORE_COLORS.purple700,
      fontWeight: '800',
    },
    productDescription: {
      fontSize: 15,
      lineHeight: 22,
      color: STORE_COLORS.textSecondary,
    },
    productBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      shadowColor: STORE_COLORS.purple700,
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    productBadgeText: {
      ...TYPOGRAPHY.CaptionBold,
      color: STORE_COLORS.white,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    productCampaign: {
      ...TYPOGRAPHY.Caption,
      color: STORE_COLORS.purple700,
      lineHeight: 18,
    },
    purchaseButton: {
      width: '100%',
      minHeight: 56,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.md,
      paddingHorizontal: SPACING.lg,
      shadowColor: STORE_COLORS.purple700,
      shadowOpacity: 0.20,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    purchaseButtonDisabled: {
      backgroundColor: STORE_COLORS.lavender,
      borderWidth: 1,
      borderColor: STORE_COLORS.border,
      shadowOpacity: 0,
      elevation: 0,
    },
    purchaseButtonText: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '800',
      color: STORE_COLORS.white,
      textAlign: 'center',
    },
    purchaseButtonTextDisabled: {
      color: STORE_COLORS.disabledText,
    },
    trustCard: {
      borderRadius: 20,
      padding: SPACING.md,
      backgroundColor: 'rgba(255,255,255,0.76)',
      borderWidth: 1,
      borderColor: 'rgba(31,23,51,0.08)',
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
    },
    trustIconShell: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: STORE_COLORS.lavender,
    },
    trustCopy: {
      flex: 1,
      gap: 2,
    },
    trustTitle: {
      ...TYPOGRAPHY.SmallBold,
      color: STORE_COLORS.textPrimary,
      fontWeight: '800',
    },
    trustBody: {
      ...TYPOGRAPHY.Small,
      color: STORE_COLORS.textSecondary,
      lineHeight: 20,
    },
    skeletonBlock: {
      backgroundColor: Platform.select({
        ios: 'rgba(168,85,247,0.12)',
        android: 'rgba(168,85,247,0.14)',
        default: 'rgba(168,85,247,0.12)',
      }),
    },
    skeletonCoin: {
      width: 94,
      height: 94,
      borderRadius: 47,
    },
    skeletonCopy: {
      flex: 1,
      gap: SPACING.sm,
    },
    skeletonTitle: {
      width: '78%',
      height: 22,
      borderRadius: RADIUS.full,
    },
    skeletonAmount: {
      width: '64%',
      height: 38,
      borderRadius: RADIUS.full,
    },
    skeletonLine: {
      width: '100%',
      height: 14,
      borderRadius: RADIUS.full,
    },
    skeletonLineShort: {
      width: '70%',
      height: 14,
      borderRadius: RADIUS.full,
    },
    skeletonButton: {
      height: 56,
      borderRadius: 20,
    },
    starDot: {
      position: 'absolute',
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: 'rgba(216,180,254,0.86)',
    },
    starOne: {
      left: '8%',
      top: '26%',
    },
    starTwo: {
      right: '9%',
      top: '20%',
      width: 3,
      height: 3,
      borderRadius: 1.5,
    },
    starThree: {
      right: '21%',
      bottom: '22%',
    },
    starFour: {
      left: '24%',
      bottom: '18%',
      width: 3,
      height: 3,
      borderRadius: 1.5,
    },
    starFive: {
      right: '38%',
      top: '44%',
      width: 2,
      height: 2,
      borderRadius: 1,
      backgroundColor: 'rgba(255,255,255,0.78)',
    },
    orbitLine: {
      position: 'absolute',
      right: -28,
      top: 16,
      width: 156,
      height: 156,
      borderRadius: 78,
      borderWidth: 1,
      borderColor: 'rgba(168,85,247,0.20)',
      transform: [{ rotate: '-24deg' }],
    },
    orbitLineAlt: {
      position: 'absolute',
      right: -52,
      top: 34,
      width: 180,
      height: 94,
      borderRadius: 90,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
      transform: [{ rotate: '-18deg' }],
    },
});
