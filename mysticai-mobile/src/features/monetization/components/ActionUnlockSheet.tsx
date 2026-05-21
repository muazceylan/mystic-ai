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
import { ACCESSIBILITY, RADIUS, SPACING, TYPOGRAPHY } from '../../../constants/tokens';
import { getUnlockOptions, unlockWithToken } from '../api/monetization.service';
import { trackMonetizationEvent } from '../analytics/monetizationAnalytics';
import { useModuleMonetization } from '../hooks/useModuleMonetization';
import { useRewardedAdContentUnlock } from '../hooks/useRewardedAdContentUnlock';
import { useGuruWalletStore } from '../store/useGuruWalletStore';
import type { UnlockOptions } from '../types';

const GURU_TOKEN_BALANCE = require('../../../../assets/guru-token-balance.png');
const GURU_TOKEN_CARD = require('../../../../assets/guru-token-card.png');
const REWARDED_VIDEO_CARD = require('../../../../assets/rewarded-video-card.png');

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
  contentKey?: string;
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

function isGenericEnglishMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return normalized.includes('unexpected error')
    || normalized.includes('internal server error')
    || normalized.includes('please try again later')
    || normalized === 'network error';
}

function toPremiumUserMessage(message: string | null | undefined, fallback: string): string {
  if (!message || !message.trim() || isGenericEnglishMessage(message)) {
    return fallback;
  }

  const normalized = message.trim();
  const lower = normalized.toLowerCase();
  if (lower.includes('ad load') || lower.includes('load failed')) {
    return 'Reklam yüklenemedi. Bağlantını kontrol edip tekrar deneyebilirsin.';
  }
  if (lower.includes('not completed') || lower.includes('dismiss') || lower.includes('cancel')) {
    return 'Reklam tamamlanmadı.\nİçeriği açmak için videoyu sonuna kadar izlemelisin.';
  }
  if (lower.includes('missing_ad_unit') || lower.includes('native_module') || lower.includes('sdk_not_initialized')) {
    return 'Reklam şu anda hazır değil. Lütfen biraz sonra tekrar deneyin.';
  }

  return normalized;
}

function getFriendlyApiMessage(error: unknown, fallback: string): string {
  return toPremiumUserMessage(getApiMessage(error), fallback);
}

