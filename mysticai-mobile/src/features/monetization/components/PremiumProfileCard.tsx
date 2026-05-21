import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ACCESSIBILITY } from '../../../constants/tokens';
import { trackEvent } from '../../../services/analytics';

interface PremiumProfileCardProps {
  isPremium?: boolean;
  annualBadgeLabel?: string | null;
  onManageSubscription?: () => void;
  onPress: () => void;
}

const COLORS = {
  deepPurple: '#16002F',
  royalPurple: '#4B10A8',
  neonPurple: '#A855F7',
  softPurple: '#C084FC',
  gold: '#FFD76A',
  white: '#FFFFFF',
  textSoft: 'rgba(255,255,255,0.82)',
  border: 'rgba(255,255,255,0.20)',
} as const;

export function PremiumProfileCard({
  isPremium = false,
  annualBadgeLabel = null,
  onManageSubscription,
  onPress,
}: PremiumProfileCardProps) {
  const { t } = useTranslation();
  const trackedViewRef = useRef(false);
  const handlePress = isPremium && onManageSubscription ? onManageSubscription : onPress;

  useEffect(() => {
    if (trackedViewRef.current) {
      return;
    }
    trackedViewRef.current = true;
    trackEvent('premium_profile_card_viewed', {
      source: 'profile',
      is_premium_user: Boolean(isPremium),
    });
  }, [isPremium]);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={isPremium ? t('profile.premium.active') : t('profile.premium.cardA11y')}
      style={styles.touchTarget}
    >
      <LinearGradient
        colors={[COLORS.deepPurple, COLORS.royalPurple, '#2B0768', COLORS.deepPurple] as const}
        locations={[0, 0.42, 0.72, 1]}
        start={{ x: 0.03, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <CosmicTexture />

        <View style={styles.mainRow}>
          <View style={styles.crownStage}>
            <View style={styles.crownGlow} />
            <LinearGradient
              colors={['#FFF4B7', COLORS.gold, '#A855F7'] as const}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.crownShell}
            >
              <Crown size={54} color="#FFFFFF" strokeWidth={2.4} />
              <Ionicons name="moon" size={15} color={COLORS.gold} style={styles.crownMoon} />
            </LinearGradient>
            <View style={styles.crownPlatform} />
          </View>

          <View style={styles.copy}>
            <Text
              style={styles.title}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.76}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              {isPremium ? t('profile.premium.activeShort') : t('profile.premium.cardTitle')}
            </Text>

            <View style={[styles.trialPill, isPremium && styles.activePill]}>
              <Ionicons name={isPremium ? 'checkmark-circle' : 'star'} size={15} color={COLORS.gold} />
              <Text
                style={styles.trialPillText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              >
                {isPremium ? t('profile.premium.activeBenefit') : t('profile.premium.trial')}
              </Text>
            </View>

            <Text
              style={styles.description}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              {isPremium ? t('profile.premium.activeDescNew') : t('profile.premium.cardDescription')}
            </Text>

            {!isPremium ? (
              <View style={styles.cancelRow}>
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={13} color={COLORS.softPurple} />
                </View>
                <Text style={styles.cancelText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  {t('profile.premium.cancelAnytime')}
                </Text>
              </View>
            ) : null}

            <View style={styles.chipRow}>
              <FeatureChip
                iconName="calendar-outline"
                label={t('premium.monthly')}
                sublabel={t('profile.premium.monthlySublabel')}
              />
              <FeatureChip
                iconName="sparkles-outline"
                label={t('premium.yearly')}
                sublabel={annualBadgeLabel || t('profile.premium.yearlySublabel')}
                featured
              />
              <FeatureChip
                iconName="star"
                label={t('profile.premium.specialContent')}
                sublabel={t('profile.premium.specialContentSublabel')}
              />
            </View>

            <View style={[styles.cta, isPremium && styles.ctaActive]}>
              <View style={styles.ctaTextWrap}>
                <Text
                  style={[styles.ctaText, isPremium && styles.ctaTextActive]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.78}
                  maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                >
                  {isPremium ? t('profile.premium.manageCta') : t('profile.premium.cta')}
                </Text>
                {!isPremium ? (
                  <Text style={styles.ctaSubtext} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                    {t('profile.premium.ctaSubtext')}
                  </Text>
                ) : null}
              </View>
              {!isPremium ? <Ionicons name="chevron-forward" size={20} color="#3B0F74" /> : null}
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function FeatureChip({
  iconName,
  label,
  sublabel,
  featured,
}: {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  sublabel: string;
  featured?: boolean;
}) {
  return (
    <View style={[styles.chip, featured && styles.chipFeatured]}>
      <Ionicons name={iconName} size={14} color={featured ? COLORS.gold : '#E9D5FF'} />
      <Text
        style={[styles.chipText, featured && styles.chipTextFeatured]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
      >
        {label}
      </Text>
      <Text
        style={[styles.chipSubtext, featured && styles.chipTextFeatured]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
      >
        {sublabel}
      </Text>
    </View>
  );
}

function CosmicTexture() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <View style={[styles.starDot, styles.starA]} />
      <View style={[styles.starDot, styles.starB]} />
      <View style={[styles.starDot, styles.starC]} />
      <View style={[styles.starDot, styles.starD]} />
      <Ionicons name="sparkles" size={15} color="rgba(255,255,255,0.82)" style={styles.sparkleA} />
      <Ionicons name="sparkles" size={12} color="rgba(255,215,106,0.78)" style={styles.sparkleB} />
      <View style={styles.planet}>
        <View style={styles.planetRing} />
      </View>
      <View style={styles.bottomGlow} />
    </View>
  );
}

const styles = StyleSheet.create({
  touchTarget: {
    marginBottom: 18,
  },
  card: {
    minHeight: 276,
    borderRadius: 28,
    padding: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.neonPurple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.34,
    shadowRadius: 22,
    elevation: 9,
  },
  mainRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  crownStage: {
    width: 118,
    minHeight: 168,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crownGlow: {
    position: 'absolute',
    width: 126,
    height: 126,
    borderRadius: 63,
    backgroundColor: 'rgba(168,85,247,0.24)',
    shadowColor: COLORS.neonPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 26,
  },
  crownShell: {
    width: 108,
    height: 102,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-7deg' }],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.38)',
  },
  crownMoon: {
    position: 'absolute',
    bottom: 30,
    right: 31,
  },
  crownPlatform: {
    width: 106,
    height: 14,
    borderRadius: 999,
    marginTop: -7,
    backgroundColor: 'rgba(192,132,252,0.52)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    shadowColor: COLORS.neonPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.78,
    shadowRadius: 16,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 10,
  },
  title: {
    color: COLORS.white,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
  },
  trialPill: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(255,215,106,0.08)',
  },
  activePill: {
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  trialPillText: {
    color: COLORS.gold,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  description: {
    color: COLORS.textSoft,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  cancelRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkCircle: {
    width: 23,
    height: 23,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.neonPurple,
    backgroundColor: 'rgba(168,85,247,0.16)',
  },
  cancelText: {
    flex: 1,
    color: 'rgba(255,255,255,0.86)',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    flex: 1,
    minWidth: 0,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  chipFeatured: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(255,215,106,0.10)',
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  chipTextFeatured: {
    color: COLORS.gold,
  },
  chipSubtext: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  cta: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 19,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.72,
    shadowRadius: 14,
  },
  ctaActive: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.22)',
    shadowOpacity: 0,
  },
  ctaTextWrap: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  ctaText: {
    color: '#32106F',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
    textAlign: 'center',
  },
  ctaTextActive: {
    color: COLORS.white,
  },
  ctaSubtext: {
    color: '#7C3AED',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  starDot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  starA: { left: 24, top: 26 },
  starB: { right: 72, top: 42 },
  starC: { left: 48, bottom: 30 },
  starD: { right: 38, bottom: 72 },
  sparkleA: { position: 'absolute', top: 28, right: 104 },
  sparkleB: { position: 'absolute', bottom: 52, left: 112 },
  planet: {
    position: 'absolute',
    top: 24,
    right: 18,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(168,85,247,0.38)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  planetRing: {
    position: 'absolute',
    left: -12,
    top: 25,
    width: 78,
    height: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    transform: [{ rotate: '-18deg' }],
  },
  bottomGlow: {
    position: 'absolute',
    left: -40,
    right: -40,
    bottom: -72,
    height: 136,
    borderRadius: 999,
    backgroundColor: 'rgba(168,85,247,0.24)',
  },
});
