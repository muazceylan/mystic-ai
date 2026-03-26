import React, { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { LunarPhaseItemModel } from '../../features/nightSkyPoster/poster.types';
import { posterTokens } from '../../features/nightSkyPoster/poster.tokens';

type Props = {
  item: LunarPhaseItemModel;
};

function shadowOffsetForPhase(key: LunarPhaseItemModel['key']) {
  switch (key) {
    case 'new_moon':
      return 18;
    case 'waxing_crescent':
      return 13;
    case 'first_quarter':
      return 8;
    case 'waxing_gibbous':
      return 4;
    case 'full_moon':
      return -20;
    case 'waning_gibbous':
      return 32;
    case 'last_quarter':
      return 28;
    case 'waning_crescent':
      return 23;
    default:
      return 18;
  }
}

function LunarPhaseItem({ item }: Props) {
  const pulse = useSharedValue(item.selected ? 0.92 : 0);

  useEffect(() => {
    if (!item.selected) {
      pulse.value = 0;
      return;
    }

    pulse.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: posterTokens.motion.pulseDurationMs,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(0.78, {
          duration: posterTokens.motion.pulseDurationMs,
          easing: Easing.inOut(Easing.quad),
        }),
      ),
      -1,
      false,
    );
  }, [item.selected, pulse]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: item.selected ? pulse.value : 0,
    transform: [{ scale: item.selected ? 0.98 + pulse.value * 0.08 : 1 }],
  }));

  const clipId = `moon-clip-${item.key}`;
  const shadowOffset = shadowOffsetForPhase(item.key);

  return (
    <View style={styles.root}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.activeGlow,
          item.selected && styles.activeGlowVisible,
          glowStyle,
        ]}
      />

      <View style={[styles.moonShell, item.selected && styles.moonShellActive]}>
        <Svg width={40} height={40} viewBox="0 0 40 40">
          <Defs>
            <ClipPath id={clipId}>
              <Circle cx={20} cy={20} r={12} />
            </ClipPath>
          </Defs>

          <G clipPath={`url(#${clipId})`}>
            <Circle cx={20} cy={20} r={12} fill="#0B1226" />
            <Circle cx={20} cy={20} r={12} fill="#F2D772" opacity={item.selected ? 0.98 : 0.9} />
            <Circle cx={shadowOffset} cy={20} r={12} fill="#12192F" />
            <Circle cx={20} cy={20} r={12} fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth={0.8} />
          </G>
        </Svg>
      </View>

      <Text style={[styles.label, item.selected && styles.labelActive]} numberOfLines={2}>
        {item.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '25%',
    alignItems: 'center',
    gap: posterTokens.spacing.xs,
    position: 'relative',
    paddingHorizontal: 2,
  },
  activeGlow: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: posterTokens.radius.pill,
    backgroundColor: posterTokens.colors.glowGold,
    top: -4,
  },
  activeGlowVisible: {
    backgroundColor: 'rgba(217,188,116,0.14)',
  },
  moonShell: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  moonShellActive: {
    borderColor: 'rgba(217,188,116,0.58)',
    backgroundColor: 'rgba(217,188,116,0.08)',
  },
  label: {
    color: posterTokens.colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
    paddingHorizontal: 2,
    minHeight: 24,
  },
  labelActive: {
    color: posterTokens.colors.textPrimary,
    fontWeight: '700',
  },
});

export default memo(LunarPhaseItem);
