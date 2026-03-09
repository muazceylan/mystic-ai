import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  trackTutorialCompleted,
  trackTutorialDismissToggled,
  trackTutorialResetClicked,
  trackTutorialResetConfirmed,
  trackTutorialReopenClicked,
  trackTutorialNextClicked,
  trackGlobalOnboardingReopened,
  trackTutorialReopened,
  trackTutorialSkipped,
  trackTutorialStarted,
  trackTutorialStepViewed,
} from '../analytics/tutorialAnalytics';
import { TutorialOverlay } from '../components/TutorialOverlay';
import { TUTORIAL_ID_ALIASES, TUTORIAL_IDS, TUTORIAL_SCREEN_KEYS } from '../domain/tutorial.constants';
import type {
  TutorialDefinition,
  TutorialProgress,
  TutorialSession,
  TutorialStartReason,
  TutorialTargetLayout,
} from '../domain/tutorial.types';
import { canStartTutorial } from '../services/TutorialDisplayService';
import { createTutorialConfigService } from '../services/TutorialConfigFactory';
import { useTutorialProgressStore } from '../storage/useTutorialProgressStore';
import { tutorialDebugLog } from '../services/tutorialDebug';

interface TutorialContextValue {
  activeSession: TutorialSession | null;
  isVisible: boolean;
  registerTargetLayout: (targetKey: string, layout: TutorialTargetLayout) => void;
  unregisterTarget: (targetKey: string) => void;

  requestTutorialForScreen: (screenKey: string, reason: TutorialStartReason) => Promise<boolean>;
  openTutorialById: (tutorialId: string, reason?: TutorialStartReason) => Promise<boolean>;
  reopenTutorialById: (tutorialId: string, sourceScreen?: string) => Promise<boolean>;
  getTutorialCatalog: (forceRefresh?: boolean) => Promise<TutorialDefinition[]>;
  getTutorialProgress: (tutorialId: string) => TutorialProgress | null;
  resetTutorialById: (tutorialId: string, sourceScreen?: string) => Promise<void>;
  resetAllTutorials: (sourceScreen?: string) => void;

  nextStep: () => void;
  skipTutorial: () => void;
  replayTutorial: () => void;
  setDontShowAgain: (tutorialId: string, value: boolean, sourceScreen?: string) => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);
const tutorialConfigService = createTutorialConfigService();

function normalizeDefinition(definition: TutorialDefinition): TutorialDefinition {
  const targetSet = new Set(definition.targets.map((target) => target.targetKey));

  const sortedSteps = definition.steps
    .filter((step) => step.isActive)
    .filter((step) => {
      if (step.presentationType === 'fullscreen_carousel') {
        return true;
      }

      if (targetSet.has(step.targetKey)) {
        return true;
      }

      tutorialDebugLog('step_skipped_missing_target_definition', {
        tutorial_id: definition.tutorialId,
        step_id: step.stepId,
        target_key: step.targetKey,
      });
      return false;
    })
    .sort((left, right) => left.order - right.order);

  return {
    ...definition,
    steps: sortedSteps,
  };
}

