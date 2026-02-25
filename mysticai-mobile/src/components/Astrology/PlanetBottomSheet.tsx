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
import { Ionicons } from '@expo/vector-icons';
import { NatalPlanetComboInsight, PlanetPosition } from '../../services/astrology.service';
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
  insight?: NatalPlanetComboInsight | null;
  onClose: () => void;
}

function lineTextPlanet(planet: PlanetPosition) {
  const planetName = PLANET_TURKISH[planet.planet] ?? planet.planet;
  const signInfo = getZodiacInfo(planet.sign);
  const signGlossary = planet.sign ? SIGN_GLOSSARY[planet.sign.toUpperCase()] : undefined;
  const houseGlossary = HOUSE_GLOSSARY[planet.house];
  const planetDesc = PLANET_DESCRIPTIONS[planet.planet];
  const houseTerm = houseGlossary?.shortDesc ?? `${planet.house}. ev teması`;
  const tripleCombo = `${planetName} + ${signInfo.name} + ${planet.house}. Ev`;

  const character = `${tripleCombo} kombinasyonu sende ${signGlossary?.shortDesc?.toLowerCase() ?? 'bu burcun karakter tonu'} ile çalışan bir ifade biçimi yaratır. ${planetGlossarySnippet(planet.planet)}`;
  const effect = `${planetDesc?.meaning ?? `${planetName}, yaşamında belirli bir temayı yönetir.`} Bu enerji ${houseTerm.toLowerCase()} alanına aktığında kararlarını daha çok ${signInfo.name.toLowerCase()} tarzında vermene neden olabilir.`;
  const caution = planet.retrograde
    ? `${planetName} retro olduğu için bu konuda önce içinden geçirip sonra harekete geçme eğilimin artabilir. Acele karar yerine ikinci kez düşünmek faydalı olur.`
    : `${planetName} enerjisini fazla zorladığında tek bir bakış açısına sıkışabilirsin. Esneklik ve geri bildirim almak denge sağlar.`;
  const strengths = [
    planetDesc?.governs,
    signGlossary?.shortDesc,
    houseGlossary?.shortDesc,
  ]
    .filter(Boolean)
    .join(', ');

  return { character, effect, caution, strengths, signGlossary, houseGlossary, planetDesc, tripleCombo };
}

function planetGlossarySnippet(planetKey: string) {
  const g = PLANET_GLOSSARY[planetKey];
  if (!g?.shortDesc) return '';
  return `Bu yerleşim özellikle ${g.shortDesc.toLowerCase()} temasını öne çıkarır.`;
}

function LineInfo({
  title,
  text,
  accent,
}: {
  title: string;
  text: string;
  accent: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[stylesShared.lineCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[stylesShared.lineTitle, { color: accent }]}>{title}</Text>
      <Text style={[stylesShared.lineText, { color: colors.textMuted }]}>{text}</Text>
    </View>
  );
}

export default function PlanetBottomSheet({
  visible,
  planet,
  insight,
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
  const linePack = lineTextPlanet(planet);
  const insightStrengths = insight?.strengths?.filter(Boolean).join(', ');

  const personalizedText =
    insight?.summary ||
    `Senin ${planetName}'ün ${signInfo.name} burcunda ve ${planet.house}. evde. Bu üçlü kombinasyon (${linePack.tripleCombo}) özellikle ${
      houseGlossary?.shortDesc?.toLowerCase() ?? 'ilgili hayat alanında'
    } davranışlarını şekillendirir. ${planetGlossary?.longDesc ?? ''}`;

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
          <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
            <View style={s.handleBar} />
            <View style={s.header}>
              <View style={s.headerLeft}>
                <Text style={s.planetEmoji}>{signInfo.symbol}</Text>
                <View>
                  <Text style={s.planetTitle}>{planetName} Konumu Analizi</Text>
                  <Text style={s.planetSubtitle}>
                    {signInfo.name} • {Math.floor(planet.degree)}°{planet.minutes}'{planet.seconds}" • {planet.house}. Ev
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

            <LineInfo title="✨ Karakter Analizi" text={insight?.characterLine || linePack.character} accent={colors.violet} />
            <LineInfo title="🚀 Seni Nasıl Etkiler?" text={insight?.effectLine || linePack.effect} accent={colors.blue} />
            <LineInfo title="⚠️ Dikkat Etmen Gerekenler" text={insight?.cautionLine || linePack.caution} accent={colors.warning} />
            <LineInfo
              title="🌟 Öne Çıkan Özellikler"
              text={insightStrengths || linePack.strengths || 'Bu yerleşim, doğru kullanıldığında güçlü bir iç kaynak ve ifade alanı açar.'}
              accent={colors.goldDark}
            />

            {houseGlossary && (
              <View style={[s.beginnerBox, { backgroundColor: colors.primaryTint, borderColor: colors.border }]}>
                <Text style={s.beginnerTitle}>Ev Temasını Basitçe Anlatalım</Text>
                <Text style={s.beginnerText}>
                  {planet.house}. Ev: {houseGlossary.shortDesc}. Yani bu gezegenin enerjisi sende en çok bu hayat alanında görünür olur.
                </Text>
              </View>
            )}

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
          </ScrollView>
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
      maxHeight: SCREEN_HEIGHT * 0.75,
    },
    scrollContent: {
      paddingBottom: 36,
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
    beginnerBox: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 12,
      marginBottom: 14,
      gap: 6,
    },
    beginnerTitle: {
      fontSize: 12.5,
      fontWeight: '800',
      color: C.textSlate,
    },
    beginnerText: {
      fontSize: 12.5,
      lineHeight: 18,
      color: C.textMuted,
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

const stylesShared = StyleSheet.create({
  lineCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    gap: 5,
  },
  lineTitle: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  lineText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
});
