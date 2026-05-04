import React, { useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTheme, ThemeColors } from '../../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS, ACCESSIBILITY } from '../../../constants/tokens';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { Button } from '../../../components/ui/Button';
import { BrandBadge } from '../../../components/ui/BrandLogo';
import { PREMIUM_ICONS } from '../../../constants/icons';
import { useGuruUnlock } from '../hooks/useGuruUnlock';
import { useModuleMonetization } from '../hooks/useModuleMonetization';
import { usePaywall } from '../hooks/usePaywall';
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
  const { paywall } = usePaywall();
  const balance = useGuruWalletStore(state => state.getBalance());
  const { getAction } = useMonetizationStore();
  const action = getAction(actionKey, moduleKey);
  const unlockState = monetization.getActionUnlockState(actionKey);
  const trackedRef = useRef(false);

  const guruCost = unlockState.guruCost;
  const canAfford = unlockState.canAffordGuru;
  const isProcessing = status === 'processing';
  const displayName = action?.displayName ?? actionKey;
  const premiumStatusLabel = monetization.trialing
    ? t('premium.trialActiveState')
    : monetization.premiumActive
      ? t('premium.activeState')
      : null;
  const showPremiumCta = Boolean(
    paywall?.premiumEnabled
    && (!paywall.premiumActive || paywall.entitlementStatus === 'TRIALING'),
  );
  const premiumCtaTarget = paywall?.premiumActive
    ? 'manage'
    : paywall?.trialEnabled && paywall?.trialEligible
      ? 'trial'
      : 'premium';
  const premiumCtaLabel = paywall?.premiumActive
    ? t('premium.activeState')
    : paywall?.trialEnabled && paywall?.trialEligible
      ? t('premium.startTrial')
      : t('premium.upgrade');

  useEffect(() => {
    if (visible && !trackedRef.current) {
      MonetizationEvents.gateViewed(moduleKey, actionKey, canAfford ? 'can_afford' : 'insufficient');
      if (!canAfford && unlockState.guruEnabled) {
        MonetizationEvents.insufficientTokenModalShown(moduleKey, actionKey, 'modal');
      }
      trackedRef.current = true;
    }
    if (!visible) {
      trackedRef.current = false;
    }
  }, [visible, moduleKey, actionKey, canAfford, unlockState.guruEnabled]);

  useEffect(() => {
    if (status === 'success') {
      onUnlocked();
      reset();
    }
  }, [status, onUnlocked, reset]);

  useEffect(() => {
    if (!visible || !unlockState.isFree) {
      return;
    }

    onDismiss();
    onUnlocked();
    reset();
  }, [onDismiss, onUnlocked, reset, unlockState.isFree, visible]);

  const handleSpend = useCallback(async () => {
    MonetizationEvents.tokenUnlockClicked(moduleKey, actionKey, balance, guruCost);
    const result = await spendGuru();
    if (result) {
      MonetizationEvents.tokenUnlockSuccess(moduleKey, actionKey, guruCost);
    }
  }, [spendGuru, moduleKey, actionKey, balance, guruCost]);

  const openPremiumPaywall = useCallback(() => {
    MonetizationEvents.premiumCtaClicked(moduleKey, actionKey, premiumCtaTarget, 'modal');
    onDismiss();
    router.push('/premium');
  }, [actionKey, moduleKey, onDismiss, premiumCtaTarget]);

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

        {premiumStatusLabel ? (
          <View style={s.premiumBox}>
            <Text
              style={s.premiumTitle}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              {premiumStatusLabel}
            </Text>
            <Text
              style={s.premiumBody}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              {monetization.premiumApplied
                ? t('monetization.premiumAppliedHint')
                : t('monetization.premiumAccountHint')}
            </Text>
          </View>
        ) : null}

        {(status === 'insufficient' || !canAfford) && (
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
              {showPremiumCta ? (
                <Button
                  title={premiumCtaLabel}
                  onPress={openPremiumPaywall}
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
    premiumBox: {
      marginTop: SPACING.md,
      padding: SPACING.md,
      backgroundColor: C.primarySoftBg,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: C.primarySoft,
    },
    premiumTitle: {
      ...TYPOGRAPHY.SmallBold,
      color: C.text,
      marginBottom: SPACING.xs,
    },
    premiumBody: {
      ...TYPOGRAPHY.Small,
      color: C.subtext,
      lineHeight: 20,
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
