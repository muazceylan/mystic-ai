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
import { GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from '../../utils/haptics';
import Reanimated from 'react-native-reanimated';
import { PlanetaryAspect } from '../../services/astrology.service';
import { PLANET_TURKISH } from '../../constants/zodiac';
import { PLANET_GLOSSARY } from '../../constants/astrology-glossary';
import {
  ASPECT_GLOSSARY,
  getAspectHookText,
  isHarmoniousAspect,
} from '../../constants/aspect-glossary';
import { formatAspectAngleHuman, labelAspectType, translateAstroTermsForUi } from '../../constants/astroLabelMap';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { useBottomSheetDragGesture } from '../ui/useBottomSheetDragGesture';

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
  const { colors } = useTheme();
  const s = createStyles(colors);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const { animatedStyle, gesture } = useBottomSheetDragGesture({
    enabled: visible,
    onClose,
  });

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
  const accentColor = harmonious ? colors.violet : colors.harmonious;

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
          <Reanimated.View style={animatedStyle}>
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.scrollContent}
            >
              <GestureDetector gesture={gesture}>
                <View>
                  <View style={s.handleBar} />
                  <View style={s.header}>
                    <View style={s.symbolRow}>
                      <Text style={[s.planetSymbol, { color: accentColor }]}>{p1Sym}</Text>
                      <Text style={[s.aspectSymbol, { color: accentColor }]}>{aspSym}</Text>
                      <Text style={[s.planetSymbol, { color: accentColor }]}>{p2Sym}</Text>
                    </View>
                    <Text style={s.typeTitle}>{labelAspectType(aspect.type, true)}</Text>
                    <Text style={s.angleText}>
                      {formatAspectAngleHuman(aspect)}
                    </Text>
                  </View>
                </View>
              </GestureDetector>

              <View style={s.section}>
                <Text style={[s.sectionLabel, { color: accentColor }]}>Bu Aci Ne Anlama Geliyor?</Text>
                <Text style={s.sectionText}>{translateAstroTermsForUi(glossary.longDesc)}</Text>
              </View>

              <View style={[s.summaryBox, { backgroundColor: accentColor + '12', borderColor: accentColor + '25' }]}>
                <Text style={[s.summaryTitle, { color: accentColor }]}>Kozmik Dinamik (Özet)</Text>
                <Text style={s.summaryText}>
                  {p1Name} ile {p2Name} arasında {labelAspectType(aspect.type).toLowerCase()} çalışıyor; bu da ilişkili konuda {harmonious ? 'akış ve destek' : 'gerilim üzerinden büyüme'} teması yaratır.
                </Text>
              </View>

              {p1Glossary && (
                <View style={s.section}>
                  <Text style={[s.sectionLabel, { color: accentColor }]}>
                    {p1Sym} {p1Name}
                  </Text>
                  <Text style={s.sectionText}>{translateAstroTermsForUi(p1Glossary.longDesc)}</Text>
                </View>
              )}

              {p2Glossary && (
                <View style={s.section}>
                  <Text style={[s.sectionLabel, { color: accentColor }]}>
                    {p2Sym} {p2Name}
                  </Text>
                  <Text style={s.sectionText}>{translateAstroTermsForUi(p2Glossary.longDesc)}</Text>
                </View>
              )}

              <View style={[s.hookSection, { backgroundColor: accentColor + '0F' }]}>
                <Text style={[s.hookLabel, { color: accentColor }]}>Sana Ozel</Text>
                <Text style={s.hookText}>{translateAstroTermsForUi(hookText)}</Text>
              </View>

              <TouchableOpacity
                style={[s.closeButton, { backgroundColor: accentColor }]}
                onPress={onClose}
                accessibilityLabel="Kapat"
                accessibilityRole="button"
              >
                <Text style={s.closeButtonText}>Kapat</Text>
              </TouchableOpacity>
            </ScrollView>
          </Reanimated.View>
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
      maxHeight: SCREEN_HEIGHT * 0.78,
    },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
    handleBar: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.borderLight,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 16,
    },
    header: { alignItems: 'center', marginBottom: 20, gap: 6 },
    symbolRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    planetSymbol: { fontSize: 32, fontWeight: '600' },
    aspectSymbol: { fontSize: 20 },
    typeTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: C.textSlate,
    },
    angleText: { fontSize: 13, color: C.muted },
    section: { marginBottom: 16 },
    sectionLabel: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
    sectionText: {
      fontSize: 13,
      color: C.textMuted,
      lineHeight: 20,
    },
    hookSection: {
      padding: 14,
      borderRadius: 14,
      marginBottom: 16,
    },
    summaryBox: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 12,
      gap: 6,
      marginBottom: 16,
    },
    summaryTitle: { fontSize: 12.5, fontWeight: '800' },
    summaryText: { fontSize: 12.5, lineHeight: 18, color: C.textMuted },
    hookLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
    hookText: {
      fontSize: 13,
      color: C.textDark,
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
      color: C.white,
    },
  });
}
