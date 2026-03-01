import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, LayoutChangeEvent } from 'react-native';
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

  const [trackWidth, setTrackWidth] = useState(0);
  const slide = useRef(new Animated.Value(value === 'daily' ? 0 : 1)).current;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  }, []);

  useEffect(() => {
    Animated.spring(slide, {
      toValue: value === 'daily' ? 0 : 1,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start();
  }, [value]);

  const padding = 3;
  const segmentWidth = trackWidth > 0 ? (trackWidth - padding * 2) / 2 : 0;

  const translateX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, segmentWidth],
  });

  return (
    <View style={S.track} onLayout={onLayout}>
      {trackWidth > 0 && (
        <Animated.View
          style={[
            S.indicator,
            {
              width: segmentWidth,
              transform: [{ translateX }],
            },
          ]}
        />
      )}
      <Pressable
        style={({ pressed }) => [S.segment, pressed && { opacity: 0.7 }]}
        onPress={() => onChange('daily')}
      >
        <Text style={[S.label, value === 'daily' && S.labelActive]}>{labels[0]}</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [S.segment, pressed && { opacity: 0.7 }]}
        onPress={() => onChange('weekly')}
      >
        <Text style={[S.label, value === 'weekly' && S.labelActive]}>{labels[1]}</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    track: {
      flexDirection: 'row',
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      borderRadius: RADIUS.md,
      padding: 3,
    },
    indicator: {
      position: 'absolute',
      top: 3,
      bottom: 3,
      left: 3,
      borderRadius: RADIUS.sm,
      backgroundColor: C.horoscopeAccent,
    },
    segment: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: SPACING.smMd,
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
