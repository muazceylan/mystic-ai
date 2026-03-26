import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import type { NightSkyPosterModel } from '../../features/nightSkyPoster/poster.types';
import { posterTokens } from '../../features/nightSkyPoster/poster.tokens';
import { getToneColors } from '../../features/nightSkyPoster/poster.utils';
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
  const tone = getToneColors(model.posterTone ?? 'moon');

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
      <View style={[styles.discGlow, { backgroundColor: 'rgba(200,170,100,0.06)' }]} />
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          {/* disc interior: deep dark with subtle blue */}
          <RadialGradient id="discCore" cx="50%" cy="50%" r="54%">
            <Stop offset="0%" stopColor="rgba(18,24,50,0.92)" />
            <Stop offset="40%" stopColor="rgba(10,14,30,0.97)" />
            <Stop offset="100%" stopColor="rgba(4,6,14,1)" />
          </RadialGradient>
          {/* bright warm golden center glow — the hero element */}
          <RadialGradient id="centerSunGlow" cx="50%" cy="50%" r="28%">
            <Stop offset="0%" stopColor="#F5D87A" stopOpacity="0.72" />
            <Stop offset="18%" stopColor="#E8C560" stopOpacity="0.48" />
            <Stop offset="40%" stopColor="#D4A840" stopOpacity="0.2" />
            <Stop offset="65%" stopColor="#C09030" stopOpacity="0.06" />
            <Stop offset="100%" stopColor="#806020" stopOpacity="0" />
          </RadialGradient>
          {/* secondary warm wash */}
          <RadialGradient id="warmWash" cx="50%" cy="50%" r="45%">
            <Stop offset="0%" stopColor="rgba(220,190,120,0.08)" />
            <Stop offset="50%" stopColor="rgba(180,150,80,0.03)" />
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
          fill="rgba(4,6,14,0.98)"
        />

        {/* outer disc border — visible gold ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="rgba(200,175,110,0.35)"
          strokeWidth={1.4}
        />

        {/* zodiac band inner boundary — prominent ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius * 0.855}
          fill="transparent"
          stroke="rgba(200,175,110,0.28)"
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
            stroke="rgba(200,175,110,0.2)"
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
              fill="rgba(215,190,120,0.07)"
            />
            <Circle
              cx={z.x}
              cy={z.y}
              r={7}
              fill="rgba(220,195,130,0.05)"
            />
            {/* symbol — large, bright, prominent */}
            <SvgText
              x={z.x}
              y={z.y + 5.5}
              fill="rgba(225,200,130,0.88)"
              fontSize={15}
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

          {aspectLine ? (
            <Line
              x1={aspectLine.x1}
              y1={aspectLine.y1}
              x2={aspectLine.x2}
              y2={aspectLine.y2}
              stroke="rgba(215,190,120,0.18)"
              strokeWidth={0.7}
            />
          ) : null}

          <ConstellationLayer
            size={size}
            segments={model.constellationLines}
            stars={model.stars}
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
        <Circle cx={center} cy={center} r={2} fill="rgba(240,215,130,0.5)" />
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