export function ActionUnlockSheet({
  visible,
  moduleKey,
  actionKey,
  contentKey,
  title,
  onClose,
  onUnlocked,
  onShowPurchase,
  closeLabel,
}: ActionUnlockSheetProps) {
  const { t, i18n } = useTranslation();
  const styles = useMemo(() => createStyles(), []);
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
  const effectiveTitle = title || action?.dialogTitle || action?.displayName || actionKey;
  const tokenRequirement = Math.max(1, options?.tokenRequirement ?? unlockState.guruCost ?? 1);
  const userGuruBalance = options?.userGuruBalance ?? balance;
  const tokenUnlockEnabled = options?.tokenUnlockEnabled ?? unlockState.guruEnabled;
  const rewardedAdEnabled = options?.rewardedAdEnabled ?? unlockState.adEnabled;
  const rewardedAdViewsRequired = options?.rewardedAdViewsRequired ?? Math.max(1, tokenRequirement);
  const rewardAnalyticsContext = useMemo(() => ({
    contentKey,
    tokenRequirement,
    userGuruBalance,
    rewardedAdViewsRequired,
  }), [contentKey, rewardedAdViewsRequired, tokenRequirement, userGuruBalance]);
  const rewardedUnlock = useRewardedAdContentUnlock(moduleKey, actionKey, contentKey, rewardAnalyticsContext);
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
      const nextOptions = await getUnlockOptions(moduleKey, actionKey, contentKey);
      setOptions(nextOptions);
    } catch (error) {
      setInlineMessage(getFriendlyApiMessage(error, t('monetization.unlockOptionsUnavailableHint')));
    } finally {
      setOptionsLoading(false);
    }
  }, [actionKey, contentKey, moduleKey, t]);

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
      contentKey,
      tokenRequirement,
      userGuruBalance,
      rewardedAdViewsRequired,
    });
  }, [actionKey, contentKey, moduleKey, rewardedAdViewsRequired, sheetVisible, tokenRequirement, userGuruBalance]);

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
      contentKey,
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
        contentKey,
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
        contentKey,
      });

      if (!response.unlocked) {
        setInlineMessage(toPremiumUserMessage(response.message, t('monetization.guruFailedError')));
        trackMonetizationEvent('unlock_with_token_failed', {
          moduleKey,
          actionKey,
          contentKey,
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
        contentKey,
        tokenRequirement,
        userGuruBalance,
        spentGuru: response.spentGuru,
        remainingGuru: response.remainingGuru,
        rewardedAdViewsRequired,
      });
      await completeUnlock();
    } catch (error) {
      const message = getFriendlyApiMessage(error, t('monetization.guruFailedError'));
      setInlineMessage(message);
      trackMonetizationEvent('unlock_with_token_failed', {
        moduleKey,
        actionKey,
        contentKey,
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
    contentKey,
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
      contentKey,
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
          : toPremiumUserMessage(result.message, t('monetization.adNotReadyMessage'));
        setInlineMessage(fallback);
        return;
      }
      await completeUnlock();
    } catch (error) {
      setInlineMessage(getFriendlyApiMessage(error, t('monetization.rewardedUnlockFailed')));
    } finally {
      rewardInFlightRef.current = false;
    }
  }, [
    actionKey,
    completeUnlock,
    contentKey,
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
              source={GURU_TOKEN_BALANCE}
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
            <PremiumMessage
              styles={styles}
              message={t('monetization.unlockOptionsUnavailableHint')}
            />
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
                  <View style={styles.cardInner}>
                    <View style={styles.cardIconTile}>
                      <Image
                        source={GURU_TOKEN_CARD}
                        style={styles.cardTileImage}
                        resizeMode="contain"
                        accessibilityIgnoresInvertColors
                      />
                    </View>
                    <View style={styles.cardNumberSlot}>
                      <Text style={styles.cardNumber}>{tokenRequirement}</Text>
                    </View>
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
                  <View style={styles.cardInner}>
                    <View style={styles.cardIconTile}>
                      <Image
                        source={REWARDED_VIDEO_CARD}
                        style={styles.cardTileImage}
                        resizeMode="contain"
                        accessibilityIgnoresInvertColors
                      />
                    </View>
                    <View style={styles.cardNumberSlot}>
                      <Text style={styles.cardNumber}>{rewardedAdViewsRequired}</Text>
                    </View>
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
            <PremiumMessage
              styles={styles}
              message={toPremiumUserMessage(
                inlineMessage ?? rewardedUnlock.message,
                t('monetization.rewardedUnlockFailed'),
              )}
            />
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
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(131, 35, 210, 0.70)', 'rgba(68, 13, 126, 0.62)', 'rgba(97, 29, 156, 0.56)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      />
      <View pointerEvents="none" style={styles.cardTopGlow} />
      <View pointerEvents="none" style={styles.cardDotField}>
        {Array.from({ length: 18 }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.cardDot,
              {
                top: `${12 + (index % 6) * 12}%`,
                left: `${60 + Math.floor(index / 6) * 9}%`,
                opacity: 0.12 + (index % 3) * 0.07,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.cardContent}>{children}</View>
      <Ionicons name="chevron-forward" size={34} color="#F7ECFF" style={styles.chevronIcon} />
    </TouchableOpacity>
  );
}

function PremiumMessage({
  message,
  styles,
}: {
  message: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.messagePill}>
      <Ionicons name="alert-circle" size={18} color="#FFD6F2" />
      <Text
        style={styles.messageText}
        maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
      >
        {message}
      </Text>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    sheet: {
      backgroundColor: 'transparent',
      overflow: 'hidden',
      borderTopLeftRadius: 40,
      borderTopRightRadius: 40,
    },
    sheetContent: {
      paddingHorizontal: 0,
    },
    dragHandle: {
      backgroundColor: '#7D39D6',
      width: 54,
      height: 6,
      borderRadius: 999,
      marginBottom: 0,
    },
    gradient: {
      borderTopLeftRadius: 40,
      borderTopRightRadius: 40,
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
      paddingHorizontal: 36,
      paddingTop: 34,
      paddingBottom: 28,
      gap: 22,
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
      fontSize: 34,
      lineHeight: 42,
      color: '#FFFFFF',
      fontWeight: '900',
      letterSpacing: 0,
    },
    balanceRow: {
      minHeight: 72,
      borderRadius: 32,
      borderWidth: 1,
      borderColor: 'rgba(218, 132, 255, 0.52)',
      backgroundColor: 'rgba(129, 35, 203, 0.60)',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 26,
      gap: 14,
      shadowColor: '#F0B7FF',
      shadowOpacity: 0.34,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
      overflow: 'hidden',
    },
    balanceIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
    },
    balanceText: {
      fontSize: 34,
      lineHeight: 40,
      color: '#FFFFFF',
      fontWeight: '900',
      letterSpacing: 0,
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
      gap: 20,
      marginTop: 8,
    },
    unlockCard: {
      minHeight: 162,
      borderRadius: 30,
      borderWidth: 1,
      borderColor: 'rgba(224, 129, 255, 0.56)',
      backgroundColor: 'rgba(87, 19, 156, 0.64)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 26,
      shadowColor: '#D46BFF',
      shadowOpacity: 0.38,
      shadowRadius: 26,
      shadowOffset: { width: 0, height: 10 },
      elevation: 14,
      overflow: 'hidden',
    },
    cardGradient: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 30,
    },
    cardTopGlow: {
      position: 'absolute',
      top: -24,
      left: 24,
      right: 28,
      height: 68,
      borderRadius: 60,
      backgroundColor: 'rgba(194, 67, 255, 0.20)',
      shadowColor: '#F7B3FF',
      shadowOpacity: 0.35,
      shadowRadius: 32,
    },
    cardDotField: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: '48%',
    },
    cardDot: {
      position: 'absolute',
      width: 2,
      height: 2,
      borderRadius: 1,
      backgroundColor: '#F8E9FF',
    },
    cardContent: {
      flex: 1,
      minHeight: 116,
      justifyContent: 'center',
      alignItems: 'stretch',
    },
    cardInner: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 116,
    },
    cardIconTile: {
      width: 116,
      height: 116,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(155, 66, 244, 0.58)',
      overflow: 'hidden',
      shadowColor: '#A94CFF',
      shadowOpacity: 0.42,
      shadowRadius: 18,
    },
    cardTileImage: {
      width: 116,
      height: 116,
      borderRadius: 28,
    },
    cardNumberSlot: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingRight: 26,
    },
    cardNumber: {
      fontSize: 64,
      lineHeight: 74,
      color: '#FFFFFF',
      fontWeight: '900',
      letterSpacing: 0,
    },
    chevronIcon: {
      marginLeft: 4,
    },
    progressText: {
      ...TYPOGRAPHY.SmallBold,
      color: '#EBD9FF',
      textAlign: 'center',
    },
    messagePill: {
      minHeight: 52,
      borderRadius: RADIUS.lg,
      backgroundColor: 'rgba(91, 32, 92, 0.72)',
      borderWidth: 1,
      borderColor: 'rgba(255, 156, 214, 0.28)',
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      shadowColor: '#FF7BD5',
      shadowOpacity: 0.18,
      shadowRadius: 14,
    },
    messageText: {
      ...TYPOGRAPHY.SmallBold,
      color: '#FFF2FA',
      textAlign: 'center',
      lineHeight: 20,
      flexShrink: 1,
    },
    closeButton: {
      minHeight: 52,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    closeText: {
      fontSize: 24,
      lineHeight: 30,
      color: '#B56BFF',
      fontWeight: '900',
      letterSpacing: 0,
    },
    disabled: {
      opacity: 0.54,
    },
  });
}
