import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import type { NightSkyPosterModel } from '../../features/nightSkyPoster/poster.types';
import { posterTokens } from '../../features/nightSkyPoster/poster.tokens';
import CelestialBodyBadge from './CelestialBodyBadge';
import ConstellationLayer from './ConstellationLayer';
import OrbitRings from './OrbitRings';

/* 12 zodiac symbols for the outer ring */
const ZODIAC_SYMBOLS = [
  '♈', '♉', '♊', '♋', '♌', '♍',
  '♎', '♏', '♐', '♑', '♒', '♓',
] as const;

type Props = {
  model: NightSkyPosterModel;
  size: number;
};

function NightSkyDisc({ model, size }: Props) {
  const center = size / 2;
  const radius = size / 2 - 4;
  const discTheme = useMemo(() => {
    switch (model.variant) {
      case 'constellation_heavy':
        return {
          discGlow: 'rgba(128,104,255,0.12)',
          discFill: 'rgba(10,7,24,0.98)',
          outerBorder: 'rgba(166,142,255,0.38)',
          innerBorder: 'rgba(166,142,255,0.24)',
          tickStroke: 'rgba(178,160,255,0.22)',
          symbolHaloOuter: 'rgba(172,150,255,0.1)',
          symbolHaloInner: 'rgba(190,172,255,0.08)',
          symbolFill: 'rgba(241,234,255,0.9)',
          discCoreInner: '#23183E',
          discCoreMiddle: '#120B24',
          discCoreOuter: '#080512',
          centerGlowInner: '#B79BFF',
          centerGlowMiddle: '#8C6EFF',
          centerGlowOuter: '#6849D7',
          centerGlowOpacities: [0.68, 0.42, 0.16, 0.04],
          washInner: 'rgba(152,128,255,0.12)',
          washMiddle: 'rgba(116,88,226,0.06)',
          aspectStroke: 'rgba(182,162,255,0.22)',
          centerDot: 'rgba(220,206,255,0.58)',
          zodiacSize: 15.2,
        };
      case 'gold_edition':
        return {
          discGlow: 'rgba(200,170,100,0.1)',
          discFill: 'rgba(8,7,11,0.98)',
          outerBorder: 'rgba(214,188,122,0.42)',
          innerBorder: 'rgba(214,188,122,0.3)',
          tickStroke: 'rgba(214,188,122,0.24)',
          symbolHaloOuter: 'rgba(215,190,120,0.08)',
          symbolHaloInner: 'rgba(220,195,130,0.06)',
          symbolFill: 'rgba(234,210,144,0.9)',
          discCoreInner: '#261D10',
          discCoreMiddle: '#14100A',
          discCoreOuter: '#090705',
          centerGlowInner: '#F7DE90',
          centerGlowMiddle: '#E6C567',
          centerGlowOuter: '#C99737',
          centerGlowOpacities: [0.76, 0.5, 0.22, 0.06],
          washInner: 'rgba(220,190,120,0.1)',
          washMiddle: 'rgba(180,150,80,0.04)',
          aspectStroke: 'rgba(220,195,130,0.22)',
          centerDot: 'rgba(240,215,130,0.6)',
          zodiacSize: 15.4,
        };
      default:
        return {
          discGlow: 'rgba(173,196,236,0.08)',
          discFill: 'rgba(5,8,18,0.98)',
          outerBorder: 'rgba(207,220,244,0.3)',
          innerBorder: 'rgba(207,220,244,0.2)',
          tickStroke: 'rgba(207,220,244,0.16)',
          symbolHaloOuter: 'rgba(210,224,245,0.06)',
          symbolHaloInner: 'rgba(216,228,248,0.05)',
          symbolFill: 'rgba(231,238,248,0.86)',
          discCoreInner: '#141E35',
          discCoreMiddle: '#0D1526',
          discCoreOuter: '#060B16',
          centerGlowInner: '#E7EFFA',
          centerGlowMiddle: '#B9CCE9',
          centerGlowOuter: '#90A5CA',
          centerGlowOpacities: [0.4, 0.24, 0.08, 0],
          washInner: 'rgba(207,220,244,0.08)',
          washMiddle: 'rgba(158,181,220,0.03)',
          aspectStroke: 'rgba(210,224,245,0.14)',
          centerDot: 'rgba(228,236,250,0.48)',
          zodiacSize: 14.4,
        };
    }
  }, [model.variant]);

  const highlightedBodies = useMemo(
    () => model.celestialBodies.filter((body) => model.highlightedBodyIds?.includes(body.id)).slice(0, 2),
    [model.celestialBodies, model.highlightedBodyIds],
  );
  const sortedBodies = useMemo(
    () => [...model.celestialBodies].sort((a, b) => (a.priority ?? 1) - (b.priority ?? 1)),
    [model.celestialBodies],
  );

  const aspectLine = highlightedBodies.length === 2
    ? {
        x1: (highlightedBodies[0].x + (highlightedBodies[0].clusterOffsetX ?? 0)) * size,
        y1: (highlightedBodies[0].y + (highlightedBodies[0].clusterOffsetY ?? 0)) * size,
        x2: (highlightedBodies[1].x + (highlightedBodies[1].clusterOffsetX ?? 0)) * size,
        y2: (highlightedBodies[1].y + (highlightedBodies[1].clusterOffsetY ?? 0)) * size,
      }
    : null;

  /* zodiac ring positions — symbols on the band between inner/outer ring */
  const zodiacBandRadius = radius * 0.925;
  const zodiacItems = useMemo(
    () =>
      ZODIAC_SYMBOLS.map((symbol, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        return {
          symbol,
          x: center + zodiacBandRadius * Math.cos(angle),
          y: center + zodiacBandRadius * Math.sin(angle),
        };
      }),
    [center, zodiacBandRadius],
  );

  /* tick marks at sign boundaries (every 30°, offset 15° from symbols) */
  const tickMarks = useMemo(() => {
    const inner = radius * 0.86;
    const outer = radius * 0.99;
    return Array.from({ length: 12 }, (_, i) => {
      const angle = ((i * 30 + 15) - 90) * (Math.PI / 180);
      return {
        x1: center + inner * Math.cos(angle),
        y1: center + inner * Math.sin(angle),
        x2: center + outer * Math.cos(angle),
        y2: center + outer * Math.sin(angle),
      };
    });
  }, [center, radius]);

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      {/* soft glow behind disc */}
      <View style={[styles.discGlow, { backgroundColor: discTheme.discGlow }]} />
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          {/* disc interior: deep dark with subtle blue */}
          <RadialGradient id="discCore" cx="50%" cy="50%" r="54%">
            <Stop offset="0%" stopColor={discTheme.discCoreInner} stopOpacity={0.94} />
            <Stop offset="40%" stopColor={discTheme.discCoreMiddle} stopOpacity={0.98} />
            <Stop offset="100%" stopColor={discTheme.discCoreOuter} stopOpacity={1} />
          </RadialGradient>
          {/* bright warm golden center glow — the hero element */}
          <RadialGradient id="centerSunGlow" cx="50%" cy="50%" r="28%">
            <Stop offset="0%" stopColor={discTheme.centerGlowInner} stopOpacity={discTheme.centerGlowOpacities[0]} />
            <Stop offset="18%" stopColor={discTheme.centerGlowMiddle} stopOpacity={discTheme.centerGlowOpacities[1]} />
            <Stop offset="40%" stopColor={discTheme.centerGlowOuter} stopOpacity={discTheme.centerGlowOpacities[2]} />
            <Stop offset="65%" stopColor={discTheme.centerGlowOuter} stopOpacity={discTheme.centerGlowOpacities[3]} />
            <Stop offset="100%" stopColor="#806020" stopOpacity="0" />
          </RadialGradient>
          {/* secondary warm wash */}
          <RadialGradient id="warmWash" cx="50%" cy="50%" r="45%">
            <Stop offset="0%" stopColor={discTheme.washInner} />
            <Stop offset="50%" stopColor={discTheme.washMiddle} />
            <Stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </RadialGradient>
          <ClipPath id="discClip">
            <Circle cx={center} cy={center} r={radius * 0.85} />
          </ClipPath>
        </Defs>

        {/* disc fill */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill={discTheme.discFill}
        />

        {/* outer disc border — visible gold ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke={discTheme.outerBorder}
          strokeWidth={1.4}
        />

        {/* zodiac band inner boundary — prominent ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius * 0.855}
          fill="transparent"
          stroke={discTheme.innerBorder}
          strokeWidth={1.0}
        />

        {/* tick marks between signs */}
        {tickMarks.map((t, i) => (
          <Line
            key={`tick-${i}`}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={discTheme.tickStroke}
            strokeWidth={0.5}
          />
        ))}

        {/* 12 zodiac symbols — large, bright gold with glow halos */}
        {zodiacItems.map((z, i) => (
          <G key={`z-${i}`}>
            {/* glow halo behind symbol */}
            <Circle
              cx={z.x}
              cy={z.y}
              r={12}
              fill={discTheme.symbolHaloOuter}
            />
            <Circle
              cx={z.x}
              cy={z.y}
              r={7}
              fill={discTheme.symbolHaloInner}
            />
            {/* symbol — large, bright, prominent */}
            <SvgText
              x={z.x}
              y={z.y + 5.5}
              fill={discTheme.symbolFill}
              fontSize={discTheme.zodiacSize}
              fontWeight="800"
              textAnchor="middle"
            >
              {z.symbol}
            </SvgText>
          </G>
        ))}

        {/* inner map area */}
        <Circle
          cx={center}
          cy={center}
          r={radius * 0.85}
          fill="url(#discCore)"
        />

        <G clipPath="url(#discClip)">
          <Rect x={0} y={0} width={size} height={size} fill="rgba(255,255,255,0.008)" />

          {/* warm golden center glow — the brightest element */}
          <Circle cx={center} cy={center} r={radius * 0.52} fill="url(#centerSunGlow)" />
          <Circle cx={center} cy={center} r={radius * 0.38} fill="url(#warmWash)" />

          <OrbitRings center={center} radius={radius * 0.85} />

          {aspectLine && model.variant !== 'minimal' ? (
            <Line
              x1={aspectLine.x1}
              y1={aspectLine.y1}
              x2={aspectLine.x2}
              y2={aspectLine.y2}
              stroke={discTheme.aspectStroke}
              strokeWidth={0.7}
            />
          ) : null}

          <ConstellationLayer
            size={size}
            segments={model.constellationLines}
            stars={model.stars}
            variant={model.variant}
          />
        </G>

        {/* planet badges */}
        {sortedBodies.map((body) => (
          <CelestialBodyBadge
            key={body.id}
            body={body}
            size={size}
          />
        ))}

        {/* center dot */}
        <Circle cx={center} cy={center} r={2} fill={discTheme.centerDot} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  discGlow: {
    position: 'absolute',
    width: '92%',
    height: '92%',
    borderRadius: posterTokens.radius.pill,
  },
});

export default memo(NightSkyDisc);
