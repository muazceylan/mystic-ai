const GPT_SCRIPT_SRC = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';
const GPT_SCRIPT_ID = '__mystic_mobile_gpt_script__';

let loadPromise: Promise<void> | null = null;

export function loadGPT(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (loadPromise !== null) {
    return loadPromise;
  }

  if (document.getElementById(GPT_SCRIPT_ID)) {
    loadPromise = Promise.resolve();
    return loadPromise;
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    if (typeof window.googletag === 'undefined') {
      (window as unknown as Record<string, unknown>).googletag = { cmd: [] };
    }

    const script = document.createElement('script');
    script.id = GPT_SCRIPT_ID;
    script.src = GPT_SCRIPT_SRC;
    script.async = true;
    script.crossOrigin = 'anonymous';

    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('GPT script failed to load.'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

export function getGoogletag(): GoogleTag | null {
  if (typeof window === 'undefined') return null;
  if (typeof window.googletag === 'undefined') return null;
  return window.googletag as unknown as GoogleTag;
}

export function withGPT(fn: () => void): void {
  const googletag = getGoogletag();
  if (!googletag) {
    console.warn('[GPT] googletag not available; command dropped.');
    return;
  }
  googletag.cmd.push(fn);
}
