import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

interface ScoreRingProps {
  score: number;
  size?: number;
  ringColors: [string, string];
  textColor: string;
  centerFill: string;
}

function scoreToGradient(score: number, fallback: [string, string]): [string, string] {
  if (score >= 70) return ['#CFC9FF', '#9EA0FF'];
  if (score >= 55) return ['#CFE2FF', '#95B0FF'];
  if (score >= 40) return ['#F0D6FF', '#D7A8FF'];
  if (score >= 25) return ['#FFD9E9', '#F4A6C8'];
  if (score >= 0) return ['#FFE5EE', '#F2B5CB'];
  return fallback;
}

export function ScoreRing({
  score,
  size = 62,
  ringColors,
  textColor,
  centerFill,
}: ScoreRingProps) {
  const progress = Math.max(0, Math.min(100, Math.round(score)));
  const strokeWidth = Math.max(5, Math.round(size * 0.11));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress / 100);
  const gradient = scoreToGradient(progress, ringColors);
  const gradientId = useMemo(
    () => `ring-grad-${Math.random().toString(36).slice(2, 10)}`,
    [],
  );

  const S = styles(size, strokeWidth, centerFill, textColor, gradient[0]);

  return (
    <View style={S.wrap}>
      <View style={S.halo} />
      <Svg width={size} height={size} style={S.svg}>
        <Defs>
          <SvgLinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={gradient[0]} />
            <Stop offset="100%" stopColor={gradient[1]} />
          </SvgLinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.32)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={S.center}>
        <View style={S.centerShine} />
        <Text style={S.score}>{progress}%</Text>
      </View>
    </View>
  );
}

function styles(
  size: number,
  strokeWidth: number,
  centerFill: string,
  textColor: string,
  haloColor: string,
) {
  const inner = size - strokeWidth * 2.15;
  return StyleSheet.create({
    wrap: {
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    halo: {
      position: 'absolute',
      width: size + 10,
      height: size + 10,
      borderRadius: (size + 10) / 2,
      backgroundColor: haloColor,
      opacity: 0.18,
    },
    svg: {
      position: 'absolute',
      top: 0,
      left: 0,
    },
    center: {
      width: inner,
      height: inner,
      borderRadius: inner / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: centerFill,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.64)',
      overflow: 'hidden',
    },
    centerShine: {
      position: 'absolute',
      top: 2,
      left: inner * 0.16,
      right: inner * 0.16,
      height: inner * 0.30,
      borderRadius: inner * 0.2,
      backgroundColor: 'rgba(255,255,255,0.50)',
    },
    score: {
      color: textColor,
      fontSize: Math.max(13, size * 0.24),
      fontWeight: '900',
      letterSpacing: -0.4,
    },
  });
}
