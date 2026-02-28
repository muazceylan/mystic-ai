import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../../constants/tokens';
import { useTranslation } from 'react-i18next';

interface Props {
  luckyColor?: string;
  luckyNumber?: string;
  compatibility?: string;
  mood?: string;
}

export function LuckRow({ luckyColor, luckyNumber, compatibility, mood }: Props) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const S = makeStyles(colors, isDark);

  if (!luckyColor && !luckyNumber && !compatibility) return null;

  return (
    <View style={S.row}>
      {luckyColor ? (
        <View style={S.item}>
          <View style={[S.colorCircle, { backgroundColor: luckyColor }]} />
          <Text style={S.label}>{t('horoscope.luckyColor')}</Text>
        </View>
      ) : null}
      {luckyNumber ? (
        <View style={S.item}>
          <View style={S.numberBadge}>
            <Text style={S.numberText}>{luckyNumber}</Text>
          </View>
          <Text style={S.label}>{t('horoscope.luckyNumber')}</Text>
        </View>
      ) : null}
      {compatibility ? (
        <View style={S.item}>
          <Ionicons name="heart" size={16} color={colors.pink} />
          <Text style={S.label}>{compatibility}</Text>
        </View>
      ) : null}
      {mood ? (
        <View style={S.item}>
          <Ionicons name="happy-outline" size={16} color={colors.horoscopeAccent} />
          <Text style={S.label}>{mood}</Text>
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : C.surface,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : C.border,
    },
    item: {
      alignItems: 'center',
      gap: 4,
    },
    colorCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
    },
    numberBadge: {
      backgroundColor: C.horoscopeGlow,
      borderRadius: RADIUS.sm,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 2,
    },
    numberText: {
      ...TYPOGRAPHY.CaptionBold,
      color: C.horoscopeAccent,
    },
    label: {
      ...TYPOGRAPHY.CaptionSmall,
      color: C.subtext,
    },
  });
}
