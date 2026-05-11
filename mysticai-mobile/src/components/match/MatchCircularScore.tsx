import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { AccessibleText } from '../ui';
import { ACCESSIBILITY } from '../../constants/tokens';
import { useTheme } from '../../context/ThemeContext';

interface MatchCircularScoreProps {
  score: number;
  size?: number;
  trackColor?: string;
  gradientColors?: readonly [string, string];
  valueColor?: string;
  labelColor?: string;
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function MatchCircularScore({
  score,
  size = 136,
  trackColor,
  gradientColors,
  valueColor,
  labelColor,
}: MatchCircularScoreProps) {
  const { colors, isDark } = useTheme();
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeScore = clampScore(score);
  const dashOffset = circumference * (1 - safeScore / 100);
  const resolvedTrackColor = trackColor ?? (isDark ? colors.border : '#ECE7F8');
  const resolvedGradientColors: readonly [string, string] =
    gradientColors ?? (isDark ? [colors.primaryLight, colors.primary] as const : ['#C4B5FD', '#7C3AED'] as const);
  const resolvedValueColor = valueColor ?? (isDark ? colors.primaryLight : '#5B21B6');
  const resolvedLabelColor = labelColor ?? colors.subtext;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <SvgLinearGradient id="match-overview-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={resolvedGradientColors[0]} />
            <Stop offset="100%" stopColor={resolvedGradientColors[1]} />
          </SvgLinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={resolvedTrackColor}
          strokeWidth={stroke}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#match-overview-gradient)"
          strokeWidth={stroke}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={styles.valueWrap}>
        <AccessibleText
          style={[styles.value, { color: resolvedValueColor }]}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          %{safeScore}
        </AccessibleText>
        <AccessibleText
          style={[styles.label, { color: resolvedLabelColor }]}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          Uyum
        </AccessibleText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  label: {
    marginTop: -2,
    fontSize: 13,
    fontWeight: '600',
  },
});
