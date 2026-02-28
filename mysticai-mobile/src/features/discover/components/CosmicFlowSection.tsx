import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, ThemeColors } from '../../../context/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../../constants/tokens';
import { AccessibleText } from '../../../components/ui/AccessibleText';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  useSkyPulse,
  useCosmicSummary,
  useWeeklySwot,
} from '../../../hooks/useHomeQueries';
import { useAuthStore } from '../../../store/useAuthStore';
import { SectionHeader } from './SectionHeader';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface FlowCardProps {
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBgColor: string;
  onPress: () => void;
  index: number;
}

function FlowCard({ title, subtitle, icon, iconColor, iconBgColor, onPress, index }: FlowCardProps) {
  const { colors, isDark } = useTheme();
  const scale = useSharedValue(1);
  const S = cardStyles(colors, isDark);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <Animated.View entering={FadeInDown.duration(350).delay(80 * index)}>
      <AnimatedPressable
        style={[S.card, animStyle]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        accessibilityRole="button"
      >
        <View style={[S.iconContainer, { backgroundColor: iconBgColor }]}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <View style={S.textCol}>
          <AccessibleText style={S.title} numberOfLines={1}>
            {title}
          </AccessibleText>
          <AccessibleText style={S.subtitle} numberOfLines={1}>
            {subtitle}
          </AccessibleText>
        </View>
        <Ionicons name="chevron-forward" size={14} color={colors.subtext} />
      </AnimatedPressable>
    </Animated.View>
  );
}

export function CosmicFlowSection() {
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const locale = (i18n.resolvedLanguage ?? i18n.language ?? 'tr').toLowerCase().startsWith('en')
    ? 'en'
    : 'tr';

  const skyPulse = useSkyPulse();
  const cosmicSummary = useCosmicSummary(
    user?.id
      ? {
          userId: user.id,
          locale,
          userGender: user.gender,
          maritalStatus: user.maritalStatus,
        }
      : null,
  );
  const weeklySwot = useWeeklySwot(user?.id);

  const isLoading = skyPulse.isLoading || cosmicSummary.isLoading;

  const skyData = skyPulse.data;
  const swotData = weeklySwot.data;

  const dailySummarySubtitle = skyData
    ? `${skyData.moonSignTurkish ?? skyData.moonSign} ${skyData.moonPhase}`
    : t('common.loading');

  const swotSubtitle = swotData
    ? swotData.strength?.headline ?? t('home.swotSectionTitle')
    : t('common.loading');

  if (isLoading) {
    return (
      <View>
        <SectionHeader title={t('discover.cosmicFlow')} />
        <View style={styles.list}>
          <Skeleton width="100%" height={56} borderRadius={RADIUS.md} />
          <Skeleton width="100%" height={56} borderRadius={RADIUS.md} />
        </View>
      </View>
    );
  }

  return (
    <View>
      <SectionHeader title={t('discover.cosmicFlow')} />
      <View style={styles.list}>
        <FlowCard
          title={t('discover.dailySummary')}
          subtitle={dailySummarySubtitle}
          icon="sunny"
          iconColor={isDark ? '#FBBF24' : '#D97706'}
          iconBgColor={isDark ? 'rgba(251,191,36,0.12)' : 'rgba(217,119,6,0.08)'}
          onPress={() => router.push('/daily-summary' as any)}
          index={0}
        />
        <FlowCard
          title={t('discover.skyPulse')}
          subtitle={
            skyData?.retrogradePlanets?.length
              ? `${skyData.retrogradePlanets.length} ${t('discover.retroPlanets')}`
              : t('discover.skyPulseDesc')
          }
          icon="planet"
          iconColor={isDark ? '#60A5FA' : '#2563EB'}
          iconBgColor={isDark ? 'rgba(96,165,250,0.12)' : 'rgba(37,99,235,0.08)'}
          onPress={() => router.push('/(tabs)/home' as any)}
          index={1}
        />
        <FlowCard
          title={t('discover.weeklySwot')}
          subtitle={swotSubtitle}
          icon="analytics"
          iconColor={isDark ? '#34D399' : '#059669'}
          iconBgColor={isDark ? 'rgba(52,211,153,0.12)' : 'rgba(5,150,105,0.08)'}
          onPress={() => router.push('/(tabs)/home' as any)}
          index={2}
        />
      </View>
    </View>
  );
}

function cardStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: isDark ? C.border : C.borderLight,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
      marginBottom: SPACING.sm,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: RADIUS.sm,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: SPACING.md,
    },
    textCol: {
      flex: 1,
    },
    title: {
      ...TYPOGRAPHY.SmallBold,
      color: C.text,
    },
    subtitle: {
      ...TYPOGRAPHY.CaptionXS,
      color: C.subtext,
      marginTop: 1,
    },
  });
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: SPACING.lg,
  },
});
