import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { usePrayerFlowStore } from '../store/usePrayerFlowStore';
import { useContentStore } from '../store/useContentStore';
import { useJournalStore } from '../store/useJournalStore';
import { ProgressRing } from '../components/ProgressRing';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { BottomSheet, Button, HeaderRightIcons } from '../../components/ui';
import { MoodSelector } from '../components/MoodSelector';
import { TYPOGRAPHY, SPACING, RADIUS, ACCESSIBILITY } from '../../constants/tokens';
import type { Mood, DuaItem } from '../types';

/* ─── Helpers ─── */
const RING_SIZE = 200;
const RING_STROKE = 8;

export default function PrayerFlowScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const S = makeStyles(colors, isDark);

  const pureDuaList = useContentStore((st) => st.pureDuaList);
  const flow = usePrayerFlowStore();
  const addEntry = useJournalStore((st) => st.addEntry);

  const [flowSheetOpen, setFlowSheetOpen] = useState(false);
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);
  const [textMode, setTextMode] = useState<'arabic' | 'trans' | 'meaning'>('arabic');

  /* pulse animation on tap */
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const triggerPulse = useCallback(() => {
    pulseAnim.setValue(0.92);
    Animated.spring(pulseAnim, {
      toValue: 1,
      friction: 4,
      tension: 160,
      useNativeDriver: true,
    }).start();
  }, [pulseAnim]);

  const items = pureDuaList;
  const current: DuaItem | undefined = items[flow.currentIndex];

  useEffect(() => {
    if (!flow.date) {
      flow.startSet({ setId: null, date: new Date().toISOString().slice(0, 10) });
    }
  }, []);

  const currentCount = useMemo(
    () => (current ? (flow.countsByPrayerId[current.id] ?? 0) : 0),
    [current, flow.countsByPrayerId],
  );
  const targetCount = current?.defaultTargetCount ?? 33;
  const done = currentCount >= targetCount;
  const progress = targetCount > 0 ? Math.min(1, currentCount / targetCount) : 0;

  const handleTap = useCallback(() => {
    if (!current || done) return;
    flow.increment(current.id, 1);
    triggerPulse();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [current, done, flow, triggerPulse]);

  const handleQuickAdd = useCallback(
    (n: number) => {
      if (!current) return;
      flow.increment(current.id, n);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    [current, flow],
  );

  const handleNext = useCallback(() => {
    if (!current) return;
    const count = flow.countsByPrayerId[current.id] ?? 0;
    if (count > 0) {
      addEntry({
        dateISO: new Date().toISOString().slice(0, 10),
        itemType: 'dua',
        itemId: current.id,
        itemName: current.title,
        target: targetCount,
        completed: count,
        durationSec: 0,
        note: flow.note ?? undefined,
      });
    }
    flow.setNote(undefined);
    flow.setMood(undefined);
    if (flow.currentIndex < items.length - 1) {
      flow.next(items.length);
    } else {
      flow.next(items.length + 1);
    }
  }, [current, flow, items.length, addEntry, targetCount]);

  const jumpTo = useCallback(
    (index: number) => {
      /* save current before jumping */
      if (current) {
        const count = flow.countsByPrayerId[current.id] ?? 0;
        if (count > 0) {
          addEntry({
            dateISO: new Date().toISOString().slice(0, 10),
            itemType: 'dua',
            itemId: current.id,
            itemName: current.title,
            target: targetCount,
            completed: count,
            durationSec: 0,
            note: flow.note ?? undefined,
          });
        }
      }
      flow.startSet({ setId: null, date: flow.date ?? new Date().toISOString().slice(0, 10) });
      /* step to target index */
      for (let i = 0; i < index; i++) flow.next(items.length);
      setFlowSheetOpen(false);
    },
    [current, flow, items.length, addEntry, targetCount],
  );

  /* ─── Empty ─── */
  if (items.length === 0) {
    return (
      <View style={S.emptyScreen}>
        <Ionicons name="book-outline" size={48} color={colors.muted} />
        <Text style={S.emptyText}>Dua bulunamadı.</Text>
      </View>
    );
  }

  /* ─── Completed ─── */
  if (!current) {
    return (
      <View style={S.emptyScreen}>
        <LinearGradient
          colors={isDark
            ? ['rgba(74,222,128,0.18)', 'rgba(74,222,128,0.02)']
            : ['rgba(22,163,74,0.12)', 'rgba(22,163,74,0.01)']}
          style={S.completedGlow}
        />
        <View style={S.completedIcon}>
          <Ionicons name="checkmark-circle" size={56} color={isDark ? '#4ADE80' : '#16A34A'} />
        </View>
        <Text style={S.completedTitle}>Set Tamamlandı</Text>
        <Text style={S.completedSub}>Tüm dualar tamamlandı. Günlüğünüzü kontrol edebilirsiniz.</Text>
        <Pressable
          style={({ pressed }) => [S.completedBtn, pressed && { opacity: 0.8 }]}
          onPress={() => { flow.reset(); router.back(); }}
        >
          <Text style={S.completedBtnText}>Geri Dön</Text>
        </Pressable>
      </View>
    );
  }

  /* ─── Accent colors ─── */
  const accent = isDark ? '#818CF8' : '#6366F1';
  const accentSoft = isDark ? 'rgba(129,140,248,0.14)' : 'rgba(99,102,241,0.08)';
  const doneColor = isDark ? '#4ADE80' : '#16A34A';
  const ringColor = done ? doneColor : accent;
  const ringTrack = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(0,0,0,0.06)';

  /* ─── Text content ─── */
  const displayText =
    textMode === 'arabic'
      ? current.arabic
      : textMode === 'trans'
        ? current.transliteration
        : current.meaningTr;

  const textAlign = textMode === 'arabic' ? 'right' : 'left';
  const textSize = textMode === 'arabic' ? 26 : 16;
  const textLH = textMode === 'arabic' ? 44 : 26;

  return (
    <View style={[S.screen, { backgroundColor: colors.bg }]}>
      {/* ─── Top bar ─── */}
      <View style={S.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={S.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={S.topCenter}>
          <Text style={S.topTitle} numberOfLines={1}>{current.title}</Text>
          <Text style={S.topSub}>{flow.currentIndex + 1} / {items.length}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Pressable onPress={() => setFlowSheetOpen(true)} hitSlop={12} style={S.flowBtn}>
            <Ionicons name="list" size={20} color={colors.text} />
          </Pressable>
          <HeaderRightIcons />
        </View>
      </View>

      {/* ─── Dua text area (scrollable) ─── */}
      <View style={S.textSection}>
        {/* text mode tabs */}
        <View style={S.textTabs}>
          {([
            { key: 'arabic' as const, label: 'Arapça' },
            { key: 'trans' as const, label: 'Okunuş' },
            { key: 'meaning' as const, label: 'Meal' },
          ]).map((t) => (
            <Pressable
              key={t.key}
              onPress={() => setTextMode(t.key)}
              style={[
                S.textTab,
                textMode === t.key && { backgroundColor: accentSoft, borderColor: accent + '44' },
              ]}
            >
              <Text style={[
                S.textTabLabel,
                { color: textMode === t.key ? accent : colors.subtext },
              ]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView
          style={S.textScroll}
          contentContainerStyle={S.textScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={[
              S.duaText,
              {
                color: colors.text,
                textAlign: textAlign as any,
                fontSize: textSize,
                lineHeight: textLH,
              },
            ]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {displayText || 'Metin bulunamadı.'}
          </Text>
        </ScrollView>
      </View>

      {/* ─── Counter ring + tap ─── */}
      <View style={S.counterSection}>
        <Pressable onPress={handleTap} disabled={done}>
          <Animated.View style={[S.ringWrap, { transform: [{ scale: pulseAnim }] }]}>
            <ProgressRing
              size={RING_SIZE}
              strokeWidth={RING_STROKE}
              progress={progress}
              color={ringColor}
              trackColor={ringTrack}
            />
            <View style={S.ringInner}>
              <Text style={[S.countText, { color: done ? doneColor : colors.text }]}>
                {currentCount}
              </Text>
              <View style={S.countDivider}>
                <View style={[S.countDividerLine, { backgroundColor: colors.border }]} />
                <Text style={[S.countTarget, { color: colors.subtext }]}>{targetCount}</Text>
                <View style={[S.countDividerLine, { backgroundColor: colors.border }]} />
              </View>
              <Text style={[S.countHint, { color: done ? doneColor : colors.muted }]}>
                {done ? 'Tamam' : 'Dokun'}
              </Text>
            </View>
          </Animated.View>
        </Pressable>

        {/* quick add row */}
        <View style={S.quickRow}>
          {[1, 5, 10, 33].map((n) => (
            <Pressable
              key={n}
              style={({ pressed }) => [
                S.quickChip,
                { borderColor: accent + '33' },
                pressed && { backgroundColor: accentSoft },
              ]}
              onPress={() => handleQuickAdd(n)}
            >
              <Text style={[S.quickChipText, { color: accent }]}>+{n}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ─── Bottom action bar ─── */}
      <View style={[S.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <Pressable
          style={[S.actionBtn, { backgroundColor: accentSoft, borderColor: accent + '22' }]}
          onPress={() => setNoteSheetOpen(true)}
        >
          <Ionicons name="create-outline" size={18} color={accent} />
          <Text style={[S.actionBtnText, { color: accent }]}>Not</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            S.nextBtn,
            {
              backgroundColor: done ? ringColor : colors.border,
              opacity: done ? (pressed ? 0.85 : 1) : 0.5,
            },
          ]}
          onPress={handleNext}
          disabled={!done}
        >
          <Text style={S.nextBtnText}>
            {flow.currentIndex < items.length - 1 ? 'Sonraki' : 'Tamamla'}
          </Text>
          <Ionicons
            name={flow.currentIndex < items.length - 1 ? 'arrow-forward' : 'checkmark'}
            size={18}
            color="#FFF"
          />
        </Pressable>
      </View>

      {/* ─── Flow list sheet ─── */}
      <BottomSheet
        visible={flowSheetOpen}
        onClose={() => setFlowSheetOpen(false)}
        title="Dua Akışı"
      >
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          style={{ maxHeight: 360 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const count = flow.countsByPrayerId[item.id] ?? 0;
            const target = item.defaultTargetCount || 33;
            const itemDone = count >= target;
            const isCurrent = index === flow.currentIndex;
            return (
              <Pressable
                style={[
                  S.flowItem,
                  { borderColor: isCurrent ? accent + '44' : colors.border },
                  isCurrent && { backgroundColor: accentSoft },
                ]}
                onPress={() => jumpTo(index)}
              >
                <View style={[
                  S.flowIndex,
                  {
                    backgroundColor: itemDone
                      ? (isDark ? 'rgba(74,222,128,0.15)' : 'rgba(22,163,74,0.10)')
                      : isCurrent
                        ? accentSoft
                        : colors.surfaceAlt,
                  },
                ]}>
                  {itemDone ? (
                    <Ionicons name="checkmark" size={14} color={doneColor} />
                  ) : (
                    <Text style={[S.flowIndexText, { color: isCurrent ? accent : colors.subtext }]}>
                      {index + 1}
                    </Text>
                  )}
                </View>
                <View style={S.flowBody}>
                  <Text
                    style={[S.flowTitle, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text style={[S.flowMeta, { color: colors.subtext }]}>
                    {count > 0 ? `${count}/${target}` : `${target} tekrar`}
                  </Text>
                </View>
                {isCurrent && (
                  <View style={[S.flowActiveDot, { backgroundColor: accent }]} />
                )}
              </Pressable>
            );
          }}
        />
      </BottomSheet>

      {/* ─── Note sheet ─── */}
      <BottomSheet
        visible={noteSheetOpen}
        onClose={() => setNoteSheetOpen(false)}
        title="Not & Ruh Hali"
      >
        <MoodSelector
          selected={flow.mood}
          onSelect={(m: Mood | undefined) => flow.setMood(m)}
        />
        <TextInput
          style={[S.noteInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
          value={flow.note ?? ''}
          onChangeText={(t) => flow.setNote(t)}
          placeholder="Kısa not (opsiyonel)"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={200}
        />
        <Button
          title="Kaydet"
          variant="outline"
          onPress={() => setNoteSheetOpen(false)}
          style={{ marginTop: SPACING.md }}
        />
      </BottomSheet>
    </View>
  );
}

/* ─── Styles ─── */
function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },

    /* ── Empty / Completed ── */
    emptyScreen: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.xxl,
      backgroundColor: C.bg,
      gap: SPACING.md,
    },
    emptyText: {
      ...TYPOGRAPHY.Body,
      color: C.subtext,
    },
    completedGlow: {
      position: 'absolute',
      width: 260,
      height: 260,
      borderRadius: 130,
    },
    completedIcon: {
      marginBottom: SPACING.sm,
    },
    completedTitle: {
      ...TYPOGRAPHY.H2,
      color: C.text,
    },
    completedSub: {
      ...TYPOGRAPHY.Body,
      color: C.subtext,
      textAlign: 'center',
      maxWidth: 280,
    },
    completedBtn: {
      marginTop: SPACING.lg,
      paddingHorizontal: SPACING.xxl,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
    },
    completedBtnText: {
      ...TYPOGRAPHY.SmallBold,
      color: C.text,
    },

    /* ── Top bar ── */
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingTop: 56,
      paddingBottom: SPACING.md,
      gap: SPACING.md,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    },
    topCenter: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    topTitle: {
      ...TYPOGRAPHY.SmallBold,
      color: C.text,
      letterSpacing: 0.2,
    },
    topSub: {
      ...TYPOGRAPHY.CaptionXS,
      color: C.subtext,
      letterSpacing: 0.5,
    },
    flowBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    },

    /* ── Text section ── */
    textSection: {
      paddingHorizontal: SPACING.lgXl,
      gap: SPACING.sm,
    },
    textTabs: {
      flexDirection: 'row',
      gap: SPACING.sm,
    },
    textTab: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xsSm,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    textTabLabel: {
      ...TYPOGRAPHY.CaptionBold,
    },
    textScroll: {
      maxHeight: 140,
    },
    textScrollContent: {
      paddingBottom: SPACING.sm,
    },
    duaText: {
      fontWeight: '500',
    },

    /* ── Counter section ── */
    counterSection: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.lgXl,
    },
    ringWrap: {
      width: RING_SIZE,
      height: RING_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringInner: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    countText: {
      fontSize: 52,
      fontWeight: '900',
      lineHeight: 56,
      letterSpacing: -2,
    },
    countDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    countDividerLine: {
      width: 18,
      height: 1,
    },
    countTarget: {
      ...TYPOGRAPHY.CaptionBold,
    },
    countHint: {
      ...TYPOGRAPHY.CaptionXS,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },

    /* quick add */
    quickRow: {
      flexDirection: 'row',
      gap: SPACING.smMd,
    },
    quickChip: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.full,
      borderWidth: 1,
    },
    quickChipText: {
      ...TYPOGRAPHY.SmallBold,
    },

    /* ── Bottom bar ── */
    bottomBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.smMd,
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.md,
      paddingBottom: 36,
      borderTopWidth: 1,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: SPACING.mdLg,
      paddingVertical: SPACING.smMd,
      borderRadius: RADIUS.full,
      borderWidth: 1,
    },
    actionBtnText: {
      ...TYPOGRAPHY.SmallBold,
    },
    nextBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.full,
    },
    nextBtnText: {
      ...TYPOGRAPHY.BodyBold,
      color: '#FFF',
    },

    /* ── Flow sheet ── */
    flowItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      paddingVertical: SPACING.smMd,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      marginBottom: SPACING.sm,
    },
    flowIndex: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    flowIndexText: {
      ...TYPOGRAPHY.CaptionBold,
    },
    flowBody: {
      flex: 1,
      gap: 2,
    },
    flowTitle: {
      ...TYPOGRAPHY.SmallBold,
    },
    flowMeta: {
      ...TYPOGRAPHY.CaptionXS,
    },
    flowActiveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },

    /* ── Note sheet ── */
    noteInput: {
      borderWidth: 1,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      minHeight: 80,
      textAlignVertical: 'top',
      marginTop: SPACING.md,
      ...TYPOGRAPHY.Body,
    },
  });
}
