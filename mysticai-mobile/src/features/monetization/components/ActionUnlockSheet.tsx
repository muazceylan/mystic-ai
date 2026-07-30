import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
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
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(width < 370), [width]);
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
  const premiumAccessActive = monetization.premiumActive || monetization.trialing;
  const rewardedAdEnabled = !premiumAccessActive && (options?.rewardedAdEnabled ?? unlockState.adEnabled);
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
  const waitingForContentUnlockOptions = sheetVisible && Boolean(contentKey) && options === null && !inlineMessage;
  const shouldRenderSheet = sheetVisible
    && !unlockState.isFree
    && !options?.alreadyUnlocked
    && !waitingForContentUnlockOptions;

  const clearRedirectTimer = useCallback(() => {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
  }, []);

  const completeUnlock = useCallback(async () => {
    setHiddenAfterUnlock(true);
    await onUnlocked();
  }, [onUnlocked]);

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
    if (!shouldRenderSheet || hasTrackedOpen.current) return;
    hasTrackedOpen.current = true;
    trackMonetizationEvent('unlock_modal_viewed', {
      moduleKey,
      actionKey,
      contentKey,
      tokenRequirement,
      userGuruBalance,
      rewardedAdViewsRequired,
    });
  }, [actionKey, contentKey, moduleKey, rewardedAdViewsRequired, shouldRenderSheet, tokenRequirement, userGuruBalance]);

  useEffect(() => {
    if (!sheetVisible || !options?.alreadyUnlocked || hasTriggeredAutoUnlock.current) {
      return;
    }

    hasTriggeredAutoUnlock.current = true;
    void completeUnlock();
  }, [completeUnlock, options?.alreadyUnlocked, sheetVisible]);

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

  if (!shouldRenderSheet) {
    return null;
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      sheetStyle={styles.sheet}
      contentStyle={styles.sheetContent}
      dragHandleStyle={styles.dragHandle}
      blurBackdrop
      showDragHandle={false}
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
          <View style={styles.headerRow}>
            <Text
              style={styles.title}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
            >
              {effectiveTitle}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              disabled={isBusy}
              style={[styles.headerCloseButton, isBusy && styles.disabled]}
              accessibilityRole="button"
              accessibilityLabel={closeLabel ?? t('common.close')}
              activeOpacity={0.78}
            >
              <Ionicons name="close" size={30} color="#C98BFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.balanceRow}>
            <Image
              source={GURU_TOKEN_BALANCE}
              style={styles.balanceIcon}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
            <View style={styles.balanceCopy}>
              <Text
                style={styles.balanceLabel}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              >
                {t('monetization.currentBalance')}
              </Text>
              <View style={styles.balanceValueRow}>
                <Text
                  style={styles.balanceText}
                  maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                >
                  {userGuruBalance}
                </Text>
                <Text
                  style={styles.balanceUnit}
                  maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                >
                  Guru
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoPanel}>
            <View style={styles.infoIcon}>
              <Ionicons name="information" size={24} color="#B05CFF" />
            </View>
            <Text
              style={styles.unlockChoiceHint}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.86}
            >
              {t('monetization.unlockChoiceHint', { cost: tokenRequirement })}
            </Text>
            <Ionicons
              name="sparkles"
              size={15}
              color="#F0C5FF"
              pointerEvents="none"
              style={styles.infoSparkleTop}
            />
            <Ionicons
              name="sparkles"
              size={15}
              color="#F0C5FF"
              pointerEvents="none"
              style={styles.infoSparkleBottom}
            />
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
                    <View style={styles.cardDetails}>
                      <View style={[styles.cardBadge, styles.instantBadge]}>
                        <Ionicons name="flash" size={15} color="#FFD84D" />
                        <Text style={[styles.cardBadgeText, styles.instantBadgeText]}>
                          {t('monetization.instantBadge')}
                        </Text>
                      </View>
                      <Text
                        style={styles.cardTitle}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.78}
                      >
                        {t('monetization.guruCostTitle', { cost: tokenRequirement })}
                      </Text>
                      <Text style={styles.cardSubtitle} numberOfLines={1}>
                        {t('monetization.instantContinue')}
                      </Text>
                      <View style={styles.cardMetaRow}>
                        <Ionicons name="pricetag-outline" size={17} color="#B875FF" />
                        <Text
                          style={styles.cardMetaText}
                          numberOfLines={2}
                          adjustsFontSizeToFit
                          minimumFontScale={0.84}
                        >
                          {t('monetization.guruSpendMeta', { cost: tokenRequirement })}
                        </Text>
                      </View>
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
                    <View style={styles.cardDetails}>
                      <View style={[styles.cardBadge, styles.freeBadge]}>
                        <Ionicons name="gift-outline" size={15} color="#2EE8A4" />
                        <Text style={[styles.cardBadgeText, styles.freeBadgeText]}>
                          {t('monetization.freeBadge')}
                        </Text>
                      </View>
                      <Text
                        style={styles.cardTitle}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.72}
                      >
                        {t('monetization.videoTitle')}
                      </Text>
                      <Text style={styles.cardSubtitle} numberOfLines={1}>
                        {t('monetization.freeContinue')}
                      </Text>
                      <View style={styles.cardMetaRow}>
                        <Ionicons name="time-outline" size={17} color="#B875FF" />
                        <Text
                          style={styles.cardMetaText}
                          numberOfLines={2}
                          adjustsFontSizeToFit
                          minimumFontScale={0.84}
                        >
                          {t('monetization.shortVideoAccess')}
                        </Text>
                      </View>
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

          <View style={styles.dividerRow} pointerEvents="none">
            <View style={styles.dividerLine} />
            <Ionicons name="sparkles" size={22} color="#A94CFF" />
            <View style={styles.dividerLine} />
          </View>

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

