import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../context/ThemeContext';
import { SpotlightTarget } from '../../tutorial/components/SpotlightTarget';
import {
  BIRTH_CHART_TUTORIAL_TARGET_KEYS,
  COMPATIBILITY_TUTORIAL_TARGET_KEYS,
  COSMIC_PLANNER_TUTORIAL_TARGET_KEYS,
  DAILY_TRANSITS_TUTORIAL_TARGET_KEYS,
  DECISION_COMPASS_TUTORIAL_TARGET_KEYS,
  DREAMS_TUTORIAL_TARGET_KEYS,
  HOME_TUTORIAL_TARGET_KEYS,
  NAME_ANALYSIS_TUTORIAL_TARGET_KEYS,
  NUMEROLOGY_TUTORIAL_TARGET_KEYS,
  PROFILE_TUTORIAL_TARGET_KEYS,
  SPIRITUAL_PRACTICE_TUTORIAL_TARGET_KEYS,
} from '../../tutorial/domain/tutorial.constants';
import { MonetizationEvents } from '../analytics/monetizationAnalytics';
import { useModuleMonetization } from '../hooks/useModuleMonetization';
import { useRewardedUnlock } from '../hooks/useRewardedUnlock';
import { useMonetizationStore } from '../store/useMonetizationStore';
import type { MonetizationConfig } from '../types';
import { PurchaseCatalogSheet } from './PurchaseCatalogSheet';

const MODULE_PRIORITY = ['dreams', 'compatibility', 'numerology'] as const;
const FALLBACK_MODULE_KEY = 'dreams';
const GURU_ICON = require('../../../../assets/brand/logo/astro-guru-icon-512.png');
const GURU_REWARD_ICON = require('../../../../assets/brand/logo/astro-guru-icon-512.png');
const TUTORIAL_TARGET_BY_PATH: Record<string, string> = {
  '/(tabs)/home': HOME_TUTORIAL_TARGET_KEYS.MONETIZATION_ENTRY,
  '/(tabs)/daily-transits': DAILY_TRANSITS_TUTORIAL_TARGET_KEYS.MONETIZATION_ENTRY,
  '/(tabs)/calendar': COSMIC_PLANNER_TUTORIAL_TARGET_KEYS.MONETIZATION_ENTRY,
  '/decision-compass': DECISION_COMPASS_TUTORIAL_TARGET_KEYS.MONETIZATION_ENTRY,
  '/(tabs)/compatibility': COMPATIBILITY_TUTORIAL_TARGET_KEYS.MONETIZATION_ENTRY,
  '/(tabs)/natal-chart': BIRTH_CHART_TUTORIAL_TARGET_KEYS.MONETIZATION_ENTRY,
  '/(tabs)/dreams': DREAMS_TUTORIAL_TARGET_KEYS.MONETIZATION_ENTRY,
  '/numerology': NUMEROLOGY_TUTORIAL_TARGET_KEYS.MONETIZATION_ENTRY,
  '/(tabs)/name-analysis': NAME_ANALYSIS_TUTORIAL_TARGET_KEYS.MONETIZATION_ENTRY,
  '/(tabs)/spiritual': SPIRITUAL_PRACTICE_TUTORIAL_TARGET_KEYS.MONETIZATION_ENTRY,
  '/(tabs)/profile': PROFILE_TUTORIAL_TARGET_KEYS.MONETIZATION_ENTRY,
};

function resolveRewardModuleKey(
  config: MonetizationConfig | null,
): string | null {
  if (!config?.moduleRules?.length) return null;

  const eligibleRule = config.moduleRules.find((rule) => rule.enabled && rule.adsEnabled);
  if (!eligibleRule) return null;

  const preferredRule = MODULE_PRIORITY
    .map((moduleKey) => config.moduleRules.find((rule) => rule.moduleKey === moduleKey))
    .find((rule) => rule?.enabled && rule.adsEnabled);

  return preferredRule?.moduleKey ?? eligibleRule.moduleKey;
}

