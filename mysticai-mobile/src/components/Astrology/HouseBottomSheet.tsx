import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type {
  HousePlacement,
  NatalHouseComboInsight,
  PlanetPosition,
} from '../../services/astrology.service';
import { getZodiacInfo, PLANET_TURKISH } from '../../constants/zodiac';
import { HOUSE_GLOSSARY } from '../../constants/astrology-glossary';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  visible: boolean;
  house: HousePlacement | null;
  planetsInHouse?: PlanetPosition[];
  insight?: NatalHouseComboInsight | null;
  onClose: () => void;
};

function buildHouseLines(house: HousePlacement | null, planetsInHouse?: PlanetPosition[]) {
  if (!house) return null;
  const info = HOUSE_GLOSSARY[house.houseNumber];
  const signInfo = getZodiacInfo(house.sign);
  const simpleTerm = info?.shortDesc ?? `${house.houseNumber}. ev teması`;
  const housePlanets = (planetsInHouse ?? []).filter((p) => p.house === house.houseNumber);

  const basicIntro = `${house.houseNumber}. Ev: ${simpleTerm.charAt(0).toUpperCase()}${simpleTerm.slice(1)}. Astrolojiyi hiç bilmesen bile burası “hayatında bu konuların nasıl çalıştığını” anlatır.`;
  const character = `Bu evin ${signInfo.name} (${signInfo.element}) ile başlaması, bu alanda yaklaşımının ${signInfo.name.toLowerCase()} tonuyla çalıştığını gösterir.`;
  const impact = `${info?.longDesc ?? 'Bu ev, hayatının önemli bir temasını taşır.'} Bu yüzden burada aldığın kararlar öz güvenini ve günlük seçimlerini doğrudan etkileyebilir.`;
  const caution = house.houseNumber === 2
    ? 'Değer duygunu sadece maddi sonuçlara bağlamamaya dikkat et.'
    : house.houseNumber === 7
      ? 'Partnerliklerde sınırlarını netleştirmek, uyumu bozmaz; aksine ilişkiyi güçlendirir.'
      : house.houseNumber === 8
        ? 'Kontrol ihtiyacı yükseldiğinde güven inşasına küçük adımlarla dönmek iyi gelir.'
        : 'Bu ev temasında tek bir doğruya sıkışmak yerine ritmini zamanla gözlemlemek daha sağlıklıdır.';
  const strengths = house.houseNumber === 10
    ? 'Hedef koyma, görünür olma, sorumluluk alma'
    : house.houseNumber === 4
      ? 'Köklenme, koruma, aidiyet kurma'
      : house.houseNumber === 3
        ? 'İletişim, öğrenme, bağlantı kurma'
        : 'Farkındalık geliştirme, denge kurma, doğru kaynak kullanımı';

  const comboSummary = housePlanets.length
    ? housePlanets.slice(0, 3).map((p) => {
        const pName = PLANET_TURKISH[p.planet] ?? p.planet;
        const pSign = getZodiacInfo(p.sign);
        return `${pName} ${pSign.name} burcunda ${house.houseNumber}. evde: ${simpleTerm.toLowerCase()} temasını ${pSign.name.toLowerCase()} tarzında çalıştırır.`;
      }).join(' ')
    : `Bu evde görünür gezegen yerleşimi az olabilir; yine de ${signInfo.name.toLowerCase()} başlangıç tonu, ${simpleTerm.toLowerCase()} temasını nasıl yaşadığını belirler.`;

  return { info, signInfo, basicIntro, character, impact, caution, strengths, comboSummary, housePlanets };
}

