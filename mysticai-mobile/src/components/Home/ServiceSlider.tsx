import { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Animated,
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
  const { colors } = useTheme();
  const router = useRouter();
  const sliderRef = useRef<FlatList<SlideItem>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeSlide, setActiveSlide] = useState(0);
  const isPausedByUserRef = useRef(false);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleResume = useCallback(() => {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => {
      isPausedByUserRef.current = false;
      resumeTimeoutRef.current = null;
    }, IDLE_RESUME_MS);
  }, []);

  const pauseAutoScroll = useCallback(() => {
    isPausedByUserRef.current = true;
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isPausedByUserRef.current) return;
      setActiveSlide((prev) => {
        const next = (prev + 1) % slides.length;
        sliderRef.current?.scrollToOffset({
          offset: next * SLIDE_SNAP,
          animated: true,
        });
        return next;
      });
    }, AUTO_ADVANCE_MS);
    return () => {
      clearInterval(interval);
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
  }, [slides.length]);

  const handleScrollBeginDrag = useCallback(() => {
    pauseAutoScroll();
  }, [pauseAutoScroll]);

  const handleScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SLIDE_SNAP);
    setActiveSlide(index);
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

  const S = makeStyles(colors);

  return (
    <>
      <Animated.FlatList
        ref={sliderRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        snapToInterval={SLIDE_SNAP}
        snapToAlignment="start"
        decelerationRate="fast"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={S.sliderContainer}
        renderItem={({ item, index }) => {
          const inputRange = [
            (index - 1) * SLIDE_SNAP,
            index * SLIDE_SNAP,
            (index + 1) * SLIDE_SNAP,
          ];
          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.9, 1, 0.9],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.65, 1, 0.65],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              style={[S.sliderCardWrapper, { transform: [{ scale }], opacity }]}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handlePress(item.id)}
                style={S.sliderCard}
                accessibilityLabel={item.title}
                accessibilityRole="button"
              >
                <Text style={S.sliderEmoji}>{item.emoji}</Text>
                <Text style={S.sliderText}>{item.title}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        }}
      />

      <View style={S.sliderDots}>
        {slides.map((_, index) => (
          <View key={index} style={[S.dot, index === activeSlide && S.dotActive]} />
        ))}
      </View>
    </>
  );
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    sliderContainer: { paddingHorizontal: HORIZONTAL_PADDING, marginTop: SPACING.md },
    sliderCardWrapper: {
      width: SLIDE_WIDTH,
      marginRight: SLIDE_GAP,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sliderCard: {
      width: SLIDE_WIDTH,
      height: 50,
      backgroundColor: C.accent,
      borderRadius: SPACING.mdLg,
      borderWidth: 1,
      borderColor: C.accent,
      shadowColor: C.accent,
      shadowOpacity: 0.18,
      shadowOffset: { width: 0, height: SPACING.xsSm },
      shadowRadius: SPACING.smMd,
      elevation: 3,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
    },
    sliderEmoji: { ...TYPOGRAPHY.Body },
    sliderText: { ...TYPOGRAPHY.BodyBold, color: C.white },
    sliderDots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: SPACING.xsSm,
      marginTop: SPACING.smMd,
      marginBottom: SPACING.xs,
    },
    dot: { width: SPACING.xsSm, height: SPACING.xsSm, borderRadius: SPACING.xsSm / 2, backgroundColor: C.border },
    dotActive: { backgroundColor: C.primary, width: 14 },
  });
}
