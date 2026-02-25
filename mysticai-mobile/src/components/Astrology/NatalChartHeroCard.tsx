import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { HousePlacement, PlanetPosition, PlanetaryAspect } from '../../services/astrology.service';
import { getZodiacInfo } from '../../constants/zodiac';
import { useTheme } from '../../context/ThemeContext';
import NatalChartProPanels from './NatalChartProPanels';

type Props = {
  name?: string | null;
  birthDate?: string | null;
  birthTime?: string | null;
  birthLocation?: string | null;
  sunSign?: string | null;
  moonSign?: string | null;
  risingSign?: string | null;
  planets: PlanetPosition[];
  houses: HousePlacement[];
  aspects: PlanetaryAspect[];
  planetNames?: Record<string, string>;
  showWheelPreview?: boolean;
};

export default function NatalChartHeroCard({
  name,
  birthDate,
  birthTime,
  birthLocation,
  sunSign,
  moonSign,
  risingSign,
  planets,
  houses,
  aspects,
  planetNames,
  showWheelPreview = false,
}: Props) {
  const { colors } = useTheme();
  const sun = getZodiacInfo(sunSign);
  const moon = getZodiacInfo(moonSign);
  const rising = getZodiacInfo(risingSign);
  const dateTimeLine = [birthDate || null, birthTime || null].filter(Boolean).join(' • ');

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={styles.topBlock}>
        <Text style={[styles.eyebrow, { color: colors.violet }]}>KOZMİK HARİTA</Text>
        <Text style={[styles.name, { color: colors.textSlate }]} numberOfLines={1}>
          {name || 'Mystic Soul'}
        </Text>
        <Text style={[styles.sub, { color: colors.textMuted }]} numberOfLines={1}>
          {dateTimeLine || 'Tarih/Saat bilgisi yok'}
        </Text>
        <Text style={[styles.locationLine, { color: colors.textMuted }]} numberOfLines={1}>
          {birthLocation || 'Konum yok'}
        </Text>
      </View>

      <View style={styles.compactSignRow}>
        {[
          { icon: '☉', label: 'Güneş', sign: `${sun.symbol} ${sun.name}` },
          { icon: '☽', label: 'Ay', sign: `${moon.symbol} ${moon.name}` },
          { icon: '↑', label: 'Yükselen', sign: `${rising.symbol} ${rising.name}` },
        ].map((item) => (
          <View
            key={item.label}
            style={[
              styles.compactSignChip,
              {
                backgroundColor: colors.primaryTint,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.compactSignIcon, { color: colors.violet }]}>{item.icon}</Text>
            <View style={styles.compactSignTextCol}>
              <Text style={[styles.compactSignLabel, { color: colors.textMuted }]} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={[styles.compactSignValue, { color: colors.text }]} numberOfLines={1}>
                {item.sign}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {!showWheelPreview ? (
        <View style={[styles.inlineHint, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Text style={[styles.inlineHintText, { color: colors.textMuted }]}>
            Dairesel harita görseli aşağıdaki "Dairesel Doğum Haritası" bölümünde.
          </Text>
        </View>
      ) : null}

      {showWheelPreview ? (
        <View style={styles.chartWrap}>
          <NatalChartProPanels
            mode="hero"
            planets={planets}
            houses={houses}
            aspects={aspects}
            risingSign={risingSign}
            planetNames={planetNames}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 10,
    gap: 8,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  topBlock: {
    gap: 1,
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 1.1,
    fontWeight: '800',
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
  },
  sub: {
    fontSize: 11,
    lineHeight: 15,
  },
  locationLine: {
    fontSize: 11,
    lineHeight: 15,
  },
  compactSignRow: {
    gap: 6,
  },
  compactSignChip: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactSignIcon: {
    fontSize: 14,
    fontWeight: '700',
  },
  compactSignTextCol: {
    flex: 1,
    minWidth: 0,
  },
  compactSignLabel: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  compactSignValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  inlineHint: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  inlineHintText: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '600',
  },
  chartWrap: {
    marginTop: 2,
  },
});