export default function HouseBottomSheet({ visible, house, planetsInHouse, insight, onClose }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, backdropAnim, slideAnim]);

  const lines = buildHouseLines(house, planetsInHouse);
  if (!house || !lines) return null;
  const insightStrengths = insight?.strengths?.filter(Boolean).join(', ');
  const introLine = insight?.introLine || lines.basicIntro;
  const characterLine = insight?.characterLine || lines.character;
  const effectLine = insight?.effectLine || lines.impact;
  const cautionLine = insight?.cautionLine || lines.caution;
  const strengthsLine = insightStrengths || lines.strengths;
  const comboSummary = insight?.comboSummary || lines.comboSummary;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={s.container}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[s.backdrop, { opacity: backdropAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
            <View style={s.handleBar} />

            <View style={s.header}>
              <View style={[s.houseBadge, { backgroundColor: colors.violetBg }]}>
                <Text style={[s.houseBadgeText, { color: colors.violet }]}>{house.houseNumber}. Ev</Text>
              </View>
              <Text style={s.headerTitle}>
                {house.houseNumber}. Ev • {lines.signInfo.symbol} {lines.signInfo.name}
              </Text>
              <Text style={s.headerSub}>{introLine}</Text>
              <Text style={s.headerMeta}>{Math.floor(house.degree)}° • Yönetici: {house.ruler}</Text>
            </View>

            <View style={s.lineList}>
              <LineItem icon="sparkles-outline" title="Karakter Analizi" text={characterLine} colors={colors} />
              <LineItem icon="rocket-outline" title="Seni Nasıl Etkiler?" text={effectLine} colors={colors} />
              <LineItem icon="warning-outline" title="Dikkat Etmen Gerekenler" text={cautionLine} colors={colors} />
              <LineItem icon="star-outline" title="Öne Çıkan Özellikler" text={strengthsLine} colors={colors} />
            </View>

            <View style={[s.comboBox, { backgroundColor: colors.primaryTint, borderColor: colors.border }]}>
              <Text style={s.comboTitle}>Gezegen + Ev + Burç Kombinasyonu</Text>
              <Text style={s.comboText}>{comboSummary}</Text>
            </View>

            {lines.info && (
              <View style={[s.glossaryBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Text style={s.glossaryTitle}>{lines.info.term}</Text>
                <Text style={s.glossaryText}>{lines.info.longDesc}</Text>
              </View>
            )}

            <Pressable style={[s.closeBtn, { backgroundColor: colors.violet }]} onPress={onClose}>
              <Text style={s.closeBtnText}>Kapat</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function LineItem({
  icon,
  title,
  text,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  colors: ThemeColors;
}) {
  return (
    <View style={[stylesShared.item, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[stylesShared.iconWrap, { backgroundColor: colors.primaryTint }]}>
        <Ionicons name={icon} size={14} color={colors.violet} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[stylesShared.itemTitle, { color: colors.textSlate }]}>{title}</Text>
        <Text style={[stylesShared.itemText, { color: colors.textMuted }]}>{text}</Text>
      </View>
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.42)' },
    sheet: {
      backgroundColor: C.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: SCREEN_HEIGHT * 0.82,
      borderWidth: 1,
      borderColor: C.border,
    },
    content: { paddingHorizontal: 18, paddingBottom: 28, gap: 12 },
    handleBar: {
      alignSelf: 'center',
      width: 44,
      height: 4,
      borderRadius: 4,
      backgroundColor: C.borderLight,
      marginTop: 12,
    },
    header: { gap: 6, marginTop: 4 },
    houseBadge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
    houseBadgeText: { fontSize: 12, fontWeight: '800' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: C.textSlate },
    headerSub: { fontSize: 13, lineHeight: 19, color: C.textMuted },
    headerMeta: { fontSize: 12, color: C.muted, fontWeight: '600' },
    lineList: { gap: 8 },
    comboBox: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 12,
      gap: 6,
    },
    comboTitle: { fontSize: 12.5, fontWeight: '800', color: C.violet },
    comboText: { fontSize: 12.5, lineHeight: 18, color: C.textMuted },
    glossaryBox: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 12,
      gap: 6,
    },
    glossaryTitle: { fontSize: 12.5, fontWeight: '800', color: C.textSlate },
    glossaryText: { fontSize: 12.5, lineHeight: 18, color: C.textMuted },
    closeBtn: {
      minHeight: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  });
}

const stylesShared = StyleSheet.create({
  item: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  itemText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
});
