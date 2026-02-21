import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { SwotPoint } from '../services/astrology.service';
import { useWeeklySwot } from '../hooks/useHomeQueries';
import { useTranslation } from 'react-i18next';
import { useTheme, ThemeColors } from '../context/ThemeContext';

function getSwotConfig(C: ThemeColors, t: (k: string) => string) {
  return {
    STRENGTH: {
      emoji: '\u26A1',
      label: t('home.strength'),
      color: C.violet,
      bgColor: C.violetBg,
      borderColor: C.violet + '33',
      barColor: C.swotStrength,
    },
    WEAKNESS: {
      emoji: '\u26A0\uFE0F',
      label: t('home.weakness'),
      color: C.warning,
      bgColor: C.orangeBg,
      borderColor: C.orange + '33',
      barColor: C.swotWeakness,
    },
    OPPORTUNITY: {
      emoji: '\u2728',
      label: t('home.opportunity'),
      color: C.success,
      bgColor: C.greenBg,
      borderColor: C.success + '33',
      barColor: C.swotOpportunity,
    },
    THREAT: {
      emoji: '\uD83D\uDEAB',
      label: t('home.threat'),
      color: C.error,
      bgColor: C.cautionBg,
      borderColor: C.error + '33',
      barColor: C.swotThreat,
    },
  } as const;
}

type SwotCategory = keyof ReturnType<typeof getSwotConfig>;

function IntensityBar({ value, color }: { value: number; color: string }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(value, { duration: 800 });
  }, [value]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
    backgroundColor: color,
  }));

  return (
    <View style={barStyles.track}>
      <Animated.View style={[barStyles.fill, animatedStyle]} />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: {
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 10,
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});

interface SwotCardProps {
  point: SwotPoint;
  category: SwotCategory;
  index: number;
  onPress: () => void;
  swotConfig: ReturnType<typeof getSwotConfig>;
  s: Record<string, any>;
}

function SwotCard({ point, category, index, onPress, swotConfig, s }: SwotCardProps) {
  const config = swotConfig[category as SwotCategory];

  return (
    <Animated.View entering={FadeInDown.delay(index * 120).springify().damping(14)}>
      <TouchableOpacity
        style={[s.swotCard, { backgroundColor: config.bgColor, borderColor: config.borderColor }]}
        activeOpacity={0.8}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        accessibilityLabel={`${config.label}: ${point.headline}`}
        accessibilityRole="button"
      >
        <View style={s.swotCardHeader}>
          <Text style={s.swotEmoji}>{config.emoji}</Text>
          <Text style={[s.swotLabel, { color: config.color }]}>{config.label}</Text>
        </View>
        <Text style={s.swotHeadline} numberOfLines={2}>{point.headline}</Text>
        <Text style={s.swotSubtext} numberOfLines={1}>{point.subtext}</Text>
        <IntensityBar value={point.intensity} color={config.barColor} />
      </TouchableOpacity>
    </Animated.View>
  );
}

interface Props {
  userId: number | undefined;
  hasChart: boolean;
}

