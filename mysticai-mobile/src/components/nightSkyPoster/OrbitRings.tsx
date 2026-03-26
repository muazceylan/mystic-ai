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
          stroke={index >= 3 ? 'rgba(200,175,110,0.1)' : 'rgba(255,255,255,0.07)'}
          strokeWidth={index >= 3 ? 0.5 : 0.35}
          opacity={0.7}
        />
      ))}
    </>
  );
}

export default memo(OrbitRings);
