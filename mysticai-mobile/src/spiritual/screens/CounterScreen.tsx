/**
 * CounterScreen — Content-Focused Zikirmatik
 * Full Arabic text centered, small counter badge top-left, thin progress bar
 * Supports custom set flow (setItems + setIndex params)
 */
import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../../utils/haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeScreen, HeaderRightIcons } from '../../components/ui';
import { useCounterStore, selectProgress } from '../store/useCounterStore';
import { useContentStore } from '../store/useContentStore';
import { useJournalStore } from '../store/useJournalStore';
import { useSpiritualSettingsStore } from '../store/useSpiritualSettingsStore';
import { CounterFinishModal } from '../components/CounterFinishModal';
import type { CustomSetItem } from '../types';

export default function CounterScreen() {
  const params = useLocalSearchParams<{
    itemType: 'esma' | 'dua';
    itemId: string;
    itemName: string;
    target: string;
    transliteration?: string;
    setItems?: string;
    setIndex?: string;
  }>();

  const store = useCounterStore();
  const journal = useJournalStore();
  const settings = useSpiritualSettingsStore();
  const contentStore = useContentStore();

  const [showFinish, setShowFinish] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Parse set flow params
  const setItems: CustomSetItem[] | null = useMemo(() => {
    if (!params.setItems) return null;
    try { return JSON.parse(params.setItems); } catch { return null; }
  }, [params.setItems]);
  const setIndex = params.setIndex ? parseInt(params.setIndex, 10) : 0;

  // Reanimated tap feedback
  const tapScale = useSharedValue(1);
  const tapOpacity = useSharedValue(1);

  const tapAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tapScale.value }],
    opacity: tapOpacity.value,
  }));

  // Get full Arabic text + transliteration from content store
  const { fullArabic, fullTranslit } = useMemo(() => {
    const id = parseInt(params.itemId ?? '0', 10);
    if (params.itemType === 'esma') {
      const esma = contentStore.getEsmaById(id);
      return { fullArabic: esma?.nameAr ?? '', fullTranslit: esma?.transliteration ?? '' };
    } else {
      const dua = contentStore.getDuaById(id);
      if (!dua?.arabic) return { fullArabic: '', fullTranslit: '' };
      const cleaned = dua.arabic.replace(/^بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\s*۝?\s*/, '');
      return { fullArabic: cleaned, fullTranslit: dua.transliteration ?? '' };
    }
  }, [params.itemType, params.itemId, contentStore]);

  useEffect(() => {
    setShowFinish(false);
    store.start({
      itemType: params.itemType ?? 'esma',
      itemId: parseInt(params.itemId ?? '0', 10),
      itemName: decodeURIComponent(params.itemName ?? ''),
      target: parseInt(params.target ?? '33', 10),
      hapticEnabled: settings.hapticEnabled,
    });
  }, [params.itemType, params.itemId, params.itemName, params.target]);

  // Elapsed timer
  useEffect(() => {
    if (store.status === 'running') {
      intervalRef.current = setInterval(() => {
        store.addElapsed(1000);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [store.status]);

  // Show finish modal when done — read fresh status from store to avoid
  // stale closure after router.replace reuses the component
  useEffect(() => {
    const currentStatus = useCounterStore.getState().status;
    if (currentStatus === 'finished' && !showFinish) {
      setShowFinish(true);
    }
  }, [store.status]);

  const handleTap = useCallback(() => {
    if (store.status !== 'running') return;
    store.tap();

    tapScale.value = withSequence(
      withTiming(0.96, { duration: 80, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) }),
    );
    tapOpacity.value = withSequence(
      withTiming(0.8, { duration: 80 }),
      withTiming(1, { duration: 120 }),
    );

    if (settings.hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [store.status, settings.hapticEnabled]);

  const navigateToNextSetItem = useCallback(() => {
    if (!setItems || setIndex + 1 >= setItems.length) return false;
    const nextItem = setItems[setIndex + 1];
    const nextItemType = nextItem.itemType === 'sure' ? 'dua' : nextItem.itemType;

    let itemName = '';
    let target = '33';
    if (nextItem.itemType === 'esma') {
      const esma = contentStore.getEsmaById(nextItem.itemId);
      itemName = esma?.nameTr ?? '';
      target = String(esma?.defaultTargetCount ?? 33);
    } else {
      const dua = contentStore.getDuaById(nextItem.itemId);
      itemName = dua?.title ?? '';
      target = String(dua?.defaultTargetCount ?? 3);
    }

    router.replace({
      pathname: '/spiritual/counter',
      params: {
        itemType: nextItemType as 'esma' | 'dua',
        itemId: String(nextItem.itemId),
        itemName: encodeURIComponent(itemName),
        target,
        setItems: params.setItems ?? '',
        setIndex: String(setIndex + 1),
      },
    });
    return true;
  }, [setItems, setIndex, contentStore, params.setItems]);

  const handleSave = useCallback(
    ({ note }: { note?: string }) => {
      const durationSec = Math.floor(store.elapsedMs / 1000);
      const dateISO = new Date().toISOString().slice(0, 10);
      journal.addEntry({
        dateISO,
        itemType: store.itemType!,
        itemId: store.itemId!,
        itemName: store.itemName,
        target: store.target,
        completed: store.completed,
        durationSec,
        note,
      });
      setShowFinish(false);

      // Delay navigation to avoid iOS modal dismiss + navigation clash
      setTimeout(() => {
        if (!navigateToNextSetItem()) {
          router.back();
        }
      }, 400);
    },
    [store, journal, navigateToNextSetItem],
  );

  const handleEarlySave = useCallback(() => {
    if (store.completed === 0) return;
    const durationSec = Math.floor(store.elapsedMs / 1000);
    const dateISO = new Date().toISOString().slice(0, 10);
    journal.addEntry({
      dateISO,
      itemType: store.itemType!,
      itemId: store.itemId!,
      itemName: store.itemName,
      target: store.target,
      completed: store.completed,
      durationSec,
    });
    setTimeout(() => router.back(), 400);
  }, [store, journal]);

  const progress = selectProgress(store);
  const transliteration = decodeURIComponent(params.transliteration ?? '') || fullTranslit;

  // --- LIGHT THEME PALETTE ---
  const isEsma = store.itemType === 'esma';
  const GRAD: [string, string] = isEsma
    ? ['#FFFBEB', '#FEF3C7']
    : ['#F5F3FF', '#EEF2FF'];
  const ACCENT = isEsma ? '#B45309' : '#6366F1';
  const ACCENT_LIGHT = isEsma ? '#FEF3C7' : '#C7D2FE';
  const TEXT = '#1E293B';
  const SUBTEXT = '#64748B';
  const SURFACE_BG = isEsma ? 'rgba(254,243,199,0.95)' : 'rgba(245,243,255,0.95)';

  // Set flow indicator
  const setFlowLabel = setItems
    ? `${setIndex + 1} / ${setItems.length}`
    : null;

  return (
    <SafeScreen style={{ backgroundColor: GRAD[0] }}>
      <LinearGradient colors={GRAD} style={styles.container}>
        <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={TEXT} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: TEXT }]} numberOfLines={1}>
            {store.itemName}
          </Text>
          {setFlowLabel && (
            <Text style={[styles.setFlowLabel, { color: ACCENT }]}>{setFlowLabel}</Text>
          )}
        </View>
        <HeaderRightIcons tintColor={TEXT} />
      </View>

      {/* Counter badge (top-left overlay) */}
      <View style={[styles.counterBadge, { backgroundColor: ACCENT + '12' }]}>
        <Text style={[styles.counterBadgeNum, { color: TEXT }]}>{store.remaining}</Text>
        <Text style={[styles.counterBadgeMeta, { color: ACCENT }]}>
          {store.completed}/{store.target}
        </Text>
      </View>

      {/* Center: Full content area (tappable) */}
      <Pressable
        style={styles.contentArea}
        onPress={handleTap}
        disabled={store.status !== 'running'}
        accessibilityLabel="Sayacı azalt"
        accessibilityHint="Ekrana dokunarak zikir sayısını azaltın"
      >
        <Animated.View style={[styles.contentInner, tapAnimStyle]}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={fullArabic.length > 200}
          >
            {fullArabic.length > 0 && (
              <Text style={[styles.fullArabicText, { color: TEXT }]}>
                {fullArabic}
              </Text>
            )}
            {transliteration.length > 0 && (
              <Text style={[styles.fullTransliteration, { color: ACCENT }]}>
                {transliteration}
              </Text>
            )}
          </ScrollView>

          {/* Status hint */}
          <Text style={[styles.statusLabel, { color: SUBTEXT }]}>
            {store.status === 'paused'
              ? 'Duraklatıldı'
              : store.remaining === 0
              ? 'Tamamlandı'
              : 'Ekrana dokun'}
          </Text>
        </Animated.View>
      </Pressable>

      {/* Thin progress bar */}
      <View style={[styles.progressBarTrack, { backgroundColor: ACCENT + '18' }]}>
        <View
          style={[
            styles.progressBarFill,
            {
              backgroundColor: ACCENT,
              width: `${Math.min(progress * 100, 100)}%`,
            },
          ]}
        />
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomSection}>
        {/* Toolbar row */}
        <View style={[styles.toolbar, { backgroundColor: SURFACE_BG, borderColor: ACCENT_LIGHT }]}>
          <ToolbarBtn
            icon="remove-outline"
            label="-1"
            color={ACCENT}
            onPress={handleTap}
            disabled={store.status !== 'running' || store.remaining <= 0}
          />
          <ToolbarBtn
            icon="add-outline"
            label="+1"
            color={SUBTEXT}
            onPress={() => store.increment()}
            disabled={store.status !== 'running' || store.completed <= 0}
          />
          <ToolbarBtn
            icon="arrow-undo-outline"
            label="Geri Al"
            color={SUBTEXT}
            disabled={store.history.length === 0}
            onPress={() => store.undo()}
          />
          <ToolbarBtn
            icon={store.status === 'paused' ? 'play-outline' : 'pause-outline'}
            label={store.status === 'paused' ? 'Devam' : 'Duraklat'}
            color={ACCENT}
            onPress={() => (store.status === 'paused' ? store.resume() : store.pause())}
          />
          <ToolbarBtn
            icon="refresh-outline"
            label="Sıfırla"
            color={SUBTEXT}
            onPress={() => store.reset()}
          />
        </View>

        {/* Primary save button */}
        {store.completed > 0 && (
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: ACCENT },
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleEarlySave}
            accessibilityRole="button"
            accessibilityLabel={`${store.completed} zikir kaydet ve çık`}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>
              Kaydet ({store.completed}/{store.target})
            </Text>
          </Pressable>
        )}
      </View>

      <CounterFinishModal
        visible={showFinish}
        itemName={store.itemName}
        completed={store.completed}
        target={store.target}
        durationSec={Math.floor(store.elapsedMs / 1000)}
        onSave={handleSave}
        onDismiss={() => setShowFinish(false)}
        accentColor={ACCENT}
        textColor={TEXT}
        surfaceColor={SURFACE_BG}
        bgColor={GRAD[0]}
      />
      </LinearGradient>
    </SafeScreen>
  );
}

function ToolbarBtn({
  icon,
  label,
  color,
  disabled,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  color: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.toolbarItem, disabled && { opacity: 0.3 }]}
      hitSlop={8}
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.toolbarLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  headerBtn: { width: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  setFlowLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  counterBadge: {
    position: 'absolute',
    top: 100,
    left: 20,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    zIndex: 10,
  },
  counterBadgeNum: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
  },
  counterBadgeMeta: {
    fontSize: 11,
    fontWeight: '600',
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  contentInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  fullArabicText: {
    fontSize: 26,
    fontWeight: '500',
    lineHeight: 48,
    textAlign: 'center',
  },
  fullTransliteration: {
    fontSize: 15,
    fontStyle: 'italic',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
    letterSpacing: 0.3,
  },
  statusLabel: {
    textAlign: 'center',
    fontSize: 13,
    marginTop: 8,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  progressBarTrack: {
    height: 4,
    borderRadius: 2,
    marginHorizontal: 16,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
  },
  bottomSection: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 12,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderRadius: 22,
  },
  toolbarItem: { alignItems: 'center', gap: 5, paddingHorizontal: 10 },
  toolbarLabel: { fontSize: 10, fontWeight: '600' },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
