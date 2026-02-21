import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { PlanetaryAspect } from '../../services/astrology.service';
import { PLANET_TURKISH } from '../../constants/zodiac';
import { PLANET_GLOSSARY } from '../../constants/astrology-glossary';
import {
  ASPECT_GLOSSARY,
  getAspectHookText,
  isHarmoniousAspect,
} from '../../constants/aspect-glossary';
import { COLORS } from '../../constants/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '\u2609', Moon: '\u263D', Mercury: '\u263F', Venus: '\u2640',
  Mars: '\u2642', Jupiter: '\u2643', Saturn: '\u2644', Uranus: '\u2645',
  Neptune: '\u2646', Pluto: '\u2647',
};

const ASPECT_SYMBOLS: Record<string, string> = {
  CONJUNCTION: '\u260C', OPPOSITION: '\u260D', TRINE: '\u25B3', SQUARE: '\u25A1',
};

interface AspectBottomSheetProps {
  visible: boolean;
  aspect: PlanetaryAspect | null;
  onClose: () => void;
}

export default function AspectBottomSheet({
  visible,
  aspect,
  onClose,
}: AspectBottomSheetProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!aspect) return null;

  const glossary = ASPECT_GLOSSARY[aspect.type];
  const harmonious = isHarmoniousAspect(aspect.type);
  const accentColor = harmonious ? COLORS.violet : COLORS.harmonious;

  const p1Sym = PLANET_SYMBOLS[aspect.planet1] ?? '?';
  const p2Sym = PLANET_SYMBOLS[aspect.planet2] ?? '?';
  const aspSym = ASPECT_SYMBOLS[aspect.type] ?? '\u260C';
  const p1Name = PLANET_TURKISH[aspect.planet1] ?? aspect.planet1;
  const p2Name = PLANET_TURKISH[aspect.planet2] ?? aspect.planet2;
  const p1Glossary = PLANET_GLOSSARY[aspect.planet1];
  const p2Glossary = PLANET_GLOSSARY[aspect.planet2];
  const hookText = getAspectHookText(aspect.planet1, aspect.planet2, aspect.type);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.container}>
        <TouchableWithoutFeedback
          onPress={onClose}
          accessibilityLabel="Arka plana tıkla kapat"
          accessibilityRole="button"
        >
          <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Handle bar */}
            <View style={styles.handleBar} />

            {/* Header — symbols and type name */}
            <View style={styles.header}>
              <View style={styles.symbolRow}>
                <Text style={[styles.planetSymbol, { color: accentColor }]}>{p1Sym}</Text>
                <Text style={[styles.aspectSymbol, { color: accentColor }]}>{aspSym}</Text>
                <Text style={[styles.planetSymbol, { color: accentColor }]}>{p2Sym}</Text>
              </View>
              <Text style={styles.typeTitle}>{glossary.term}</Text>
              <Text style={styles.angleText}>
                {aspect.angle.toFixed(1)}\u00B0 \u00B7 orb {aspect.orb.toFixed(2)}\u00B0
              </Text>
            </View>

            {/* Aspect explanation */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: accentColor }]}>Bu Aci Ne Anlama Geliyor?</Text>
              <Text style={styles.sectionText}>{glossary.longDesc}</Text>
            </View>

            {/* Planet 1 info */}
            {p1Glossary && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: accentColor }]}>
                  {p1Sym} {p1Name}
                </Text>
                <Text style={styles.sectionText}>{p1Glossary.longDesc}</Text>
              </View>
            )}

            {/* Planet 2 info */}
            {p2Glossary && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: accentColor }]}>
                  {p2Sym} {p2Name}
                </Text>
                <Text style={styles.sectionText}>{p2Glossary.longDesc}</Text>
              </View>
            )}

            {/* Personalized hook */}
            <View style={[styles.hookSection, { backgroundColor: accentColor + '0F' }]}>
              <Text style={[styles.hookLabel, { color: accentColor }]}>Sana Ozel</Text>
              <Text style={styles.hookText}>{hookText}</Text>
            </View>

            {/* Close button */}
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: accentColor }]}
              onPress={onClose}
              accessibilityLabel="Kapat"
              accessibilityRole="button"
            >
              <Text style={styles.closeButtonText}>Kapat</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.78,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderLight,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 6,
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planetSymbol: {
    fontSize: 32,
    fontWeight: '600',
  },
  aspectSymbol: {
    fontSize: 20,
  },
  typeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textSlate,
  },
  angleText: {
    fontSize: 13,
    color: COLORS.muted,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  hookSection: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  hookLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  hookText: {
    fontSize: 13,
    color: COLORS.textDark,
    lineHeight: 20,
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 4,
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
});
