import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../../../utils/haptics';
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
import { SectionHeader } from './SectionHeader';
import { DISCOVER_MODULES } from '../discoverModules';
import type { DiscoverModule } from '../types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Map module ids to subtle icon tints (avoid heavy gradients) */
const ICON_TINTS: Record<string, { light: string; dark: string; bgLight: string; bgDark: string }> = {
  'decision-compass': { light: '#D97706', dark: '#FBBF24', bgLight: 'rgba(217,119,6,0.08)', bgDark: 'rgba(251,191,36,0.12)' },
  'cosmic-planner': { light: '#2563EB', dark: '#60A5FA', bgLight: 'rgba(37,99,235,0.08)', bgDark: 'rgba(96,165,250,0.12)' },
  'dream-journal': { light: '#7C3AED', dark: '#A78BFA', bgLight: 'rgba(124,58,237,0.08)', bgDark: 'rgba(167,139,250,0.12)' },
  'star-mate': { light: '#DB2777', dark: '#F472B6', bgLight: 'rgba(219,39,119,0.08)', bgDark: 'rgba(244,114,182,0.12)' },
};

interface ToolCardProps {
  module: DiscoverModule;
  index: number;
}

function ToolCard({ module, index }: ToolCardProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const scale = useSharedValue(1);
  const S = cardStyles(colors, isDark);

  const tint = ICON_TINTS[module.id] ?? { light: colors.primary, dark: colors.primary, bgLight: colors.primarySoftBg, bgDark: colors.primarySoft };
  const iconColor = isDark ? tint.dark : tint.light;
  const iconBg = isDark ? tint.bgDark : tint.bgLight;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(module.route as any);
  }, [router, module.route]);

  return (
    <Animated.View
      entering={FadeInDown.duration(350).delay(60 * index)}
      style={styles.halfWidth}
    >
      <AnimatedPressable
        style={[S.card, animStyle]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={t(module.titleKey)}
      >
        <View style={[S.iconContainer, { backgroundColor: iconBg }]}>
          <Ionicons name={module.icon} size={18} color={iconColor} />
        </View>
        <AccessibleText style={S.title} numberOfLines={1}>
          {t(module.titleKey)}
        </AccessibleText>
        <AccessibleText style={S.desc} numberOfLines={2}>
          {t(module.descriptionKey)}
        </AccessibleText>
      </AnimatedPressable>
    </Animated.View>
  );
}

export function ToolsGridSection() {
  const { t } = useTranslation();

  const toolModules = DISCOVER_MODULES.filter((m) => m.section === 'tools');

  return (
    <View>
      <SectionHeader title={t('discover.tools')} />
      <View style={styles.grid}>
        {toolModules.map((m, i) => (
          <ToolCard key={m.id} module={m} index={i} />
        ))}
      </View>
    </View>
  );
}

function cardStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    card: {
      backgroundColor: C.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: isDark ? C.border : C.borderLight,
      padding: SPACING.md,
      minHeight: 100,
      justifyContent: 'flex-start',
    },
    iconContainer: {
      width: 34,
      height: 34,
      borderRadius: RADIUS.sm,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.sm,
    },
    title: {
      ...TYPOGRAPHY.SmallBold,
      color: C.text,
    },
    desc: {
      ...TYPOGRAPHY.CaptionXS,
      color: C.subtext,
      marginTop: 2,
    },
  });
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
  },
  halfWidth: {
    width: '48%',
    marginBottom: SPACING.sm,
  },
});
