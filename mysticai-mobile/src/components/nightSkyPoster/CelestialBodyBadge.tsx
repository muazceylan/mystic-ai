import React, { memo } from 'react';
import { Circle, G, Line, Text as SvgText } from 'react-native-svg';
import type { CelestialBody } from '../../features/nightSkyPoster/poster.types';
import { getToneColors } from '../../features/nightSkyPoster/poster.utils';

type Props = {
  body: CelestialBody;
  size: number;
};

/**
 * Premium medallion badge matching the reference poster:
 * dark circle + gold/tone ring border + bright symbol
 * Simple, clean, no excessive layering.
 */
function CelestialBodyBadge({ body, size }: Props) {
  const tone = getToneColors(body.tone);
  const anchorX = body.x * size;
  const anchorY = body.y * size;
  const badgeX = (body.x + (body.clusterOffsetX ?? 0)) * size;
  const badgeY = (body.y + (body.clusterOffsetY ?? 0)) * size;
  const priority = body.priority ?? 1;
  const isPrimary = body.markerLevel === 'primary';

  /* size hierarchy — reference shows Sun/Moon largest, inner planets medium, outers small */
  const badgeRadius = isPrimary ? 15 : priority >= 2 ? 11.8 : 9.3;
  const symbolSize = isPrimary ? 15 : priority >= 2 ? 11.8 : 9.4;
  const glowRadius = isPrimary ? 23 : priority >= 2 ? 17 : 12.5;
  const anchorDotR = isPrimary ? 1.8 : priority >= 2 ? 1.3 : 1.0;
  const borderWidth = isPrimary ? 1.4 : priority >= 2 ? 1.1 : 0.85;

  return (
    <G>
      {/* tether line */}
      <Line
        x1={anchorX}
        y1={anchorY}
        x2={badgeX}
        y2={badgeY}
        stroke="rgba(200,175,110,0.18)"
        strokeWidth={isPrimary ? 0.7 : 0.45}
      />

      {/* anchor dot */}
      <Circle
        cx={anchorX}
        cy={anchorY}
        r={anchorDotR}
        fill="rgba(215,190,120,0.7)"
      />

      {/* soft glow halo */}
      <Circle
        cx={badgeX}
        cy={badgeY}
        r={glowRadius}
        fill={tone.glow}
        opacity={isPrimary ? 0.35 : priority >= 2 ? 0.22 : 0.15}
      />

      <Circle
        cx={badgeX}
        cy={badgeY}
        r={badgeRadius + 4.6}
        fill="transparent"
        stroke="rgba(244,226,180,0.16)"
        strokeWidth={0.9}
      />

      {/* main badge: dark fill + gold/tone border ring */}
      <Circle
        cx={badgeX}
        cy={badgeY}
        r={badgeRadius}
        fill="rgba(6,8,18,0.95)"
        stroke={tone.border}
        strokeWidth={borderWidth}
      />

      {/* inner subtle ring for depth */}
      <Circle
        cx={badgeX}
        cy={badgeY}
        r={badgeRadius - 0.9}
        fill="transparent"
        stroke="rgba(255,248,228,0.08)"
        strokeWidth={0.75}
      />
      <Circle
        cx={badgeX}
        cy={badgeY}
        r={badgeRadius - 2.2}
        fill="transparent"
        stroke={tone.border}
        strokeOpacity={0.12}
        strokeWidth={0.4}
      />

      <Circle
        cx={badgeX - badgeRadius * 0.24}
        cy={badgeY - badgeRadius * 0.28}
        r={badgeRadius * 0.28}
        fill="rgba(255,245,220,0.08)"
      />

      {/* symbol */}
      <SvgText
        x={badgeX}
        y={badgeY + symbolSize * 0.36}
        fill={tone.symbol}
        fontSize={symbolSize}
        fontWeight="800"
        textAnchor="middle"
        opacity={0.95}
      >
        {body.symbol}
      </SvgText>
    </G>
  );
}

export default memo(CelestialBodyBadge);
