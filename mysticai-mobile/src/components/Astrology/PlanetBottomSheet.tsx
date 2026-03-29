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
import { Ionicons } from '@expo/vector-icons';
import Reanimated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { NatalPlanetComboInsight, PlanetPosition } from '../../services/astrology.service';
import { getZodiacInfo, getPlanetName, getPlanetDescription } from '../../constants/zodiac';
import {
  getPlanetGlossary,
  getSignGlossary,
  getHouseGlossary,
  CONCEPT_GLOSSARY,
} from '../../constants/astrology-glossary';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { useBottomSheetDragGesture } from '../ui/useBottomSheetDragGesture';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PlanetBottomSheetProps {
  visible: boolean;
  planet: PlanetPosition | null;
  insight?: NatalPlanetComboInsight | null;
  onClose: () => void;
}

type TFn = (key: string, opts?: Record<string, string>) => string;

function buildLinePack(planet: PlanetPosition, locale: string, t: TFn) {
  const planetName   = getPlanetName(planet.planet, locale);
  const signInfo     = getZodiacInfo(planet.sign, locale);
  const signGlossary = planet.sign ? getSignGlossary(planet.sign, locale) : undefined;
  const houseGlossary = getHouseGlossary(planet.house, locale);
  const planetDesc   = getPlanetDescription(planet.planet, locale);
  const planetGloss  = getPlanetGlossary(planet.planet, locale);

  const houseTerm = houseGlossary?.shortDesc ?? t('planetSheet.houseTermFallback', { house: String(planet.house) });
  const tripleCombo = t('planetSheet.tripleCombo', { planet: planetName, sign: signInfo.name, house: String(planet.house) });

  const glossSnippet = planetGloss?.shortDesc
    ? t('planetSheet.glossarySnippet', { desc: planetGloss.shortDesc.toLowerCase() })
    : '';

  const character = t('planetSheet.lineCharacter', {
    combo: tripleCombo,
    shortDesc: signGlossary?.shortDesc?.toLowerCase() ?? t('planetSheet.lineCharacterSignFallback'),
    snippet: glossSnippet,
  });

  const meaning = planetDesc?.meaning ?? t('planetSheet.lineEffectFallback', { planet: planetName });
  const effect = t('planetSheet.lineEffect', {
    meaning,
    houseDesc: houseTerm.toLowerCase(),
    sign: signInfo.name.toLowerCase(),
  });

  const caution = planet.retrograde
    ? t('planetSheet.lineCautionRetro', { planet: planetName })
    : t('planetSheet.lineCautionNormal', { planet: planetName });

  const strengths = [planetDesc?.governs, signGlossary?.shortDesc, houseGlossary?.shortDesc]
    .filter(Boolean)
    .join(', ');

  return { character, effect, caution, strengths, signGlossary, houseGlossary, planetDesc, tripleCombo, planetName, signInfo };
}

