import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { SPACING } from '../../constants/tokens';
import { getMoonPhaseIcon } from './homeUtils';

interface CosmicSnapshotHeroProps {
  moonPhase: string;
  moonSignSymbol: string;
  moonSignTurkish: string;
  loading: boolean;
  dailyVibeText: string;
  onPress?: () => void;
}

export function CosmicSnapshotHero({
  moonPhase,
  moonSignSymbol,
  moonSignTurkish,
  loading,
  dailyVibeText,
  onPress,
}: CosmicSnapshotHeroProps) {
  const { colors, isDark } = useTheme();

  const glowOpacity = useSharedValue(0.75);
  const glowScale = useSharedValue(1.0);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.72, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const moonAnimStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const moonIcon = moonPhase ? getMoonPhaseIcon(moonPhase) : '🌙';

  // Take first 3 meaningful words for the hero headline
  const vibeSummary = dailyVibeText
    .split(/[\s,،.]+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(' ');

  const S = makeStyles(isDark);

  return (
    <Animated.View
      entering={FadeInDown.delay(80).duration(650).springify()}
      style={[S.shadow, { shadowColor: isDark ? '#7c3aed' : '#4f46e5' }]}
    >
      <Pressable onPress={onPress} android_ripple={{ color: '#ffffff18', borderless: false }}>
        <LinearGradient
          colors={
            isDark
              ? ['#1e0d4e', '#0d1b4a', '#12103a']
              : ['#ede9fe', '#dbeafe', '#f0f4ff']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={S.gradient}
        >
          {/* Ambient glow blob */}
          <View style={S.glowBlob} />

          {/* Left: Animated Moon */}
          <View style={S.moonSide}>
            <View style={[S.moonRing, { borderColor: isDark ? 'rgba(167,139,250,0.5)' : 'rgba(99,102,241,0.25)' }]}>
              <View style={[S.moonRingInner, { backgroundColor: isDark ? 'rgba(109,40,217,0.25)' : 'rgba(99,102,241,0.12)' }]}>
                <Animated.Text style={[S.moonEmoji, moonAnimStyle]}>
                  {moonIcon}
                </Animated.Text>
              </View>
            </View>
          </View>

          {/* Right: Vibe text */}
          <View style={S.textSide}>
            <Text style={[S.vibeLabel, { color: isDark ? 'rgba(196,181,253,0.8)' : 'rgba(99,102,241,0.65)' }]}>
              GÜNÜN ENERJİSİ
            </Text>
            <Text
              style={[S.vibeHeadline, { color: isDark ? '#ede9fe' : '#1e1b4b' }]}
              numberOfLines={2}
            >
              {vibeSummary || '—'}
            </Text>
            {(moonSignTurkish || moonPhase) ? (
              <Text
                style={[S.moonCaption, { color: isDark ? '#a78bfa' : '#4f46e5' }]}
                numberOfLines={1}
              >
                {moonSignSymbol ? `${moonSignSymbol} ` : '🌙 '}
                {moonSignTurkish}
                {moonPhase ? ` · ${moonPhase}` : ''}
              </Text>
            ) : null}
          </View>

          {/* Gold accent star */}
          <Text style={[S.goldStar, { color: isDark ? '#fbbf24' : '#d97706' }]}>✦</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

function makeStyles(isDark: boolean) {
  return StyleSheet.create({
    shadow: {
      marginHorizontal: SPACING.lgXl,
      marginTop: SPACING.md,
      borderRadius: 24,
      shadowOpacity: 0.24,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 20,
      elevation: 7,
    },
    gradient: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lgXl,
      paddingVertical: SPACING.xl,
      gap: SPACING.lg,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(139,92,246,0.3)' : 'rgba(99,102,241,0.15)',
      overflow: 'hidden',
    },
    glowBlob: {
      position: 'absolute',
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: isDark ? 'rgba(109,40,217,0.2)' : 'rgba(99,102,241,0.08)',
      right: -40,
      bottom: -40,
    },
    moonSide: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    moonRing: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    moonRingInner: {
      width: 68,
      height: 68,
      borderRadius: 34,
      alignItems: 'center',
      justifyContent: 'center',
    },
    moonEmoji: {
      fontSize: 40,
      lineHeight: 48,
    },
    textSide: {
      flex: 1,
      gap: SPACING.xs,
    },
    vibeLabel: {
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 1.8,
    },
    vibeHeadline: {
      fontSize: 22,
      fontWeight: '800',
      lineHeight: 30,
    },
    moonCaption: {
      fontSize: 11,
      fontWeight: '600',
      marginTop: SPACING.xs,
    },
    goldStar: {
      fontSize: 20,
      opacity: 0.7,
      position: 'absolute',
      top: SPACING.smMd,
      right: SPACING.lg,
    },
  });
}
