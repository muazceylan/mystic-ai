import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { useTheme, type ThemeColors } from '../../../context/ThemeContext';
import { ACCESSIBILITY, RADIUS, SPACING, TYPOGRAPHY } from '../../../constants/tokens';
import { getUnlockOptions, unlockWithToken } from '../api/monetization.service';
import { trackMonetizationEvent } from '../analytics/monetizationAnalytics';
import { useModuleMonetization } from '../hooks/useModuleMonetization';
import { useRewardedAdContentUnlock } from '../hooks/useRewardedAdContentUnlock';
import { useGuruWalletStore } from '../store/useGuruWalletStore';
import type { UnlockOptions } from '../types';

const GURU_TOKEN_DARK = require('../../../../assets/guru_transparent_light.png');
const GURU_TOKEN_LIGHT = require('../../../../assets/guru_transparent.png');

const STAR_POINTS = [
  { top: '8%', left: '18%', opacity: 0.42 },
  { top: '12%', left: '78%', opacity: 0.35 },
  { top: '24%', left: '64%', opacity: 0.28 },
  { top: '30%', left: '88%', opacity: 0.38 },
  { top: '42%', left: '16%', opacity: 0.25 },
  { top: '48%', left: '74%', opacity: 0.36 },
  { top: '58%', left: '84%', opacity: 0.22 },
  { top: '66%', left: '22%', opacity: 0.3 },
  { top: '74%', left: '68%', opacity: 0.34 },
  { top: '82%', left: '38%', opacity: 0.24 },
] as const;

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

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getApiMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const response = (error as { response?: { data?: { message?: unknown; error?: unknown } } }).response;
  const message = response?.data?.message ?? response?.data?.error;
  return typeof message === 'string' && message.trim() ? message : null;
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
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const monetization = useModuleMonetization(moduleKey);
  const unlockState = monetization.getActionUnlockState(actionKey);
  const action = unlockState.action;
  const balance = useGuruWalletStore(state => state.getBalance());
  const refreshBalance = useGuruWalletStore(state => state.refreshBalance);
  const [options, setOptions] = useState<UnlockOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [tokenProcessing, setTokenProcessing] = useState(false);
  const [inlineMessage, setInlineMessage] = useState<string | null>(null);
  const [hiddenAfterUnlock, setHiddenAfterUnlock] = useState(false);
  const hasTrackedOpen = useRef(false);
  const hasTriggeredAutoUnlock = useRef(false);
  const tokenInFlightRef = useRef(false);
  const rewardInFlightRef = useRef(false);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sheetVisible = visible && !hiddenAfterUnlock;
  const tokenIcon = isDark ? GURU_TOKEN_DARK : GURU_TOKEN_LIGHT;
  const effectiveTitle = title || action?.dialogTitle || action?.displayName || actionKey;
  const tokenRequirement = Math.max(1, options?.tokenRequirement ?? unlockState.guruCost ?? 1);
  const userGuruBalance = options?.userGuruBalance ?? balance;
  const tokenUnlockEnabled = options?.tokenUnlockEnabled ?? unlockState.guruEnabled;
  const rewardedAdEnabled = options?.rewardedAdEnabled ?? unlockState.adEnabled;
  const rewardedAdViewsRequired = options?.rewardedAdViewsRequired ?? Math.max(1, tokenRequirement);
  const rewardAnalyticsContext = useMemo(() => ({
    tokenRequirement,
    userGuruBalance,
    rewardedAdViewsRequired,
  }), [rewardedAdViewsRequired, tokenRequirement, userGuruBalance]);
  const rewardedUnlock = useRewardedAdContentUnlock(moduleKey, actionKey, rewardAnalyticsContext);
  const rewardedProgress = rewardedUnlock.progress ?? options?.rewardedAdProgress ?? null;
  const hasVisibleOptions = tokenUnlockEnabled || rewardedAdEnabled || optionsLoading;
  const isRewardBusy = rewardedUnlock.status === 'checking'
    || rewardedUnlock.status === 'loading_ad'
    || rewardedUnlock.status === 'showing_ad'
    || rewardedUnlock.status === 'completing';
  const isBusy = optionsLoading || tokenProcessing || isRewardBusy;

  const clearRedirectTimer = useCallback(() => {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
  }, []);

  const loadOptions = useCallback(async () => {
    setOptionsLoading(true);
    setInlineMessage(null);
    try {
      const nextOptions = await getUnlockOptions(moduleKey, actionKey);
      setOptions(nextOptions);
    } catch (error) {
      setInlineMessage(getApiMessage(error) ?? t('monetization.unlockOptionsUnavailableHint'));
    } finally {
      setOptionsLoading(false);
    }
  }, [actionKey, moduleKey, t]);

  useEffect(() => {
    if (!sheetVisible) return;
    void loadOptions();
  }, [loadOptions, sheetVisible]);

  useEffect(() => {
    if (visible) return;
    clearRedirectTimer();
    setHiddenAfterUnlock(false);
    setOptions(null);
    setInlineMessage(null);
    setTokenProcessing(false);
    tokenInFlightRef.current = false;
    rewardInFlightRef.current = false;
    hasTrackedOpen.current = false;
    hasTriggeredAutoUnlock.current = false;
    rewardedUnlock.reset();
  }, [clearRedirectTimer, rewardedUnlock, visible]);

  useEffect(() => {
    return clearRedirectTimer;
  }, [clearRedirectTimer]);

  useEffect(() => {
    if (!sheetVisible || hasTrackedOpen.current) return;
    hasTrackedOpen.current = true;
    trackMonetizationEvent('unlock_modal_viewed', {
      moduleKey,
      actionKey,
      tokenRequirement,
      userGuruBalance,
      rewardedAdViewsRequired,
    });
  }, [actionKey, moduleKey, rewardedAdViewsRequired, sheetVisible, tokenRequirement, userGuruBalance]);

  const completeUnlock = useCallback(async () => {
    setHiddenAfterUnlock(true);
    await onUnlocked();
  }, [onUnlocked]);

  useEffect(() => {
    if (!sheetVisible || !unlockState.isFree || hasTriggeredAutoUnlock.current) {
      return;
    }

    hasTriggeredAutoUnlock.current = true;
    void completeUnlock();
  }, [completeUnlock, sheetVisible, unlockState.isFree]);

  const redirectToPurchase = useCallback(() => {
    clearRedirectTimer();
    redirectTimerRef.current = setTimeout(() => {
      if (onShowPurchase) {
        onShowPurchase();
        return;
      }
      onClose();
      router.push('/premium');
    }, 650);
  }, [clearRedirectTimer, onClose, onShowPurchase]);

  const handleTokenUnlock = useCallback(async () => {
    if (!tokenUnlockEnabled || isBusy || tokenInFlightRef.current) return;
    tokenInFlightRef.current = true;
    setInlineMessage(null);
    trackMonetizationEvent('unlock_with_token_clicked', {
      moduleKey,
      actionKey,
      tokenRequirement,
      userGuruBalance,
      rewardedAdViewsRequired,
    });

    if (userGuruBalance < tokenRequirement) {
      const message = `${t('monetization.notEnoughGuruTokens')}\n${t('monetization.addTokensToContinue')}`;
      setInlineMessage(message);
      trackMonetizationEvent('unlock_with_token_failed', {
        moduleKey,
        actionKey,
        reason: 'INSUFFICIENT_GURU',
        tokenRequirement,
        userGuruBalance,
        rewardedAdViewsRequired,
      });
      redirectToPurchase();
      tokenInFlightRef.current = false;
      return;
    }

    try {
      setTokenProcessing(true);
      const response = await unlockWithToken(moduleKey, actionKey, {
        platform: Platform.OS,
        locale: i18n.language,
        idempotencyKey: createId('content_unlock_token'),
        sourceScreen: moduleKey,
      });

      if (!response.unlocked) {
        setInlineMessage(response.message ?? t('monetization.guruFailedError'));
        trackMonetizationEvent('unlock_with_token_failed', {
          moduleKey,
          actionKey,
          reason: response.reason ?? 'TOKEN_UNLOCK_FAILED',
          tokenRequirement,
          userGuruBalance,
          rewardedAdViewsRequired,
        });
        if (response.reason === 'INSUFFICIENT_GURU') {
          redirectToPurchase();
        }
        return;
      }

      await refreshBalance();
      trackMonetizationEvent('unlock_with_token_success', {
        moduleKey,
        actionKey,
        tokenRequirement,
        userGuruBalance,
        spentGuru: response.spentGuru,
        remainingGuru: response.remainingGuru,
        rewardedAdViewsRequired,
      });
      await completeUnlock();
    } catch (error) {
      const message = getApiMessage(error) ?? t('monetization.guruFailedError');
      setInlineMessage(message);
      trackMonetizationEvent('unlock_with_token_failed', {
        moduleKey,
        actionKey,
        reason: message,
        tokenRequirement,
        userGuruBalance,
        rewardedAdViewsRequired,
      });
    } finally {
      setTokenProcessing(false);
      tokenInFlightRef.current = false;
    }
  }, [
    actionKey,
    completeUnlock,
    i18n.language,
    isBusy,
    moduleKey,
    redirectToPurchase,
    refreshBalance,
    rewardedAdViewsRequired,
    t,
    tokenRequirement,
    tokenUnlockEnabled,
    userGuruBalance,
  ]);

  const handleRewardedUnlock = useCallback(async () => {
    if (!rewardedAdEnabled || isBusy || rewardInFlightRef.current) return;
    rewardInFlightRef.current = true;
    setInlineMessage(null);
    trackMonetizationEvent('rewarded_unlock_clicked', {
      moduleKey,
      actionKey,
      tokenRequirement,
      userGuruBalance,
      rewardedAdViewsRequired,
      completedViews: rewardedProgress?.completed ?? 0,
      requiredViews: rewardedProgress?.required ?? rewardedAdViewsRequired,
    });

    try {
      const result = await rewardedUnlock.startRewardedUnlock();
      if (!result.response?.unlocked) {
        const fallback = result.status === 'cancelled'
          ? `${t('monetization.adNotCompletedTitle')}\n${t('monetization.adNotCompletedBody')}`
          : result.message ?? t('monetization.adNotReadyMessage');
        setInlineMessage(fallback);
        return;
      }
      await completeUnlock();
    } catch (error) {
      setInlineMessage(getApiMessage(error) ?? t('monetization.rewardedUnlockFailed'));
    } finally {
      rewardInFlightRef.current = false;
    }
  }, [
    actionKey,
    completeUnlock,
    isBusy,
    moduleKey,
    rewardedAdEnabled,
    rewardedAdViewsRequired,
    rewardedProgress,
    rewardedUnlock,
    t,
    tokenRequirement,
    userGuruBalance,
  ]);

  if (!sheetVisible || unlockState.isFree) {
    return null;
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      sheetStyle={styles.sheet}
      contentStyle={styles.sheetContent}
      dragHandleStyle={styles.dragHandle}
    >
      <LinearGradient
        colors={['#17052f', '#26054b', '#120321']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={styles.gradient}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {STAR_POINTS.map((point, index) => (
            <View
              key={`${point.top}-${point.left}-${index}`}
              style={[
                styles.star,
                {
                  top: point.top,
                  left: point.left,
                  opacity: point.opacity,
                },
              ]}
            />
          ))}
        </View>

        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text
            style={styles.title}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            numberOfLines={2}
          >
            {effectiveTitle}
          </Text>

          <View style={styles.balanceRow}>
            <Image
              source={tokenIcon}
              style={styles.balanceIcon}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
            <Text
              style={styles.balanceText}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              {userGuruBalance}
            </Text>
          </View>

          {optionsLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#C79CFF" />
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
          ) : null}

          {!optionsLoading && !hasVisibleOptions ? (
            <Text style={styles.inlineMessage}>
              {t('monetization.unlockOptionsUnavailableHint')}
            </Text>
          ) : null}

          <View style={styles.cardStack}>
            {tokenUnlockEnabled ? (
              <UnlockCard
                disabled={isBusy}
                onPress={handleTokenUnlock}
                styles={styles}
                accessibilityLabel={t('monetization.useGuruUnlockA11y', { count: tokenRequirement })}
              >
                {tokenProcessing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.tokenCardInner}>
                    <Text style={styles.cardNumber}>{tokenRequirement}</Text>
                    <Image
                      source={tokenIcon}
                      style={styles.cardTokenIcon}
                      resizeMode="contain"
                      accessibilityIgnoresInvertColors
                    />
                  </View>
                )}
              </UnlockCard>
            ) : null}

            {rewardedAdEnabled ? (
              <UnlockCard
                disabled={isBusy}
                onPress={handleRewardedUnlock}
                styles={styles}
                accessibilityLabel={t('monetization.rewardedUnlockA11y', { count: rewardedAdViewsRequired })}
              >
                {isRewardBusy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.videoCardInner}>
                    <View style={styles.videoIconBox}>
                      <Ionicons name="play" size={26} color="#F7E8FF" />
                    </View>
                    <Text style={styles.cardNumber}>{rewardedAdViewsRequired}</Text>
                  </View>
                )}
              </UnlockCard>
            ) : null}
          </View>

          {isRewardBusy ? (
            <Text style={styles.progressText}>
              {rewardedUnlock.status === 'loading_ad'
                ? t('monetization.adPreparing')
                : rewardedProgress && rewardedProgress.required > 1
                  ? t('monetization.adProgress', {
                      completed: rewardedProgress.completed,
                      required: rewardedProgress.required,
                    })
                  : t('monetization.adPreparing')}
            </Text>
          ) : null}

          {inlineMessage || rewardedUnlock.message ? (
            <Text style={styles.inlineMessage}>
              {inlineMessage ?? rewardedUnlock.message}
            </Text>
          ) : null}

          <TouchableOpacity
            onPress={onClose}
            disabled={isBusy}
            style={[styles.closeButton, isBusy && styles.disabled]}
            accessibilityRole="button"
            accessibilityLabel={closeLabel ?? t('common.close')}
          >
            <Text style={styles.closeText}>{closeLabel ?? t('common.close')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </BottomSheet>
  );
}

