import { useMemo, useState, useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSpiritualDaily } from '../hooks/useSpiritualDaily';
import { usePrayerFlowStore } from '../store/usePrayerFlowStore';
import { useContentStore } from '../store/useContentStore';
import { PrayerCounter } from '../components/PrayerCounter';
import { spiritualApi } from '../api/spiritual.api';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { AppHeader, BottomSheet, ProgressPill, Chip, Button } from '../../components/ui';
import { MoodSelector } from '../components/MoodSelector';
import { TYPOGRAPHY, SPACING, RADIUS, ACCESSIBILITY } from '../../constants/tokens';
import type { Mood } from '../types';

type TextTab = 'arabic' | 'transliteration' | 'meaning';

export default function PrayerFlowScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const s = createStyles(colors);
  const { prayers } = useSpiritualDaily();
  const flow = usePrayerFlowStore();
  const getDuaById = useContentStore((st) => st.getDuaById);

  const [textSheetOpen, setTextSheetOpen] = useState(false);
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);
  const [textTab, setTextTab] = useState<TextTab>('arabic');

  const items = prayers.data?.items ?? [];
  const current = items[flow.currentIndex];

  const currentCount = useMemo(
    () => (current ? (flow.countsByPrayerId[current.prayerId] ?? 0) : 0),
    [current, flow.countsByPrayerId],
  );

  const duaDetail = useMemo(
    () => (current ? getDuaById(current.prayerId) : undefined),
    [current, getDuaById],
  );

  const handleNext = useCallback(async () => {
    if (!current || !prayers.data) return;
    const count = flow.countsByPrayerId[current.prayerId] ?? 0;
    if (count > 0) {
      await spiritualApi.logPrayer({
        date: prayers.data.date,
        prayerId: current.prayerId,
        count,
        note: flow.note,
        mood: flow.mood,
      });
    }
    if (flow.currentIndex < items.length - 1) {
      flow.next(items.length);
    } else {
      flow.next(items.length + 1);
    }
  }, [current, prayers.data, flow, items.length]);

  if (prayers.isLoading) {
    return (
      <View style={s.center}>
        <Text style={{ color: colors.subtext }}>Yükleniyor...</Text>
      </View>
    );
  }
  if (prayers.isError || !prayers.data) {
    return (
      <View style={s.center}>
        <Text style={{ color: colors.error }}>Akış yüklenemedi.</Text>
      </View>
    );
  }
  if (items.length === 0) {
    return (
      <View style={s.center}>
        <Text style={{ color: colors.subtext }}>Bugün set yok.</Text>
      </View>
    );
  }

  if (!current) {
    return (
      <View style={s.center}>
        <Ionicons name="checkmark-circle" size={48} color={colors.success} />
        <Text style={s.doneTitle}>Set Tamamlandı</Text>
        <Text style={s.doneSub}>Bugünkü dualar tamamlandı. Günlüğü kontrol edebilirsiniz.</Text>
        <Button
          title="Geri Dön"
          variant="outline"
          onPress={() => router.back()}
          style={{ marginTop: SPACING.lg }}
        />
      </View>
    );
  }

  const done = currentCount >= current.recommendedRepeatCount;
  const progress = current.recommendedRepeatCount > 0
    ? Math.min(1, currentCount / current.recommendedRepeatCount)
    : 0;

  const textContent = duaDetail
    ? {
        arabic: duaDetail.arabic,
        transliteration: duaDetail.transliteration,
        meaning: duaDetail.meaningTr,
      }
    : null;

  return (
    <View style={[s.screen, { backgroundColor: colors.bg }]}>
      <AppHeader
        title={current.title}
        subtitle={current.category}
        onBack={() => router.back()}
        rightActions={
          <ProgressPill
            current={flow.currentIndex + 1}
            total={items.length}
            accentColor={colors.spiritualDua}
          />
        }
      />

      {/* Center: Large counter */}
      <View style={s.counterCenter}>
        <Text
          style={[s.bigCount, { color: done ? colors.success : colors.text }]}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          {currentCount}
        </Text>
        <Text style={[s.targetText, { color: colors.subtext }]}>
          / {current.recommendedRepeatCount}
        </Text>

        {/* Thin progress bar */}
        <View style={[s.progressTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              s.progressFill,
              {
                width: `${progress * 100}%`,
                backgroundColor: done ? colors.success : colors.spiritualDua,
              },
            ]}
          />
        </View>

        <Text style={[s.hint, { color: colors.muted }]}>
          {done ? 'Tamamlandı' : 'Ekrana dokun'}
        </Text>
      </View>

      {/* Tap area */}
      <Pressable
        style={s.tapArea}
        onPress={() => flow.increment(current.prayerId, 1)}
        disabled={done}
        accessibilityLabel="Sayacı artır"
      >
        <View style={s.tapAreaInner} />
      </Pressable>

      {/* Quick chips row */}
      <View style={s.chipsRow}>
        <Chip label="+1" size="sm" variant="primary" onPress={() => flow.increment(current.prayerId, 1)} />
        <Chip label="+5" size="sm" variant="primary" onPress={() => flow.increment(current.prayerId, 5)} />
        <Chip label="+10" size="sm" variant="primary" onPress={() => flow.increment(current.prayerId, 10)} />
        <Chip label="+33" size="sm" variant="primary" onPress={() => flow.increment(current.prayerId, 33)} />
      </View>

      {/* Bottom action bar */}
      <View style={[s.bottomBar, { borderTopColor: colors.border }]}>
        <Pressable
          style={s.iconBtn}
          onPress={() => setTextSheetOpen(true)}
          accessibilityLabel="Dua metnini görüntüle"
        >
          <Ionicons name="document-text-outline" size={22} color={colors.spiritualDua} />
        </Pressable>
        <Pressable
          style={s.iconBtn}
          onPress={() => setNoteSheetOpen(true)}
          accessibilityLabel="Not ekle"
        >
          <Ionicons name="create-outline" size={22} color={colors.subtext} />
        </Pressable>
        <View style={s.flex}>
          <Button
            title={flow.currentIndex < items.length - 1 ? 'Sonraki' : 'Tamamla'}
            onPress={handleNext}
            disabled={!done}
            size="md"
            accessibilityLabel={
              flow.currentIndex < items.length - 1 ? 'Sonraki duaya geç' : 'Seti tamamla'
            }
          />
        </View>
      </View>

      {/* Text BottomSheet */}
      <BottomSheet
        visible={textSheetOpen}
        onClose={() => setTextSheetOpen(false)}
        title="Dua Metni"
      >
        <View style={s.tabRow}>
          {(['arabic', 'transliteration', 'meaning'] as TextTab[]).map((tab) => (
            <Pressable
              key={tab}
              style={[
                s.tab,
                textTab === tab && { backgroundColor: colors.spiritualDua },
              ]}
              onPress={() => setTextTab(tab)}
            >
              <Text style={[
                s.tabText,
                { color: textTab === tab ? '#fff' : colors.subtext },
              ]}>
                {tab === 'arabic' ? 'Arapça' : tab === 'transliteration' ? 'Okunuş' : 'Meal'}
              </Text>
            </Pressable>
          ))}
        </View>
        <ScrollView style={s.textScroll} showsVerticalScrollIndicator={false}>
          <Text
            style={[
              s.prayerText,
              { color: colors.text },
              textTab === 'arabic' && s.arabicText,
            ]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {textContent
              ? textContent[textTab] ?? 'İçerik bulunamadı.'
              : 'Bu dua için metin bulunamadı.'}
          </Text>
        </ScrollView>
      </BottomSheet>

      {/* Note BottomSheet */}
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
          style={[s.noteInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
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

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.xl,
      backgroundColor: C.bg,
      gap: SPACING.sm,
    },
    doneTitle: {
      ...TYPOGRAPHY.H2,
      color: C.text,
      marginTop: SPACING.md,
    },
    doneSub: {
      ...TYPOGRAPHY.Body,
      color: C.subtext,
      textAlign: 'center',
    },
    counterCenter: {
      alignItems: 'center',
      paddingTop: SPACING.xl,
      gap: 4,
    },
    bigCount: {
      fontSize: 72,
      fontWeight: '900',
      lineHeight: 80,
    },
    targetText: {
      ...TYPOGRAPHY.H3,
    },
    progressTrack: {
      height: 4,
      width: '60%',
      borderRadius: RADIUS.full,
      marginTop: SPACING.md,
      overflow: 'hidden',
    },
    progressFill: {
      height: 4,
      borderRadius: RADIUS.full,
    },
    hint: {
      ...TYPOGRAPHY.Caption,
      marginTop: SPACING.sm,
    },
    tapArea: {
      flex: 1,
      marginHorizontal: SPACING.xl,
      marginVertical: SPACING.sm,
    },
    tapAreaInner: { flex: 1 },
    chipsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: SPACING.sm,
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.md,
    },
    bottomBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      paddingBottom: 34,
      borderTopWidth: 1,
    },
    iconBtn: {
      width: 44,
      height: 44,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
    },
    flex: { flex: 1 },
    tabRow: {
      flexDirection: 'row',
      borderRadius: RADIUS.md,
      backgroundColor: C.surface,
      padding: 3,
      marginBottom: SPACING.md,
    },
    tab: {
      flex: 1,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.sm,
      alignItems: 'center',
    },
    tabText: {
      ...TYPOGRAPHY.SmallBold,
    },
    textScroll: {
      maxHeight: 300,
      marginBottom: SPACING.md,
    },
    prayerText: {
      ...TYPOGRAPHY.Body,
      lineHeight: 26,
    },
    arabicText: {
      fontSize: 22,
      lineHeight: 38,
      textAlign: 'right',
    },
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
