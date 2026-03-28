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

type SkyBandItem = {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  rotate: string;
  opacity: number;
  colors: [string, string, string, string];
};

type SkyOrbItem = {
  id: string;
  left: number;
  top: number;
  size: number;
  opacity: number;
};

const BACKGROUND_PRESETS: Record<
  PosterTone,
  {
    gradient: [string, string, string, string, string];
    wash: [string, string, string, string, string];
    aurora: [string, string, string, string];
    auroraSoft: [string, string, string, string];
    mainCloud: string;
    innerCloud: string;
    warmAccent: string;
    topCloud: string;
    orbGlow: string;
    star: string;
    starGlow: string;
    sparkle: string;
  }
> = {
  moon: {
    gradient: ['#03050A', '#07101B', '#0B1524', '#081221', '#040915'],
    wash: ['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(70,96,146,0.08)', 'rgba(109,136,187,0.16)', 'rgba(88,118,176,0.12)'],
    aurora: ['rgba(0,0,0,0)', 'rgba(184,215,255,0.12)', 'rgba(120,174,245,0.22)', 'rgba(0,0,0,0)'],
    auroraSoft: ['rgba(0,0,0,0)', 'rgba(197,225,255,0.04)', 'rgba(168,200,246,0.12)', 'rgba(0,0,0,0)'],
    mainCloud: 'rgba(62,92,146,0.34)',
    innerCloud: 'rgba(118,150,198,0.24)',
    warmAccent: 'rgba(152,183,222,0.14)',
    topCloud: 'rgba(55,76,119,0.2)',
    orbGlow: 'rgba(190,220,255,0.12)',
    star: 'rgba(241,247,255,0.96)',
    starGlow: 'rgba(196,214,246,0.56)',
    sparkle: 'rgba(231,240,255,0.72)',
  },
  violet: {
    gradient: ['#05040C', '#120A1E', '#1A1030', '#120B23', '#070510'],
    wash: ['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(88,58,168,0.1)', 'rgba(126,88,232,0.2)', 'rgba(91,63,175,0.12)'],
    aurora: ['rgba(0,0,0,0)', 'rgba(173,136,255,0.1)', 'rgba(121,90,241,0.24)', 'rgba(0,0,0,0)'],
    auroraSoft: ['rgba(0,0,0,0)', 'rgba(210,189,255,0.03)', 'rgba(169,136,255,0.12)', 'rgba(0,0,0,0)'],
    mainCloud: 'rgba(94,62,182,0.34)',
    innerCloud: 'rgba(144,111,255,0.28)',
    warmAccent: 'rgba(110,90,205,0.18)',
    topCloud: 'rgba(80,52,154,0.18)',
    orbGlow: 'rgba(174,144,255,0.14)',
    star: 'rgba(247,241,255,0.96)',
    starGlow: 'rgba(182,153,255,0.5)',
    sparkle: 'rgba(235,225,255,0.72)',
  },
  gold: {
    gradient: ['#060508', '#120E10', '#1A1310', '#120E0C', '#070607'],
    wash: ['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(120,88,28,0.08)', 'rgba(194,154,74,0.18)', 'rgba(130,96,34,0.1)'],
    aurora: ['rgba(0,0,0,0)', 'rgba(240,211,132,0.08)', 'rgba(214,168,77,0.2)', 'rgba(0,0,0,0)'],
    auroraSoft: ['rgba(0,0,0,0)', 'rgba(255,229,168,0.03)', 'rgba(226,191,118,0.1)', 'rgba(0,0,0,0)'],
    mainCloud: 'rgba(114,83,32,0.28)',
    innerCloud: 'rgba(176,135,70,0.22)',
    warmAccent: 'rgba(214,176,98,0.16)',
    topCloud: 'rgba(100,71,24,0.16)',
    orbGlow: 'rgba(230,196,124,0.14)',
    star: 'rgba(255,246,220,0.96)',
    starGlow: 'rgba(236,199,121,0.44)',
    sparkle: 'rgba(248,226,176,0.72)',
  },
  blue: {
    gradient: ['#04060B', '#08101A', '#0C1630', '#091224', '#040811'],
    wash: ['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(40,90,160,0.08)', 'rgba(72,128,220,0.16)', 'rgba(50,92,170,0.1)'],
    aurora: ['rgba(0,0,0,0)', 'rgba(120,182,255,0.08)', 'rgba(74,136,235,0.22)', 'rgba(0,0,0,0)'],
    auroraSoft: ['rgba(0,0,0,0)', 'rgba(184,220,255,0.03)', 'rgba(122,170,255,0.1)', 'rgba(0,0,0,0)'],
    mainCloud: 'rgba(48,86,164,0.3)',
    innerCloud: 'rgba(96,146,240,0.24)',
    warmAccent: 'rgba(84,120,198,0.16)',
    topCloud: 'rgba(40,66,118,0.18)',
    orbGlow: 'rgba(140,192,255,0.12)',
    star: 'rgba(240,248,255,0.96)',
    starGlow: 'rgba(146,190,255,0.46)',
    sparkle: 'rgba(220,238,255,0.74)',
  },
  silver: {
    gradient: ['#05070A', '#0A1014', '#12181E', '#0B1015', '#05070B'],
    wash: ['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(76,96,120,0.06)', 'rgba(140,162,188,0.14)', 'rgba(102,124,150,0.08)'],
    aurora: ['rgba(0,0,0,0)', 'rgba(212,223,236,0.06)', 'rgba(158,178,202,0.18)', 'rgba(0,0,0,0)'],
    auroraSoft: ['rgba(0,0,0,0)', 'rgba(232,238,246,0.03)', 'rgba(190,204,220,0.08)', 'rgba(0,0,0,0)'],
    mainCloud: 'rgba(94,116,142,0.24)',
    innerCloud: 'rgba(168,184,206,0.18)',
    warmAccent: 'rgba(152,166,188,0.12)',
    topCloud: 'rgba(82,96,116,0.16)',
    orbGlow: 'rgba(200,214,230,0.1)',
    star: 'rgba(245,248,252,0.96)',
    starGlow: 'rgba(214,226,240,0.4)',
    sparkle: 'rgba(240,246,255,0.7)',
  },
  rose: {
    gradient: ['#070509', '#140A14', '#1C0F1D', '#140B15', '#080508'],
    wash: ['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(126,58,114,0.08)', 'rgba(204,112,176,0.16)', 'rgba(144,76,126,0.1)'],
    aurora: ['rgba(0,0,0,0)', 'rgba(255,188,225,0.06)', 'rgba(220,120,190,0.18)', 'rgba(0,0,0,0)'],
    auroraSoft: ['rgba(0,0,0,0)', 'rgba(255,222,239,0.03)', 'rgba(232,168,210,0.09)', 'rgba(0,0,0,0)'],
    mainCloud: 'rgba(128,68,110,0.28)',
    innerCloud: 'rgba(214,132,184,0.22)',
    warmAccent: 'rgba(214,154,192,0.14)',
    topCloud: 'rgba(102,56,92,0.16)',
    orbGlow: 'rgba(244,184,220,0.12)',
    star: 'rgba(255,243,250,0.96)',
    starGlow: 'rgba(244,186,220,0.44)',
    sparkle: 'rgba(255,229,245,0.72)',
  },
};

