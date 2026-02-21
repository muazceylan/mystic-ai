import { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING } from '../../constants/tokens';
import { HORIZONTAL_PADDING, SLIDE_WIDTH, SLIDE_GAP, SLIDE_SNAP } from './homeConstants';

const AUTO_ADVANCE_MS = 3200;
const IDLE_RESUME_MS = 4000;

interface SlideItem {
  id: string;
  key: string;
  emoji: string;
  title: string;
}

interface ServiceSliderProps {
  slides: SlideItem[];
  onScrollToSwot: () => void;
}

export function ServiceSlider({ slides, onScrollToSwot }: ServiceSliderProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const sliderRef = useRef<FlatList<SlideItem>>(null);
  const isPausedByUserRef = useRef(false);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIndexRef = useRef(0);

  const scheduleResume = useCallback(() => {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => {
      isPausedByUserRef.current = false;
    }, IDLE_RESUME_MS);
  }, []);

  const pauseAutoScroll = useCallback(() => {
    isPausedByUserRef.current = true;
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isPausedByUserRef.current) return;
      const next = (activeIndexRef.current + 1) % slides.length;
      activeIndexRef.current = next;
      sliderRef.current?.scrollToOffset({ offset: next * SLIDE_SNAP, animated: true });
    }, AUTO_ADVANCE_MS);
    return () => {
      clearInterval(interval);
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
  }, [slides.length]);

  const handleScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SLIDE_SNAP);
    activeIndexRef.current = index;
    scheduleResume();
  }, [scheduleResume]);

  const handlePress = useCallback((itemId: string) => {
    pauseAutoScroll();
    scheduleResume();
    if (itemId === 'planner') router.push('/(tabs)/calendar');
    else if (itemId === 'dream') router.push('/(tabs)/dreams');
    else if (itemId === 'natal') router.push('/(tabs)/natal-chart');
    else if (itemId === 'numerology') router.push('/numerology');
    else if (itemId === 'name') router.push('/name-analysis');
    else if (itemId === 'compatibility') router.push('/(tabs)/compatibility');
    else if (itemId === 'weekly') onScrollToSwot();
  }, [router, onScrollToSwot, pauseAutoScroll, scheduleResume]);

  const glassBg = isDark
    ? 'rgba(139, 92, 246, 0.08)'
    : 'rgba(139, 92, 246, 0.06)';
  const glassBorder = isDark
    ? 'rgba(139, 92, 246, 0.22)'
    : 'rgba(139, 92, 246, 0.18)';

  return (
    <FlatList
      ref={sliderRef}
      data={slides}
      keyExtractor={(item) => item.id}
      horizontal
      pagingEnabled={false}
      showsHorizontalScrollIndicator={false}
      snapToInterval={SLIDE_SNAP}
      snapToAlignment="start"
      decelerationRate="fast"
      onScrollBeginDrag={pauseAutoScroll}
      onMomentumScrollEnd={handleScrollEnd}
      contentContainerStyle={styles.container}
      renderItem={({ item }) => (
        <TouchableOpacity
          activeOpacity={0.68}
          onPress={() => handlePress(item.id)}
          style={[styles.chip, { backgroundColor: glassBg, borderColor: glassBorder }]}
          accessibilityLabel={item.title}
          accessibilityRole="button"
        >
          <Text style={styles.chipEmoji}>{item.emoji}</Text>
          <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingLeft: HORIZONTAL_PADDING,
    paddingRight: HORIZONTAL_PADDING,
    gap: SLIDE_GAP,
    marginTop: SPACING.smMd,
    marginBottom: SPACING.xs,
  },
  chip: {
    width: SLIDE_WIDTH,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xsSm,
    paddingHorizontal: SPACING.smMd,
  },
  chipEmoji: {
    fontSize: 15,
    lineHeight: 20,
  },
  chipText: {
    ...TYPOGRAPHY.CaptionSmall,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
