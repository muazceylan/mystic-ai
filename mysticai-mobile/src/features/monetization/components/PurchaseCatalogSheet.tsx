import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import i18n from 'i18next';
import { useTranslation } from 'react-i18next';
import { useTheme, ThemeColors } from '../../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS, ACCESSIBILITY } from '../../../constants/tokens';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { Button } from '../../../components/ui/Button';
import { useMonetizationStore } from '../store/useMonetizationStore';
import { useGuruWalletStore } from '../store/useGuruWalletStore';
import { processPurchase } from '../api/monetization.service';
import { MonetizationEvents } from '../analytics/monetizationAnalytics';
import type { GuruProduct } from '../types';

interface PurchaseCatalogSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

export function PurchaseCatalogSheet({ visible, onDismiss }: PurchaseCatalogSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = createStyles(colors);
  const config = useMonetizationStore((state) => state.config);
  const balance = useGuruWalletStore((state) => state.getBalance());
  const loadWallet = useGuruWalletStore((state) => state.loadWallet);
  const trackedRef = useRef(false);
  const [purchasingKey, setPurchasingKey] = useState<string | null>(null);

  const products = useMemo(
    () => [...(config?.products ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [config?.products],
  );
  const isPurchaseEnabled = config?.guruPurchaseEnabled ?? false;

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

  const handlePurchase = async (product: GuruProduct) => {
    if (!isPurchaseEnabled || purchasingKey) return;

    const totalGuru = product.guruAmount + product.bonusGuruAmount;
    try {
      setPurchasingKey(product.productKey);
      MonetizationEvents.purchaseClicked(product.productKey, product.price);

      await processPurchase({
        guruAmount: totalGuru,
        productKey: product.productKey,
        platform: Platform.OS,
        locale: i18n.language,
        idempotencyKey: `purchase_${product.productKey}_${Date.now()}`,
      });

      await loadWallet();
      onDismiss();
      Alert.alert(
        t('monetization.packageAddedTitle'),
        t('monetization.packageAddedBody', { count: totalGuru }),
      );
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

  const renderProduct = ({ item }: { item: GuruProduct }) => {
    const totalGuru = item.guruAmount + item.bonusGuruAmount;
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
                {item.bonusGuruAmount > 0
                  ? t('monetization.bonusGuru', { count: item.bonusGuruAmount })
                  : item.description || t('monetization.packageFallbackDescription', { count: item.guruAmount })}
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
            title={item.price ? `${item.price} ${item.currency}` : t('monetization.buy')}
            onPress={() => {
              void handlePurchase(item);
            }}
            size="md"
            style={s.purchaseButton}
            loading={isProcessing}
            disabled={!isPurchaseEnabled || isProcessing}
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
            {t('monetization.purchaseDisabledBody')}
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
