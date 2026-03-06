import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

type BannerTone = 'info' | 'success' | 'error';

interface StatusBannerProps {
  tone?: BannerTone;
  message: string;
}

export function StatusBanner({ tone = 'info', message }: StatusBannerProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const toneMap = {
    info: { icon: 'information-circle-outline', color: colors.primary, bg: colors.primarySoftBg },
    success: { icon: 'checkmark-circle', color: colors.success, bg: colors.successBg },
    error: { icon: 'alert-circle', color: colors.error, bg: colors.redBg },
  } as const;

  const selected = toneMap[tone];

  return (
    <View style={[styles.container, { backgroundColor: selected.bg }]} accessibilityRole="alert">
      <Ionicons name={selected.icon as any} size={16} color={selected.color} />
      <Text style={[styles.message, { color: selected.color }]}>{message}</Text>
    </View>
  );
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      paddingVertical: 10,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    message: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500',
    },
  });
}
