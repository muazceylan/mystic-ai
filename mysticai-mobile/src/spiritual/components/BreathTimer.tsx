import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type BreathPattern = {
  inhale: number;
  hold1?: number;
  exhale: number;
  hold2?: number;
};

interface BreathTimerProps {
  pattern: BreathPattern;
  targetDurationSec: number;
  onComplete: (payload: { actualDurationSec: number; cycles: number }) => void;
}

const PHASE_LABELS: Record<string, string> = {
  INHALE: 'Nefes Al',
  HOLD: 'Tut',
  EXHALE: 'Ver',
};

const CIRCLE = 180;

export function BreathTimer({ pattern, targetDurationSec, onComplete }: BreathTimerProps) {
  const phases = useMemo(
    () =>
      [
        { key: 'INHALE', sec: pattern.inhale },
        { key: 'HOLD', sec: pattern.hold1 ?? 0 },
        { key: 'EXHALE', sec: pattern.exhale },
        { key: 'HOLD', sec: pattern.hold2 ?? 0 },
      ].filter((p) => p.sec > 0),
    [pattern],
  );

  const [running, setRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseRemaining, setPhaseRemaining] = useState(phases[0]?.sec ?? 0);
  const cyclesRef = useRef(0);

  // Reanimated shared values for circle pulse
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0.6);

  // Animate circle when phase changes or session starts/resumes
  useEffect(() => {
    if (!running || phases.length === 0) return;
    const phase = phases[phaseIndex];
    if (!phase) return;
    const dur = phase.sec * 1000;
    if (phase.key === 'INHALE') {
      scale.value = withTiming(1.0, { duration: dur, easing: Easing.out(Easing.sin) });
      opacity.value = withTiming(1.0, { duration: dur });
    } else if (phase.key === 'EXHALE') {
      scale.value = withTiming(0.55, { duration: dur, easing: Easing.in(Easing.sin) });
      opacity.value = withTiming(0.55, { duration: dur });
    }
    // HOLD: no animation — circle stays at current scale
  }, [running, phaseIndex, phases]);

  // Countdown ticker
  useEffect(() => {
    if (!running || phases.length === 0) return;

    const interval = setInterval(() => {
      setElapsedSec((prev) => {
        const next = prev + 1;
        if (next >= targetDurationSec) {
          setRunning(false);
          onComplete({ actualDurationSec: next, cycles: cyclesRef.current });
        }
        return next;
      });

      setPhaseRemaining((prev) => {
        if (prev > 1) return prev - 1;
        const nextIdx = (phaseIndex + 1) % phases.length;
        if (nextIdx === 0) cyclesRef.current += 1;
        setPhaseIndex(nextIdx);
        return phases[nextIdx].sec;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [running, phaseIndex, phases, targetDurationSec, onComplete]);

  const phase = phases[phaseIndex];

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.circleArea}>
        <Animated.View style={[styles.circle, circleStyle]}>
          <Text style={styles.phaseLabel}>
            {running ? (PHASE_LABELS[phase?.key ?? ''] ?? phase?.key ?? '–') : 'HAZIR'}
          </Text>
          <Text style={styles.countdown}>{phaseRemaining}s</Text>
        </Animated.View>
      </View>

      <Text style={styles.meta}>{elapsedSec} / {targetDurationSec} sn</Text>

      <Pressable style={styles.btn} onPress={() => setRunning((v) => !v)}>
        <Text style={styles.btnText}>{running ? 'Duraklat' : 'Başlat'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  circleArea: {
    width: CIRCLE,
    height: CIRCLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  phaseLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  countdown: {
    fontSize: 44,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  meta: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  btn: {
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 12,
    minWidth: 130,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
