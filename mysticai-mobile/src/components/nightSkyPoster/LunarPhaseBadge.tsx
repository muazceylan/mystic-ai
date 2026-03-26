import React, { memo, useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G } from 'react-native-svg';
import type { NightSkyPosterModel } from '../../features/nightSkyPoster/poster.types';

type Props = {
  model: NightSkyPosterModel;
  label: string;
};

const displaySerif = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: undefined,
});

function shadowOffsetForPhase(key: string) {
  switch (key) {
    case 'new_moon': return 22;
    case 'waxing_crescent': return 16;
    case 'first_quarter': return 10;
    case 'waxing_gibbous': return 5;
    case 'full_moon': return -24;
    case 'waning_gibbous': return 38;
    case 'last_quarter': return 34;
    case 'waning_crescent': return 28;
    default: return 22;
  }
}

/**
 * Footer moon badge matching the reference:
 * moon crescent icon + "Yeniay · %4" text
 * Simple, editorial, no card container.
 */
function LunarPhaseBadge({ model, label }: Props) {
  const selectedPhase = useMemo(
    () => model.lunarPhases.find((p) => p.selected) ?? model.lunarPhases[0],
    [model.lunarPhases],
  );

  const shadowOffset = shadowOffsetForPhase(selectedPhase?.key ?? 'new_moon');

  return (
    <View style={styles.root}>
      {/* moon icon */}
      <View style={styles.moonWrap}>
        <Svg width={24} height={24} viewBox="0 0 24 24">
          <Defs>
            <ClipPath id="phase-badge-clip">
              <Circle cx={12} cy={12} r={9} />
            </ClipPath>
          </Defs>
          <G clipPath="url(#phase-badge-clip)">
            <Circle cx={12} cy={12} r={9} fill="#0B1226" />
            <Circle cx={12} cy={12} r={9} fill="#E8C860" opacity={0.9} />
            <Circle cx={shadowOffset * 0.32} cy={12} r={9} fill="#080E1E" />
          </G>
        </Svg>
      </View>

      <Text style={styles.phaseText} numberOfLines={1}>
        {selectedPhase?.label ?? label}
      </Text>

      <Text style={styles.separator}>·</Text>

      <Text style={styles.illumination}>
        %{model.moonIlluminationPercent}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moonWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseText: {
    color: 'rgba(220,210,190,0.7)',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  separator: {
    color: 'rgba(200,175,110,0.5)',
    fontSize: 12,
    fontWeight: '300',
  },
  illumination: {
    color: 'rgba(215,190,120,0.85)',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: displaySerif,
    letterSpacing: 0.3,
  },
});

export default memo(LunarPhaseBadge);
