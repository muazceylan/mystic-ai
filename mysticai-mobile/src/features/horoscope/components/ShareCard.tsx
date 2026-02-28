import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, ThemeColors } from '../../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../../constants/tokens';
import { ZodiacSign, HoroscopeResponse } from '../types/horoscope.types';
import { ZODIAC_MAP } from '../utils/zodiacData';

interface Props {
  data: HoroscopeResponse;
  lang: string;
}

export function ShareCard({ data, lang }: Props) {
  const { colors, isDark } = useTheme();
  const S = makeStyles(colors, isDark);
  const signData = ZODIAC_MAP.get(data.sign);
  const name = signData ? (lang.startsWith('en') ? signData.nameEn : signData.nameTr) : data.sign;

  return (
    <View style={S.wrapper}>
      <LinearGradient
        colors={isDark ? ['#1E1040', '#0A0520'] : ['#F5F0FA', '#E8DEFF']}
        style={S.card}
      >
        <Text style={S.emoji}>{signData?.emoji}</Text>
        <Text style={S.sign}>{name}</Text>
        <Text style={S.date}>{data.date}</Text>
        <Text style={S.text} numberOfLines={5}>{data.sections.general}</Text>
        <Text style={S.brand}>Mystic AI</Text>
      </LinearGradient>
    </View>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    wrapper: {
      aspectRatio: 9 / 16,
      width: '100%',
      borderRadius: RADIUS.lg,
      overflow: 'hidden',
    },
    card: {
      flex: 1,
      padding: SPACING.xl,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emoji: {
      fontSize: 56,
      marginBottom: SPACING.md,
    },
    sign: {
      ...TYPOGRAPHY.H1,
      color: C.text,
      marginBottom: 4,
    },
    date: {
      ...TYPOGRAPHY.Caption,
      color: C.subtext,
      marginBottom: SPACING.lg,
    },
    text: {
      ...TYPOGRAPHY.Body,
      color: C.body,
      textAlign: 'center',
      lineHeight: 24,
    },
    brand: {
      ...TYPOGRAPHY.CaptionBold,
      color: C.horoscopeAccent,
      position: 'absolute',
      bottom: SPACING.xl,
    },
  });
}
