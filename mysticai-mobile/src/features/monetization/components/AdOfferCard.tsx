import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme, ThemeColors } from '../../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS, ACCESSIBILITY } from '../../../constants/tokens';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { PREMIUM_ICONS } from '../../../constants/icons';
import { useRewardedUnlock } from '../hooks/useRewardedUnlock';
import { useMonetizationStore } from '../store/useMonetizationStore';
import { MonetizationEvents } from '../analytics/monetizationAnalytics';
import { useTranslation } from 'react-i18next';

interface AdOfferCardProps {
  moduleKey: string;
  actionKey?: string;
  onComplete: () => void;
  onDismiss: () => void;
}

export function AdOfferCard({ moduleKey, actionKey, onComplete, onDismiss }: AdOfferCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = createStyles(colors);
  const { status, startRewardedUnlock, reset } = useRewardedUnlock(moduleKey, actionKey);
  const { getModuleRule } = useMonetizationStore();
  const rule = getModuleRule(moduleKey);
  const trackedRef = useRef(false);

  const rewardAmount = rule?.guruRewardAmountPerCompletedAd ?? 1;
  const isProcessing = status === 'loading_ad' || status === 'showing_ad' || status === 'processing_reward';

  useEffect(() => {
    if (!trackedRef.current) {
      MonetizationEvents.adOfferViewed(moduleKey, actionKey);
      trackedRef.current = true;
    }
  }, [moduleKey, actionKey]);

  useEffect(() => {
    if (status === 'success') {
      onComplete();
      reset();
    }
  }, [status, onComplete, reset]);

  const handleWatchAd = async () => {
    MonetizationEvents.adOfferClicked(moduleKey, actionKey);
    await startRewardedUnlock();
  };

  const handleDismiss = () => {
    MonetizationEvents.adOfferDismissed(moduleKey, actionKey);
    onDismiss();
  };

  const statusLabel = (() => {
    switch (status) {
      case 'loading_ad': return t('monetization.adStatusLoading');
      case 'showing_ad': return t('monetization.adStatusShowing');
      case 'processing_reward': return t('monetization.adStatusProcessing');
      default: return null;
    }
  })();

  return (
    <Card variant="outlined" style={s.card}>
      <View style={s.header}>
        <Text
          style={s.icon}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          {'🎬'}
        </Text>
        <View style={s.headerText}>
          <Text
            style={s.title}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {t('monetization.adCardTitle')}
          </Text>
          <Text
            style={s.subtitle}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {t('monetization.adCardSubtitle', { count: String(rewardAmount) })}
          </Text>
        </View>
      </View>

      {status === 'failed' && (
        <View style={s.errorRow}>
          <Text
            style={s.errorText}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {t('monetization.adLoadError')}
          </Text>
        </View>
      )}

      {statusLabel && (
        <View style={s.statusRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text
            style={s.statusText}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {statusLabel}
          </Text>
        </View>
      )}

      <View style={s.actions}>
        <Button
          title={t('monetization.adWatchBtn')}
          onPress={handleWatchAd}
          loading={isProcessing}
          disabled={isProcessing}
          leftIcon={PREMIUM_ICONS.ad}
          size="md"
          style={s.watchButton}
        />
        <Button
          title={t('monetization.dismissBtn')}
          onPress={handleDismiss}
          variant="ghost"
          size="sm"
          disabled={isProcessing}
        />
      </View>
    </Card>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    card: {
      padding: SPACING.lg,
      borderColor: C.primarySoft,
      backgroundColor: C.primarySoftBg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING.md,
    },
    icon: {
      fontSize: 28,
      marginTop: 2,
    },
    headerText: {
      flex: 1,
    },
    title: {
      ...TYPOGRAPHY.H3,
      color: C.text,
      marginBottom: SPACING.xs,
    },
    subtitle: {
      ...TYPOGRAPHY.Small,
      color: C.subtext,
    },
    rewardHighlight: {
      ...TYPOGRAPHY.SmallBold,
      color: C.gold,
    },
    errorRow: {
      marginTop: SPACING.sm,
      paddingVertical: SPACING.xs,
      paddingHorizontal: SPACING.sm,
      backgroundColor: C.redBg,
      borderRadius: RADIUS.sm,
    },
    errorText: {
      ...TYPOGRAPHY.Caption,
      color: C.red,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginTop: SPACING.md,
    },
    statusText: {
      ...TYPOGRAPHY.Small,
      color: C.subtext,
    },
    actions: {
      marginTop: SPACING.lg,
      gap: SPACING.sm,
    },
    watchButton: {
      width: '100%',
    },
  });
}
