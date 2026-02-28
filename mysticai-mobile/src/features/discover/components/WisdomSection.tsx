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
import { SectionHeader } from './SectionHeader';
import { DISCOVER_MODULES } from '../discoverModules';
import type { DiscoverModule } from '../types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ICON_TINTS: Record<string, { light: string; dark: string; bgLight: string; bgDark: string }> = {
  'numerology': { light: '#B45309', dark: '#FCD34D', bgLight: 'rgba(180,83,9,0.08)', bgDark: 'rgba(252,211,77,0.12)' },
  'name-analysis': { light: '#475569', dark: '#94A3B8', bgLight: 'rgba(71,85,105,0.08)', bgDark: 'rgba(148,163,184,0.12)' },
  'natal-chart': { light: '#0891B2', dark: '#22D3EE', bgLight: 'rgba(8,145,178,0.08)', bgDark: 'rgba(34,211,238,0.12)' },
  'spiritual': { light: '#16A34A', dark: '#4ADE80', bgLight: 'rgba(22,163,74,0.08)', bgDark: 'rgba(74,222,128,0.12)' },
  'compatibility': { light: '#DC2626', dark: '#F87171', bgLight: 'rgba(220,38,38,0.08)', bgDark: 'rgba(248,113,113,0.12)' },
};

interface WisdomCardProps {
  module: DiscoverModule;
  index: number;
}

function WisdomCard({ module, index }: WisdomCardProps) {
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
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(module.route as any);
  }, [router, module.route]);

  return (
    <Animated.View entering={FadeInDown.duration(350).delay(60 * index)}>
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
        <View style={S.textCol}>
          <AccessibleText style={S.title} numberOfLines={1}>
            {t(module.titleKey)}
          </AccessibleText>
          <AccessibleText style={S.desc} numberOfLines={1}>
            {t(module.descriptionKey)}
          </AccessibleText>
        </View>
        <Ionicons name="chevron-forward" size={14} color={colors.subtext} />
      </AnimatedPressable>
    </Animated.View>
  );
}

export function WisdomSection() {
  const { t } = useTranslation();

  const wisdomModules = DISCOVER_MODULES.filter((m) => m.section === 'wisdom');

  return (
    <View>
      <SectionHeader title={t('discover.wisdom')} />
      <View style={styles.list}>
        {wisdomModules.map((m, i) => (
          <WisdomCard key={m.id} module={m} index={i} />
        ))}
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
      width: 34,
      height: 34,
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
    desc: {
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
