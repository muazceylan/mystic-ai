import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING } from '../../constants/tokens';

/* ─── Standalone right-side icons ─── */
/**
 * Settings + Notifications icon buttons.
 * Drop into any header's right slot to get consistent nav icons.
 */
export function HeaderRightIcons({ tintColor }: { tintColor?: string }) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const S = makeIconStyles(isDark);
  const color = tintColor ?? colors.text;

  return (
    <View style={S.row}>
      <Pressable
        onPress={() => router.push('/theme-settings')}
        style={({ pressed }) => [S.iconBtn, pressed && S.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Settings"
      >
        <Ionicons name="options-outline" size={18} color={color} />
      </Pressable>
      <Pressable
        onPress={() => router.push('/notifications-settings')}
        style={({ pressed }) => [S.iconBtn, pressed && S.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
      >
        <Ionicons name="notifications-outline" size={18} color={color} />
      </Pressable>
    </View>
  );
}

function makeIconStyles(isDark: boolean) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(248,246,255,0.94)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.09)' : '#E9E5F5',
      shadowColor: isDark ? '#000' : '#C4BCD9',
      shadowOpacity: isDark ? 0.18 : 0.10,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    pressed: { opacity: 0.7 },
  });
}

/* ─── Full TabHeader ─── */

interface TabHeaderProps {
  /** Page title (left side, next to avatar) */
  title?: string;
  /** Optional subtitle below the title row */
  subtitle?: string;
  /** Screen-specific action buttons inserted before settings/notifications */
  rightActions?: React.ReactNode;
  /** Show avatar circle on the left (default true) */
  showAvatar?: boolean;
  /** Transparent background for gradient screens */
  transparent?: boolean;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
}

export function TabHeader({
  title,
  subtitle,
  rightActions,
  showAvatar = true,
  transparent = false,
  onOpenProfile,
  onOpenSettings,
  onOpenNotifications,
}: TabHeaderProps) {
  const { colors, isDark } = useTheme();
  const S = makeStyles(colors, isDark, transparent);

  return (
    <View style={S.wrap}>
      <View style={S.row}>
        {/* Left: avatar + title */}
        <View style={S.left}>
          {showAvatar && (
            <Pressable
              onPress={onOpenProfile}
              style={({ pressed }) => [S.avatarBtn, pressed && S.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Profile"
            >
              <View style={S.avatarCircle}>
                <Ionicons name="person-outline" size={18} color={colors.subtext} />
              </View>
            </Pressable>
          )}
          {title ? (
            <Text style={S.title} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
        </View>

        {/* Right: per-screen actions + settings + notifications */}
        <View style={S.right}>
          {rightActions}
          <Pressable
            onPress={onOpenSettings}
            style={({ pressed }) => [S.iconBtn, pressed && S.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Ionicons name="options-outline" size={18} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={onOpenNotifications}
            style={({ pressed }) => [S.iconBtn, pressed && S.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={18} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {subtitle ? (
        <Text style={S.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean, transparent: boolean) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: SPACING.lgXl,
      paddingTop: Platform.OS === 'web' ? 8 : 4,
      paddingBottom: SPACING.sm,
      backgroundColor: transparent ? 'transparent' : undefined,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flexShrink: 1,
    },
    avatarBtn: {},
    avatarCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.88)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(122,91,234,0.10)',
      shadowColor: isDark ? '#000' : '#C4BCD9',
      shadowOpacity: isDark ? 0.24 : 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    title: {
      ...TYPOGRAPHY.H2,
      color: C.text,
      letterSpacing: -0.3,
      maxWidth: 200,
    },
    right: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(248,246,255,0.94)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.09)' : '#E9E5F5',
      shadowColor: isDark ? '#000' : '#C4BCD9',
      shadowOpacity: isDark ? 0.18 : 0.10,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    subtitle: {
      ...TYPOGRAPHY.Caption,
      color: C.subtext,
      marginTop: 4,
      marginLeft: 2,
    },
    pressed: {
      opacity: 0.7,
    },
  });
}
