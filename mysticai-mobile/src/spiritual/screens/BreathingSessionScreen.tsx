import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { useContentStore } from '../store/useContentStore';
import { useJournalStore } from '../store/useJournalStore';
import { SafeScreen, AppHeader } from '../../components/ui';
import { BreathTimer } from '../components/BreathTimer';

const ACCENT = '#7C3AED';
const MIN_DURATION = 60;
const MAX_DURATION = 600;
const STEP = 30;

export default function BreathingSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const technique = useContentStore().getBreathingById(id ?? '');
  const addEntry = useJournalStore((s) => s.addEntry);
  const s = makeStyles(colors, isDark);

  const [duration, setDuration] = useState(
    technique?.defaultDurationSec ?? 240,
  );
  const [completed, setCompleted] = useState(false);

  const cycleDuration = technique
    ? (technique.pattern.inhale ?? 0) +
      (technique.pattern.hold1 ?? 0) +
      (technique.pattern.exhale ?? 0) +
      (technique.pattern.hold2 ?? 0)
    : 1;

  const handleComplete = useCallback(
    (payload: { actualDurationSec: number; cycles: number }) => {
      if (!technique) return;

      addEntry({
        dateISO: new Date().toISOString().slice(0, 10),
        itemType: 'dua',
        itemId: 0,
        itemName: technique.titleTr,
        target: Math.floor(duration / cycleDuration),
        completed: payload.cycles,
        durationSec: payload.actualDurationSec,
      });

      setCompleted(true);
    },
    [technique, duration, cycleDuration, addEntry],
  );

  if (!technique) {
    return (
      <SafeScreen style={{ backgroundColor: isDark ? '#1E1B2E' : '#F5F3FF' }}>
        <LinearGradient
          colors={isDark ? ['#1E1B2E', '#2D2640'] : ['#F5F3FF', '#EDE9FE']}
          style={s.flex}
        >
          <AppHeader
            title="Nefes Tekniği"
            onBack={() => router.back()}
            transparent
          />
          <View style={s.errorWrap}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.muted} />
            <Text style={s.errorText}>Teknik bulunamadı.</Text>
            <Pressable style={s.backBtn} onPress={() => router.back()}>
              <Text style={s.backBtnText}>Geri Dön</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </SafeScreen>
    );
  }

  if (completed) {
    return (
      <SafeScreen style={{ backgroundColor: isDark ? '#1E1B2E' : '#F5F3FF' }}>
        <LinearGradient
          colors={isDark ? ['#1E1B2E', '#2D2640'] : ['#F5F3FF', '#EDE9FE']}
          style={s.flex}
        >
          <View style={s.completedWrap}>
            <View style={s.completedIconWrap}>
              <Ionicons name="checkmark-circle" size={72} color={ACCENT} />
            </View>
            <Text style={s.completedTitle}>Tebrikler!</Text>
            <Text style={s.completedSub}>
              {technique.titleTr} seansını başarıyla tamamladınız.
            </Text>
            <Pressable
              style={s.doneBtn}
              onPress={() => router.back()}
            >
              <Text style={s.doneBtnText}>Tamam</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen style={{ backgroundColor: isDark ? '#1E1B2E' : '#F5F3FF' }}>
      <LinearGradient
        colors={isDark ? ['#1E1B2E', '#2D2640'] : ['#F5F3FF', '#EDE9FE']}
        style={s.flex}
      >
        <AppHeader
          title={technique.titleTr}
          onBack={() => router.back()}
          transparent
        />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Description */}
        <Text style={s.description}>{technique.description}</Text>

        {/* Benefits */}
        <View style={s.benefitsCard}>
          <Text style={s.benefitsTitle}>Faydaları</Text>
          {technique.benefits.map((b, i) => (
            <View key={i} style={s.benefitRow}>
              <Ionicons name="leaf-outline" size={15} color={ACCENT} />
              <Text style={s.benefitText}>{b}</Text>
            </View>
          ))}
        </View>

        {/* Duration adjuster */}
        <View style={s.durationCard}>
          <Text style={s.durationLabel}>Süre</Text>
          <View style={s.durationRow}>
            <Pressable
              style={[
                s.durationBtn,
                duration <= MIN_DURATION && s.durationBtnDisabled,
              ]}
              onPress={() =>
                setDuration((d) => Math.max(MIN_DURATION, d - STEP))
              }
              disabled={duration <= MIN_DURATION}
            >
              <Text style={s.durationBtnText}>-30s</Text>
            </Pressable>

            <Text style={s.durationValue}>
              {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}
            </Text>

            <Pressable
              style={[
                s.durationBtn,
                duration >= MAX_DURATION && s.durationBtnDisabled,
              ]}
              onPress={() =>
                setDuration((d) => Math.min(MAX_DURATION, d + STEP))
              }
              disabled={duration >= MAX_DURATION}
            >
              <Text style={s.durationBtnText}>+30s</Text>
            </Pressable>
          </View>
        </View>

        {/* Breath Timer */}
        <BreathTimer
          pattern={technique.pattern}
          targetDurationSec={duration}
          onComplete={handleComplete}
        />
      </ScrollView>
      </LinearGradient>
    </SafeScreen>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    flex: {
      flex: 1,
    },
    scroll: {
      padding: 16,
      paddingBottom: 48,
      gap: 16,
    },
    description: {
      fontSize: 14,
      lineHeight: 22,
      color: C.subtext,
    },
    benefitsCard: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#FFFFFF',
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(124,58,237,0.2)' : '#E9D5FF',
      gap: 10,
    },
    benefitsTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: C.text,
      marginBottom: 2,
    },
    benefitRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    benefitText: {
      fontSize: 13,
      lineHeight: 19,
      color: C.subtext,
      flex: 1,
    },
    durationCard: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#FFFFFF',
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(124,58,237,0.2)' : '#E9D5FF',
      alignItems: 'center',
      gap: 10,
    },
    durationLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: C.text,
    },
    durationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 20,
    },
    durationBtn: {
      backgroundColor: isDark ? 'rgba(124,58,237,0.25)' : '#F3E8FF',
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    durationBtnDisabled: {
      opacity: 0.35,
    },
    durationBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: ACCENT,
    },
    durationValue: {
      fontSize: 28,
      fontWeight: '800',
      color: C.text,
      minWidth: 80,
      textAlign: 'center',
    },
    errorWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: 24,
    },
    errorText: {
      fontSize: 15,
      color: C.muted,
      textAlign: 'center',
    },
    backBtn: {
      backgroundColor: ACCENT,
      borderRadius: 12,
      paddingHorizontal: 24,
      paddingVertical: 10,
      marginTop: 8,
    },
    backBtnText: {
      color: '#FFF',
      fontWeight: '700',
      fontSize: 14,
    },
    completedWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      gap: 12,
    },
    completedIconWrap: {
      marginBottom: 8,
    },
    completedTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: C.text,
    },
    completedSub: {
      fontSize: 15,
      lineHeight: 22,
      color: C.subtext,
      textAlign: 'center',
    },
    doneBtn: {
      backgroundColor: ACCENT,
      borderRadius: 14,
      paddingHorizontal: 32,
      paddingVertical: 13,
      marginTop: 16,
    },
    doneBtnText: {
      color: '#FFF',
      fontWeight: '700',
      fontSize: 16,
    },
  });
}
