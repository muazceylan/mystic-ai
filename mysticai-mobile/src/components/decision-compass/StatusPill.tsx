import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface StatusPillProps {
  label: string;
  textColor: string;
  gradient: [string, string];
  compact?: boolean;
}

export function StatusPill({ label, textColor, gradient, compact = false }: StatusPillProps) {
  const S = styles(textColor, compact);
  return (
    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.pill}>
      <View pointerEvents="none" style={S.highlight} />
      <Text style={S.label} numberOfLines={1}>{label}</Text>
    </LinearGradient>
  );
}

function styles(textColor: string, compact: boolean) {
  return StyleSheet.create({
    pill: {
      alignSelf: 'flex-start',
      minHeight: compact ? 24 : 28,
      borderRadius: 999,
      paddingHorizontal: compact ? 10 : 13,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.52)',
      overflow: 'hidden',
      position: 'relative',
    },
    highlight: {
      position: 'absolute',
      top: 1,
      left: 6,
      right: 6,
      height: compact ? 7 : 9,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.34)',
    },
    label: {
      color: textColor,
      fontSize: compact ? 11.5 : 12.5,
      fontWeight: '800',
      letterSpacing: 0.02,
    },
  });
}
