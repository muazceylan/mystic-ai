import { useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const DEFAULT_CLOSE_DISTANCE = 72;
const DEFAULT_CLOSE_VELOCITY = 650;
const DEFAULT_ACTIVATION_DISTANCE = 4;
const DEFAULT_VERTICAL_DOMINANCE = 1.15;
const UPWARD_ACTIVATION_GUARD = -100000;

interface UseBottomSheetDragGestureOptions {
  enabled?: boolean;
  onClose: () => void;
  closeDistance?: number;
  closeVelocity?: number;
  activationDistance?: number;
  verticalDominance?: number;
}

export function useBottomSheetDragGesture({
  enabled = true,
  onClose,
  closeDistance = DEFAULT_CLOSE_DISTANCE,
  closeVelocity = DEFAULT_CLOSE_VELOCITY,
  activationDistance = DEFAULT_ACTIVATION_DISTANCE,
  verticalDominance = DEFAULT_VERTICAL_DOMINANCE,
}: UseBottomSheetDragGestureOptions) {
  const dragOffset = useSharedValue(0);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .minDistance(activationDistance)
        .activeOffsetY([UPWARD_ACTIVATION_GUARD, activationDistance])
        .cancelsTouchesInView(false)
        .onUpdate((event) => {
          if (event.translationY <= 0) {
            dragOffset.value = 0;
            return;
          }

          const absDx = Math.abs(event.translationX);
          const absDy = Math.abs(event.translationY);
          if (absDy < absDx * verticalDominance) {
            return;
          }

          dragOffset.value = event.translationY;
        })
        .onEnd((event) => {
          const translationY = Math.max(0, event.translationY, dragOffset.value);
          const shouldClose = translationY >= closeDistance || event.velocityY >= closeVelocity;

          if (shouldClose) {
            dragOffset.value = 0;
            runOnJS(onClose)();
            return;
          }

          dragOffset.value = withTiming(0, {
            duration: 180,
            easing: Easing.out(Easing.cubic),
          });
        })
        .onFinalize(() => {
          if (dragOffset.value > 0) {
            dragOffset.value = withTiming(0, {
              duration: 180,
              easing: Easing.out(Easing.cubic),
            });
          }
        }),
    [activationDistance, closeDistance, closeVelocity, dragOffset, enabled, onClose, verticalDominance],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dragOffset.value }],
  }));

  return {
    dragOffset,
    gesture,
    animatedStyle,
  };
}