function LineInfo({ title, text, accent }: { title: string; text: string; accent: string }) {
  const { colors } = useTheme();
  return (
    <View style={[stylesShared.lineCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[stylesShared.lineTitle, { color: accent }]}>{title}</Text>
      <Text style={[stylesShared.lineText, { color: colors.textMuted }]}>{text}</Text>
    </View>
  );
}

export default function PlanetBottomSheet({ visible, planet, insight, onClose }: PlanetBottomSheetProps) {
  const { colors }  = useTheme();
  const { t, i18n } = useTranslation();
  const s = createStyles(colors);
  const slideAnim    = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const { animatedStyle, gesture } = useBottomSheetDragGesture({ enabled: visible, onClose });

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim,    { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim,    { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!planet) return null;

  const locale       = i18n.language;
  const tFn          = t as TFn;
  const linePack     = buildLinePack(planet, locale, tFn);
  const planetName   = linePack.planetName;
  const signInfo     = linePack.signInfo;
  const planetGloss  = getPlanetGlossary(planet.planet, locale);
  const signGlossary = linePack.signGlossary;
  const houseGlossary = linePack.houseGlossary;
  const planetDesc   = linePack.planetDesc;
  const insightStrengths = insight?.strengths?.filter(Boolean).join(', ');

  const personalizedText =
    insight?.summary ||
    t('planetSheet.personalizedFallback', {
      planet: planetName,
      sign: signInfo.name,
      house: String(planet.house),
      combo: linePack.tripleCombo,
      houseDesc: houseGlossary?.shortDesc?.toLowerCase() ?? t('planetSheet.personalizedFallbackNoHouse'),
    }) + (planetGloss?.longDesc ? ' ' + planetGloss.longDesc : '');

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={s.container}>
        <TouchableWithoutFeedback
          onPress={onClose}
          accessibilityLabel={t('planetSheet.backdropA11y')}
          accessibilityRole="button"
        >
          <Animated.View style={[s.backdrop, { opacity: backdropAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <Reanimated.View style={animatedStyle}>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
              <GestureDetector gesture={gesture}>
                <View>
                  <View style={s.handleBar} />
                  <View style={s.header}>
                    <View style={s.headerLeft}>
                      <Text style={s.planetEmoji}>{signInfo.symbol}</Text>
                      <View>
                        <Text style={s.planetTitle}>{t('planetSheet.positionAnalysis', { planet: planetName })}</Text>
                        <Text style={s.planetSubtitle}>
                          {t('planetSheet.positionSubtitle', {
                            sign: signInfo.name,
                            degree: String(Math.floor(planet.degree)),
                            minutes: String(planet.minutes),
                            seconds: String(planet.seconds ?? 0),
                            house: String(planet.house),
                          })}
                        </Text>
                      </View>
                    </View>
                    <View style={s.badges}>
                      <View style={s.houseBadge}>
                        <Text style={s.houseBadgeText}>{t('planetSheet.houseBadge', { house: String(planet.house) })}</Text>
                      </View>
                      {planet.retrograde && (
                        <View style={s.retroBadge}>
                          <Text style={s.retroBadgeText}>Rx</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <Text style={s.personalizedText}>{personalizedText}</Text>
                </View>
              </GestureDetector>

              <LineInfo title={t('planetSheet.cardCharacter')} text={insight?.characterLine || linePack.character} accent={colors.violet} />
              <LineInfo title={t('planetSheet.cardEffect')}    text={insight?.effectLine    || linePack.effect}    accent={colors.blue} />
              <LineInfo title={t('planetSheet.cardCaution')}   text={insight?.cautionLine   || linePack.caution}   accent={colors.warning} />
              <LineInfo
                title={t('planetSheet.cardStrengths')}
                text={insightStrengths || linePack.strengths || t('planetSheet.strengthsFallback')}
                accent={colors.goldDark}
              />

              {houseGlossary && (
                <View style={[s.beginnerBox, { backgroundColor: colors.primaryTint, borderColor: colors.border }]}>
                  <Text style={s.beginnerTitle}>{t('planetSheet.houseBoxTitle')}</Text>
                  <Text style={s.beginnerText}>
                    {t('planetSheet.houseBoxText', { house: String(planet.house), desc: houseGlossary.shortDesc })}
                  </Text>
                </View>
              )}

              {planetDesc && (
                <View style={s.section}>
                  <Text style={s.sectionLabel}>{t('planetSheet.governs')}</Text>
                  <Text style={s.sectionText}>{planetDesc.governs}</Text>
                </View>
              )}

              {signGlossary && (
                <View style={s.section}>
                  <Text style={s.sectionLabel}>
                    {t('planetSheet.signSection', { symbol: signInfo.symbol, term: signGlossary.term })}
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
                  <Text style={s.retroExplanation}>{CONCEPT_GLOSSARY.retrograde.longDesc}</Text>
                </View>
              )}

              <TouchableOpacity
                style={s.closeButton}
                onPress={onClose}
                accessibilityLabel={t('planetSheet.closeA11y')}
                accessibilityRole="button"
              >
                <Text style={s.closeButtonText}>{t('planetSheet.closeBtn')}</Text>
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
    container:       { flex: 1, justifyContent: 'flex-end' },
    backdrop:        { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: {
      backgroundColor: C.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      maxHeight: SCREEN_HEIGHT * 0.75,
    },
    scrollContent:   { paddingBottom: 36 },
    handleBar:       { width: 40, height: 4, borderRadius: 2, backgroundColor: C.borderLight, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
    header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    headerLeft:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
    planetEmoji:     { fontSize: 32 },
    planetTitle:     { fontSize: 18, fontWeight: '700', color: C.textSlate },
    planetSubtitle:  { fontSize: 13, color: C.textMuted, marginTop: 2 },
    badges:          { flexDirection: 'row', gap: 6 },
    houseBadge:      { backgroundColor: C.violetBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    houseBadgeText:  { fontSize: 12, fontWeight: '600', color: C.violetLight },
    retroBadge:      { backgroundColor: C.amberLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    retroBadgeText:  { fontSize: 12, fontWeight: '700', color: C.amber },
    personalizedText:{ fontSize: 15, color: C.textDark, lineHeight: 23, marginBottom: 16 },
    section:         { marginBottom: 14 },
    sectionLabel:    { fontSize: 13, fontWeight: '700', color: C.violetLight, marginBottom: 4 },
    sectionText:     { fontSize: 13, color: C.textMuted, lineHeight: 20 },
    beginnerBox:     { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 14, gap: 6 },
    beginnerTitle:   { fontSize: 12.5, fontWeight: '800', color: C.textSlate },
    beginnerText:    { fontSize: 12.5, lineHeight: 18, color: C.textMuted },
    retroSection:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.amberLight, padding: 12, borderRadius: 12, marginBottom: 14 },
    retroExplanation:{ flex: 1, fontSize: 12, color: C.textMuted, lineHeight: 18 },
    closeButton:     { alignItems: 'center', paddingVertical: 14, backgroundColor: C.violetLight, borderRadius: 24, marginTop: 4 },
    closeButtonText: { fontSize: 15, fontWeight: '600', color: C.white },
  });
}

const stylesShared = StyleSheet.create({
  lineCard:  { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 10, gap: 5 },
  lineTitle: { fontSize: 12.5, fontWeight: '800' },
  lineText:  { fontSize: 12.5, lineHeight: 18 },
});
