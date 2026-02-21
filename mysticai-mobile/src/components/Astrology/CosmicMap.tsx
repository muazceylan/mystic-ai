import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { PlanetPosition } from '../../services/astrology.service';
import { getZodiacInfo, PLANET_TURKISH } from '../../constants/zodiac';
import { useTheme, ThemeColors } from '../../context/ThemeContext';

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
  const { colors } = useTheme();
  const s = createStyles(colors);
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
    <View style={s.container}>
      <Text style={s.title}>Kozmik Harita</Text>
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
              style={s.card}
              onPress={() => onPlanetPress(planet)}
              accessibilityLabel={`${PLANET_TURKISH[planet.planet] ?? planet.planet} detaylarını aç`}
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              {/* Left: Planet emoji + name */}
              <View style={s.cardLeft}>
                <Text style={s.planetEmoji}>{emoji}</Text>
                <Text style={s.planetName}>{planetName}</Text>
              </View>

              {/* Center: Sign + degree */}
              <View style={s.cardCenter}>
                <Text style={s.signText}>
                  {signInfo.symbol} {signInfo.name}
                </Text>
                <Text style={s.degreeText}>
                  {Math.floor(planet.degree)}°{planet.minutes}'{planet.seconds}"
                </Text>
              </View>

              {/* Right: House badge + retrograde */}
              <View style={s.cardRight}>
                <View style={s.houseBadge}>
                  <Text style={s.houseBadgeText}>{planet.house}</Text>
                </View>
                {planet.retrograde && (
                  <View style={s.retroBadge}>
                    <Text style={s.retroText}>Rx</Text>
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

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { gap: 8 },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: C.textSlate,
      marginBottom: 8,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.bg,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: C.borderMuted,
      shadowColor: C.shadow,
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
    planetEmoji: { fontSize: 20 },
    planetName: {
      fontSize: 14,
      fontWeight: '600',
      color: C.textSlate,
    },
    cardCenter: { flex: 1, alignItems: 'center' },
    signText: {
      fontSize: 13,
      fontWeight: '600',
      color: C.violetLight,
    },
    degreeText: {
      fontSize: 11,
      color: C.muted,
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
      backgroundColor: C.violetBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    houseBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: C.violetLight,
    },
    retroBadge: {
      backgroundColor: C.amberLight,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    retroText: {
      fontSize: 10,
      fontWeight: '700',
      color: C.amber,
    },
  });
}
