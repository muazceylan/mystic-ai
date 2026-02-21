import { useCallback, useEffect, useState } from 'react';
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
import {
  WeeklySwotResponse,
  SwotPoint,
  fetchWeeklySwot,
} from '../services/astrology.service';
import { COLORS } from '../constants/colors';

const SWOT_CONFIG = {
  STRENGTH: {
    emoji: '\u26A1',
    label: '\u0130\u00E7sel G\u00FC\u00E7',
    color: COLORS.violet,
    bgColor: 'rgba(124, 58, 237, 0.08)',
    borderColor: 'rgba(124, 58, 237, 0.20)',
    barColor: COLORS.swotStrength,
  },
  WEAKNESS: {
    emoji: '\u26A0\uFE0F',
    label: 'Enerji Kayb\u0131',
    color: COLORS.warning,
    bgColor: 'rgba(217, 119, 6, 0.08)',
    borderColor: 'rgba(217, 119, 6, 0.20)',
    barColor: COLORS.swotWeakness,
  },
  OPPORTUNITY: {
    emoji: '\u2728',
    label: 'Alt\u0131n F\u0131rsat',
    color: COLORS.success,
    bgColor: 'rgba(5, 150, 105, 0.08)',
    borderColor: 'rgba(5, 150, 105, 0.20)',
    barColor: COLORS.swotOpportunity,
  },
  THREAT: {
    emoji: '\uD83D\uDEAB',
    label: 'Kritik Uyar\u0131',
    color: COLORS.error,
    bgColor: 'rgba(220, 38, 38, 0.08)',
    borderColor: 'rgba(220, 38, 38, 0.20)',
    barColor: COLORS.swotThreat,
  },
} as const;

type SwotCategory = keyof typeof SWOT_CONFIG;

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
}

