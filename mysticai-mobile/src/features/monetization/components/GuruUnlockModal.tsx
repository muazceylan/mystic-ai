import React, { useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme, ThemeColors } from '../../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS, ACCESSIBILITY } from '../../../constants/tokens';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { Button } from '../../../components/ui/Button';
import { BrandBadge } from '../../../components/ui/BrandLogo';
import { PREMIUM_ICONS } from '../../../constants/icons';
import { useGuruUnlock } from '../hooks/useGuruUnlock';
import { useModuleMonetization } from '../hooks/useModuleMonetization';
import { useGuruWalletStore } from '../store/useGuruWalletStore';
import { useMonetizationStore } from '../store/useMonetizationStore';
import { MonetizationEvents } from '../analytics/monetizationAnalytics';
import { useTranslation } from 'react-i18next';

interface GuruUnlockModalProps {
  visible: boolean;
  moduleKey: string;
  actionKey: string;
  onUnlocked: () => void;
  onDismiss: () => void;
  onShowAdOffer?: () => void;
  onShowPurchase?: () => void;
}

export function GuruUnlockModal({
  visible,
  moduleKey,
  actionKey,
  onUnlocked,
  onDismiss,
  onShowAdOffer,
  onShowPurchase,
}: GuruUnlockModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = createStyles(colors);
  const { status, spendGuru, reset } = useGuruUnlock(moduleKey, actionKey);
  const monetization = useModuleMonetization(moduleKey);
  const balance = useGuruWalletStore(state => state.getBalance());
  const { getAction } = useMonetizationStore();
  const action = getAction(actionKey, moduleKey);
  const unlockState = monetization.getActionUnlockState(actionKey);
  const trackedRef = useRef(false);

  const guruCost = action?.guruCost ?? 0;
  const canAfford = balance >= guruCost;
  const isProcessing = status === 'processing';
  const displayName = action?.displayName ?? actionKey;

  useEffect(() => {
    if (visible && !trackedRef.current) {
      MonetizationEvents.gateViewed(moduleKey, actionKey, canAfford ? 'can_afford' : 'insufficient');
      trackedRef.current = true;
    }
    if (!visible) {
      trackedRef.current = false;
    }
  }, [visible, moduleKey, actionKey, canAfford]);

  useEffect(() => {
    if (status === 'success') {
      onUnlocked();
      reset();
    }
  }, [status, onUnlocked, reset]);

  const handleSpend = useCallback(async () => {
    MonetizationEvents.tokenUnlockClicked(moduleKey, actionKey, balance, guruCost);
    const result = await spendGuru();
    if (result) {
      MonetizationEvents.tokenUnlockSuccess(moduleKey, actionKey, guruCost);
    }
  }, [spendGuru, moduleKey, actionKey, balance, guruCost]);

  const handleClose = useCallback(() => {
    reset();
    onDismiss();
  }, [reset, onDismiss]);

  return (
    <BottomSheet visible={visible} onClose={handleClose} title={t('monetization.guruUnlockTitle')}>
      <View style={s.content}>
        <View style={s.brandRow}>
          <BrandBadge variant="icon-transparent" size={28} />
        </View>

        <View style={s.infoRow}>
          <Text
            style={s.label}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {t('monetization.guruContentLabel')}
          </Text>
          <Text
            style={s.value}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {displayName}
          </Text>
        </View>

        <View style={s.infoRow}>
          <Text
            style={s.label}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {t('monetization.guruCostLabel')}
          </Text>
          <Text
            style={s.costValue}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {'✦ '}{guruCost} Guru
          </Text>
        </View>

        <View style={s.infoRow}>
          <Text
            style={s.label}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {t('monetization.guruBalanceLabel')}
          </Text>
          <Text
            style={[s.value, !canAfford && s.insufficientBalance]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {'✦ '}{balance} Guru
          </Text>
        </View>

        {status === 'insufficient' && (
          <View style={s.warningBox}>
            <Text
              style={s.warningText}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              {t('monetization.guruInsufficientWarning')}
            </Text>
            <View style={s.fallbackActions}>
              {onShowAdOffer && unlockState.adEnabled ? (
                <Button
                  title={t('monetization.guruWatchAdBtn')}
                  onPress={onShowAdOffer}
                  variant="outline"
                  leftIcon={PREMIUM_ICONS.ad}
                  size="sm"
                />
              ) : null}
              {onShowPurchase && unlockState.purchaseEnabled ? (
                <Button
                  title={t('monetization.guruBuyBtn')}
                  onPress={onShowPurchase}
                  variant="outline"
                  leftIcon={PREMIUM_ICONS.purchase}
                  size="sm"
                />
              ) : null}
            </View>
          </View>
        )}

        {status === 'failed' && (
          <View style={s.errorBox}>
            <Text
              style={s.errorText}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              {t('monetization.guruFailedError')}
            </Text>
          </View>
        )}

        {isProcessing && (
          <View style={s.processingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text
              style={s.processingText}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              {t('monetization.guruProcessing')}
            </Text>
          </View>
        )}

        <View style={s.actions}>
          <Button
            title={t('monetization.guruSpendBtn')}
            onPress={handleSpend}
            loading={isProcessing}
            disabled={isProcessing || !canAfford}
            leftIcon={PREMIUM_ICONS.unlocked}
            size="lg"
            style={s.spendButton}
          />
          <Button
            title={t('monetization.dismissBtn')}
            onPress={handleClose}
            variant="ghost"
            size="sm"
            disabled={isProcessing}
          />
        </View>
      </View>
    </BottomSheet>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    content: {
      paddingBottom: SPACING.lg,
    },
    brandRow: {
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    label: {
      ...TYPOGRAPHY.Small,
      color: C.subtext,
    },
    value: {
      ...TYPOGRAPHY.BodyBold,
      color: C.text,
    },
    costValue: {
      ...TYPOGRAPHY.BodyBold,
      color: C.gold,
    },
    insufficientBalance: {
      color: C.red,
    },
    warningBox: {
      marginTop: SPACING.md,
      padding: SPACING.md,
      backgroundColor: C.warningBg,
      borderRadius: RADIUS.md,
    },
    warningText: {
      ...TYPOGRAPHY.Small,
      color: C.warningDark,
      marginBottom: SPACING.sm,
    },
    fallbackActions: {
      flexDirection: 'row',
      gap: SPACING.sm,
      marginTop: SPACING.sm,
    },
    errorBox: {
      marginTop: SPACING.md,
      padding: SPACING.md,
      backgroundColor: C.redBg,
      borderRadius: RADIUS.md,
    },
    errorText: {
      ...TYPOGRAPHY.Small,
      color: C.red,
    },
    processingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginTop: SPACING.md,
    },
    processingText: {
      ...TYPOGRAPHY.Small,
      color: C.subtext,
    },
    actions: {
      marginTop: SPACING.xl,
      gap: SPACING.sm,
    },
    spendButton: {
      width: '100%',
    },
  });
}
