import React, { useCallback, useEffect, useRef } from 'react';
import {
  type LayoutChangeEvent,
  type StyleProp,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { useTutorial } from '../hooks/useTutorial';

interface SpotlightTargetProps {
  targetKey: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export function SpotlightTarget({ targetKey, children, style, disabled = false }: SpotlightTargetProps) {
  const { registerTargetLayout, unregisterTarget, isVisible } = useTutorial();
  const viewRef = useRef<View>(null);
  const dimensions = useWindowDimensions();

  const measureTarget = useCallback(() => {
    if (disabled) {
      return;
    }

    const node = viewRef.current;
    if (!node) {
      return;
    }

    node.measureInWindow((x, y, width, height) => {
      if (!Number.isFinite(x) || !Number.isFinite(y) || width <= 0 || height <= 0) {
        return;
      }

      registerTargetLayout(targetKey, {
        x,
        y,
        width,
        height,
      });
    });
  }, [disabled, registerTargetLayout, targetKey]);

  const handleLayout = useCallback(
    (_event: LayoutChangeEvent) => {
      requestAnimationFrame(measureTarget);
    },
    [measureTarget],
  );

  useEffect(() => {
    if (disabled) {
      unregisterTarget(targetKey);
      return;
    }

    const timeoutId = setTimeout(measureTarget, 40);
    return () => clearTimeout(timeoutId);
  }, [disabled, measureTarget, targetKey, unregisterTarget]);

  useEffect(() => {
    if (disabled) {
      return;
    }
    measureTarget();
  }, [disabled, dimensions.height, dimensions.width, measureTarget]);

  useEffect(() => {
    if (disabled || !isVisible) {
      return;
    }

    const intervalId = setInterval(measureTarget, 160);
    return () => clearInterval(intervalId);
  }, [disabled, isVisible, measureTarget]);

  useEffect(() => {
    return () => unregisterTarget(targetKey);
  }, [targetKey, unregisterTarget]);

  return (
    <View ref={viewRef} collapsable={false} onLayout={handleLayout} style={style}>
      {children}
    </View>
  );
}
