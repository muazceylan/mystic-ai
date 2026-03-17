import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BottomSheet } from './ui';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useAuthStore, isGuestUser } from '../store/useAuthStore';
import { canUseFeature, type FeatureKey } from '../utils/featureGate';
import { trackEvent } from '../services/analytics';
import { TYPOGRAPHY, SPACING } from '../constants/tokens';

interface GuestGateProps {
  visible: boolean;
  onClose: () => void;
  featureKey?: FeatureKey;
}

export function GuestGate({ visible, onClose, featureKey }: GuestGateProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const handleLinkAccount = () => {
    trackEvent('guest_gate_cta_tapped', {
      feature_key: featureKey ?? 'unknown',
      entry_point: 'guest_gate',
    });
    onClose();
    router.push('/link-account');
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('guestGate.title')}>
      <View style={s.content}>
        <View style={s.iconRow}>
          <View style={s.iconCircle}>
            <Ionicons name="lock-closed" size={28} color={colors.primary} />
          </View>
        </View>

        <Text style={s.description}>{t('guestGate.description')}</Text>

        <View style={s.perks}>
          {(['perk1', 'perk2', 'perk3'] as const).map((key) => (
            <View key={key} style={s.perkRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              <Text style={s.perkText}>{t(`guestGate.${key}`)}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={s.ctaButton}
          onPress={handleLinkAccount}
          accessibilityRole="button"
          accessibilityLabel={t('guestGate.cta')}
        >
          <Text style={s.ctaText}>{t('guestGate.cta')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.dismissButton}
          onPress={onClose}
          accessibilityRole="button"
        >
          <Text style={s.dismissText}>{t('guestGate.dismiss')}</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

/**
 * Hook to manage GuestGate visibility.
 *
 * Usage:
 *   const { guestGateProps, checkGated } = useGuestGate('premium_access');
 *   // In an event handler:
 *   if (checkGated()) return; // shows gate for guests, returns true if gated
 *   // ... rest of the handler
 */
export function useGuestGate(featureKey: FeatureKey) {
  const user = useAuthStore((s) => s.user);
  const [visible, setVisible] = useState(false);

  const checkGated = useCallback((): boolean => {
    if (!isGuestUser(user) && canUseFeature(user, featureKey)) {
      return false;
    }
    // Block only when feature actually requires registration
    if (!canUseFeature(user, featureKey)) {
      trackEvent('guest_gate_shown', {
        feature_key: featureKey,
        user_type: user?.userType ?? 'GUEST',
      });
      setVisible(true);
      return true;
    }
    return false;
  }, [user, featureKey]);

  const hide = useCallback(() => setVisible(false), []);

  return {
    checkGated,
    guestGateProps: {
      visible,
      onClose: hide,
      featureKey,
    },
  };
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    content: {
      paddingBottom: SPACING.lg,
    },
    iconRow: {
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    iconCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: C.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    description: {
      ...TYPOGRAPHY.Body,
      color: C.subtext,
      textAlign: 'center',
      marginBottom: SPACING.lg,
      lineHeight: 22,
    },
    perks: {
      gap: SPACING.sm,
      marginBottom: SPACING.lg,
    },
    perkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    perkText: {
      ...TYPOGRAPHY.Body,
      color: C.text,
      flex: 1,
    },
    ctaButton: {
      backgroundColor: C.primary,
      borderRadius: 28,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    ctaText: {
      ...TYPOGRAPHY.BodyBold,
      color: C.white,
    },
    dismissButton: {
      alignItems: 'center',
      paddingVertical: SPACING.sm,
    },
    dismissText: {
      ...TYPOGRAPHY.Body,
      color: C.subtext,
    },
  });
}
