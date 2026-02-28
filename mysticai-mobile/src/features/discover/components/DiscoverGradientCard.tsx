import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../context/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../../constants/tokens';
import { AccessibleText } from '../../../components/ui/AccessibleText';
import type { DiscoverModule } from '../types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  module: DiscoverModule;
  fullWidth?: boolean;
}

export function DiscoverGradientCard({ module, fullWidth = false }: Props) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  }, [scale]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const onPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(module.route as any);
  }, [router, module.route]);

  return (
    <AnimatedPressable
      style={[
        styles.container,
        fullWidth ? styles.fullWidth : styles.halfWidth,
        {
          backgroundColor: colors.surface,
          borderColor: isDark ? colors.border : colors.borderLight,
        },
        animatedStyle,
      ]}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={[styles.iconWrap, {
        backgroundColor: isDark ? 'rgba(139,92,246,0.12)' : 'rgba(124,58,237,0.08)',
      }]}>
        <Ionicons
          name={module.icon}
          size={18}
          color={isDark ? colors.primary : colors.primary700}
        />
      </View>
      <AccessibleText
        style={[TYPOGRAPHY.SmallBold, { color: colors.text, marginTop: SPACING.sm }]}
        numberOfLines={1}
      >
        {t(module.titleKey)}
      </AccessibleText>
      <AccessibleText
        style={[TYPOGRAPHY.CaptionXS, { color: colors.subtext, marginTop: 2 }]}
        numberOfLines={2}
      >
        {t(module.descriptionKey)}
      </AccessibleText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    minHeight: 100,
    justifyContent: 'flex-start',
  },
  halfWidth: {
    width: '48%',
  },
  fullWidth: {
    width: '100%',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
