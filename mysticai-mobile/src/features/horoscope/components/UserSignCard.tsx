import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../../constants/tokens';
import { ZodiacSign } from '../types/horoscope.types';
import { ZODIAC_MAP } from '../utils/zodiacData';

interface Props {
  sign: ZodiacSign;
  lang: string;
  onPress: () => void;
  summary?: string;
}

export function UserSignCard({ sign, lang, onPress, summary }: Props) {
  const { colors, isDark } = useTheme();
  const S = makeStyles(colors, isDark);
  const data = ZODIAC_MAP.get(sign);
  if (!data) return null;

  const name = lang.startsWith('en') ? data.nameEn : data.nameTr;
  const dateRange = lang.startsWith('en') ? data.dateRange : data.dateRangeTr;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.92 }]}>
      <LinearGradient
        colors={isDark
          ? [colors.horoscopeGlow, 'rgba(168,85,247,0.08)', 'transparent']
          : [colors.horoscopeGlow, 'rgba(157,78,221,0.05)', 'transparent']}
        style={S.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={S.row}>
          <Text style={S.emoji}>{data.emoji}</Text>
          <View style={S.info}>
            <Text style={S.name}>{name}</Text>
            <Text style={S.dateRange}>{dateRange}</Text>
          </View>
          <View style={S.cta}>
            <Ionicons name="chevron-forward" size={20} color={colors.horoscopeAccent} />
          </View>
        </View>
        {summary ? (
          <Text style={S.summary} numberOfLines={2}>{summary}</Text>
        ) : null}
      </LinearGradient>
    </Pressable>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    card: {
      borderRadius: RADIUS.lg,
      padding: SPACING.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(168,85,247,0.2)' : 'rgba(157,78,221,0.15)',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    emoji: {
      fontSize: 40,
      marginRight: SPACING.md,
    },
    info: {
      flex: 1,
    },
    name: {
      ...TYPOGRAPHY.H3,
      color: C.text,
    },
    dateRange: {
      ...TYPOGRAPHY.Caption,
      color: C.subtext,
      marginTop: 2,
    },
    cta: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: C.horoscopeGlow,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summary: {
      ...TYPOGRAPHY.Small,
      color: C.body,
      marginTop: SPACING.sm,
      lineHeight: 20,
    },
  });
}
