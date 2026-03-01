import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../../utils/haptics';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS, ACCESSIBILITY } from '../../constants/tokens';

interface PrayerCounterProps {
  value: number;
  target: number;
  onAdd: (value: number) => void;
}

export function PrayerCounter({ value, target, onAdd }: PrayerCounterProps) {
  const { colors, isDark } = useTheme();
  const s = createStyles(colors);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progress = target > 0 ? Math.min(1, value / target) : 0;
  const isDone = value >= target;

  const startHold = () => {
    onAdd(1);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    holdTimerRef.current = setInterval(() => {
      onAdd(1);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 90);
  };

  const stopHold = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  useEffect(() => () => stopHold(), []);

  const doneColor = isDark ? '#4ADE80' : '#16A34A';

  return (
    <View style={[s.container, {
      backgroundColor: isDark ? 'rgba(15,23,42,0.60)' : colors.surface,
      borderColor: isDone
        ? (isDark ? 'rgba(74,222,128,0.35)' : 'rgba(22,163,74,0.35)')
        : colors.border,
    }]}>
      {/* Counter display */}
      <View style={s.scoreboard}>
        <Text
          style={[s.scoreText, { color: isDone ? doneColor : colors.text }]}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          {value}
        </Text>
        <Text style={[s.scoreSep, { color: colors.subtext }]}>/</Text>
        <Text style={[s.scoreTarget, { color: colors.subtext }]}>{target}</Text>
        {isDone && (
          <View style={[s.doneBadge, {
            backgroundColor: isDark ? 'rgba(74,222,128,0.15)' : 'rgba(22,163,74,0.12)',
          }]}>
            <Ionicons name="checkmark-circle" size={14} color={doneColor} />
            <Text style={[s.doneText, { color: doneColor }]}>Tamamlandı</Text>
          </View>
        )}
      </View>

      {/* Progress bar */}
      <View style={[s.progressTrack, {
        backgroundColor: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(0,0,0,0.07)',
      }]}>
        <View style={[
          s.progressFill,
          {
            width: `${progress * 100}%`,
            backgroundColor: isDone ? doneColor : colors.primary,
          },
        ]} />
      </View>

      {/* Large main button */}
      <Pressable
        style={({ pressed }) => [
          s.mainBtn,
          { backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 },
        ]}
        onPress={() => onAdd(1)}
        onLongPress={startHold}
        onPressOut={stopHold}
        accessibilityLabel="Bir ekle"
        accessibilityHint="Basılı tutarak hızlı sayım yapabilirsiniz"
      >
        <Ionicons name="add" size={32} color="#fff" />
        <Text style={s.mainBtnLabel}>Ekle</Text>
        <Text style={s.mainBtnHint}>Basılı tut = hızlı</Text>
      </Pressable>
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: {
      borderRadius: 18,
      borderWidth: 1,
      padding: SPACING.lg,
      gap: SPACING.mdLg,
    },
    scoreboard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    scoreText: {
      fontSize: 40,
      fontWeight: '900',
      lineHeight: 44,
    },
    scoreSep: {
      fontSize: 22,
      fontWeight: '300',
    },
    scoreTarget: {
      fontSize: 20,
      fontWeight: '600',
    },
    doneBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: RADIUS.full,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginLeft: 6,
    },
    doneText: {
      fontSize: 11,
      fontWeight: '700',
    },
    progressTrack: {
      height: 6,
      borderRadius: RADIUS.full,
      overflow: 'hidden',
    },
    progressFill: {
      height: 6,
      borderRadius: RADIUS.full,
    },
    mainBtn: {
      borderRadius: RADIUS.lg,
      paddingVertical: 20,
      alignItems: 'center',
      gap: 2,
      minHeight: 100,
      justifyContent: 'center',
    },
    mainBtnLabel: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 17,
    },
    mainBtnHint: {
      color: 'rgba(255,255,255,0.6)',
      fontSize: 11,
      fontWeight: '500',
    },
  });
}
