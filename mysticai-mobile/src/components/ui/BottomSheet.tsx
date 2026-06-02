import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants/tokens';
import { useBottomSheetDragGesture } from './useBottomSheetDragGesture';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  sheetStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  dragHandleStyle?: StyleProp<ViewStyle>;
  blurBackdrop?: boolean;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  sheetStyle: sheetStyleOverride,
  contentStyle,
  titleStyle,
  dragHandleStyle,
  blurBackdrop = false,
}: BottomSheetProps) {
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const maxSheetHeight = Math.min(height * 0.85, height - insets.top - SPACING.xl);
  const s = createStyles(colors, maxSheetHeight, Math.max(insets.bottom, SPACING.lg));

  const translateY = useSharedValue(height);
  const backdropOpacity = useSharedValue(0);

  // Use ref so height changes don't retrigger the visibility animation effect
  const heightRef = useRef(height);
  useEffect(() => {
    heightRef.current = height;
  }, [height]);

  const handleClose = useCallback(() => {
    translateY.value = withTiming(heightRef.current, { duration: 250, easing: Easing.in(Easing.cubic) }, () => {
      runOnJS(onClose)();
    });
    backdropOpacity.value = withTiming(0, { duration: 200 });
  }, [backdropOpacity, onClose, translateY]);

  const { dragOffset, gesture } = useBottomSheetDragGesture({
    enabled: visible,
    onClose: handleClose,
  });

  useEffect(() => {
    if (visible) {
      // Always snap to off-screen first so re-opens start from a clean state
      translateY.value = heightRef.current;
      backdropOpacity.value = 0;
      translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
      backdropOpacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withTiming(heightRef.current, { duration: 250, easing: Easing.in(Easing.cubic) });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + dragOffset.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
      accessibilityViewIsModal
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.wrapper}
      >
        <Animated.View style={[s.backdrop, backdropStyle]}>
          {blurBackdrop ? (
            <BlurView
              intensity={28}
              tint="dark"
              style={StyleSheet.absoluteFill}
              experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
            />
          ) : null}
          <View style={s.backdropDim} pointerEvents="none" />
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <GestureDetector gesture={gesture}>
          <Animated.View style={[s.sheet, sheetStyle, sheetStyleOverride]}>
            <View style={s.dragZone}>
              <View style={[s.dragHandle, dragHandleStyle]} />
              {title ? <Text style={[s.title, titleStyle]}>{title}</Text> : null}
            </View>
            <View style={[s.content, contentStyle]}>{children}</View>
          </Animated.View>
        </GestureDetector>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(C: ThemeColors, maxSheetHeight: number, bottomPadding: number) {
  return StyleSheet.create({
    wrapper: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    backdropDim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
      backgroundColor: C.card,
      borderTopLeftRadius: RADIUS.xl,
      borderTopRightRadius: RADIUS.xl,
      maxHeight: maxSheetHeight,
      paddingBottom: bottomPadding,
    },
    dragZone: {
      paddingTop: SPACING.sm,
    },
    dragHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.border,
      alignSelf: 'center',
      marginBottom: SPACING.md,
    },
    title: {
      ...TYPOGRAPHY.H3,
      color: C.text,
      paddingHorizontal: SPACING.lg,
      marginBottom: SPACING.md,
    },
    content: {
      paddingHorizontal: SPACING.lg,
    },
  });
}
