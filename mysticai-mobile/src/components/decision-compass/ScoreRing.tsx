import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ScoreRingProps {
  score: number;
  size?: number;
  ringColors: [string, string];
  textColor: string;
  centerFill: string;
}

export function ScoreRing({
  score,
  size = 62,
  ringColors,
  textColor,
  centerFill,
}: ScoreRingProps) {
  // Thicker ring for more visible, refined feel
  const ringPadding = Math.max(8, Math.round(size * 0.118));
  const inner = size - ringPadding * 2;
  const S = styles(size, inner, ringPadding, centerFill, textColor, ringColors[0]);

  return (
    <View style={S.wrap}>
      <View style={S.glowHalo} />
      <LinearGradient colors={ringColors} start={{ x: 0.1, y: 0.1 }} end={{ x: 0.9, y: 0.9 }} style={S.outer}>
        <View style={S.innerCutout} />
      </LinearGradient>
      <View style={S.centerWrap}>
        <View style={S.centerHighlight} />
        <View style={S.inner}>
          <Text style={S.scoreText}>{Math.round(score)}%</Text>
        </View>
      </View>
    </View>
  );
}

function styles(
  size: number,
  inner: number,
  ringPadding: number,
  centerFill: string,
  textColor: string,
  glowColor: string,
) {
  return StyleSheet.create({
    wrap: {
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    glowHalo: {
      position: 'absolute',
      width: size + 14,
      height: size + 14,
      borderRadius: (size + 14) / 2,
      backgroundColor: glowColor,
      opacity: 0.20,
    },
    outer: {
      width: size,
      height: size,
      borderRadius: size / 2,
      alignItems: 'center',
      justifyContent: 'center',
      // No hard border — the gradient itself is the ring
    },
    innerCutout: {
      width: inner,
      height: inner,
      borderRadius: inner / 2,
      // Nearly transparent so the ring gradient shows cleanly at the edges
      backgroundColor: 'rgba(255,255,255,0.08)',
      opacity: 0.5,
    },
    centerWrap: {
      position: 'absolute',
      width: inner,
      height: inner,
      borderRadius: inner / 2,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      // No hard border for a softer look
      backgroundColor: centerFill,
    },
    centerHighlight: {
      position: 'absolute',
      top: 2,
      left: inner * 0.14,
      right: inner * 0.14,
      height: inner * 0.32,
      borderRadius: inner * 0.20,
      backgroundColor: 'rgba(255,255,255,0.54)',
    },
    inner: {
      width: inner,
      height: inner,
      borderRadius: inner / 2,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 1,
    },
    scoreText: {
      color: textColor,
      fontSize: Math.max(13, size * 0.25),
      fontWeight: '900',
      letterSpacing: -0.5,
    },
  });
}
