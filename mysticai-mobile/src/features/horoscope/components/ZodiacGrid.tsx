import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme, ThemeColors } from '../../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../../constants/tokens';
import { ZodiacSign } from '../types/horoscope.types';
import { ZODIAC_SIGNS } from '../utils/zodiacData';

interface Props {
  userSign?: ZodiacSign | null;
  onSelect: (sign: ZodiacSign) => void;
  lang: string;
}

export function ZodiacGrid({ userSign, onSelect, lang }: Props) {
  const { colors, isDark } = useTheme();
  const S = makeStyles(colors, isDark);

  return (
    <View style={S.grid}>
      {ZODIAC_SIGNS.map((z) => {
        const isUser = z.id === userSign;
        const name = lang.startsWith('en') ? z.nameEn : z.nameTr;

        return (
          <Pressable
            key={z.id}
            style={({ pressed }) => [
              S.cell,
              isUser && S.cellUser,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => onSelect(z.id)}
            accessibilityLabel={name}
          >
            <Text style={S.emoji}>{z.emoji}</Text>
            <Text style={[S.name, isUser && S.nameUser]} numberOfLines={1}>{name}</Text>
            {isUser && <View style={S.badge} />}
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    cell: {
      width: '31%',
      alignItems: 'center',
      paddingVertical: SPACING.md,
      marginBottom: SPACING.sm,
      borderRadius: RADIUS.md,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
      borderWidth: 1,
      borderColor: 'transparent',
      position: 'relative',
    },
    cellUser: {
      borderColor: C.horoscopeAccent,
      backgroundColor: C.horoscopeGlow,
    },
    emoji: {
      fontSize: 28,
      marginBottom: 4,
    },
    name: {
      ...TYPOGRAPHY.CaptionBold,
      color: C.text,
    },
    nameUser: {
      color: C.horoscopeAccent,
    },
    badge: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: C.horoscopeAccent,
    },
  });
}