export default function CosmicSwotDashboard({ userId, hasChart }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const swotConfig = getSwotConfig(colors, t);
  const s = createStyles(colors);
  const { data: swot, isLoading: loading, isError: error, refetch: loadSwot } = useWeeklySwot(
    hasChart ? userId : undefined
  );
  const [tipModal, setTipModal] = useState<{ visible: boolean; point: SwotPoint | null; category: SwotCategory | null }>({
    visible: false,
    point: null,
    category: null,
  });

  // Don't render anything if no natal chart
  if (!hasChart) return null;

  if (loading) {
    return (
      <View style={s.container}>
        <View style={s.stateCard}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={s.stateText}>{t('home.swotLoading')}</Text>
        </View>
      </View>
    );
  }

  if (error || !swot) {
    return (
      <View style={s.container}>
        <View style={s.stateCard}>
          <Ionicons name="alert-circle-outline" size={24} color={colors.primary} />
          <Text style={s.stateText}>{t('home.swotLoadError')}</Text>
          <TouchableOpacity
            style={s.retryButton}
            onPress={() => loadSwot()}
            accessibilityLabel={t('home.swotRetryBtn')}
            accessibilityRole="button"
          >
            <Ionicons name="refresh" size={14} color={colors.primary} />
            <Text style={s.retryText}>{t('home.swotRetryBtn')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const flash = swot.flashInsight;
  const isAlert = flash.type === 'ALERT';

  const openTip = (point: SwotPoint, category: SwotCategory) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTipModal({ visible: true, point, category });
  };

  return (
    <View style={s.container}>
      <Animated.View entering={FadeIn.delay(50).duration(400)}>
        <View style={[s.flashBanner, isAlert ? s.flashAlert : s.flashFortune]}>
          <Text style={s.flashDot}>{isAlert ? '\uD83D\uDD34' : '\uD83D\uDFE2'}</Text>
          <View style={s.flashTextWrap}>
            <Text style={[s.flashHeadline, isAlert ? s.flashAlertText : s.flashFortuneText]} numberOfLines={1}>
              {flash.headline}
            </Text>
            <Text style={s.flashDetail} numberOfLines={1}>{flash.detail}</Text>
          </View>
        </View>
      </Animated.View>

      <View style={s.swotGrid}>
        <View style={s.swotRow}>
          <SwotCard point={swot.strength} category="STRENGTH" index={0} onPress={() => openTip(swot.strength, 'STRENGTH')} swotConfig={swotConfig} s={s} />
          <SwotCard point={swot.weakness} category="WEAKNESS" index={1} onPress={() => openTip(swot.weakness, 'WEAKNESS')} swotConfig={swotConfig} s={s} />
        </View>
        <View style={s.swotRow}>
          <SwotCard point={swot.opportunity} category="OPPORTUNITY" index={2} onPress={() => openTip(swot.opportunity, 'OPPORTUNITY')} swotConfig={swotConfig} s={s} />
          <SwotCard point={swot.threat} category="THREAT" index={3} onPress={() => openTip(swot.threat, 'THREAT')} swotConfig={swotConfig} s={s} />
        </View>
      </View>

      <Modal
        visible={tipModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setTipModal({ visible: false, point: null, category: null })}
      >
        <Pressable
          style={s.modalOverlay}
          onPress={() => setTipModal({ visible: false, point: null, category: null })}
          accessibilityLabel={t('home.swotCloseModal')}
          accessibilityRole="button"
        >
          <Pressable style={s.modalContent} onPress={(e) => e.stopPropagation()}>
            {tipModal.point && tipModal.category && (
              <>
                <Text style={s.modalEmoji}>{swotConfig[tipModal.category as SwotCategory].emoji}</Text>
                <Text style={[s.modalTitle, { color: swotConfig[tipModal.category as SwotCategory].color }]}>
                  {t('home.swotManageEnergy')}
                </Text>
                <Text style={s.modalTip}>{tipModal.point.quickTip}</Text>
                <TouchableOpacity
                  style={[s.modalButton, { backgroundColor: swotConfig[tipModal.category as SwotCategory].color }]}
                  onPress={() => setTipModal({ visible: false, point: null, category: null })}
                  accessibilityLabel="Anladım, kapat"
                  accessibilityRole="button"
                >
                  <Text style={s.modalButtonText}>Anlad\u0131m</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { marginHorizontal: 20, marginTop: 14, gap: 10 },
    stateCard: {
      backgroundColor: C.card,
      borderRadius: 14,
      padding: 20,
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: C.border,
    },
    stateText: {
      fontSize: 13,
      color: C.subtext,
      textAlign: 'center',
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: C.primarySoft,
    },
    retryText: {
      fontSize: 12,
      color: C.primary,
      fontWeight: '600',
    },
    flashBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      gap: 10,
    },
    flashAlert: {
      backgroundColor: C.cautionBg,
      borderWidth: 1,
      borderColor: C.redLight,
    },
    flashFortune: {
      backgroundColor: C.luckBg,
      borderWidth: 1,
      borderColor: C.greenBg,
    },
    flashDot: { fontSize: 12 },
    flashTextWrap: { flex: 1, gap: 2 },
    flashHeadline: { fontSize: 13, fontWeight: '700' },
    flashAlertText: { color: C.error },
    flashFortuneText: { color: C.success },
    flashDetail: { fontSize: 11, color: C.subtext },
    swotGrid: { gap: 10 },
    swotRow: { flexDirection: 'row', gap: 10 },
    swotCard: {
      flex: 1,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
    },
    swotCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    swotEmoji: { fontSize: 16 },
    swotLabel: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    swotHeadline: {
      fontSize: 13,
      fontWeight: '700',
      color: C.text,
      lineHeight: 18,
    },
    swotSubtext: {
      fontSize: 11,
      color: C.subtext,
      marginTop: 3,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 30,
    },
    modalContent: {
      backgroundColor: C.card,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      width: '100%',
      maxWidth: 320,
      gap: 12,
    },
    modalEmoji: { fontSize: 36 },
    modalTitle: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
    modalTip: {
      fontSize: 14,
      color: C.text,
      textAlign: 'center',
      lineHeight: 21,
    },
    modalButton: {
      marginTop: 6,
      paddingVertical: 10,
      paddingHorizontal: 32,
      borderRadius: 12,
    },
    modalButtonText: {
      color: C.white,
      fontSize: 14,
      fontWeight: '700',
    },
  });
}
