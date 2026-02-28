import React, { useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useTheme, ThemeColors } from '../../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../../constants/tokens';
import { HoroscopePeriod } from '../types/horoscope.types';

interface Props {
  value: HoroscopePeriod;
  onChange: (v: HoroscopePeriod) => void;
  labels: [string, string];
}

export function SegmentedControl({ value, onChange, labels }: Props) {
  const { colors, isDark } = useTheme();
  const S = makeStyles(colors, isDark);
  const slide = useRef(new Animated.Value(value === 'daily' ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: value === 'daily' ? 0 : 1,
      useNativeDriver: false,
      tension: 68,
      friction: 12,
    }).start();
  }, [value]);

  const translateX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={S.track}>
      <Animated.View style={[S.indicator, { left: translateX, width: '50%' }]} />
      <Pressable style={S.segment} onPress={() => onChange('daily')}>
        <Text style={[S.label, value === 'daily' && S.labelActive]}>{labels[0]}</Text>
      </Pressable>
      <Pressable style={S.segment} onPress={() => onChange('weekly')}>
        <Text style={[S.label, value === 'weekly' && S.labelActive]}>{labels[1]}</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    track: {
      flexDirection: 'row',
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      borderRadius: RADIUS.md,
      padding: 3,
      position: 'relative',
    },
    indicator: {
      position: 'absolute',
      top: 3,
      bottom: 3,
      borderRadius: RADIUS.sm,
      backgroundColor: C.horoscopeAccent,
    },
    segment: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: SPACING.sm,
      zIndex: 1,
    },
    label: {
      ...TYPOGRAPHY.SmallBold,
      color: C.subtext,
    },
    labelActive: {
      color: '#FFFFFF',
    },
  });
}
