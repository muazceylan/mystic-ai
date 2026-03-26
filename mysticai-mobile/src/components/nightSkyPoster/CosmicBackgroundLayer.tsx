import React, { memo, useEffect, useMemo } from 'react';
import { type DimensionValue, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { PosterTone } from '../../features/nightSkyPoster/poster.types';
import { posterTokens } from '../../features/nightSkyPoster/poster.tokens';
import { hashSeed, mulberry32 } from '../../features/nightSkyPoster/poster.utils';

type Props = {
  tone: PosterTone;
  seedKey: string;
};

type StarItem = {
  id: string;
  left: DimensionValue;
  top: DimensionValue;
  size: number;
  opacity: number;
  bright: boolean;
};

function CosmicBackgroundLayer({ tone, seedKey }: Props) {
  const stars = useMemo(() => {
    const rand = mulberry32(hashSeed(`bg:${seedKey}`));

    return Array.from({ length: 70 }, (_, index): StarItem => {
      const isBright = rand() > 0.9;
      return {
        id: `s-${index}`,
        left: `${2 + rand() * 96}%` as DimensionValue,
        top: `${2 + rand() * 96}%` as DimensionValue,
        size: isBright ? 2.0 + rand() * 1.0 : rand() > 0.5 ? 1.0 + rand() * 0.5 : 0.5 + rand() * 0.4,
        opacity: isBright ? 0.75 + rand() * 0.2 : rand() > 0.5 ? 0.3 + rand() * 0.25 : 0.1 + rand() * 0.15,
        bright: isBright,
      };
    });
  }, [seedKey]);

  /* slow breathing for the nebula clouds */
  const breath = useSharedValue(0.92);

  useEffect(() => {
    breath.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: posterTokens.motion.hazeDurationMs, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.92, { duration: posterTokens.motion.hazeDurationMs, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [breath]);

  /* main bottom-right nebula — large, visible, matching reference */
  const nebulaMainStyle = useAnimatedStyle(() => ({
    opacity: breath.value * 0.42,
    transform: [{ scale: 0.96 + breath.value * 0.04 }],
  }));

  /* secondary nebula core — brighter center of the cloud */
  const nebulaCoreStyle = useAnimatedStyle(() => ({
    opacity: breath.value * 0.28,
    transform: [{ scale: 0.94 + breath.value * 0.05 }],
  }));

  /* faint top-left accent */
  const nebulaTopStyle = useAnimatedStyle(() => ({
    opacity: breath.value * 0.14,
    transform: [{ scale: 0.93 + breath.value * 0.03 }],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* deep space base gradient — darker at top, slightly warmer toward bottom */}
      <LinearGradient
        colors={['#030509', '#050810', '#06091A', '#070C1E', '#050A18']}
        locations={[0, 0.2, 0.5, 0.75, 1]}
        start={{ x: 0.4, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* nebula bottom-right — the prominent cosmic cloud from the reference */}
      <Animated.View style={[styles.nebula, styles.nebulaMainCloud, nebulaMainStyle]} />
      <Animated.View style={[styles.nebula, styles.nebulaInnerCore, nebulaCoreStyle]} />

      {/* warm accent glow below disc area */}
      <Animated.View style={[styles.nebula, styles.nebulaWarmAccent, nebulaCoreStyle]} />

      {/* faint top-left nebula */}
      <Animated.View style={[styles.nebula, styles.nebulaTopLeft, nebulaTopStyle]} />

      {/* nebula color wash — diagonal light from bottom-right */}
      <LinearGradient
        colors={[
          'rgba(0,0,0,0)',
          'rgba(0,0,0,0)',
          'rgba(35,50,100,0.08)',
          'rgba(55,70,130,0.14)',
          'rgba(45,55,110,0.1)',
        ]}
        locations={[0, 0.4, 0.65, 0.82, 1]}
        start={{ x: 0.2, y: 0.1 }}
        end={{ x: 0.85, y: 0.95 }}
        style={StyleSheet.absoluteFill}
      />

      {/* stars */}
      {stars.map((star) => (
        <View key={star.id}>
          {/* cross-sparkle glow for bright stars (matching reference's visible sparkles) */}
          {star.bright ? (
            <>
              <View
                style={[
                  styles.sparkleH,
                  {
                    left: star.left,
                    top: star.top,
                    width: star.size * 5,
                    marginLeft: -(star.size * 2.5),
                    marginTop: -0.25,
                    opacity: star.opacity * 0.35,
                  },
                ]}
              />
              <View
                style={[
                  styles.sparkleV,
                  {
                    left: star.left,
                    top: star.top,
                    height: star.size * 5,
                    marginTop: -(star.size * 2.5),
                    marginLeft: -0.25,
                    opacity: star.opacity * 0.35,
                  },
                ]}
              />
              <View
                style={[
                  styles.starGlow,
                  {
                    left: star.left,
                    top: star.top,
                    width: star.size * 3,
                    height: star.size * 3,
                    marginLeft: -(star.size * 1.5),
                    marginTop: -(star.size * 1.5),
                    borderRadius: star.size * 2,
                    opacity: star.opacity * 0.3,
                  },
                ]}
              />
            </>
          ) : null}
          <View
            style={[
              styles.star,
              {
                left: star.left,
                top: star.top,
                width: star.size,
                height: star.size,
                opacity: star.opacity,
              },
            ]}
          />
        </View>
      ))}

      {/* edge vignette */}
      <LinearGradient
        colors={['rgba(0,0,0,0.22)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.18)']}
        locations={[0, 0.13, 0.85, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.12)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.12)']}
        locations={[0, 0.12, 0.88, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  nebula: {
    position: 'absolute',
    borderRadius: posterTokens.radius.pill,
  },
  /* large diffuse cloud — bottom-right, blue-indigo */
  nebulaMainCloud: {
    width: 340,
    height: 340,
    right: -100,
    bottom: -60,
    backgroundColor: 'rgba(40,55,120,0.45)',
  },
  /* brighter inner core of the nebula */
  nebulaInnerCore: {
    width: 180,
    height: 180,
    right: -20,
    bottom: 30,
    backgroundColor: 'rgba(60,80,150,0.35)',
  },
  /* warm accent below the disc */
  nebulaWarmAccent: {
    width: 200,
    height: 140,
    right: 20,
    bottom: 120,
    backgroundColor: 'rgba(80,70,120,0.2)',
  },
  /* faint top-left secondary */
  nebulaTopLeft: {
    width: 200,
    height: 200,
    left: -70,
    top: -50,
    backgroundColor: 'rgba(30,40,80,0.3)',
  },
  star: {
    position: 'absolute',
    borderRadius: posterTokens.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  starGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(200,210,240,0.5)',
  },
  sparkleH: {
    position: 'absolute',
    height: 0.5,
    backgroundColor: 'rgba(220,225,240,0.7)',
  },
  sparkleV: {
    position: 'absolute',
    width: 0.5,
    backgroundColor: 'rgba(220,225,240,0.7)',
  },
});

export default memo(CosmicBackgroundLayer);
