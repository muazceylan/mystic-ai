import React, { memo } from 'react';
import { Circle } from 'react-native-svg';
import { posterTokens } from '../../features/nightSkyPoster/poster.tokens';

type Props = {
  center: number;
  radius: number;
};

/**
 * Concentric orbit rings matching the reference poster:
 * thin, subtle, evenly spaced circles with slight gold tint on outer ones.
 */
function OrbitRings({ center, radius }: Props) {
  return (
    <>
      {posterTokens.disc.ringFractions.map((fraction, index) => (
        <Circle
          key={`ring-${fraction}`}
          cx={center}
          cy={center}
          r={radius * fraction}
          fill="transparent"
          stroke={
            index === 0
              ? 'rgba(255,248,228,0.18)'
              : index >= 3
                ? 'rgba(214,189,123,0.18)'
                : 'rgba(244,238,224,0.1)'
          }
          strokeWidth={index >= 3 ? 0.65 : index === 0 ? 0.7 : 0.45}
          opacity={index === 0 ? 0.95 : 0.8}
        />
      ))}
    </>
  );
}

export default memo(OrbitRings);
