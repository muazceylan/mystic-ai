import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTheme, ThemeColors } from '../../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS, ACCESSIBILITY } from '../../../constants/tokens';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useMonetizationStore } from '../store/useMonetizationStore';
import { MonetizationEvents } from '../analytics/monetizationAnalytics';
import type { GuruProduct } from '../types';

interface PurchaseCatalogSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

export function PurchaseCatalogSheet({ visible, onDismiss }: PurchaseCatalogSheetProps) {
  const { colors } = useTheme();
  const s = createStyles(colors);
  const { config } = useMonetizationStore();
  const trackedRef = useRef(false);

  const products = config?.products ?? [];
  const isPurchaseEnabled = config?.guruPurchaseEnabled ?? false;

  useEffect(() => {
    if (visible && !trackedRef.current) {
      MonetizationEvents.purchaseCatalogViewed();
      trackedRef.current = true;
    }
    if (!visible) {
      trackedRef.current = false;
    }
  }, [visible]);

  const handlePurchase = (product: GuruProduct) => {
    MonetizationEvents.purchaseClicked(product.productKey, product.price);
    // TODO: Integrate actual in-app purchase flow (RevenueCat / StoreKit / Google Play Billing)
  };

  const renderProduct = ({ item }: { item: GuruProduct }) => {
    const totalGuru = item.guruAmount + item.bonusGuruAmount;

    return (
      <Card variant="outlined" style={s.productCard}>
        <View style={s.productHeader}>
          <View style={s.productInfo}>
            <Text
              style={s.productTitle}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              {item.title}
            </Text>
            {item.description ? (
              <Text
                style={s.productDescription}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              >
                {item.description}
              </Text>
            ) : null}
          </View>
          {item.badge ? (
            <Badge label={item.badge} />
          ) : null}
        </View>

        <View style={s.productDetails}>
          <View style={s.guruAmountRow}>
            <Text
              style={s.guruAmount}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              {'✦ '}{item.guruAmount} Guru
            </Text>
            {item.bonusGuruAmount > 0 && (
              <Text
                style={s.bonusAmount}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              >
                +{item.bonusGuruAmount} bonus
              </Text>
            )}
          </View>
          {item.bonusGuruAmount > 0 && (
            <Text
              style={s.totalGuru}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              Toplam: {totalGuru} Guru
            </Text>
          )}
        </View>

        <Button
          title={item.price ? `${item.price}` : 'Satın Al'}
          onPress={() => handlePurchase(item)}
          size="md"
          style={s.purchaseButton}
        />

        {item.campaignLabel ? (
          <Text
            style={s.campaignLabel}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {item.campaignLabel}
          </Text>
        ) : null}
      </Card>
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onDismiss} title="Guru Satın Al">
      {!isPurchaseEnabled ? (
        <View style={s.disabledNotice}>
          <Text
            style={s.disabledText}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            Guru satın alma şu anda kullanılamıyor. Reklam izleyerek Guru kazanabilirsiniz.
          </Text>
        </View>
      ) : products.length === 0 ? (
        <View style={s.emptyState}>
          <Text
            style={s.emptyText}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            Henüz ürün bulunmuyor.
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => item.productKey}
          renderItem={renderProduct}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}
    </BottomSheet>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    list: {
      paddingBottom: SPACING.lg,
    },
    separator: {
      height: SPACING.md,
    },
    productCard: {
      padding: SPACING.lg,
    },
    productHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: SPACING.md,
    },
    productInfo: {
      flex: 1,
      marginRight: SPACING.sm,
    },
    productTitle: {
      ...TYPOGRAPHY.H3,
      color: C.text,
    },
    productDescription: {
      ...TYPOGRAPHY.Small,
      color: C.subtext,
      marginTop: SPACING.xs,
    },
    productDetails: {
      marginBottom: SPACING.md,
    },
    guruAmountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    guruAmount: {
      ...TYPOGRAPHY.BodyBold,
      color: C.gold,
    },
    bonusAmount: {
      ...TYPOGRAPHY.SmallBold,
      color: C.green,
    },
    totalGuru: {
      ...TYPOGRAPHY.Caption,
      color: C.subtext,
      marginTop: SPACING.xs,
    },
    purchaseButton: {
      width: '100%',
    },
    campaignLabel: {
      ...TYPOGRAPHY.CaptionBold,
      color: C.primary,
      textAlign: 'center',
      marginTop: SPACING.sm,
    },
    disabledNotice: {
      padding: SPACING.xl,
      alignItems: 'center',
    },
    disabledText: {
      ...TYPOGRAPHY.Body,
      color: C.subtext,
      textAlign: 'center',
    },
    emptyState: {
      padding: SPACING.xl,
      alignItems: 'center',
    },
    emptyText: {
      ...TYPOGRAPHY.Body,
      color: C.muted,
      textAlign: 'center',
    },
  });
}
