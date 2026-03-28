import React, { memo, useMemo } from 'react';
import { Circle, Polyline } from 'react-native-svg';
import type { ConstellationPoint, ConstellationSegment, NightSkyPosterModel } from '../../features/nightSkyPoster/poster.types';

type Props = {
  size: number;
  segments: ConstellationSegment[];
  stars?: ConstellationPoint[];
  variant?: NightSkyPosterModel['variant'];
};

/**
 * Constellation lines and stars matching the reference poster:
 * warm golden-tinted lines, subtle, with natural star dots.
 */
function ConstellationLayer({ size, segments, stars = [], variant }: Props) {
  const variantStyles = useMemo(() => {
    switch (variant) {
      case 'constellation_heavy':
        return {
          decorativeLimit: 80,
          decorativeFill: 'rgba(239,232,255,0.92)',
          lineGlowBase: 'rgba(150,126,255,',
          lineCoreBase: 'rgba(220,208,255,',
          lineGlowWidth: 2.6,
          lineCoreWidth: 0.8,
          nodeGlowFill: 'rgba(164,138,255,0.12)',
          nodeFill: 'rgba(244,238,255,',
        };
      case 'gold_edition':
        return {
          decorativeLimit: 54,
          decorativeFill: 'rgba(245,236,204,0.9)',
          lineGlowBase: 'rgba(212,179,108,',
          lineCoreBase: 'rgba(242,224,170,',
          lineGlowWidth: 2.2,
          lineCoreWidth: 0.7,
          nodeGlowFill: 'rgba(220,188,116,0.08)',
          nodeFill: 'rgba(250,240,206,',
        };
      default:
        return {
          decorativeLimit: 36,
          decorativeFill: 'rgba(228,236,250,0.78)',
          lineGlowBase: 'rgba(170,188,220,',
          lineCoreBase: 'rgba(220,229,244,',
          lineGlowWidth: 1.6,
          lineCoreWidth: 0.42,
          nodeGlowFill: 'rgba(220,232,250,0.05)',
          nodeFill: 'rgba(238,244,252,',
        };
    }
  }, [variant]);

  const { decorativeStars, constellationNodes } = useMemo(() => {
    const nodesMap = new Map<string, ConstellationPoint>();
    for (const segment of segments) {
      for (const point of segment.points) {
        const key = `${point.x.toFixed(3)}:${point.y.toFixed(3)}`;
        if (!nodesMap.has(key)) {
          nodesMap.set(key, point);
        }
      }
    }

    const nodes = Array.from(nodesMap.values());
    const decorative = stars.filter((star) => {
      return !nodes.some((node) => {
        const dx = node.x - star.x;
        const dy = node.y - star.y;
        return Math.sqrt(dx * dx + dy * dy) < 0.014;
      });
    }).slice(0, 60);

    return {
      decorativeStars: decorative,
      constellationNodes: nodes.slice(0, 28),
    };
  }, [segments, stars]);

  return (
    <>
      {/* decorative stars — simple warm-white dots */}
      {decorativeStars.slice(0, variantStyles.decorativeLimit).map((star, index) => (
        <Circle
          key={`star-${index}`}
          cx={star.x * size}
          cy={star.y * size}
          r={star.size ?? 0.7}
          fill={variantStyles.decorativeFill}
          opacity={Math.min(0.9, (star.opacity ?? 0.5) * 1.08)}
        />
      ))}

      {/* constellation lines — warm golden, subtle */}
      {segments.map((segment) => {
        const points = segment.points.map((p) => `${p.x * size},${p.y * size}`).join(' ');
        const baseOp = segment.opacity ?? 0.2;
        return (
          <React.Fragment key={segment.id}>
            {/* soft glow */}
            <Polyline
              points={points}
              fill="none"
              stroke={`${variantStyles.lineGlowBase}${baseOp * 0.34})`}
              strokeWidth={variantStyles.lineGlowWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* core line */}
            <Polyline
              points={points}
              fill="none"
              stroke={`${variantStyles.lineCoreBase}${baseOp * 0.9})`}
              strokeWidth={variantStyles.lineCoreWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </React.Fragment>
        );
      })}

      {/* constellation nodes — slightly brighter dots with tiny glow */}
      {constellationNodes.map((node, index) => (
        <React.Fragment key={`node-${index}`}>
          <Circle
            cx={node.x * size}
            cy={node.y * size}
            r={(node.size ?? 0.8) + 1.2}
            fill={variantStyles.nodeGlowFill}
          />
          <Circle
            cx={node.x * size}
            cy={node.y * size}
            r={Math.max(0.5, (node.size ?? 0.8) + 0.1)}
            fill={`${variantStyles.nodeFill}${Math.max(0.6, node.opacity ?? 0.6)})`}
          />
        </React.Fragment>
      ))}
    </>
  );
}

export default memo(ConstellationLayer);
