/**
 * Navigation intent store.
 *
 * A tiny in-memory map from target pathname → navigation origin. Acts as a
 * reliable secondary source of truth alongside URL params.
 *
 * WHY: expo-router URL params are unreliable in two scenarios we care about:
 *   1. `<Redirect>` wrapper screens drop custom params when they replace.
 *   2. Pushing to a tab route (e.g. `/(tabs)/calendar`) doesn't always carry
 *      custom params into the tab screen's `useLocalSearchParams()`.
 *
 * So `navigateWithOrigin` writes the intent here right before navigating, and
 * `useBackNavigation` reads it as a fallback when URL params are empty. This
 * is dynamic — it works for every route without needing a per-screen
 * whitelist.
 *
 * Lifecycle:
 *   - Written on every `navigateWithOrigin` call, keyed by the normalized
 *     target path (aliases resolved, query stripped).
 *   - Overwritten when the same target is navigated to again (latest wins).
 *   - Cleared when the user navigates AWAY from that target (the back
 *     resolution consumed or superseded the intent).
 *   - Also cleared on full reset (logout).
 *
 * This is intentionally NOT persisted. A cold start or full refresh should
 * fall back to the safe default (`/(tabs)/home`), not a stale intent from a
 * prior session.
 */

import type { NavigationEntryType } from './navigationOrigin';
import { normalizeComparablePath, resolveAliasedPath } from './navigationOrigin';

export interface NavigationIntent {
  from: string;
  fallbackRoute?: string;
  entryType?: NavigationEntryType;
  originParams?: string;
  /** Monotonic counter — used to invalidate older intents for the same target. */
  seq: number;
}

type IntentMap = Record<string, NavigationIntent>;

let intents: IntentMap = {};
let seqCounter = 0;

function canonicalKey(pathname: string): string | null {
  const resolved = resolveAliasedPath(pathname);
  const normalized = normalizeComparablePath(resolved);
  return normalized;
}

/**
 * Write an intent for the given target pathname.
 * Overwrites any previous intent for the same canonical target.
 */
export function setNavigationIntent(
  targetPathname: string,
  intent: Omit<NavigationIntent, 'seq'>,
): void {
  const key = canonicalKey(targetPathname);
  if (!key) return;
  seqCounter += 1;
  intents[key] = { ...intent, seq: seqCounter };
}

/**
 * Read (but do not remove) the intent for the given pathname.
 * Call this from `useBackNavigation` when URL params lack origin.
 */
export function peekNavigationIntent(
  pathname: string | null | undefined,
): NavigationIntent | null {
  if (!pathname) return null;
  const key = canonicalKey(pathname);
  if (!key) return null;
  const found = intents[key] ?? null;
  return found;
}

/**
 * Remove the intent for the given pathname.
 * Called when the user navigates away from the target, so the intent doesn't
 * stick around for a later re-entry from a different origin.
 */
export function clearNavigationIntent(pathname: string | null | undefined): void {
  if (!pathname) return;
  const key = canonicalKey(pathname);
  if (!key) return;
  if (intents[key]) {
    const { [key]: _removed, ...rest } = intents;
    intents = rest;
  }
}

/** Clear everything. Call on logout. */
export function clearAllNavigationIntents(): void {
  intents = {};
}

/** Test helper — NOT for production use. */
export function __getNavigationIntentsForTest(): IntentMap {
  return { ...intents };
}
