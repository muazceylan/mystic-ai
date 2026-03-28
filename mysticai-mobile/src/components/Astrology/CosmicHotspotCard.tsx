import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { PlanetaryAspect } from '../../services/astrology.service';
import { getAspectHookText, isHarmoniousAspect } from '../../constants/aspect-glossary';
import { formatAspectAngleHuman, labelAspectType, translateAstroTermsForUi } from '../../constants/astroLabelMap';
import { useTranslation } from 'react-i18next';
import { useTheme, ThemeColors } from '../../context/ThemeContext';

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
  const { t } = useTranslation();
  const { colors } = useTheme();
  const harmonious = isHarmoniousAspect(aspect.type);
  const glowColor = harmonious ? colors.violet : colors.harmonious;

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
  const planetKey = (p: string) => `natalChart.${p === 'NorthNode' ? 'northNode' : p.charAt(0).toLowerCase() + p.slice(1)}`;
  const p1Name = t(planetKey(aspect.planet1), { defaultValue: aspect.planet1 });
  const p2Name = t(planetKey(aspect.planet2), { defaultValue: aspect.planet2 });
  const hookText = getAspectHookText(aspect.planet1, aspect.planet2, aspect.type);

  const borderColor = pulseAnim.interpolate({
    inputRange: [0.2, 0.7],
    outputRange: [
      glowColor + '33', // ~20% opacity
      glowColor + 'B3', // ~70% opacity
    ],
  });

  const s = createStyles(colors);
  return (
    <Animated.View
      style={[
        s.card,
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
      <View style={s.symbolRow}>
        <View style={s.symbolBadge}>
          <Text style={[s.planetSymbol, { color: glowColor }]}>{p1Sym}</Text>
        </View>
        <View style={[s.symbolBadge, s.aspectBadge, { borderColor: `${glowColor}44` }]}>
          <Text style={[s.aspectSymbol, { color: glowColor }]}>{aspSym}</Text>
        </View>
        <View style={s.symbolBadge}>
          <Text style={[s.planetSymbol, { color: glowColor }]}>{p2Sym}</Text>
        </View>
      </View>

      {/* Names and angle */}
      <Text style={s.namesText}>
        {p1Name} & {p2Name}
      </Text>
      <Text style={[s.typeLabel, { color: glowColor }]}>
        {labelAspectType(aspect.type)}
        {' \u00B7 '}
        {formatAspectAngleHuman(aspect)}
      </Text>

      {/* Hook text */}
      <Text style={s.hookText}>{translateAstroTermsForUi(hookText)}</Text>
    </Animated.View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: C.card,
      borderRadius: 20,
      padding: 16,
      alignItems: 'center',
      gap: 6,
      borderWidth: 2,
      shadowColor: C.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    symbolRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    symbolBadge: {
      minWidth: 38,
      height: 38,
      paddingHorizontal: 8,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.surfaceAlt,
      borderWidth: 1,
      borderColor: C.border,
    },
    aspectBadge: {
      backgroundColor: C.primarySoftBg,
    },
    planetSymbol: { fontSize: 24, fontWeight: '700' },
    aspectSymbol: { fontSize: 16, fontWeight: '700' },
    namesText: {
      fontSize: 13,
      fontWeight: '700',
      color: C.textDark,
      textAlign: 'center',
    },
    typeLabel: { fontSize: 11, fontWeight: '600' },
    hookText: {
      fontSize: 11,
      color: C.textMuted,
      lineHeight: 16,
      textAlign: 'center',
      marginTop: 2,
    },
  });
}