function CosmicBackgroundLayer({ tone, seedKey }: Props) {
  const palette = useMemo(() => BACKGROUND_PRESETS[tone] ?? BACKGROUND_PRESETS.moon, [tone]);
  const stars = useMemo(() => {
    const rand = mulberry32(hashSeed(`bg:${seedKey}`));

    return Array.from({ length: 176 }, (_, index): StarItem => {
      const isBright = rand() > 0.84;
      return {
        id: `s-${index}`,
        left: `${2 + rand() * 96}%` as DimensionValue,
        top: `${2 + rand() * 96}%` as DimensionValue,
        size: isBright ? 2.2 + rand() * 1.3 : rand() > 0.48 ? 1.0 + rand() * 0.8 : 0.5 + rand() * 0.55,
        opacity: isBright ? 0.78 + rand() * 0.22 : rand() > 0.45 ? 0.34 + rand() * 0.28 : 0.12 + rand() * 0.18,
        bright: isBright,
      };
    });
  }, [seedKey]);
  const skyBands = useMemo(() => {
    const rand = mulberry32(hashSeed(`bands:${seedKey}`));

    return Array.from({ length: 4 }, (_, index): SkyBandItem => ({
      id: `band-${index}`,
      left: -40 + rand() * 130,
      top: 52 + rand() * 480,
      width: 220 + rand() * 150,
      height: 72 + rand() * 40,
      rotate: `${-28 + rand() * 24}deg`,
      opacity: 0.2 + rand() * 0.18,
      colors: index % 2 === 0 ? palette.aurora : palette.auroraSoft,
    }));
  }, [palette.aurora, palette.auroraSoft, seedKey]);
  const skyOrbs = useMemo(() => {
    const rand = mulberry32(hashSeed(`orbs:${seedKey}`));

    return Array.from({ length: 4 }, (_, index): SkyOrbItem => ({
      id: `orb-${index}`,
      left: 10 + rand() * 300,
      top: 24 + rand() * 560,
      size: 54 + rand() * 88,
      opacity: 0.08 + rand() * 0.08,
    }));
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
        colors={palette.gradient}
        locations={[0, 0.2, 0.5, 0.75, 1]}
        start={{ x: 0.4, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* nebula bottom-right — the prominent cosmic cloud from the reference */}
      <Animated.View style={[styles.nebula, styles.nebulaMainCloud, { backgroundColor: palette.mainCloud }, nebulaMainStyle]} />
      <Animated.View style={[styles.nebula, styles.nebulaInnerCore, { backgroundColor: palette.innerCloud }, nebulaCoreStyle]} />

      {/* warm accent glow below disc area */}
      <Animated.View style={[styles.nebula, styles.nebulaWarmAccent, { backgroundColor: palette.warmAccent }, nebulaCoreStyle]} />

      {/* faint top-left nebula */}
      <Animated.View style={[styles.nebula, styles.nebulaTopLeft, { backgroundColor: palette.topCloud }, nebulaTopStyle]} />

      {/* nebula color wash — diagonal light from bottom-right */}
      <LinearGradient
        colors={palette.wash}
        locations={[0, 0.4, 0.65, 0.82, 1]}
        start={{ x: 0.2, y: 0.1 }}
        end={{ x: 0.85, y: 0.95 }}
        style={StyleSheet.absoluteFill}
      />

      {skyBands.map((band) => (
        <LinearGradient
          key={band.id}
          colors={band.colors}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[
            styles.skyBand,
            {
              left: band.left,
              top: band.top,
              width: band.width,
              height: band.height,
              opacity: band.opacity,
              transform: [{ rotate: band.rotate }],
            },
          ]}
        />
      ))}

      <LinearGradient
        colors={palette.aurora}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.galaxySweep}
      />

      {skyOrbs.map((orb) => (
        <View
          key={orb.id}
          style={[
            styles.skyOrb,
            {
              left: orb.left,
              top: orb.top,
              width: orb.size,
              height: orb.size,
              borderRadius: orb.size / 2,
              opacity: orb.opacity,
              backgroundColor: palette.orbGlow,
            },
          ]}
        />
      ))}

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
                    backgroundColor: palette.sparkle,
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
                    backgroundColor: palette.sparkle,
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
                    backgroundColor: palette.starGlow,
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
                backgroundColor: palette.star,
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
  skyBand: {
    position: 'absolute',
    borderRadius: posterTokens.radius.pill,
  },
  skyOrb: {
    position: 'absolute',
  },
  galaxySweep: {
    position: 'absolute',
    left: -84,
    top: 116,
    width: 520,
    height: 120,
    borderRadius: posterTokens.radius.pill,
    opacity: 0.28,
    transform: [{ rotate: '22deg' }],
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
  },
  starGlow: {
    position: 'absolute',
  },
  sparkleH: {
    position: 'absolute',
    height: 0.5,
  },
  sparkleV: {
    position: 'absolute',
    width: 0.5,
  },
});

export default memo(CosmicBackgroundLayer);
