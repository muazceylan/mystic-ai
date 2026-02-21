import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { PlanetPosition } from '../../services/astrology.service';
import { getZodiacInfo, PLANET_TURKISH } from '../../constants/zodiac';
import { COLORS } from '../../constants/colors';

const PLANET_EMOJIS: Record<string, string> = {
  Sun: '☀️',
  Moon: '🌙',
  Mercury: '☿️',
  Venus: '♀️',
  Mars: '♂️',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '⛢',
  Neptune: '♆',
  Pluto: '♇',
};

interface CosmicMapProps {
  planets: PlanetPosition[];
  onPlanetPress: (planet: PlanetPosition) => void;
}

export default function CosmicMap({ planets, onPlanetPress }: CosmicMapProps) {
  const anims = useRef(planets.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 350,
        delay: i * 80,
        useNativeDriver: true,
      })
    );
    Animated.stagger(80, animations).start();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kozmik Harita</Text>
      {planets.map((planet, i) => {
        const planetName = PLANET_TURKISH[planet.planet] ?? planet.planet;
        const signInfo = getZodiacInfo(planet.sign);
        const emoji = PLANET_EMOJIS[planet.planet] ?? '⭐';
        const anim = anims[i] ?? new Animated.Value(1);

        return (
          <Animated.View
            key={`${planet.planet}-${i}`}
            style={{
              opacity: anim,
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            }}
          >
            <TouchableOpacity
              style={styles.card}
              onPress={() => onPlanetPress(planet)}
              accessibilityLabel={`${PLANET_TURKISH[planet] ?? planet} detaylarını aç`}
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              {/* Left: Planet emoji + name */}
              <View style={styles.cardLeft}>
                <Text style={styles.planetEmoji}>{emoji}</Text>
                <Text style={styles.planetName}>{planetName}</Text>
              </View>

              {/* Center: Sign + degree */}
              <View style={styles.cardCenter}>
                <Text style={styles.signText}>
                  {signInfo.symbol} {signInfo.name}
                </Text>
                <Text style={styles.degreeText}>
                  {Math.floor(planet.degree)}°{planet.minutes}'{planet.seconds}"
                </Text>
              </View>

              {/* Right: House badge + retrograde */}
              <View style={styles.cardRight}>
                <View style={styles.houseBadge}>
                  <Text style={styles.houseBadgeText}>{planet.house}</Text>
                </View>
                {planet.retrograde && (
                  <View style={styles.retroBadge}>
                    <Text style={styles.retroText}>Rx</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSlate,
    marginBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  planetEmoji: {
    fontSize: 20,
  },
  planetName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSlate,
  },
  cardCenter: {
    flex: 1,
    alignItems: 'center',
  },
  signText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.violetLight,
  },
  degreeText: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  houseBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(139,92,246,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  houseBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.violetLight,
  },
  retroBadge: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  retroText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.amber,
  },
});