interface MonetizationQuickBarProps {
  style?: StyleProp<ViewStyle>;
}

export function MonetizationQuickBar({ style }: MonetizationQuickBarProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const config = useMonetizationStore((state) => state.config);
  const rewardModuleKey = useMemo(() => resolveRewardModuleKey(config), [config]);
  const tutorialTargetKey = TUTORIAL_TARGET_BY_PATH[pathname] ?? null;
  const monetization = useModuleMonetization(rewardModuleKey ?? FALLBACK_MODULE_KEY);
  const [showPurchaseSheet, setShowPurchaseSheet] = useState(false);
  const {
    status: rewardStatus,
    startRewardedUnlock,
    reset: resetRewardedUnlock,
  } = useRewardedUnlock(rewardModuleKey ?? FALLBACK_MODULE_KEY);

  const isRewardBusy = rewardStatus === 'loading_ad'
    || rewardStatus === 'showing_ad'
    || rewardStatus === 'processing_reward';
  const rewardAmount = monetization.rule?.guruRewardAmountPerCompletedAd ?? 1;
  const showPackagesEntry = Boolean(config?.guruEnabled || (config?.products?.length ?? 0) > 0);
  const showFreeEntry = Boolean(rewardModuleKey && (config?.adsEnabled || monetization.adsEnabled));
  const canEarnFreeGuru = Boolean(rewardModuleKey && monetization.adsEnabled && monetization.isAdReady);

  if (!showPackagesEntry && !showFreeEntry) {
    return null;
  }

  const handleEarnFreeGuru = async () => {
    if (!canEarnFreeGuru || isRewardBusy || !rewardModuleKey) {
      Alert.alert(
        t('monetization.rewardUnavailableTitle'),
        t('monetization.rewardUnavailableBody'),
      );
      return;
    }

    const rewarded = await startRewardedUnlock();
    if (rewarded) {
      MonetizationEvents.tokenEarned(rewardAmount, rewardModuleKey, 'rewarded_ad');
      Alert.alert(
        t('monetization.rewardEarnedTitle'),
        t('monetization.rewardEarnedBody', { count: rewardAmount }),
      );
    }
    resetRewardedUnlock();
  };

  const content = (
    <View style={[styles.row, style]}>
      {showPackagesEntry ? (
        <Pressable
          onPress={() => setShowPurchaseSheet(true)}
          style={({ pressed }) => [
            styles.iconPressable,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('monetization.packages')}
        >
          <View style={styles.iconStack}>
            <View style={styles.guruOrb}>
              <Image source={GURU_ICON} style={styles.guruOrbImage} resizeMode="cover" />
            </View>

            <View style={styles.balanceBadge}>
              <Text style={styles.balanceBadgeText}>{monetization.walletBalance}</Text>
            </View>
          </View>
        </Pressable>
      ) : null}

      {showFreeEntry ? (
        <Pressable
          onPress={() => {
            void handleEarnFreeGuru();
          }}
          disabled={!canEarnFreeGuru || isRewardBusy}
          style={({ pressed }) => [
            styles.iconPressable,
            (!canEarnFreeGuru || isRewardBusy) && styles.disabled,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('monetization.free')}
        >
          <View style={styles.iconStack}>
            <LinearGradient
              colors={['#0E4E9F', '#0C66C4', '#1482D8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.freeOrb}
            >
              {isRewardBusy
                ? <ActivityIndicator size="small" color={colors.primary} />
                : (
                  <View style={styles.playGlyphShell}>
                    <Ionicons name="play" size={18} color={colors.primary} />
                  </View>
                )}
            </LinearGradient>

            <View style={styles.freeLabelBadge}>
              <Text style={styles.freeLabelText}>FREE</Text>
            </View>

            <View style={styles.rewardBadgeCluster} pointerEvents="none">
              <View style={styles.rewardBadge}>
                <Text style={styles.rewardBadgeText}>+{rewardAmount}</Text>
                <View style={styles.rewardBadgeIconShell}>
                  <Image source={GURU_REWARD_ICON} style={styles.rewardBadgeIcon} resizeMode="cover" />
                </View>
              </View>
              <View style={styles.rewardBubbleTail} />
            </View>
          </View>
        </Pressable>
      ) : null}

      <PurchaseCatalogSheet
        visible={showPurchaseSheet}
        onDismiss={() => setShowPurchaseSheet(false)}
      />
    </View>
  );

  if (!tutorialTargetKey) {
    return content;
  }

  return (
    <SpotlightTarget targetKey={tutorialTargetKey}>
      {content}
    </SpotlightTarget>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
    },
    iconPressable: {
      minWidth: 50,
      minHeight: 50,
    },
    iconStack: {
      width: 44,
      height: 46,
      justifyContent: 'center',
      alignItems: 'center',
    },
    guruOrb: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      backgroundColor: 'transparent',
    },
    guruOrbImage: {
      width: '100%',
      height: '100%',
      borderRadius: 23,
    },
    balanceBadge: {
      position: 'absolute',
      top: -1,
      right: -3,
      minWidth: 20,
      height: 20,
      paddingHorizontal: 5,
      borderRadius: 10,
      backgroundColor: '#12B84F',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.56)',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#159947',
      shadowOpacity: 0.18,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
      elevation: 2,
    },
    balanceBadgeText: {
      fontSize: 11,
      lineHeight: 12,
      fontWeight: '900',
      color: colors.white,
      letterSpacing: -0.2,
    },
    freeOrb: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(203,231,255,0.34)',
      shadowColor: '#165BB0',
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 14,
      elevation: 3,
    },
    playGlyphShell: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderWidth: 1,
      borderColor: 'rgba(123,77,255,0.18)',
      shadowColor: colors.primary,
      shadowOpacity: 0.12,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 10,
      elevation: 2,
    },
    freeLabelBadge: {
      position: 'absolute',
      bottom: -3,
      minWidth: 32,
      paddingHorizontal: 7,
      height: 16,
      borderRadius: 8,
      backgroundColor: '#0D2145',
      borderWidth: 1,
      borderColor: 'rgba(200,230,255,0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    freeLabelText: {
      fontSize: 7,
      lineHeight: 8,
      fontWeight: '900',
      color: colors.white,
      letterSpacing: 0.6,
    },
    rewardBadgeCluster: {
      position: 'absolute',
      top: -11,
      right: -6,
      alignItems: 'flex-end',
    },
    rewardBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      minWidth: 42,
      height: 24,
      paddingLeft: 7,
      paddingRight: 8,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderWidth: 1,
      borderColor: 'rgba(111,177,255,0.22)',
      shadowColor: '#2F6FBE',
      shadowOpacity: 0.12,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 10,
      elevation: 2,
    },
    rewardBubbleTail: {
      position: 'absolute',
      right: 11,
      bottom: -3,
      width: 8,
      height: 8,
      backgroundColor: 'rgba(255,255,255,0.94)',
      borderWidth: 1,
      borderColor: 'rgba(111,177,255,0.18)',
      borderRadius: 2,
      transform: [{ rotate: '45deg' }],
    },
    rewardBadgeText: {
      fontSize: 10,
      lineHeight: 11,
      fontWeight: '900',
      color: '#0E4E9F',
      letterSpacing: -0.1,
    },
    rewardBadgeIconShell: {
      width: 16,
      height: 16,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: 'rgba(14,78,159,0.14)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.88)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    rewardBadgeIcon: {
      width: 16,
      height: 16,
      borderRadius: 8,
    },
    disabled: {
      opacity: 0.52,
    },
    pressed: {
      opacity: 0.84,
    },
  });
}
