import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { Button } from '../../../components/ui/Button';
import { useTheme, type ThemeColors } from '../../../context/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../../constants/tokens';
import { useModuleMonetization } from '../hooks/useModuleMonetization';
import { useRewardedUnlock } from '../hooks/useRewardedUnlock';
import { useGuruUnlock } from '../hooks/useGuruUnlock';
import { MonetizationEvents } from '../analytics/monetizationAnalytics';
import { GuruBalanceBadge } from './GuruBalanceBadge';

interface ActionUnlockSheetProps {
  visible: boolean;
  moduleKey: string;
  actionKey: string;
  title?: string;
  onClose: () => void;
  onUnlocked: () => void | Promise<void>;
  onShowPurchase?: () => void;
  closeLabel?: string;
}

export function ActionUnlockSheet({
  visible,
  moduleKey,
  actionKey,
  title,
  onClose,
  onUnlocked,
  onShowPurchase,
  closeLabel,
}: ActionUnlockSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const monetization = useModuleMonetization(moduleKey);
  const unlockState = monetization.getActionUnlockState(actionKey);
  const action = unlockState.action;
  const { status: adStatus, startRewardedUnlock, reset: resetRewardedUnlock } = useRewardedUnlock(moduleKey, actionKey);
  const { status: guruStatus, spendGuru, reset: resetGuruUnlock } = useGuruUnlock(moduleKey, actionKey);
  const [showInsufficientHint, setShowInsufficientHint] = useState(false);
  const hasHandledUnavailableState = useRef(false);
  const hasTriggeredAutoUnlock = useRef(false);
  const effectiveTitle = action?.dialogTitle || title || action?.displayName || actionKey;
  const effectiveDescription = action?.dialogDescription || action?.description;
  const guruLabel = action?.primaryCtaLabel || t('monetization.useGuruUnlock', { count: unlockState.guruCost });
  const rewardLabel = action?.secondaryCtaLabel || t('monetization.watchVideoUnlock');
  const shouldRenderAdOption = unlockState.adEnabled
    && (
      !unlockState.guruEnabled
      || !unlockState.canAffordGuru
      || unlockState.unlockType === 'AD_WATCH'
    );
  const hasVisibleOptions = unlockState.isFree
    || shouldRenderAdOption
    || unlockState.guruEnabled
    || Boolean(unlockState.purchaseEnabled && onShowPurchase);
  const presentAlert = useCallback((alertTitle: string, message: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(`${alertTitle}\n\n${message}`);
      return;
    }

    Alert.alert(alertTitle, message);
  }, []);

  useEffect(() => {
    if (visible) return;
    hasHandledUnavailableState.current = false;
    hasTriggeredAutoUnlock.current = false;
    setShowInsufficientHint(false);
    resetRewardedUnlock();
    resetGuruUnlock();
  }, [visible, resetGuruUnlock, resetRewardedUnlock]);

  useEffect(() => {
    if (!visible || hasVisibleOptions || hasHandledUnavailableState.current) {
      return;
    }

    hasHandledUnavailableState.current = true;
    onClose();
    presentAlert(
      t('monetization.rewardUnavailableTitle'),
      t('monetization.unlockOptionsUnavailableHint'),
    );
  }, [visible, hasVisibleOptions, onClose, presentAlert, t]);

  const isBusy = adStatus === 'loading_ad'
    || adStatus === 'showing_ad'
    || adStatus === 'processing_reward'
    || guruStatus === 'processing';

  const completeUnlock = useCallback(async () => {
    onClose();
    await onUnlocked();
  }, [onClose, onUnlocked]);

  useEffect(() => {
    if (!visible || !unlockState.isFree || hasTriggeredAutoUnlock.current) {
      return;
    }

    hasTriggeredAutoUnlock.current = true;
    void completeUnlock();
  }, [visible, unlockState.isFree, completeUnlock]);

  const handleGuruUnlock = useCallback(async () => {
    if (!unlockState.guruEnabled) {
      presentAlert(t('common.error'), t('monetization.unlockOptionsUnavailableHint'));
      return;
    }

    MonetizationEvents.gateSeen(moduleKey, actionKey, 'guru_spend');
    setShowInsufficientHint(false);

    if (!unlockState.canAffordGuru) {
      setShowInsufficientHint(true);
      return;
    }

    const spent = await spendGuru();
    if (!spent) {
      if (!monetization.canAffordAction(actionKey)) {
        setShowInsufficientHint(true);
        return;
      }
      presentAlert(t('common.error'), t('monetization.guruFailedError'));
      return;
    }

    await completeUnlock();
  }, [unlockState, spendGuru, completeUnlock, t, monetization, moduleKey, actionKey, presentAlert]);

  const handleRewardedUnlock = useCallback(async () => {
    if (!unlockState.adEnabled) {
      presentAlert(t('common.error'), t('monetization.unlockOptionsUnavailableHint'));
      return;
    }

    if (!unlockState.adReady) {
      presentAlert(t('monetization.rewardUnavailableTitle'), t('monetization.rewardUnavailableBody'));
      return;
    }

    MonetizationEvents.gateSeen(moduleKey, actionKey, 'ad');
    setShowInsufficientHint(false);

    const rewarded = await startRewardedUnlock();
    if (!rewarded) {
      presentAlert(t('common.error'), t('monetization.adLoadError'));
      return;
    }

    if (unlockState.requiresAdThenGuruSpend) {
      const spent = await spendGuru();
      if (!spent) {
        setShowInsufficientHint(true);
        return;
      }
    }

    await completeUnlock();
  }, [unlockState, startRewardedUnlock, spendGuru, completeUnlock, t, moduleKey, actionKey, presentAlert]);

  if (!visible || !hasVisibleOptions || unlockState.isFree) {
    return null;
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title={effectiveTitle}>
      <View style={styles.content}>
        {unlockState.usesMonetization ? (
          <View style={styles.balanceRow}>
            <GuruBalanceBadge size="sm" />
          </View>
        ) : null}

        {effectiveDescription ? (
          <Text style={styles.descriptionText}>{effectiveDescription}</Text>
        ) : null}

        {showInsufficientHint ? (
          <Text style={styles.warningText}>
            {t('monetization.insufficientGuruBody', {
              cost: unlockState.guruCost,
              balance: monetization.walletBalance,
            })}
          </Text>
        ) : null}

        <View style={styles.options}>
          {shouldRenderAdOption ? (
            <TouchableOpacity
              style={[
                styles.optionCard,
                (!unlockState.adReady || isBusy) && styles.optionCardDisabled,
              ]}
              onPress={() => {
                void handleRewardedUnlock();
              }}
              disabled={!unlockState.adReady || isBusy}
              accessibilityRole="button"
              accessibilityLabel={rewardLabel}
            >
              <View style={styles.optionIconWrap}>
                {adStatus === 'loading_ad' || adStatus === 'showing_ad' || adStatus === 'processing_reward'
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Ionicons name="play-circle" size={22} color={colors.primary} />}
              </View>
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>{rewardLabel}</Text>
                <Text style={styles.optionSubtitle}>{t('monetization.watchVideoUnlockHint')}</Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {unlockState.guruEnabled ? (
            <TouchableOpacity
              style={[
                styles.optionCard,
                styles.optionCardPrimary,
                isBusy && styles.optionCardDisabled,
              ]}
              onPress={() => {
                void handleGuruUnlock();
              }}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityLabel={guruLabel}
            >
              <View style={[styles.optionIconWrap, styles.optionIconWrapPrimary]}>
                {guruStatus === 'processing'
                  ? <ActivityIndicator size="small" color={colors.white} />
                  : <Ionicons name="sparkles" size={20} color={colors.white} />}
              </View>
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitlePrimary}>{guruLabel}</Text>
                <Text style={styles.optionSubtitlePrimary}>{t('monetization.useGuruUnlockHint')}</Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {unlockState.purchaseEnabled && onShowPurchase ? (
            <TouchableOpacity
              style={[
                styles.optionCard,
                styles.optionCardPurchase,
                isBusy && styles.optionCardDisabled,
              ]}
              onPress={onShowPurchase}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityLabel={t('monetization.guruBuyBtn')}
            >
              <View style={[styles.optionIconWrap, styles.optionIconWrapPurchase]}>
                <Ionicons name="card-outline" size={20} color={colors.text} />
              </View>
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>{t('monetization.guruBuyBtn')}</Text>
                <Text style={styles.optionSubtitle}>{t('monetization.purchaseOptionHint')}</Text>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>

        <Button
          title={closeLabel ?? t('common.close')}
          onPress={onClose}
          variant="ghost"
          size="sm"
          disabled={isBusy}
        />
      </View>
    </BottomSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: {
      paddingBottom: SPACING.lg,
    },
    balanceRow: {
      marginBottom: SPACING.md,
    },
    descriptionText: {
      ...TYPOGRAPHY.Small,
      color: colors.subtext,
      marginBottom: SPACING.md,
      lineHeight: 20,
    },
    warningText: {
      ...TYPOGRAPHY.Small,
      color: colors.warningDark,
      backgroundColor: colors.warningBg,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      marginBottom: SPACING.md,
    },
    options: {
      gap: SPACING.md,
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
    },
    optionCardPrimary: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionCardPurchase: {
      backgroundColor: colors.surface,
    },
    optionCardDisabled: {
      opacity: 0.45,
    },
    optionIconWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 42,
      height: 42,
      borderRadius: 999,
      backgroundColor: colors.primarySoftBg,
    },
    optionIconWrapPrimary: {
      backgroundColor: colors.primary700,
    },
    optionIconWrapPurchase: {
      backgroundColor: colors.surfaceAlt,
    },
    optionCopy: {
      flex: 1,
      gap: 2,
    },
    optionTitle: {
      ...TYPOGRAPHY.BodyBold,
      color: colors.text,
    },
    optionSubtitle: {
      ...TYPOGRAPHY.Small,
      color: colors.subtext,
    },
    optionTitlePrimary: {
      ...TYPOGRAPHY.BodyBold,
      color: colors.white,
    },
    optionSubtitlePrimary: {
      ...TYPOGRAPHY.Small,
      color: colors.white,
      opacity: 0.88,
    },
  });
}
