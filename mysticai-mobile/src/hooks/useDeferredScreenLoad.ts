import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

/**
 * Defers heavy rendering until ongoing transitions / interactions have finished.
 *
 * Typical usage:
 * ```
 * const ready = useDeferredScreenLoad();
 * if (!ready) return <Skeleton />;
 * return <HeavyContent />;
 * ```
 *
 * @param delayMs  Extra delay (ms) AFTER InteractionManager fires. Default 0.
 * @returns `true` once it is safe to mount heavy content.
 */
export function useDeferredScreenLoad(delayMs = 0): boolean {
  const [ready, setReady] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const task = InteractionManager.runAfterInteractions(() => {
      if (delayMs <= 0) {
        if (mountedRef.current) setReady(true);
        return;
      }
      const timer = setTimeout(() => {
        if (mountedRef.current) setReady(true);
      }, delayMs);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      task.cancel = () => {
        clearTimeout(timer);
      };
    });

    return () => {
      mountedRef.current = false;
      task.cancel();
    };
  }, [delayMs]);

  return ready;
}

/**
 * Returns a function that schedules a callback after the current interaction batch.
 * Useful for deferring analytics or non-critical work during screen transitions.
 */
export function useDeferredCallback<T extends (...args: any[]) => void>(
  callback: T,
  deps: readonly unknown[],
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(
    ((...args: any[]) => {
      InteractionManager.runAfterInteractions(() => {
        callbackRef.current(...args);
      });
    }) as unknown as T,
    deps,
  );
}
