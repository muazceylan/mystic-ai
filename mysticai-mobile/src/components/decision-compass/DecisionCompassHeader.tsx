import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { getCompassTokens } from './tokens';

interface DecisionCompassHeaderProps {
  onBack: () => void;
  onOpenCalendar: () => void;
  onOpenNotifications: () => void;
  onOpenHelp: () => void;
  topPadding: number;
  horizontalPadding: number;
  bottomPadding: number;
}

export function DecisionCompassHeader({
  onBack,
  onOpenCalendar,
  onOpenNotifications,
  onOpenHelp,
  topPadding,
  horizontalPadding,
  bottomPadding,
}: DecisionCompassHeaderProps) {
  const { colors, isDark } = useTheme();
  const T = getCompassTokens(colors, isDark);
  const S = styles(colors, isDark, T, { topPadding, horizontalPadding, bottomPadding });

  const actions = [
    { key: 'calendar', icon: 'calendar-outline' as const, label: 'Takvim', onPress: onOpenCalendar },
    { key: 'notifications', icon: 'notifications-outline' as const, label: 'Bildirimler', onPress: onOpenNotifications },
    { key: 'help', icon: 'help-circle-outline' as const, label: 'Yardım', onPress: onOpenHelp },
  ];

  return (
    <View style={S.header}>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [S.backShell, pressed && S.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Geri"
      >
        <LinearGradient colors={T.chip.defaultGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.backBtn}>
          <View pointerEvents="none" style={S.iconGlow} />
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </LinearGradient>
      </Pressable>

      <View style={S.titleWrap}>
        <Text style={S.title}>Karar Pusulası</Text>
        <Text style={S.subtitle}>Günün öncelik alanları ve skorlar</Text>
      </View>

      <View style={S.actions}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            onPress={action.onPress}
            style={({ pressed }) => [S.iconShell, pressed && S.pressed]}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <LinearGradient colors={T.chip.defaultGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.iconBtn}>
              <View pointerEvents="none" style={S.iconGlow} />
              <Ionicons name={action.icon} size={18} color={colors.primary} />
            </LinearGradient>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function styles(
  C: ReturnType<typeof useTheme>['colors'],
  _isDark: boolean,
  T: ReturnType<typeof getCompassTokens>,
  layout: { topPadding: number; horizontalPadding: number; bottomPadding: number },
) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingTop: layout.topPadding,
      paddingBottom: layout.bottomPadding + 4,
      paddingHorizontal: layout.horizontalPadding,
    },
    titleWrap: {
      flex: 1,
      minWidth: 0,
      paddingRight: 2,
    },
    title: {
      color: T.text.title,
      fontSize: 18.5,
      fontWeight: '900',
      letterSpacing: -0.45,
    },
    subtitle: {
      color: T.text.subtitle,
      fontSize: 12.4,
      lineHeight: 15.8,
      fontWeight: '700',
      marginTop: 2,
      maxWidth: 210,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    backShell: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: T.border.soft,
      overflow: 'hidden',
      ...T.shadows.soft,
    },
    backBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 24,
      backgroundColor: T.surface.soft,
    },
    iconShell: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: T.border.soft,
      overflow: 'hidden',
      ...T.shadows.soft,
    },
    iconBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 22,
      backgroundColor: T.surface.soft,
    },
    iconGlow: {
      position: 'absolute',
      top: 2,
      left: 6,
      right: 6,
      height: 14,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.42)',
    },
    pressed: {
      opacity: 0.84,
    },
  });
}
