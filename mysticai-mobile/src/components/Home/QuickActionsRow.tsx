import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { SPACING } from '../../constants/tokens';

const ACTIONS = [
  {
    emoji: '🎤',
    label: 'Rüya Ekle',
    route: '/(tabs)/dreams',
    gradDark: ['#2d1b69', '#1e1b4b'] as const,
    gradLight: ['#ede9fe', '#ddd6fe'] as const,
    glowDark: 'rgba(109,40,217,0.35)',
    glowLight: 'rgba(99,102,241,0.18)',
    borderDark: 'rgba(139,92,246,0.5)',
    borderLight: 'rgba(99,102,241,0.22)',
    labelDark: '#c4b5fd',
    labelLight: '#4f46e5',
  },
  {
    emoji: '💞',
    label: 'Uyum Bak',
    route: '/(tabs)/compatibility',
    gradDark: ['#3b1a5c', '#2d1b4b'] as const,
    gradLight: ['#fdf2f8', '#fce7f3'] as const,
    glowDark: 'rgba(168,85,247,0.3)',
    glowLight: 'rgba(236,72,153,0.12)',
    borderDark: 'rgba(192,132,252,0.5)',
    borderLight: 'rgba(236,72,153,0.2)',
    labelDark: '#d8b4fe',
    labelLight: '#9333ea',
  },
  {
    emoji: '🗓️',
    label: 'Takvimim',
    route: '/(tabs)/calendar',
    gradDark: ['#0f2748', '#0a1f3d'] as const,
    gradLight: ['#eff6ff', '#dbeafe'] as const,
    glowDark: 'rgba(59,130,246,0.3)',
    glowLight: 'rgba(59,130,246,0.12)',
    borderDark: 'rgba(96,165,250,0.45)',
    borderLight: 'rgba(59,130,246,0.2)',
    labelDark: '#93c5fd',
    labelLight: '#2563eb',
  },
] as const;

export function QuickActionsRow() {
  const { isDark } = useTheme();
  const router = useRouter();

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(600).springify()} style={styles.row}>
      {ACTIONS.map((action) => (
        <Pressable
          key={action.route}
          onPress={() => router.push(action.route as any)}
          style={styles.actionBtn}
          accessibilityLabel={action.label}
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <LinearGradient
            colors={isDark ? action.gradDark : action.gradLight}
            style={[
              styles.circle,
              {
                borderColor: isDark ? action.borderDark : action.borderLight,
                shadowColor: isDark ? action.glowDark : action.glowLight,
              },
            ]}
          >
            <Text style={styles.emoji}>{action.emoji}</Text>
          </LinearGradient>
          <Text
            style={[styles.label, { color: isDark ? action.labelDark : action.labelLight }]}
            numberOfLines={1}
          >
            {action.label}
          </Text>
        </Pressable>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: SPACING.lgXl,
    marginTop: SPACING.lg,
  },
  actionBtn: {
    alignItems: 'center',
    gap: SPACING.xsSm,
  },
  circle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  emoji: {
    fontSize: 28,
    lineHeight: 34,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