function UnlockCard({
  children,
  disabled,
  onPress,
  styles,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  accessibilityLabel: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.unlockCard, disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.86}
    >
      <View style={styles.cardContent}>{children}</View>
      <Ionicons name="chevron-forward" size={26} color="#F4E9FF" />
    </TouchableOpacity>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    sheet: {
      backgroundColor: 'transparent',
      overflow: 'hidden',
      borderTopLeftRadius: 34,
      borderTopRightRadius: 34,
    },
    sheetContent: {
      paddingHorizontal: 0,
    },
    dragHandle: {
      backgroundColor: '#7D39D6',
      width: 54,
      height: 6,
      marginBottom: 0,
    },
    gradient: {
      borderTopLeftRadius: 34,
      borderTopRightRadius: 34,
      borderWidth: 1,
      borderColor: 'rgba(179, 83, 255, 0.46)',
      shadowColor: '#AD4CFF',
      shadowOpacity: 0.38,
      shadowOffset: { width: 0, height: -10 },
      shadowRadius: 24,
      elevation: 18,
      overflow: 'hidden',
    },
    scrollContent: {
      paddingHorizontal: SPACING.xl,
      paddingTop: SPACING.xl,
      paddingBottom: SPACING.lg,
      gap: SPACING.lg,
    },
    star: {
      position: 'absolute',
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor: '#F3E5FF',
      shadowColor: '#E3B4FF',
      shadowOpacity: 0.8,
      shadowRadius: 6,
    },
    title: {
      ...TYPOGRAPHY.H1,
      color: '#FFFFFF',
      letterSpacing: 0,
    },
    balanceRow: {
      minHeight: 58,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: 'rgba(202, 142, 255, 0.42)',
      backgroundColor: 'rgba(131, 38, 204, 0.42)',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      gap: SPACING.sm,
      shadowColor: '#F0B7FF',
      shadowOpacity: 0.22,
      shadowRadius: 18,
      overflow: 'hidden',
    },
    balanceIcon: {
      width: 28,
      height: 28,
    },
    balanceText: {
      ...TYPOGRAPHY.H2,
      color: '#FFFFFF',
      fontWeight: '800',
    },
    loadingRow: {
      minHeight: 58,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: SPACING.sm,
    },
    loadingText: {
      ...TYPOGRAPHY.SmallBold,
      color: '#EBD9FF',
    },
    cardStack: {
      gap: SPACING.md,
    },
    unlockCard: {
      minHeight: 132,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(218, 128, 255, 0.54)',
      backgroundColor: 'rgba(86, 19, 156, 0.52)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      shadowColor: '#D46BFF',
      shadowOpacity: 0.32,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
      overflow: 'hidden',
    },
    cardContent: {
      flex: 1,
      minHeight: 96,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tokenCardInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.md,
    },
    videoCardInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.xl,
    },
    videoIconBox: {
      width: 74,
      height: 74,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(108, 33, 196, 0.8)',
      borderWidth: 1,
      borderColor: 'rgba(207, 130, 255, 0.44)',
    },
    cardNumber: {
      ...TYPOGRAPHY.Display,
      color: '#FFFFFF',
      fontWeight: '900',
      letterSpacing: 0,
    },
    cardTokenIcon: {
      width: 76,
      height: 76,
    },
    progressText: {
      ...TYPOGRAPHY.SmallBold,
      color: '#EBD9FF',
      textAlign: 'center',
    },
    inlineMessage: {
      ...TYPOGRAPHY.SmallBold,
      color: '#FFFFFF',
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.md,
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.14)',
      overflow: 'hidden',
    },
    closeButton: {
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: SPACING.xs,
    },
    closeText: {
      ...TYPOGRAPHY.H3,
      color: '#B56BFF',
      fontWeight: '800',
    },
    disabled: {
      opacity: 0.54,
    },
  });
}
