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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlanetPosition } from '../../services/astrology.service';
import { getZodiacInfo, PLANET_TURKISH, PLANET_DESCRIPTIONS } from '../../constants/zodiac';
import {
  PLANET_GLOSSARY,
  SIGN_GLOSSARY,
  HOUSE_GLOSSARY,
  CONCEPT_GLOSSARY,
} from '../../constants/astrology-glossary';
import { COLORS } from '../../constants/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PlanetBottomSheetProps {
  visible: boolean;
  planet: PlanetPosition | null;
  onClose: () => void;
}

export default function PlanetBottomSheet({
  visible,
  planet,
  onClose,
}: PlanetBottomSheetProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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

  if (!planet) return null;

  const planetName = PLANET_TURKISH[planet.planet] ?? planet.planet;
  const signInfo = getZodiacInfo(planet.sign);
  const planetGlossary = PLANET_GLOSSARY[planet.planet];
  const signKey = planet.sign?.toUpperCase();
  const signGlossary = signKey ? SIGN_GLOSSARY[signKey] : undefined;
  const houseGlossary = HOUSE_GLOSSARY[planet.house];
  const planetDesc = PLANET_DESCRIPTIONS[planet.planet];

  const personalizedText = `Senin ${planetName}'ün ${signInfo.name} burcunda. ${
    planetGlossary?.longDesc ?? ''
  }`;

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
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.planetEmoji}>{signInfo.symbol}</Text>
              <View>
                <Text style={styles.planetTitle}>{planetName}</Text>
                <Text style={styles.planetSubtitle}>
                  {signInfo.name} | {Math.floor(planet.degree)}°{planet.minutes}'{planet.seconds}"
                </Text>
              </View>
            </View>
            <View style={styles.badges}>
              <View style={styles.houseBadge}>
                <Text style={styles.houseBadgeText}>Ev {planet.house}</Text>
              </View>
              {planet.retrograde && (
                <View style={styles.retroBadge}>
                  <Text style={styles.retroBadgeText}>Rx</Text>
                </View>
              )}
            </View>
          </View>

          {/* Personalized description */}
          <Text style={styles.personalizedText}>{personalizedText}</Text>

          {/* Planet governs */}
          {planetDesc && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Yönetim Alanı</Text>
              <Text style={styles.sectionText}>{planetDesc.governs}</Text>
            </View>
          )}

          {/* Sign info */}
          {signGlossary && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                {signInfo.symbol} {signGlossary.term} Burcu
              </Text>
              <Text style={styles.sectionText}>{signGlossary.longDesc}</Text>
            </View>
          )}

          {/* House info */}
          {houseGlossary && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{houseGlossary.term}</Text>
              <Text style={styles.sectionText}>{houseGlossary.longDesc}</Text>
            </View>
          )}

          {/* Retrograde explanation */}
          {planet.retrograde && (
            <View style={styles.retroSection}>
              <Ionicons name="arrow-undo" size={14} color={COLORS.amber} />
              <Text style={styles.retroExplanation}>
                {CONCEPT_GLOSSARY.retrograde.longDesc}
              </Text>
            </View>
          )}

          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="Kapat"
            accessibilityRole="button"
          >
            <Text style={styles.closeButtonText}>Kapat</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: SCREEN_HEIGHT * 0.75,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planetEmoji: {
    fontSize: 32,
  },
  planetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textSlate,
  },
  planetSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  houseBadge: {
    backgroundColor: 'rgba(139,92,246,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  houseBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.violetLight,
  },
  retroBadge: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  retroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.amber,
  },
  personalizedText: {
    fontSize: 15,
    color: COLORS.textDark,
    lineHeight: 23,
    marginBottom: 16,
  },
  section: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.violetLight,
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  retroSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(245,158,11,0.08)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  retroExplanation: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: COLORS.violetLight,
    borderRadius: 24,
    marginTop: 4,
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
});
