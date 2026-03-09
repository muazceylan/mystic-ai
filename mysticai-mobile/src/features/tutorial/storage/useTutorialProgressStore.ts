import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from '../../../utils/storage';
import { TUTORIAL_STORAGE_KEYS } from '../domain/tutorial.constants';
import type { TutorialProgress, TutorialStatus } from '../domain/tutorial.types';

interface TutorialScopeState {
  progressByTutorialId: Record<string, TutorialProgress>;
  visitedScreens: Record<string, boolean>;
  firstAppOpenHandled: boolean;
}

interface TutorialProgressState {
  scopes: Record<string, TutorialScopeState>;
  isHydrated: boolean;

  getProgress: (scopeKey: string, tutorialId: string) => TutorialProgress | null;
  updateProgress: (
    scopeKey: string,
    tutorialId: string,
    updater: (current: TutorialProgress) => TutorialProgress,
  ) => void;
  setProgressStatus: (scopeKey: string, tutorialId: string, status: TutorialStatus) => void;
  setDontShowAgain: (scopeKey: string, tutorialId: string, value: boolean) => void;
  resetTutorialProgress: (scopeKey: string, tutorialId: string) => void;

  markScreenVisited: (scopeKey: string, screenKey: string) => boolean;
  hasVisitedScreen: (scopeKey: string, screenKey: string) => boolean;
  resetScreenVisit: (scopeKey: string, screenKey: string) => void;

  markFirstAppOpenHandled: (scopeKey: string) => boolean;
  isFirstAppOpenHandled: (scopeKey: string) => boolean;
  resetFirstAppOpenHandled: (scopeKey: string) => void;

  migrateLegacyTutorialProgress: (scopeKey: string, aliases: Record<string, string>) => void;
  resetScope: (scopeKey: string) => void;
}

function createDefaultProgress(tutorialId: string): TutorialProgress {
  return {
    tutorialId,
    currentStepIndex: 0,
    status: 'not_started',
    shownCount: 0,
    lastSeenVersion: null,
    completedVersion: null,
    skippedVersion: null,
    lastShownAt: null,
    dontShowAgain: false,
  };
}

function createDefaultScopeState(): TutorialScopeState {
  return {
    progressByTutorialId: {},
    visitedScreens: {},
    firstAppOpenHandled: false,
  };
}

function ensureScope(scopes: Record<string, TutorialScopeState>, scopeKey: string): TutorialScopeState {
  return scopes[scopeKey] ?? createDefaultScopeState();
}

function mergeNullableVersion(left: number | null, right: number | null): number | null {
  if (left === null) return right;
  if (right === null) return left;
  return Math.max(left, right);
}

function mergeLatestIso(left: string | null, right: string | null): string | null {
  if (!left) return right;
  if (!right) return left;
  return Date.parse(left) >= Date.parse(right) ? left : right;
}

const STATUS_PRIORITY: Record<TutorialStatus, number> = {
  not_started: 0,
  in_progress: 1,
  skipped: 2,
  completed: 3,
};