function isSameLayout(left: TutorialTargetLayout, right: TutorialTargetLayout): boolean {
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  );
}

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const userId = useAuthStore((state) => state.user?.id);
  const scopeKey = useMemo(() => (userId ? `user:${userId}` : 'guest'), [userId]);

  const isHydrated = useTutorialProgressStore((state) => state.isHydrated);
  const scopedProgress = useTutorialProgressStore((state) => state.scopes[scopeKey]?.progressByTutorialId ?? {});
  const getProgress = useTutorialProgressStore((state) => state.getProgress);
  const updateProgress = useTutorialProgressStore((state) => state.updateProgress);
  const setDontShowAgain = useTutorialProgressStore((state) => state.setDontShowAgain);
  const resetTutorialProgress = useTutorialProgressStore((state) => state.resetTutorialProgress);
  const markScreenVisited = useTutorialProgressStore((state) => state.markScreenVisited);
  const hasVisitedScreen = useTutorialProgressStore((state) => state.hasVisitedScreen);
  const resetScreenVisit = useTutorialProgressStore((state) => state.resetScreenVisit);
  const markFirstAppOpenHandled = useTutorialProgressStore((state) => state.markFirstAppOpenHandled);
  const isFirstAppOpenHandled = useTutorialProgressStore((state) => state.isFirstAppOpenHandled);
  const resetFirstAppOpenHandled = useTutorialProgressStore((state) => state.resetFirstAppOpenHandled);
  const migrateLegacyTutorialProgress = useTutorialProgressStore((state) => state.migrateLegacyTutorialProgress);
  const resetScope = useTutorialProgressStore((state) => state.resetScope);

  const [activeSession, setActiveSession] = useState<TutorialSession | null>(null);
  const [targetLayouts, setTargetLayouts] = useState<Record<string, TutorialTargetLayout>>({});
  const startLockRef = useRef(false);
  const activeSessionRef = useRef<TutorialSession | null>(null);
  const viewedStepRef = useRef<string | null>(null);

  useEffect(() => {
    activeSessionRef.current = null;
    setActiveSession(null);
  }, [scopeKey]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    migrateLegacyTutorialProgress(scopeKey, TUTORIAL_ID_ALIASES);
  }, [isHydrated, migrateLegacyTutorialProgress, scopeKey]);

  useEffect(() => {
    void tutorialConfigService.getTutorials('merged_fallback', true);
  }, []);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  const registerTargetLayout = useCallback((targetKey: string, layout: TutorialTargetLayout) => {
    setTargetLayouts((current) => {
      const existing = current[targetKey];
      if (existing && isSameLayout(existing, layout)) {
        return current;
      }

      return {
        ...current,
        [targetKey]: layout,
      };
    });
  }, []);

  const unregisterTarget = useCallback((targetKey: string) => {
    setTargetLayouts((current) => {
      if (!current[targetKey]) {
        return current;
      }

      const next = { ...current };
      delete next[targetKey];
      return next;
    });
  }, []);

  const startSession = useCallback(
    (definition: TutorialDefinition, reason: TutorialStartReason): boolean => {
      if (activeSessionRef.current) {
        return false;
      }

      const normalizedDefinition = normalizeDefinition(definition);
      if (!normalizedDefinition.steps.length) {
        return false;
      }

      const nowIso = new Date().toISOString();
      const nextSession: TutorialSession = {
        definition: normalizedDefinition,
        stepIndex: 0,
        reason,
      };
      activeSessionRef.current = nextSession;
      setActiveSession(nextSession);

      updateProgress(scopeKey, normalizedDefinition.tutorialId, (current) => ({
        ...current,
        tutorialId: normalizedDefinition.tutorialId,
        status: 'in_progress',
        currentStepIndex: 0,
        shownCount: current.shownCount + 1,
        lastSeenVersion: normalizedDefinition.version,
        lastShownAt: nowIso,
      }));

      if (reason === 'manual_reopen') {
        trackTutorialReopened({ tutorial: normalizedDefinition, reason });
      }
      trackTutorialStarted({ tutorial: normalizedDefinition, reason });
      return true;
    },
    [scopeKey, updateProgress],
  );

  const requestTutorialForScreen = useCallback(
    async (screenKey: string, reason: TutorialStartReason): Promise<boolean> => {
      if (!isHydrated || activeSessionRef.current || startLockRef.current) {
        return false;
      }

      startLockRef.current = true;
      try {
        const tutorials = await tutorialConfigService.getTutorialsForScreen(screenKey);
        if (!tutorials.length) {
          return false;
        }

        const isFirstScreenVisit =
          reason === 'first_screen_visit'
            ? markScreenVisited(scopeKey, screenKey)
            : !hasVisitedScreen(scopeKey, screenKey);

        const isFirstAppOpen =
          reason === 'first_app_open'
            ? markFirstAppOpenHandled(scopeKey)
            : !isFirstAppOpenHandled(scopeKey);

        for (const tutorial of tutorials) {
          const progress = getProgress(scopeKey, tutorial.tutorialId);
          const shouldStart = canStartTutorial(tutorial, {
            reason,
            progress,
            isFirstScreenVisit,
            isFirstAppOpen,
          });

          if (shouldStart) {
            return startSession(tutorial, reason);
          }
        }

        return false;
      } finally {
        startLockRef.current = false;
      }
    },
    [
      getProgress,
      hasVisitedScreen,
      isFirstAppOpenHandled,
      isHydrated,
      markFirstAppOpenHandled,
      markScreenVisited,
      scopeKey,
      startSession,
    ],
  );

  const openTutorialById = useCallback(
    async (tutorialId: string, reason: TutorialStartReason = 'manual_reopen'): Promise<boolean> => {
      if (!isHydrated || activeSessionRef.current || startLockRef.current) {
        return false;
      }

      startLockRef.current = true;
      try {
        const tutorial = await tutorialConfigService.getTutorialById(tutorialId);
        if (!tutorial) {
          return false;
        }

        if (!tutorial.isActive || tutorial.publishStatus !== 'published') {
          return false;
        }

        const progress = getProgress(scopeKey, tutorial.tutorialId);
        const shouldStart = canStartTutorial(tutorial, {
          reason,
          progress,
          isFirstScreenVisit: false,
          isFirstAppOpen: false,
        });

        if (!shouldStart) {
          return false;
        }

        return startSession(tutorial, reason);
      } finally {
        startLockRef.current = false;
      }
    },
    [getProgress, isHydrated, scopeKey, startSession],
  );

  const reopenTutorialById = useCallback(
    async (tutorialId: string, sourceScreen = 'tutorial_center'): Promise<boolean> => {
      const tutorial = await tutorialConfigService.getTutorialById(tutorialId);
      const progress = tutorial ? getProgress(scopeKey, tutorialId) : null;

      trackTutorialReopenClicked({
        tutorial,
        tutorialId,
        tutorialVersion: tutorial?.version ?? null,
        screenKey: tutorial?.screenKey ?? null,
        sourceScreen,
        entryPoint: 'manual_reopen',
        completionState: progress?.status ?? 'not_started',
      });

      if (tutorial?.tutorialId === TUTORIAL_IDS.GLOBAL_ONBOARDING) {
        trackGlobalOnboardingReopened({
          tutorial,
          tutorialId,
          tutorialVersion: tutorial?.version ?? null,
          screenKey: tutorial?.screenKey ?? null,
          sourceScreen,
          entryPoint: 'manual_reopen',
        });
      }

      return openTutorialById(tutorialId, 'manual_reopen');
    },
    [getProgress, openTutorialById, scopeKey],
  );

  const getTutorialCatalog = useCallback(
    async (forceRefresh = false): Promise<TutorialDefinition[]> => {
      return tutorialConfigService.getTutorials('merged_fallback', forceRefresh);
    },
    [],
  );

  const getTutorialProgress = useCallback(
    (tutorialId: string): TutorialProgress | null => getProgress(scopeKey, tutorialId),
    [getProgress, scopeKey],
  );

  const resetTutorialById = useCallback(
    async (tutorialId: string, sourceScreen = 'tutorial_center') => {
      const tutorial = await tutorialConfigService.getTutorialById(tutorialId);
      const existingProgress = getProgress(scopeKey, tutorialId);

      trackTutorialResetClicked({
        tutorial,
        tutorialId,
        tutorialVersion: tutorial?.version ?? null,
        screenKey: tutorial?.screenKey ?? null,
        sourceScreen,
        entryPoint: 'manual_reopen',
        completionState: existingProgress?.status ?? 'not_started',
      });

      resetTutorialProgress(scopeKey, tutorialId);

      if (tutorial) {
        resetScreenVisit(scopeKey, tutorial.screenKey);
        if (tutorial.screenKey === TUTORIAL_SCREEN_KEYS.GLOBAL_ONBOARDING) {
          resetFirstAppOpenHandled(scopeKey);
        }
      }

      if (activeSessionRef.current?.definition.tutorialId === tutorialId) {
        viewedStepRef.current = null;
        activeSessionRef.current = null;
        setActiveSession(null);
      }

      trackTutorialResetConfirmed({
        tutorial,
        tutorialId,
        tutorialVersion: tutorial?.version ?? null,
        screenKey: tutorial?.screenKey ?? null,
        sourceScreen,
        entryPoint: 'manual_reopen',
        completionState: 'not_started',
      });
    },
    [
      getProgress,
      resetFirstAppOpenHandled,
      resetScreenVisit,
      resetTutorialProgress,
      scopeKey,
    ],
  );

  const resetAllTutorials = useCallback(
    (sourceScreen = 'tutorial_center') => {
      trackTutorialResetClicked({
        tutorialId: 'all_tutorials',
        sourceScreen,
        entryPoint: 'manual_reopen',
        completionState: 'bulk',
      });

      resetScope(scopeKey);
      viewedStepRef.current = null;
      activeSessionRef.current = null;
      setActiveSession(null);

      trackTutorialResetConfirmed({
        tutorialId: 'all_tutorials',
        sourceScreen,
        entryPoint: 'manual_reopen',
        completionState: 'bulk',
      });
    },
    [resetScope, scopeKey],
  );

  const completeSession = useCallback(() => {
    if (!activeSession) {
      return;
    }

    const nowIso = new Date().toISOString();
    const { definition, reason } = activeSession;

    updateProgress(scopeKey, definition.tutorialId, (current) => ({
      ...current,
      status: 'completed',
      currentStepIndex: definition.steps.length - 1,
      completedVersion: definition.version,
      lastSeenVersion: definition.version,
      lastShownAt: nowIso,
    }));

    trackTutorialCompleted({ tutorial: definition, reason });
    viewedStepRef.current = null;
    activeSessionRef.current = null;
    setActiveSession(null);
  }, [activeSession, scopeKey, updateProgress]);

  const nextStep = useCallback(() => {
    if (!activeSession) {
      return;
    }

    const { definition, stepIndex, reason } = activeSession;
    const currentStep = definition.steps[stepIndex];
    if (!currentStep) {
      return;
    }

    trackTutorialNextClicked(
      { tutorial: definition, reason },
      currentStep,
      stepIndex,
      definition.steps.length,
    );

    const isLastStep = stepIndex >= definition.steps.length - 1;
    if (isLastStep) {
      completeSession();
      return;
    }

    const nextStepIndex = stepIndex + 1;
    updateProgress(scopeKey, definition.tutorialId, (current) => ({
      ...current,
      status: 'in_progress',
      currentStepIndex: nextStepIndex,
      lastSeenVersion: definition.version,
      lastShownAt: new Date().toISOString(),
    }));

    setActiveSession({
      ...activeSession,
      stepIndex: nextStepIndex,
    });
  }, [activeSession, completeSession, scopeKey, updateProgress]);

  const skipTutorial = useCallback(() => {
    if (!activeSession) {
      return;
    }

    const { definition, stepIndex, reason } = activeSession;
    const currentStep = definition.steps[stepIndex];

    if (currentStep) {
      trackTutorialSkipped(
        { tutorial: definition, reason },
        currentStep,
        stepIndex,
        definition.steps.length,
      );
    }

    updateProgress(scopeKey, definition.tutorialId, (current) => ({
      ...current,
      status: 'skipped',
      skippedVersion: definition.version,
      lastSeenVersion: definition.version,
      lastShownAt: new Date().toISOString(),
    }));

    viewedStepRef.current = null;
    activeSessionRef.current = null;
    setActiveSession(null);
  }, [activeSession, scopeKey, updateProgress]);

  const replayTutorial = useCallback(() => {
    if (!activeSession) {
      return;
    }

    const { definition, reason } = activeSession;
    updateProgress(scopeKey, definition.tutorialId, (current) => ({
      ...current,
      status: 'in_progress',
      currentStepIndex: 0,
      lastShownAt: new Date().toISOString(),
    }));

    trackTutorialReopened({ tutorial: definition, reason });
    viewedStepRef.current = null;
    setActiveSession({
      ...activeSession,
      stepIndex: 0,
    });
  }, [activeSession, scopeKey, updateProgress]);

  useEffect(() => {
    if (!activeSession) {
      viewedStepRef.current = null;
      return;
    }

    const step = activeSession.definition.steps[activeSession.stepIndex];
    if (!step) {
      return;
    }

    const viewedKey = `${activeSession.definition.tutorialId}:${activeSession.stepIndex}:${activeSession.reason}`;
    if (viewedStepRef.current === viewedKey) {
      return;
    }

    viewedStepRef.current = viewedKey;
    trackTutorialStepViewed(
      { tutorial: activeSession.definition, reason: activeSession.reason },
      step,
      activeSession.stepIndex,
      activeSession.definition.steps.length,
    );
  }, [activeSession]);

  const dontShowAgain = activeSession
    ? (scopedProgress[activeSession.definition.tutorialId]?.dontShowAgain ?? false)
    : false;

  const handleSetDontShowAgain = useCallback(
    (tutorialId: string, value: boolean, sourceScreen = 'tutorial_overlay') => {
      const tutorial = activeSessionRef.current?.definition.tutorialId === tutorialId
        ? activeSessionRef.current.definition
        : null;

      setDontShowAgain(scopeKey, tutorialId, value);
      trackTutorialDismissToggled({
        tutorial,
        tutorialId,
        tutorialVersion: tutorial?.version ?? null,
        screenKey: tutorial?.screenKey ?? null,
        sourceScreen,
        entryPoint: 'manual_reopen',
        dismissEnabled: value,
        completionState: value ? 'dismissed' : 'eligible',
      });
    },
    [scopeKey, setDontShowAgain],
  );

  const contextValue = useMemo<TutorialContextValue>(
    () => ({
      activeSession,
      isVisible: Boolean(activeSession),
      registerTargetLayout,
      unregisterTarget,
      requestTutorialForScreen,
      openTutorialById,
      reopenTutorialById,
      getTutorialCatalog,
      getTutorialProgress,
      resetTutorialById,
      resetAllTutorials,
      nextStep,
      skipTutorial,
      replayTutorial,
      setDontShowAgain: handleSetDontShowAgain,
    }),
    [
      activeSession,
      handleSetDontShowAgain,
      nextStep,
      openTutorialById,
      reopenTutorialById,
      registerTargetLayout,
      getTutorialCatalog,
      getTutorialProgress,
      replayTutorial,
      resetTutorialById,
      resetAllTutorials,
      requestTutorialForScreen,
      skipTutorial,
      unregisterTarget,
    ],
  );

  return (
    <TutorialContext.Provider value={contextValue}>
      {children}
      <TutorialOverlay
        session={activeSession}
        targetLayouts={targetLayouts}
        dontShowAgain={dontShowAgain}
        onNext={nextStep}
        onSkip={skipTutorial}
        onReplay={replayTutorial}
        onToggleDontShowAgain={(value) => {
          if (!activeSession) {
            return;
          }
          handleSetDontShowAgain(activeSession.definition.tutorialId, value);
        }}
      />
    </TutorialContext.Provider>
  );
}

export function useTutorialContext(): TutorialContextValue {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorialContext must be used within TutorialProvider');
  }
  return context;
}
