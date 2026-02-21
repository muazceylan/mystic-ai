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
import { useTheme, ThemeColors } from '../../context/ThemeContext';

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
  const { colors } = useTheme();
  const s = createStyles(colors);
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
      <View style={s.container}>
        <TouchableWithoutFeedback
          onPress={onClose}
          accessibilityLabel="Arka plana tıkla kapat"
          accessibilityRole="button"
        >
          <Animated.View style={[s.backdrop, { opacity: backdropAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={s.handleBar} />
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Text style={s.planetEmoji}>{signInfo.symbol}</Text>
              <View>
                <Text style={s.planetTitle}>{planetName}</Text>
                <Text style={s.planetSubtitle}>
                  {signInfo.name} | {Math.floor(planet.degree)}°{planet.minutes}'{planet.seconds}"
                </Text>
              </View>
            </View>
            <View style={s.badges}>
              <View style={s.houseBadge}>
                <Text style={s.houseBadgeText}>Ev {planet.house}</Text>
              </View>
              {planet.retrograde && (
                <View style={s.retroBadge}>
                  <Text style={s.retroBadgeText}>Rx</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={s.personalizedText}>{personalizedText}</Text>

          {planetDesc && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>Yönetim Alanı</Text>
              <Text style={s.sectionText}>{planetDesc.governs}</Text>
            </View>
          )}

          {signGlossary && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>
                {signInfo.symbol} {signGlossary.term} Burcu
              </Text>
              <Text style={s.sectionText}>{signGlossary.longDesc}</Text>
            </View>
          )}

          {houseGlossary && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>{houseGlossary.term}</Text>
              <Text style={s.sectionText}>{houseGlossary.longDesc}</Text>
            </View>
          )}

          {planet.retrograde && (
            <View style={s.retroSection}>
              <Ionicons name="arrow-undo" size={14} color={colors.amber} />
              <Text style={s.retroExplanation}>
                {CONCEPT_GLOSSARY.retrograde.longDesc}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={s.closeButton}
            onPress={onClose}
            accessibilityLabel="Kapat"
            accessibilityRole="button"
          >
            <Text style={s.closeButtonText}>Kapat</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, justifyContent: 'flex-end' },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
      backgroundColor: C.card,
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
      backgroundColor: C.borderLight,
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
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    planetEmoji: { fontSize: 32 },
    planetTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: C.textSlate,
    },
    planetSubtitle: {
      fontSize: 13,
      color: C.textMuted,
      marginTop: 2,
    },
    badges: { flexDirection: 'row', gap: 6 },
    houseBadge: {
      backgroundColor: C.violetBg,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    houseBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: C.violetLight,
    },
    retroBadge: {
      backgroundColor: C.amberLight,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    retroBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: C.amber,
    },
    personalizedText: {
      fontSize: 15,
      color: C.textDark,
      lineHeight: 23,
      marginBottom: 16,
    },
    section: { marginBottom: 14 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: C.violetLight,
      marginBottom: 4,
    },
    sectionText: {
      fontSize: 13,
      color: C.textMuted,
      lineHeight: 20,
    },
    retroSection: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: C.amberLight,
      padding: 12,
      borderRadius: 12,
      marginBottom: 14,
    },
    retroExplanation: {
      flex: 1,
      fontSize: 12,
      color: C.textMuted,
      lineHeight: 18,
    },
    closeButton: {
      alignItems: 'center',
      paddingVertical: 14,
      backgroundColor: C.violetLight,
      borderRadius: 24,
      marginTop: 4,
    },
    closeButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: C.white,
    },
  });
}
