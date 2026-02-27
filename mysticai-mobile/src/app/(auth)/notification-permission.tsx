import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import * as Notifications from 'expo-notifications';
import OnboardingBackground from '../../components/OnboardingBackground';
import { useTheme } from '../../context/ThemeContext';
import { SafeScreen } from '../../components/ui';

const { width: SCREEN_W } = Dimensions.get('window');

const REASONS = [
  { icon: 'sunny-outline' as const, key: 'dailyHoroscope', emoji: '☀️' },
  { icon: 'moon-outline' as const, key: 'lunarEvents', emoji: '🌙' },
  { icon: 'sparkles-outline' as const, key: 'cosmicOpportunities', emoji: '✨' },
  { icon: 'cloudy-night-outline' as const, key: 'dreamReminder', emoji: '💤' },
] as const;

/* ── Floating ring animation ── */
function PulseRing({ delay, size, color }: { delay: number; size: number; color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 2800, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 1.5,
    borderColor: color,
    opacity: interpolate(progress.value, [0, 0.6, 1], [0.6, 0.2, 0]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.8, 1.6]) }],
  }));

  return <Animated.View style={style} />;
}

/* ── Animated bell icon ── */
function AnimatedBell({ color }: { color: string }) {
  const wobble = useSharedValue(0);

  useEffect(() => {
    wobble.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(-12, { duration: 80, easing: Easing.inOut(Easing.ease) }),
          withTiming(12, { duration: 80, easing: Easing.inOut(Easing.ease) }),
          withTiming(-8, { duration: 70, easing: Easing.inOut(Easing.ease) }),
          withTiming(8, { duration: 70, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 100, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 3000 }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${wobble.value}deg` }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Ionicons name="notifications" size={38} color={color} />
    </Animated.View>
  );
}

function makeStyles(C: ReturnType<typeof useTheme>['colors'], isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
      paddingHorizontal: 24,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    /* Hero icon area */
    heroArea: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 120,
      height: 120,
      marginBottom: 28,
    },
    bellCircle: {
      width: 76,
      height: 76,
      borderRadius: 38,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },

    /* Typography */
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: C.text,
      textAlign: 'center',
      marginBottom: 8,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 14,
      color: C.subtext,
      textAlign: 'center',
      lineHeight: 21,
      marginBottom: 30,
      paddingHorizontal: 12,
    },

    /* Reason cards */
    reasonsContainer: {
      width: '100%',
      gap: 10,
    },
    reasonCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    },
    reasonEmoji: {
      fontSize: 22,
      width: 36,
      textAlign: 'center',
    },
    reasonTextContainer: {
      flex: 1,
    },
    reasonText: {
      fontSize: 14,
      color: C.text,
      fontWeight: '600',
      lineHeight: 19,
    },

    /* Privacy */
    privacyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 20,
      paddingHorizontal: 4,
    },
    privacyText: {
      fontSize: 12,
      color: C.disabledText,
      flex: 1,
      lineHeight: 16,
    },

    /* Footer */
    footer: {
      gap: 8,
      paddingBottom: 32,
    },
    primaryButtonOuter: {
      width: '100%',
      borderRadius: 999,
      overflow: 'hidden',
    },
    primaryButtonGradient: {
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    primaryText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    skipButton: {
      width: '100%',
      paddingVertical: 12,
      alignItems: 'center',
    },
    skipText: {
      color: C.disabledText,
      fontSize: 14,
      fontWeight: '500',
    },
  });
}

export default function NotificationPermissionScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const s = makeStyles(colors, isDark);
  const [requesting, setRequesting] = useState(false);

  const ringColor = isDark ? 'rgba(157,78,221,0.3)' : 'rgba(157,78,221,0.2)';

  const handleAllow = async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      if (Platform.OS !== 'web') {
        await Notifications.requestPermissionsAsync();
      }
    } catch {
      // Permission denied or unavailable — proceed anyway
    } finally {
      setRequesting(false);
      router.push('/natal-chart');
    }
  };

  const handleSkip = () => {
    router.push('/natal-chart');
  };

  return (
    <SafeScreen>
      <View style={s.container}>
        <OnboardingBackground />

        <View style={s.content}>
          {/* ── Hero: bell + pulse rings ── */}
          <Animated.View entering={FadeIn.duration(600)} style={s.heroArea}>
            <PulseRing delay={0} size={100} color={ringColor} />
            <PulseRing delay={900} size={100} color={ringColor} />
            <PulseRing delay={1800} size={100} color={ringColor} />
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(157,78,221,0.25)', 'rgba(124,58,237,0.15)']
                  : ['rgba(157,78,221,0.12)', 'rgba(124,58,237,0.06)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.bellCircle}
            >
              <AnimatedBell color={colors.primary} />
            </LinearGradient>
          </Animated.View>

          {/* ── Title ── */}
          <Animated.Text entering={FadeInDown.duration(500).delay(150)} style={s.title}>
            {t('notificationPermission.title')}
          </Animated.Text>
          <Animated.Text entering={FadeInDown.duration(500).delay(250)} style={s.subtitle}>
            {t('notificationPermission.subtitle')}
          </Animated.Text>

          {/* ── Reason cards ── */}
          <View style={s.reasonsContainer}>
            {REASONS.map((reason, i) => (
              <Animated.View
                key={reason.key}
                entering={FadeInUp.duration(450).delay(350 + i * 100)}
                style={s.reasonCard}
              >
                <Text style={s.reasonEmoji}>{reason.emoji}</Text>
                <View style={s.reasonTextContainer}>
                  <Text style={s.reasonText}>
                    {t(`notificationPermission.reason_${reason.key}`)}
                  </Text>
                </View>
              </Animated.View>
            ))}
          </View>

          {/* ── Privacy note ── */}
          <Animated.View entering={FadeIn.duration(400).delay(800)} style={s.privacyRow}>
            <Ionicons name="shield-checkmark-outline" size={13} color={colors.disabledText} />
            <Text style={s.privacyText}>
              {t('notificationPermission.privacyNote')}
            </Text>
          </Animated.View>
        </View>

        {/* ── Footer ── */}
        <Animated.View entering={FadeInDown.duration(500).delay(900)} style={s.footer}>
          <TouchableOpacity
            style={s.primaryButtonOuter}
            onPress={handleAllow}
            disabled={requesting}
            activeOpacity={0.85}
            accessibilityLabel={t('notificationPermission.allow')}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={['#9D4EDD', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0.5 }}
              style={s.primaryButtonGradient}
            >
              <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
              <Text style={s.primaryText}>{t('notificationPermission.allow')}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.skipButton}
            onPress={handleSkip}
            accessibilityLabel={t('notificationPermission.skip')}
            accessibilityRole="button"
          >
            <Text style={s.skipText}>{t('notificationPermission.skip')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeScreen>
  );
}
