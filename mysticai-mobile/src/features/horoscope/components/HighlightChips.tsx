import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, ThemeColors } from '../../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../../constants/tokens';

interface Props {
  highlights: string[];
}

export function HighlightChips({ highlights }: Props) {
  const { colors, isDark } = useTheme();
  const S = makeStyles(colors, isDark);

  return (
    <View style={S.row}>
      {highlights.map((text, i) => (
        <View key={i} style={S.chip}>
          <Text style={S.text} numberOfLines={2}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: SPACING.sm,
    },
    chip: {
      flex: 1,
      backgroundColor: C.primarySoft,
      borderRadius: RADIUS.sm,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xsSm,
    },
    text: {
      ...TYPOGRAPHY.CaptionBold,
      color: C.horoscopeAccent,
      textAlign: 'center',
    },
  });
}
