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
import { GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from '../../utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import Reanimated from 'react-native-reanimated';
import Svg, { Circle, G, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { getZodiacInfo, SIGN_MODALITY_KEY, type ElementKey, type ModalityKey } from '../../constants/zodiac';
import { getSignGlossary } from '../../constants/astrology-glossary';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';
import { useBottomSheetDragGesture } from '../ui/useBottomSheetDragGesture';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type BigThreeRole = 'sun' | 'moon' | 'rising';

type Props = {
  visible: boolean;
  role: BigThreeRole | null;
  sign: string | null | undefined;
  onClose: () => void;
};

type RadarMetric = {
  key: string;
  label: string;
  value: number;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function buildRoleRadarMetrics(
  role: BigThreeRole,
  elementKey: ElementKey,
  modalityKey: ModalityKey,
  labels: { identity: string; intuition: string; expression: string; harmony: string; initiative: string },
): RadarMetric[] {
  const baseByRole: Record<BigThreeRole, Record<string, number>> = {
    sun:    { identity: 86, intuition: 54, expression: 78, harmony: 58, initiative: 82 },
    moon:   { identity: 58, intuition: 90, expression: 56, harmony: 80, initiative: 46 },
    rising: { identity: 70, intuition: 52, expression: 74, harmony: 62, initiative: 76 },
  };

  const score = { ...baseByRole[role] };

  if (elementKey === 'fire')       { score.initiative += 10; score.expression += 7;  score.harmony -= 4;    }
  else if (elementKey === 'water') { score.intuition  += 12; score.harmony    += 8;  score.initiative -= 5; }
  else if (elementKey === 'air')   { score.expression += 10; score.harmony    += 5;  score.identity -= 3;   }
  else if (elementKey === 'earth') { score.identity   += 6;  score.harmony    += 4;  score.intuition -= 3;  }

  if (modalityKey === 'cardinal')     { score.initiative += 8; score.identity += 4;  }
  else if (modalityKey === 'fixed')   { score.identity   += 7; score.harmony  += 3;  score.expression -= 2; }
  else if (modalityKey === 'mutable') { score.expression += 6; score.intuition += 5; score.identity -= 2;   }

  return [
    { key: 'identity',   label: labels.identity,   value: clamp(score.identity)   },
    { key: 'intuition',  label: labels.intuition,   value: clamp(score.intuition)  },
    { key: 'expression', label: labels.expression,  value: clamp(score.expression) },
    { key: 'harmony',    label: labels.harmony,     value: clamp(score.harmony)    },
    { key: 'initiative', label: labels.initiative,  value: clamp(score.initiative) },
  ];
}

type TFn = (key: string, opts?: Record<string, string>) => string;

function buildRoleCards(role: BigThreeRole, sign: string | null | undefined, locale: string, t: TFn) {
  const signInfo     = getZodiacInfo(sign, locale);
  const signGlossary = getSignGlossary(sign ?? '', locale);
  const signKey      = (sign ?? '').toUpperCase();
  const modalityKey: ModalityKey = SIGN_MODALITY_KEY[signKey] ?? 'cardinal';

  const modalityLabel =
    modalityKey === 'cardinal' ? t('bigThreeSheet.modalityCardinal') :
    modalityKey === 'fixed'    ? t('bigThreeSheet.modalityFixed')    :
                                 t('bigThreeSheet.modalityMutable');

  const radarLabels = {
    identity:   t('bigThreeSheet.metricIdentity'),
    intuition:  t('bigThreeSheet.metricIntuition'),
    expression: t('bigThreeSheet.metricExpression'),
    harmony:    t('bigThreeSheet.metricHarmony'),
    initiative: t('bigThreeSheet.metricInitiative'),
  };

  const radarMetrics = buildRoleRadarMetrics(role, signInfo.elementKey, modalityKey, radarLabels);

  const impactText =
    role === 'sun'    ? t('bigThreeSheet.cardImpactSun',   { sign: signInfo.name }) :
    role === 'moon'   ? t('bigThreeSheet.cardImpactMoon',  { sign: signInfo.name }) :
                        t('bigThreeSheet.cardImpactRising', { sign: signInfo.name });

  const socialText =
    role === 'sun'    ? t('bigThreeSheet.cardDailySun',    { shortDesc: signGlossary?.shortDesc?.toLowerCase() ?? t('bigThreeSheet.unknown') }) :
    role === 'moon'   ? t('bigThreeSheet.cardDailyMoon',   { element: signInfo.element.toLowerCase() }) :
                        t('bigThreeSheet.cardDailyRising', { modality: modalityLabel.toLowerCase() });

  const cautionText =
    role === 'sun'    ? t('bigThreeSheet.cardCautionSun')    :
    role === 'moon'   ? t('bigThreeSheet.cardCautionMoon')   :
                        t('bigThreeSheet.cardCautionRising');

  const strengths =
    role === 'sun'    ? [t('bigThreeSheet.strengthIdentity'), t('bigThreeSheet.strengthExpression'), t('bigThreeSheet.strengthSelfAssertion')] :
    role === 'moon'   ? [t('bigThreeSheet.strengthEmotionalIntuition'), t('bigThreeSheet.strengthInstinctiveReading'), t('bigThreeSheet.strengthSpiritualResilience')] :
                        [t('bigThreeSheet.strengthFirstImpression'), t('bigThreeSheet.strengthStartingEnergy'), t('bigThreeSheet.strengthSocialAdaptation')];

  return {
    signInfo,
    element: signInfo.element,
    modalityLabel,
    radarMetrics,
    cards: [
      { icon: 'sparkles-outline', title: t('bigThreeSheet.cardCharacterTitle'), text: signGlossary?.longDesc ?? t('bigThreeSheet.signFallback', { name: signInfo.name }) },
      { icon: 'rocket-outline',   title: t('bigThreeSheet.cardImpactTitle'),    text: impactText  },
      { icon: 'people-outline',   title: t('bigThreeSheet.cardDailyTitle'),     text: socialText  },
      { icon: 'warning-outline',  title: t('bigThreeSheet.cardCautionTitle'),   text: cautionText },
    ],
    strengths,
  };
}

function polarPoint(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function RoleRadarMiniChart({ metrics, colors }: { metrics: RadarMetric[]; colors: ThemeColors }) {
  const size   = 138;
  const cx     = size / 2;
  const cy     = size / 2;
  const radius = 52;
  const angles = metrics.map((_, idx) => (360 / metrics.length) * idx);

  const gridPolygons = [0.25, 0.5, 0.75, 1].map((f) =>
    angles.map((angle) => { const p = polarPoint(cx, cy, radius * f, angle); return `${p.x},${p.y}`; }).join(' ')
  );

  const valuePolygon = angles.map((angle, idx) => {
    const p = polarPoint(cx, cy, radius * (metrics[idx].value / 100), angle);
    return `${p.x},${p.y}`;
  }).join(' ');

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridPolygons.map((points, idx) => (
        <Polygon key={`grid-${idx}`} points={points} fill="none"
          stroke={idx === gridPolygons.length - 1 ? colors.border : colors.borderLight}
          strokeWidth={1} opacity={0.9} />
      ))}
      {angles.map((angle, idx) => {
        const p     = polarPoint(cx, cy, radius, angle);
        const label = polarPoint(cx, cy, radius + 13, angle);
        return (
          <G key={`axis-wrap-${metrics[idx].key}`}>
            <Line x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={colors.border} strokeWidth={1} />
            <Circle cx={p.x} cy={p.y} r={1.5} fill={colors.border} />
            <SvgText x={label.x} y={label.y + 3} fill={colors.textMuted} fontSize={8.5} textAnchor="middle">
              {metrics[idx].label}
            </SvgText>
          </G>
        );
      })}
      <Polygon points={valuePolygon} fill={colors.violet + '2E'} stroke={colors.violet} strokeWidth={1.8} />
      {angles.map((angle, idx) => {
        const p = polarPoint(cx, cy, radius * (metrics[idx].value / 100), angle);
        return <Circle key={`dot-${metrics[idx].key}`} cx={p.x} cy={p.y} r={3} fill={colors.violet} />;
      })}
      <Circle cx={cx} cy={cy} r={2.2} fill={colors.violet} />
    </Svg>
  );
}

export default function BigThreeBottomSheet({ visible, role, sign, onClose }: Props) {
  const { colors }   = useTheme();
  const { t, i18n }  = useTranslation();
  const s            = useMemo(() => createStyles(colors), [colors]);
  const slideAnim    = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const { animatedStyle, gesture } = useBottomSheetDragGesture({ enabled: visible, onClose });

  const ROLE_META = useMemo(() => ({
    sun:    { label: t('bigThreeSheet.sunLabel'),    icon: '☉', hook: t('bigThreeSheet.sunHook')    },
    moon:   { label: t('bigThreeSheet.moonLabel'),   icon: '☽', hook: t('bigThreeSheet.moonHook')   },
    rising: { label: t('bigThreeSheet.risingLabel'), icon: '↑', hook: t('bigThreeSheet.risingHook') },
  }), [t]);

  useEffect(() => {
    if (visible) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim,    { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim,    { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, backdropAnim, slideAnim]);

  if (!visible || !role) return null;

  const meta  = ROLE_META[role];
  const built = buildRoleCards(role, sign, i18n.language, t as TFn);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={s.container}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[s.backdrop, { opacity: backdropAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <Reanimated.View style={animatedStyle}>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
              <GestureDetector gesture={gesture}>
                <View>
                  <View style={s.handleBar} />
                  <View style={s.hero}>
                    <View style={[s.heroBadge, { backgroundColor: colors.violetBg }]}>
                      <Text style={[s.heroBadgeText, { color: colors.violet }]}>{meta.icon} {meta.label}</Text>
                    </View>
                    <Text style={s.heroTitle}>
                      {t('bigThreeSheet.heroTitle', { role: meta.label, symbol: built.signInfo.symbol, sign: built.signInfo.name })}
                    </Text>
                    <Text style={s.heroDesc}>{meta.hook}</Text>
                  </View>
                </View>
              </GestureDetector>

              <View style={s.pillRow}>
                <View style={[s.pill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Ionicons name="water-outline" size={12} color={colors.violet} />
                  <Text style={s.pillText}>{t('bigThreeSheet.elementPill', { value: built.element })}</Text>
                </View>
                <View style={[s.pill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Ionicons name="git-branch-outline" size={12} color={colors.violet} />
                  <Text style={s.pillText}>{t('bigThreeSheet.modalityPill', { value: built.modalityLabel })}</Text>
                </View>
              </View>

              <View style={[s.radarCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <View style={s.radarHeader}>
                  <Text style={s.radarTitle}>{t('bigThreeSheet.radarTitle')}</Text>
                  <Text style={s.radarSub}>{t('bigThreeSheet.radarSub')}</Text>
                </View>
                <View style={s.radarBody}>
                  <RoleRadarMiniChart metrics={built.radarMetrics} colors={colors} />
                  <View style={s.radarLegend}>
                    {built.radarMetrics.map((metric) => (
                      <View key={metric.key} style={s.radarLegendRow}>
                        <View style={[s.radarLegendDot, { backgroundColor: colors.violet }]} />
                        <Text style={s.radarLegendLabel}>{metric.label}</Text>
                        <View style={[s.radarTrack, { backgroundColor: colors.borderLight }]}>
                          <View style={[s.radarTrackFill, { backgroundColor: colors.violet, width: `${Math.max(8, metric.value)}%` }]} />
                        </View>
                        <Text style={s.radarLegendValue}>{metric.value}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              <View style={s.cardList}>
                {built.cards.map((card) => (
                  <View key={card.title} style={[s.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={s.infoHeader}>
                      <View style={[s.infoIconWrap, { backgroundColor: colors.primaryTint }]}>
                        <Ionicons name={card.icon as any} size={14} color={colors.violet} />
                      </View>
                      <Text style={s.infoTitle}>{card.title}</Text>
                    </View>
                    <Text style={s.infoText}>{card.text}</Text>
                  </View>
                ))}
              </View>

              <View style={[s.strengthCard, { backgroundColor: colors.primaryTint, borderColor: colors.border }]}>
                <Text style={s.strengthTitle}>{t('bigThreeSheet.strengthsTitle')}</Text>
                <View style={s.strengthWrap}>
                  {built.strengths.map((item) => (
                    <View key={item} style={[s.strengthChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Ionicons name="star-outline" size={12} color={colors.violet} />
                      <Text style={s.strengthChipText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <Pressable style={[s.closeBtn, { backgroundColor: colors.violet }]} onPress={onClose}>
                <Text style={s.closeBtnText}>{t('bigThreeSheet.closeBtn')}</Text>
              </Pressable>
            </ScrollView>
          </Reanimated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container:        { flex: 1, justifyContent: 'flex-end' },
    backdrop:         { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,14,24,0.45)' },
    sheet: {
      backgroundColor: C.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: SCREEN_HEIGHT * 0.82,
      borderWidth: 1,
      borderColor: C.border,
    },
    content:          { paddingHorizontal: 18, paddingBottom: 28, gap: 12 },
    handleBar:        { alignSelf: 'center', width: 44, height: 4, borderRadius: 4, backgroundColor: C.borderLight, marginTop: 12 },
    hero:             { gap: 6, marginTop: 4 },
    heroBadge:        { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
    heroBadgeText:    { fontSize: 12, fontWeight: '800' },
    heroTitle:        { fontSize: 18, fontWeight: '800', color: C.textSlate },
    heroDesc:         { fontSize: 13, lineHeight: 19, color: C.textMuted },
    pillRow:          { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    pill:             { borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6 },
    pillText:         { fontSize: 12, color: C.textDark, fontWeight: '600' },
    radarCard:        { borderRadius: 14, borderWidth: 1, padding: 12, gap: 10 },
    radarHeader:      { gap: 2 },
    radarTitle:       { fontSize: 12.5, fontWeight: '800', color: C.textSlate },
    radarSub:         { fontSize: 11.5, lineHeight: 16, color: C.textMuted },
    radarBody:        { flexDirection: 'row', gap: 10, alignItems: 'center' },
    radarLegend:      { flex: 1, gap: 6 },
    radarLegendRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
    radarLegendDot:   { width: 6, height: 6, borderRadius: 999 },
    radarLegendLabel: { width: 52, fontSize: 11, fontWeight: '700', color: C.textDark },
    radarTrack:       { flex: 1, height: 6, borderRadius: 999, overflow: 'hidden' },
    radarTrackFill:   { height: '100%', borderRadius: 999 },
    radarLegendValue: { width: 22, textAlign: 'right', fontSize: 10.5, fontWeight: '700', color: C.muted },
    cardList:         { gap: 8 },
    infoCard:         { borderRadius: 14, borderWidth: 1, padding: 12, gap: 6 },
    infoHeader:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoIconWrap:     { width: 24, height: 24, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
    infoTitle:        { fontSize: 13, fontWeight: '800', color: C.textSlate },
    infoText:         { fontSize: 12.5, lineHeight: 18, color: C.textMuted },
    strengthCard:     { borderRadius: 14, borderWidth: 1, padding: 12, gap: 8 },
    strengthTitle:    { fontSize: 12.5, fontWeight: '800', color: C.textSlate },
    strengthWrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    strengthChip:     { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 5 },
    strengthChipText: { fontSize: 11.5, fontWeight: '700', color: C.textDark },
    closeBtn:         { marginTop: 2, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    closeBtnText:     { color: '#FFF', fontWeight: '800', fontSize: 13 },
  });
}