function createStyles(isCompact: boolean) {
  return StyleSheet.create({
    sheet: {
      backgroundColor: 'transparent',
      overflow: 'hidden',
      borderRadius: 28,
      marginHorizontal: isCompact ? 8 : 12,
      marginBottom: isCompact ? 8 : 12,
      height: '94%',
      maxHeight: '96%',
      paddingBottom: 0,
    },
    sheetContent: {
      paddingHorizontal: 0,
    },
    dragHandle: {
      width: 0,
      height: 0,
      marginBottom: 0,
    },
    gradient: {
      borderRadius: 28,
      borderWidth: 1.5,
      borderColor: 'rgba(156, 64, 237, 0.82)',
      shadowColor: '#AD4CFF',
      shadowOpacity: 0.38,
      shadowOffset: { width: 0, height: -10 },
      shadowRadius: 24,
      elevation: 18,
      overflow: 'hidden',
    },
    scrollContent: {
      paddingHorizontal: isCompact ? 18 : 24,
      paddingTop: isCompact ? 22 : 28,
      paddingBottom: isCompact ? 18 : 24,
      gap: isCompact ? 14 : 18,
      flexGrow: 1,
      justifyContent: 'space-between',
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
    headerRow: {
      minHeight: 54,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: SPACING.md,
    },
    title: {
      flex: 1,
      fontSize: isCompact ? 32 : 38,
      lineHeight: isCompact ? 38 : 44,
      color: '#FFFFFF',
      fontWeight: '900',
      letterSpacing: 0,
    },
    headerCloseButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(149, 61, 224, 0.42)',
      backgroundColor: 'rgba(42, 9, 75, 0.54)',
    },
    balanceRow: {
      minHeight: isCompact ? 76 : 84,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: 'rgba(170, 75, 241, 0.50)',
      backgroundColor: 'rgba(91, 25, 160, 0.44)',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: isCompact ? 18 : 22,
      gap: 16,
      shadowColor: '#F0B7FF',
      shadowOpacity: 0.24,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      overflow: 'hidden',
    },
    balanceIcon: {
      width: isCompact ? 44 : 50,
      height: isCompact ? 44 : 50,
      borderRadius: 25,
    },
    balanceCopy: {
      flex: 1,
      justifyContent: 'center',
    },
    balanceLabel: {
      fontSize: isCompact ? 13 : 14,
      lineHeight: 18,
      color: 'rgba(229, 203, 255, 0.76)',
      fontWeight: '600',
    },
    balanceValueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 7,
    },
    balanceText: {
      fontSize: isCompact ? 30 : 34,
      lineHeight: isCompact ? 34 : 38,
      color: '#FFFFFF',
      fontWeight: '900',
      letterSpacing: 0,
    },
    balanceUnit: {
      fontSize: isCompact ? 23 : 26,
      lineHeight: isCompact ? 29 : 32,
      color: '#B687E6',
      fontWeight: '800',
    },
    infoPanel: {
      position: 'relative',
      minHeight: isCompact ? 70 : 76,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: 'rgba(180, 76, 255, 0.80)',
      backgroundColor: 'rgba(74, 15, 130, 0.56)',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: isCompact ? 14 : 18,
      paddingVertical: 12,
      gap: isCompact ? 11 : 14,
      shadowColor: '#B650FF',
      shadowOpacity: 0.24,
      shadowRadius: 18,
      overflow: 'visible',
    },
    infoIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#8830D7',
      backgroundColor: 'rgba(61, 10, 112, 0.76)',
    },
    unlockChoiceHint: {
      flex: 1,
      fontSize: isCompact ? 12 : 13,
      lineHeight: isCompact ? 17 : 18,
      color: 'rgba(255, 255, 255, 0.86)',
      textAlign: 'left',
    },
    infoSparkleTop: {
      position: 'absolute',
      top: -8,
      left: -7,
    },
    infoSparkleBottom: {
      position: 'absolute',
      right: -7,
      bottom: -7,
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
      gap: isCompact ? 14 : 18,
      marginTop: 2,
    },
    unlockCard: {
      minHeight: isCompact ? 148 : 164,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(208, 102, 255, 0.72)',
      backgroundColor: 'rgba(87, 19, 156, 0.66)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: isCompact ? 14 : 18,
      shadowColor: '#D46BFF',
      shadowOpacity: 0.30,
      shadowRadius: 22,
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
      minHeight: isCompact ? 116 : 130,
      justifyContent: 'center',
      alignItems: 'stretch',
    },
    cardInner: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: isCompact ? 116 : 130,
      gap: isCompact ? 12 : 16,
    },
    cardIconTile: {
      width: isCompact ? 96 : 112,
      height: isCompact ? 96 : 112,
      borderRadius: 24,
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
      width: isCompact ? 96 : 112,
      height: isCompact ? 96 : 112,
      borderRadius: 24,
    },
    cardDetails: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'flex-start',
      minWidth: 0,
      gap: isCompact ? 2 : 4,
    },
    cardBadge: {
      minHeight: 26,
      borderRadius: 10,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 3,
      marginBottom: 1,
    },
    instantBadge: {
      borderColor: 'rgba(255, 209, 55, 0.76)',
      backgroundColor: 'rgba(92, 50, 85, 0.72)',
    },
    freeBadge: {
      borderColor: 'rgba(24, 222, 150, 0.82)',
      backgroundColor: 'rgba(22, 100, 93, 0.46)',
    },
    cardBadgeText: {
      fontSize: isCompact ? 10 : 11,
      lineHeight: 14,
      fontWeight: '900',
      letterSpacing: 0.3,
    },
    instantBadgeText: {
      color: '#FFD84D',
    },
    freeBadgeText: {
      color: '#2EE8A4',
    },
    cardTitle: {
      width: '100%',
      fontSize: isCompact ? 28 : 32,
      lineHeight: isCompact ? 34 : 38,
      color: '#FFFFFF',
      fontWeight: '900',
      letterSpacing: 0,
    },
    cardSubtitle: {
      width: '100%',
      fontSize: isCompact ? 16 : 18,
      lineHeight: isCompact ? 20 : 22,
      color: '#B05CFF',
      fontWeight: '700',
    },
    cardMetaRow: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 3,
    },
    cardMetaText: {
      flex: 1,
      fontSize: isCompact ? 10.5 : 11.5,
      lineHeight: isCompact ? 14 : 16,
      color: 'rgba(230, 206, 248, 0.72)',
    },
    chevronIcon: {
      marginLeft: isCompact ? 2 : 5,
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
      marginTop: -8,
    },
    closeText: {
      fontSize: isCompact ? 20 : 22,
      lineHeight: 28,
      color: '#B56BFF',
      fontWeight: '900',
      letterSpacing: 0,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginTop: 4,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: 'rgba(153, 72, 220, 0.44)',
    },
    disabled: {
      opacity: 0.54,
    },
  });
}
