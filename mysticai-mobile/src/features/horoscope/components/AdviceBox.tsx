import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../../constants/tokens';

interface Props {
  text: string;
}

export function AdviceBox({ text }: Props) {
  const { colors, isDark } = useTheme();
  const S = makeStyles(colors, isDark);

  return (
    <View style={S.box}>
      <View style={S.bar} />
      <View style={S.inner}>
        <Ionicons name="bulb-outline" size={18} color={colors.gold} style={{ marginRight: SPACING.sm }} />
        <Text style={S.text}>{text}</Text>
      </View>
    </View>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    box: {
      backgroundColor: C.surfaceAlt,
      borderRadius: RADIUS.md,
      overflow: 'hidden',
      flexDirection: 'row',
    },
    bar: {
      width: 4,
      backgroundColor: C.gold,
    },
    inner: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: SPACING.md,
    },
    text: {
      ...TYPOGRAPHY.Small,
      color: C.body,
      flex: 1,
      lineHeight: 22,
    },
  });
}