export const useTutorialProgressStore = create<TutorialProgressState>()(
  persist(
    (set, get) => ({
      scopes: {},
      isHydrated: false,

      getProgress: (scopeKey, tutorialId) => {
        const scope = ensureScope(get().scopes, scopeKey);
        return scope.progressByTutorialId[tutorialId] ?? null;
      },

      updateProgress: (scopeKey, tutorialId, updater) => {
        const state = get();
        const currentScope = ensureScope(state.scopes, scopeKey);
        const currentProgress = currentScope.progressByTutorialId[tutorialId] ?? createDefaultProgress(tutorialId);
        const nextProgress = updater(currentProgress);

        set({
          scopes: {
            ...state.scopes,
            [scopeKey]: {
              ...currentScope,
              progressByTutorialId: {
                ...currentScope.progressByTutorialId,
                [tutorialId]: nextProgress,
              },
            },
          },
        });
      },

      setProgressStatus: (scopeKey, tutorialId, status) => {
        get().updateProgress(scopeKey, tutorialId, (current) => ({
          ...current,
          status,
        }));
      },

      setDontShowAgain: (scopeKey, tutorialId, value) => {
        get().updateProgress(scopeKey, tutorialId, (current) => ({
          ...current,
          dontShowAgain: value,
        }));
      },

      resetTutorialProgress: (scopeKey, tutorialId) => {
        const state = get();
        const currentScope = ensureScope(state.scopes, scopeKey);

        if (!currentScope.progressByTutorialId[tutorialId]) {
          return;
        }

        const nextProgressByTutorialId = { ...currentScope.progressByTutorialId };
        delete nextProgressByTutorialId[tutorialId];

        set({
          scopes: {
            ...state.scopes,
            [scopeKey]: {
              ...currentScope,
              progressByTutorialId: nextProgressByTutorialId,
            },
          },
        });
      },

      markScreenVisited: (scopeKey, screenKey) => {
        const state = get();
        const currentScope = ensureScope(state.scopes, scopeKey);
        const alreadyVisited = currentScope.visitedScreens[screenKey] === true;

        if (!alreadyVisited) {
          set({
            scopes: {
              ...state.scopes,
              [scopeKey]: {
                ...currentScope,
                visitedScreens: {
                  ...currentScope.visitedScreens,
                  [screenKey]: true,
                },
              },
            },
          });
        }

        return !alreadyVisited;
      },

      hasVisitedScreen: (scopeKey, screenKey) => {
        const scope = ensureScope(get().scopes, scopeKey);
        return scope.visitedScreens[screenKey] === true;
      },

      resetScreenVisit: (scopeKey, screenKey) => {
        const state = get();
        const currentScope = ensureScope(state.scopes, scopeKey);

        if (!currentScope.visitedScreens[screenKey]) {
          return;
        }

        const nextVisitedScreens = { ...currentScope.visitedScreens };
        delete nextVisitedScreens[screenKey];

        set({
          scopes: {
            ...state.scopes,
            [scopeKey]: {
              ...currentScope,
              visitedScreens: nextVisitedScreens,
            },
          },
        });
      },

      markFirstAppOpenHandled: (scopeKey) => {
        const state = get();
        const currentScope = ensureScope(state.scopes, scopeKey);
        const firstOpen = !currentScope.firstAppOpenHandled;

        if (firstOpen) {
          set({
            scopes: {
              ...state.scopes,
              [scopeKey]: {
                ...currentScope,
                firstAppOpenHandled: true,
              },
            },
          });
        }

        return firstOpen;
      },

      isFirstAppOpenHandled: (scopeKey) => {
        const scope = ensureScope(get().scopes, scopeKey);
        return scope.firstAppOpenHandled;
      },

      resetFirstAppOpenHandled: (scopeKey) => {
        const state = get();
        const currentScope = ensureScope(state.scopes, scopeKey);

        if (!currentScope.firstAppOpenHandled) {
          return;
        }

        set({
          scopes: {
            ...state.scopes,
            [scopeKey]: {
              ...currentScope,
              firstAppOpenHandled: false,
            },
          },
        });
      },

      migrateLegacyTutorialProgress: (scopeKey, aliases) => {
        const state = get();
        const currentScope = ensureScope(state.scopes, scopeKey);
        if (!Object.keys(aliases).length) {
          return;
        }

        const nextProgressByTutorialId = { ...currentScope.progressByTutorialId };
        let hasChanges = false;

        Object.entries(aliases).forEach(([legacyId, canonicalId]) => {
          if (legacyId === canonicalId) {
            return;
          }

          const legacyProgress = nextProgressByTutorialId[legacyId];
          if (!legacyProgress) {
            return;
          }

          const canonicalProgress = nextProgressByTutorialId[canonicalId];
          if (!canonicalProgress) {
            nextProgressByTutorialId[canonicalId] = {
              ...legacyProgress,
              tutorialId: canonicalId,
            };
          } else {
            const mergedStatus = STATUS_PRIORITY[legacyProgress.status] > STATUS_PRIORITY[canonicalProgress.status]
              ? legacyProgress.status
              : canonicalProgress.status;

            nextProgressByTutorialId[canonicalId] = {
              ...canonicalProgress,
              tutorialId: canonicalId,
              currentStepIndex: Math.max(canonicalProgress.currentStepIndex, legacyProgress.currentStepIndex),
              status: mergedStatus,
              shownCount: Math.max(canonicalProgress.shownCount, legacyProgress.shownCount),
              lastSeenVersion: mergeNullableVersion(canonicalProgress.lastSeenVersion, legacyProgress.lastSeenVersion),
              completedVersion: mergeNullableVersion(canonicalProgress.completedVersion, legacyProgress.completedVersion),
              skippedVersion: mergeNullableVersion(canonicalProgress.skippedVersion, legacyProgress.skippedVersion),
              lastShownAt: mergeLatestIso(canonicalProgress.lastShownAt, legacyProgress.lastShownAt),
              dontShowAgain: canonicalProgress.dontShowAgain || legacyProgress.dontShowAgain,
            };
          }

          delete nextProgressByTutorialId[legacyId];
          hasChanges = true;
        });

        if (!hasChanges) {
          return;
        }

        set({
          scopes: {
            ...state.scopes,
            [scopeKey]: {
              ...currentScope,
              progressByTutorialId: nextProgressByTutorialId,
            },
          },
        });
      },

      resetScope: (scopeKey) => {
        const state = get();
        if (!state.scopes[scopeKey]) {
          return;
        }

        const nextScopes = { ...state.scopes };
        delete nextScopes[scopeKey];
        set({ scopes: nextScopes });
      },
    }),
    {
      name: TUTORIAL_STORAGE_KEYS.PROGRESS_STORE,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        scopes: state.scopes,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
        }
      },
    },
  ),
);