function SwotCard({ point, category, index, onPress }: SwotCardProps) {
  const config = SWOT_CONFIG[category];

  return (
    <Animated.View entering={FadeInDown.delay(index * 120).springify().damping(14)}>
      <TouchableOpacity
        style={[styles.swotCard, { backgroundColor: config.bgColor, borderColor: config.borderColor }]}
        activeOpacity={0.8}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        accessibilityLabel={`${config.label}: ${point.headline}`}
        accessibilityRole="button"
      >
        <View style={styles.swotCardHeader}>
          <Text style={styles.swotEmoji}>{config.emoji}</Text>
          <Text style={[styles.swotLabel, { color: config.color }]}>{config.label}</Text>
        </View>
        <Text style={styles.swotHeadline} numberOfLines={2}>{point.headline}</Text>
        <Text style={styles.swotSubtext} numberOfLines={1}>{point.subtext}</Text>
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
  const [swot, setSwot] = useState<WeeklySwotResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [tipModal, setTipModal] = useState<{ visible: boolean; point: SwotPoint | null; category: SwotCategory | null }>({
    visible: false,
    point: null,
    category: null,
  });

  const loadSwot = useCallback(async () => {
    if (!userId || !hasChart) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetchWeeklySwot(userId);
      setSwot(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [userId, hasChart]);

  useEffect(() => {
    loadSwot();
  }, [loadSwot]);

  // Don't render anything if no natal chart
  if (!hasChart) return null;

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.stateCard}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.stateText}>Haftal\u0131k enerji analizi y\u00FCkleniyor...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error || !swot) {
    return (
      <View style={styles.container}>
        <View style={styles.stateCard}>
          <Ionicons name="alert-circle-outline" size={24} color={COLORS.primary} />
          <Text style={styles.stateText}>Haftal\u0131k enerji analizi y\u00FCklenemedi</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadSwot}
            accessibilityLabel="Tekrar dene"
            accessibilityRole="button"
          >
            <Ionicons name="refresh" size={14} color={COLORS.primary} />
            <Text style={styles.retryText}>Tekrar dene</Text>
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
    <View style={styles.container}>
      {/* Flash Insight Banner */}
      <Animated.View entering={FadeIn.delay(50).duration(400)}>
        <View style={[styles.flashBanner, isAlert ? styles.flashAlert : styles.flashFortune]}>
          <Text style={styles.flashDot}>{isAlert ? '\uD83D\uDD34' : '\uD83D\uDFE2'}</Text>
          <View style={styles.flashTextWrap}>
            <Text style={[styles.flashHeadline, isAlert ? styles.flashAlertText : styles.flashFortuneText]} numberOfLines={1}>
              {flash.headline}
            </Text>
            <Text style={styles.flashDetail} numberOfLines={1}>{flash.detail}</Text>
          </View>
        </View>
      </Animated.View>

      {/* SWOT 2x2 Grid */}
      <View style={styles.swotGrid}>
        <View style={styles.swotRow}>
          <SwotCard point={swot.strength} category="STRENGTH" index={0} onPress={() => openTip(swot.strength, 'STRENGTH')} />
          <SwotCard point={swot.weakness} category="WEAKNESS" index={1} onPress={() => openTip(swot.weakness, 'WEAKNESS')} />
        </View>
        <View style={styles.swotRow}>
          <SwotCard point={swot.opportunity} category="OPPORTUNITY" index={2} onPress={() => openTip(swot.opportunity, 'OPPORTUNITY')} />
          <SwotCard point={swot.threat} category="THREAT" index={3} onPress={() => openTip(swot.threat, 'THREAT')} />
        </View>
      </View>

      {/* Quick-Tip Popup */}
      <Modal
        visible={tipModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setTipModal({ visible: false, point: null, category: null })}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setTipModal({ visible: false, point: null, category: null })}
          accessibilityLabel="Modal dışına tıkla kapat"
          accessibilityRole="button"
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {tipModal.point && tipModal.category && (
              <>
                <Text style={styles.modalEmoji}>{SWOT_CONFIG[tipModal.category].emoji}</Text>
                <Text style={[styles.modalTitle, { color: SWOT_CONFIG[tipModal.category].color }]}>
                  Bu enerjiyi nas\u0131l y\u00F6netirsin?
                </Text>
                <Text style={styles.modalTip}>{tipModal.point.quickTip}</Text>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: SWOT_CONFIG[tipModal.category].color }]}
                  onPress={() => setTipModal({ visible: false, point: null, category: null })}
                  accessibilityLabel="Anladım, kapat"
                  accessibilityRole="button"
                >
                  <Text style={styles.modalButtonText}>Anlad\u0131m</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 14,
    gap: 10,
  },

  // Loading/Error states
  stateCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stateText: {
    fontSize: 13,
    color: COLORS.subtext,
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
    backgroundColor: COLORS.primarySoft,
  },
  retryText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Flash Insight
  flashBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  flashAlert: {
    backgroundColor: 'rgba(220, 38, 38, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.18)',
  },
  flashFortune: {
    backgroundColor: 'rgba(5, 150, 105, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.18)',
  },
  flashDot: {
    fontSize: 12,
  },
  flashTextWrap: {
    flex: 1,
    gap: 2,
  },
  flashHeadline: {
    fontSize: 13,
    fontWeight: '700',
  },
  flashAlertText: {
    color: COLORS.error,
  },
  flashFortuneText: {
    color: COLORS.success,
  },
  flashDetail: {
    fontSize: 11,
    color: COLORS.subtext,
  },

  // SWOT Grid
  swotGrid: {
    gap: 10,
  },
  swotRow: {
    flexDirection: 'row',
    gap: 10,
  },
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
  swotEmoji: {
    fontSize: 16,
  },
  swotLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  swotHeadline: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 18,
  },
  swotSubtext: {
    fontSize: 11,
    color: COLORS.subtext,
    marginTop: 3,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    gap: 12,
  },
  modalEmoji: {
    fontSize: 36,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalTip: {
    fontSize: 14,
    color: COLORS.text,
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
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
