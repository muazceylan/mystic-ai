import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';
import { TUTORIAL_DEFAULTS, TUTORIAL_TARGET_RESOLUTION_POLICY } from '../domain/tutorial.constants';
import type { TutorialSession, TutorialTargetLayout } from '../domain/tutorial.types';
import { tutorialDebugLog } from '../services/tutorialDebug';
import { TutorialTooltipCard } from './TutorialTooltipCard';

interface TutorialOverlayProps {
  session: TutorialSession | null;
  targetLayouts: Record<string, TutorialTargetLayout>;
  dontShowAgain: boolean;
  onNext: () => void;
  onSkip: () => void;
  onReplay: () => void;
  onToggleDontShowAgain: (value: boolean) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function TutorialOverlay({
  session,
  targetLayouts,
  dontShowAgain,
  onNext,
  onSkip,
  onReplay,
  onToggleDontShowAgain,
}: TutorialOverlayProps) {
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    if (!session) {
      fade.setValue(0);
      scale.setValue(0.96);
      return;
    }

    fade.setValue(0);
    scale.setValue(0.96);

    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, scale, session?.definition.tutorialId, session?.stepIndex]);

  const currentStep = session ? session.definition.steps[session.stepIndex] : null;
  const isFullscreen = Boolean(
    session
      && currentStep
      && (currentStep.presentationType === 'fullscreen_carousel'
        || session.definition.presentationType === 'fullscreen_carousel'),
  );
  const targetConfig = currentStep && session
    ? session.definition.targets.find((target) => target.targetKey === currentStep.targetKey)
    : null;
  const targetLayout = currentStep ? targetLayouts[currentStep.targetKey] : null;
  const useSpotlight = Boolean(currentStep && !isFullscreen && targetConfig && targetLayout);

  useEffect(() => {
    if (!session || !currentStep || isFullscreen || useSpotlight) {
      return;
    }

    tutorialDebugLog('target_not_found_fallback_card', {
      tutorial_id: session.definition.tutorialId,
      step_id: currentStep.stepId,
      target_key: currentStep.targetKey,
      screen_key: session.definition.screenKey,
      policy: TUTORIAL_TARGET_RESOLUTION_POLICY.MISSING_TARGET_LAYOUT_BEHAVIOR,
    });
  }, [
    currentStep?.stepId,
    currentStep?.targetKey,
    isFullscreen,
    session?.definition.screenKey,
    session?.definition.tutorialId,
    useSpotlight,
  ]);

  if (!session || !currentStep) {
    return null;
  }

  const fallbackRect = {
    x: 20,
    y: insets.top + 120,
    width: viewportWidth - 40,
    height: 58,
  };

  const rawRect = targetLayout ?? fallbackRect;
  const padding = targetConfig?.padding ?? TUTORIAL_DEFAULTS.SPOTLIGHT_PADDING;

  const left = clamp(rawRect.x - padding, 8, viewportWidth - 54);
  const top = clamp(rawRect.y - padding, insets.top + 4, viewportHeight - insets.bottom - 54);
  const right = clamp(rawRect.x + rawRect.width + padding, left + 44, viewportWidth - 8);
  const bottom = clamp(rawRect.y + rawRect.height + padding, top + 44, viewportHeight - insets.bottom - 4);

  const spotlightRect = {
    x: left,
    y: top,
    width: Math.max(44, right - left),
    height: Math.max(44, bottom - top),
    radius: targetConfig?.cornerRadius ?? TUTORIAL_DEFAULTS.SPOTLIGHT_RADIUS,
  };

  const dimColor = isDark ? 'rgba(2,4,10,0.76)' : 'rgba(37,22,68,0.56)';

  const horizontalMargin = TUTORIAL_DEFAULTS.TOOLTIP_HORIZONTAL_MARGIN;
  const tooltipWidth = isFullscreen
    ? Math.min(390, viewportWidth - horizontalMargin * 2)
    : Math.min(TUTORIAL_DEFAULTS.TOOLTIP_WIDTH, viewportWidth - horizontalMargin * 2);
  const estimatedHeight = isFullscreen ? 332 : 286;

  const placeBelow =
    spotlightRect.y + spotlightRect.height + 16 + estimatedHeight <= viewportHeight - insets.bottom - 8;

  const spotlightTooltipTop = placeBelow
    ? spotlightRect.y + spotlightRect.height + 16
    : Math.max(insets.top + 8, spotlightRect.y - estimatedHeight - 12);

  const spotlightTooltipLeft = clamp(
    spotlightRect.x + spotlightRect.width / 2 - tooltipWidth / 2,
    horizontalMargin,
    viewportWidth - horizontalMargin - tooltipWidth,
  );

  const fallbackTop = clamp(
    viewportHeight * (isFullscreen ? 0.46 : 0.5) - estimatedHeight / 2,
    insets.top + 18,
    viewportHeight - insets.bottom - estimatedHeight - 18,
  );
  const fallbackLeft = clamp(
    viewportWidth / 2 - tooltipWidth / 2,
    horizontalMargin,
    viewportWidth - horizontalMargin - tooltipWidth,
  );

  const tooltipTop = useSpotlight ? spotlightTooltipTop : fallbackTop;
  const tooltipLeft = useSpotlight ? spotlightTooltipLeft : fallbackLeft;

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      onRequestClose={onSkip}
    >
      <View style={styles.root}>
        {useSpotlight ? (
          <>
            <View style={[styles.dim, { top: 0, left: 0, right: 0, height: spotlightRect.y, backgroundColor: dimColor }]} />
            <View
              style={[
                styles.dim,
                {
                  top: spotlightRect.y + spotlightRect.height,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: dimColor,
                },
              ]}
            />
            <View
              style={[
                styles.dim,
                {
                  top: spotlightRect.y,
                  left: 0,
                  width: spotlightRect.x,
                  height: spotlightRect.height,
                  backgroundColor: dimColor,
                },
              ]}
            />
            <View
              style={[
                styles.dim,
                {
                  top: spotlightRect.y,
                  left: spotlightRect.x + spotlightRect.width,
                  right: 0,
                  height: spotlightRect.height,
                  backgroundColor: dimColor,
                },
              ]}
            />
          </>
        ) : (
          <View style={[styles.dim, { top: 0, right: 0, bottom: 0, left: 0, backgroundColor: dimColor }]} />
        )}

        {useSpotlight ? (
          <View
            pointerEvents="none"
            style={[
              styles.spotlightRing,
              {
                top: spotlightRect.y,
                left: spotlightRect.x,
                width: spotlightRect.width,
                height: spotlightRect.height,
                borderRadius: spotlightRect.radius,
                borderColor: isDark ? 'rgba(245,234,255,0.92)' : 'rgba(255,255,255,0.95)',
                shadowColor: isDark ? '#F4D5FF' : '#FFE3FA',
              },
            ]}
          />
        ) : null}

        <Animated.View
          style={[
            styles.card,
            {
              top: tooltipTop,
              left: tooltipLeft,
              width: tooltipWidth,
              opacity: fade,
              transform: [{ scale }],
            },
          ]}
        >
          <TutorialTooltipCard
            step={currentStep}
            currentStep={session.stepIndex}
            totalSteps={session.definition.steps.length}
            isLastStep={session.stepIndex >= session.definition.steps.length - 1}
            variant={isFullscreen ? 'fullscreen' : useSpotlight ? 'spotlight' : 'fallback'}
            dontShowAgain={dontShowAgain}
            onNext={onNext}
            onSkip={onSkip}
            onReplay={onReplay}
            onToggleDontShowAgain={onToggleDontShowAgain}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  dim: {
    position: 'absolute',
  },
  spotlightRing: {
    position: 'absolute',
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 20,
    elevation: 20,
  },
  card: {
    position: 'absolute',
  },
});
