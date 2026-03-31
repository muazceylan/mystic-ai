import { InteractionManager } from 'react-native';

/**
 * Schedule `fn` to run after the current interaction batch (animations, gestures).
 * Returns a cancel function.
 */
export function runAfterInteractions(fn: () => void): () => void {
  const handle = InteractionManager.runAfterInteractions(fn);
  return () => handle.cancel();
}

/**
 * Promise-based wrapper around InteractionManager.
 */
export function waitForInteractions(): Promise<void> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => resolve());
  });
}

/**
 * Creates a dead-zone deadline: the returned function will only execute `fn`
 * if at least `ms` milliseconds have elapsed since the last call.
 * Useful for throttling expensive operations during rapid navigations.
 */
export function createNavigationThrottle(ms: number) {
  let lastRun = 0;
  return (fn: () => void): boolean => {
    const now = Date.now();
    if (now - lastRun < ms) return false;
    lastRun = now;
    fn();
    return true;
  };
}
