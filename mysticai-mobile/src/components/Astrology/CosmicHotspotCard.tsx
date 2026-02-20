import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { PlanetaryAspect } from '../../services/astrology.service';
import { PLANET_TURKISH } from '../../constants/zodiac';
import { getAspectHookText, isHarmoniousAspect } from '../../constants/aspect-glossary';

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '\u2609', Moon: '\u263D', Mercury: '\u263F', Venus: '\u2640',
  Mars: '\u2642', Jupiter: '\u2643', Saturn: '\u2644', Uranus: '\u2645',
  Neptune: '\u2646', Pluto: '\u2647',
};

const ASPECT_SYMBOLS: Record<string, string> = {
  CONJUNCTION: '\u260C', OPPOSITION: '\u260D', TRINE: '\u25B3', SQUARE: '\u25A1',
};

interface Props {
  aspect: PlanetaryAspect;
  index: number;
}

export default function CosmicHotspotCard({ aspect, index }: Props) {
  const harmonious = isHarmoniousAspect(aspect.type);
  const glowColor = harmonious ? '#7C3AED' : '#C026D3';

  // ── Pulse animation (border glow) ─────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(0.2)).current;
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

  // ── Entry fade-in with stagger ────────────────────────────────────
  const entryAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry
    Animated.timing(entryAnim, {
      toValue: 1,
      duration: 500,
      delay: index * 200,
      useNativeDriver: false,
    }).start();

    // Pulse loop
    pulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 1500, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0.2, duration: 1500, useNativeDriver: false }),
      ]),
    );
    pulseRef.current.start();

    return () => {
      pulseRef.current?.stop();
    };
  }, []);

  const p1Sym = PLANET_SYMBOLS[aspect.planet1] ?? '?';
  const p2Sym = PLANET_SYMBOLS[aspect.planet2] ?? '?';
  const aspSym = ASPECT_SYMBOLS[aspect.type] ?? '\u260C';
  const p1Name = PLANET_TURKISH[aspect.planet1] ?? aspect.planet1;
  const p2Name = PLANET_TURKISH[aspect.planet2] ?? aspect.planet2;
  const hookText = getAspectHookText(aspect.planet1, aspect.planet2, aspect.type);

  const borderColor = pulseAnim.interpolate({
    inputRange: [0.2, 0.7],
    outputRange: [
      glowColor + '33', // ~20% opacity
      glowColor + 'B3', // ~70% opacity
    ],
  });

  return (
    <Animated.View
      style={[
        styles.card,
        {
          borderColor,
          opacity: entryAnim,
          transform: [
            {
              translateY: entryAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      {/* Planet symbols row */}
      <View style={styles.symbolRow}>
        <Text style={[styles.planetSymbol, { color: glowColor }]}>{p1Sym}</Text>
        <Text style={[styles.aspectSymbol, { color: glowColor }]}>{aspSym}</Text>
        <Text style={[styles.planetSymbol, { color: glowColor }]}>{p2Sym}</Text>
      </View>

      {/* Names and angle */}
      <Text style={styles.namesText}>
        {p1Name} & {p2Name}
      </Text>
      <Text style={[styles.typeLabel, { color: glowColor }]}>
        {aspect.type === 'CONJUNCTION' ? 'Kavusum' :
         aspect.type === 'OPPOSITION' ? 'Karsit' :
         aspect.type === 'TRINE' ? 'Ucgen' : 'Kare'}
        {' \u00B7 '}
        {aspect.angle.toFixed(1)}\u00B0
      </Text>

      {/* Hook text */}
      <Text style={styles.hookText}>{hookText}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planetSymbol: {
    fontSize: 28,
    fontWeight: '600',
  },
  aspectSymbol: {
    fontSize: 18,
    fontWeight: '400',
  },
  namesText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  hookText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 2,
  },
});
