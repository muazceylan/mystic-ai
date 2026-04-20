/**
 * GPT (Google Publisher Tags) singleton bootstrap.
 *
 * Responsibilities:
 * - Load the GPT script exactly once per page lifecycle.
 * - Expose a typed `getGoogletag()` accessor for the global object.
 * - Expose `isGPTReady()` for slot creation guards.
 *
 * Rules enforced here:
 * - Script is loaded from the official CDN domain only.
 * - Calling `loadGPT()` multiple times is safe (idempotent).
 * - Server-side rendering: no script injection on the server.
 */

const GPT_SCRIPT_SRC = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';
const GPT_SCRIPT_ID  = '__gpt_script__';

let loadPromise: Promise<void> | null = null;

/**
 * Loads the GPT script into the document head (once per page).
 * Safe to call multiple times — subsequent calls return the same Promise.
 *
 * @returns Promise that resolves when GPT is available on window.googletag
 */
export function loadGPT(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve(); // SSR — no-op
  }

  // Already in-flight or complete.
  if (loadPromise !== null) return loadPromise;

  // Script already injected by another module.
  if (document.getElementById(GPT_SCRIPT_ID)) {
    loadPromise = Promise.resolve();
    return loadPromise;
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    // Ensure the cmd queue exists before the script loads.
    if (typeof window.googletag === 'undefined') {
      (window as unknown as Record<string, unknown>).googletag = { cmd: [] };
    }

    const script = document.createElement('script');
    script.id    = GPT_SCRIPT_ID;
    script.src   = GPT_SCRIPT_SRC;
    script.async = true;
    script.crossOrigin = 'anonymous';

    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null; // Allow retry on next call.
      reject(new Error('GPT script failed to load. Ad blocker may be active.'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Returns the window.googletag object if available, or null.
 * Never throws; callers must handle null (ad blocker / SSR).
 */
export function getGoogletag(): GoogleTag | null {
  if (typeof window === 'undefined') return null;
  if (typeof window.googletag === 'undefined') return null;
  return window.googletag as unknown as GoogleTag;
}

/**
 * Returns true when GPT is loaded and the cmd queue is available.
 */
export function isGPTReady(): boolean {
  const gt = getGoogletag();
  return gt !== null && Array.isArray(gt.cmd);
}

/**
 * Queues a function to run once GPT is ready.
 * If GPT is already available, the callback is executed synchronously
 * within the cmd queue (standard GPT pattern).
 */
export function withGPT(fn: () => void): void {
  const gt = getGoogletag();
  if (!gt) {
    console.warn('[GPT] googletag not available; command dropped.');
    return;
  }
  gt.cmd.push(fn);
}
