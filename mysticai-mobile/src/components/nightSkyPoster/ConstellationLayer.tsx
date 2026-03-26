import React, { memo, useMemo } from 'react';
import { Circle, Polyline } from 'react-native-svg';
import type { ConstellationPoint, ConstellationSegment } from '../../features/nightSkyPoster/poster.types';

type Props = {
  size: number;
  segments: ConstellationSegment[];
  stars?: ConstellationPoint[];
};

/**
 * Constellation lines and stars matching the reference poster:
 * warm golden-tinted lines, subtle, with natural star dots.
 */
function ConstellationLayer({ size, segments, stars = [] }: Props) {
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
      {decorativeStars.map((star, index) => (
        <Circle
          key={`star-${index}`}
          cx={star.x * size}
          cy={star.y * size}
          r={star.size ?? 0.7}
          fill={`rgba(240,235,210,${Math.min(0.85, (star.opacity ?? 0.5) * 1.1)})`}
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
              stroke={`rgba(200,180,120,${baseOp * 0.3})`}
              strokeWidth={2.0}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* core line */}
            <Polyline
              points={points}
              fill="none"
              stroke={`rgba(215,195,140,${baseOp * 0.9})`}
              strokeWidth={0.55}
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
            fill="rgba(220,200,150,0.06)"
          />
          <Circle
            cx={node.x * size}
            cy={node.y * size}
            r={Math.max(0.5, (node.size ?? 0.8) + 0.1)}
            fill={`rgba(245,235,200,${Math.max(0.6, node.opacity ?? 0.6)})`}
          />
        </React.Fragment>
      ))}
    </>
  );
}

export default memo(ConstellationLayer);
