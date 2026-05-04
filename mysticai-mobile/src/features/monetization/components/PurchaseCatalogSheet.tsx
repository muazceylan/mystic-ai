import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import i18n from 'i18next';
import { useTranslation } from 'react-i18next';
import { useTheme, ThemeColors } from '../../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS, ACCESSIBILITY } from '../../../constants/tokens';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { Button } from '../../../components/ui/Button';
import { BrandBadge } from '../../../components/ui/BrandLogo';
import { PREMIUM_ICONS } from '../../../constants/icons';
import { useGuruWalletStore } from '../store/useGuruWalletStore';
import { MonetizationEvents } from '../analytics/monetizationAnalytics';
import { usePaywall } from '../hooks/usePaywall';
import { usePurchaseTokenPack } from '../hooks/usePurchaseTokenPack';
import type { ResolvedPaywallProduct } from '../types/billing';

interface PurchaseCatalogSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

export function PurchaseCatalogSheet({ visible, onDismiss }: PurchaseCatalogSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = createStyles(colors);
  const balance = useGuruWalletStore((state) => state.getBalance());
  const { paywall, tokenProducts, canPurchaseTokens, revenueCatDisabledReason } = usePaywall();
  const purchaseTokenPack = usePurchaseTokenPack();
  const trackedRef = useRef(false);
  const [purchasingKey, setPurchasingKey] = useState<string | null>(null);

  const products = useMemo(
    () => [...tokenProducts].sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)),
    [tokenProducts],
  );
  const isPurchaseEnabled = canPurchaseTokens && Boolean(paywall?.tokenPurchaseEnabled);

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
    if (!isPurchaseEnabled || purchasingKey) return;

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

  const renderHeader = () => (
    <View style={s.heroCard}>
      <View style={s.heroBrandRow}>
        <BrandBadge variant="icon-transparent" size={36} />
      </View>

      <View style={s.heroBadge}>
        <Ionicons name="sparkles" size={14} color={colors.primary} />
        <Text
          style={s.heroBadgeText}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          {t('monetization.storeEyebrow')}
        </Text>
      </View>

      <View style={s.heroTopRow}>
        <View style={s.heroCopy}>
          <Text
            style={s.heroTitle}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {t('monetization.storeTitle')}
          </Text>
          <Text
            style={s.heroSubtitle}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {t('monetization.storeSubtitle')}
          </Text>
        </View>

        <View style={s.heroBalancePill}>
          <Text
            style={s.heroBalanceLabel}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {t('monetization.balance')}
          </Text>
          <Text
            style={s.heroBalanceValue}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {balance} Guru
          </Text>
        </View>
      </View>
    </View>
  );

  const renderProduct = ({ item }: { item: ResolvedPaywallProduct }) => {
    const totalGuru = (item.tokenAmount ?? 0) + (item.bonusTokenAmount ?? 0);
    const isProcessing = purchasingKey === item.productKey;

    return (
      <TouchableOpacity
        style={s.productShell}
        onPress={() => {
          void handlePurchase(item);
        }}
        activeOpacity={0.93}
        disabled={isProcessing || !isPurchaseEnabled}
        accessibilityRole="button"
        accessibilityLabel={`${item.title} ${totalGuru} Guru`}
      >
        <View style={s.productCard}>
          <View style={s.productTopRow}>
            <View style={s.productTokenWrap}>
              <Ionicons name="sparkles" size={16} color={colors.primary} />
            </View>

            <View style={s.productCopy}>
              <View style={s.productTitleRow}>
                <Text
                  style={s.productTitle}
                  maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                {item.badge ? (
                  <View style={s.productBadge}>
                    <Text
                      style={s.productBadgeText}
                      maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                    >
                      {item.badge}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text
                style={s.productAmount}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              >
                {totalGuru} Guru
              </Text>

              <Text
                style={s.productSupportText}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                numberOfLines={2}
              >
                {(item.bonusTokenAmount ?? 0) > 0
                  ? t('monetization.bonusGuru', { count: item.bonusTokenAmount ?? 0 })
                  : item.description || t('monetization.packageFallbackDescription', { count: item.tokenAmount ?? 0 })}
              </Text>
            </View>
          </View>

          {item.campaignLabel ? (
            <Text
              style={s.productCampaign}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              numberOfLines={2}
            >
              {item.campaignLabel}
            </Text>
          ) : null}

          <Button
            title={item.localizedPrice || item.price || t('monetization.buy')}
            onPress={() => {
              void handlePurchase(item);
            }}
            leftIcon={PREMIUM_ICONS.purchase}
            size="md"
            style={s.purchaseButton}
            loading={isProcessing}
            disabled={!isPurchaseEnabled || isProcessing || !item.availableForPurchase}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onDismiss} title={t('monetization.storeTitle')}>
      {!isPurchaseEnabled ? (
        <View style={s.noticeCard}>
          <Text
            style={s.noticeTitle}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {t('monetization.purchaseDisabledTitle')}
          </Text>
          <Text
            style={s.noticeText}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {revenueCatDisabledReason === 'offerings_unavailable'
              ? t('premium.offeringsUnavailableMessage')
              : t('monetization.purchaseDisabledBody')}
          </Text>
        </View>
      ) : products.length === 0 ? (
        <View style={s.noticeCard}>
          <Text
            style={s.noticeTitle}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {t('monetization.emptyPackagesTitle')}
          </Text>
          <Text
            style={s.noticeText}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {t('monetization.emptyPackagesBody')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.productKey}
          renderItem={renderProduct}
          ListHeaderComponent={renderHeader()}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </BottomSheet>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    list: {
      paddingBottom: SPACING.xl,
      gap: SPACING.md,
    },
    heroCard: {
      marginBottom: SPACING.md,
      borderRadius: 24,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.lg,
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.borderLight,
      gap: SPACING.md,
    },
    heroBrandRow: {
      alignItems: 'center',
      marginBottom: -SPACING.sm,
    },
    heroTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: SPACING.md,
    },
    heroCopy: {
      flex: 1,
      gap: 6,
    },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: RADIUS.full,
      alignSelf: 'flex-start',
      backgroundColor: C.primarySoftBg,
      borderWidth: 1,
      borderColor: C.primarySoft,
    },
    heroBadgeText: {
      ...TYPOGRAPHY.CaptionBold,
      color: C.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    heroBalancePill: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: C.surfaceAlt,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: 'flex-end',
      minWidth: 110,
    },
    heroBalanceLabel: {
      ...TYPOGRAPHY.Caption,
      color: C.subtext,
      textTransform: 'uppercase',
    },
    heroBalanceValue: {
      ...TYPOGRAPHY.BodyBold,
      color: C.text,
      fontWeight: '800',
    },
    heroTitle: {
      ...TYPOGRAPHY.H2,
      color: C.text,
      fontWeight: '800',
    },
    heroSubtitle: {
      ...TYPOGRAPHY.Small,
      color: C.subtext,
      lineHeight: 20,
    },
    productShell: {
      marginBottom: SPACING.md,
    },
    productCard: {
      borderRadius: 24,
      padding: SPACING.md,
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.borderLight,
      gap: SPACING.md,
    },
    productTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING.md,
    },
    productTokenWrap: {
      width: 44,
      height: 44,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.primarySoftBg,
      borderWidth: 1,
      borderColor: C.primarySoft,
    },
    productCopy: {
      flex: 1,
      gap: 6,
    },
    productTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    productTitle: {
      ...TYPOGRAPHY.BodyBold,
      color: C.text,
    },
    productBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: C.violetBg,
    },
    productBadgeText: {
      ...TYPOGRAPHY.CaptionBold,
      color: C.primary,
    },
    productAmount: {
      fontSize: 24,
      lineHeight: 28,
      color: C.text,
      fontWeight: '800',
      letterSpacing: -0.4,
    },
    productSupportText: {
      ...TYPOGRAPHY.Small,
      color: C.subtext,
      lineHeight: 18,
    },
    productCampaign: {
      ...TYPOGRAPHY.Caption,
      color: C.primary,
      lineHeight: 18,
    },
    purchaseButton: {
      width: '100%',
      backgroundColor: C.primary,
      borderWidth: 1,
      borderColor: C.primary,
    },
    noticeCard: {
      paddingVertical: SPACING.xl,
      paddingHorizontal: SPACING.lg,
      borderRadius: 22,
      backgroundColor: C.primarySoftBg,
      borderWidth: 1,
      borderColor: C.border,
      gap: SPACING.sm,
    },
    noticeTitle: {
      ...TYPOGRAPHY.H3,
      color: C.text,
    },
    noticeText: {
      ...TYPOGRAPHY.Body,
      color: C.subtext,
      lineHeight: 22,
    },
  });
}
