import { useEffect } from 'react';
import { NativeModules, Platform } from 'react-native';

const PROTECTION_KEY = 'astro-guru-global-protection';

type ScreenCaptureModule = {
  isAvailableAsync: () => Promise<boolean>;
  preventScreenCaptureAsync: (key: string) => Promise<void>;
  allowScreenCaptureAsync: (key: string) => Promise<void>;
  enableAppSwitcherProtectionAsync?: (opacity: number) => Promise<void>;
  disableAppSwitcherProtectionAsync?: () => Promise<void>;
};

function loadScreenCapture(): ScreenCaptureModule | null {
  if (Platform.OS === 'web') return null;
  // NativeModules is populated at startup; if ExpoScreenCapture is absent
  // (Expo Go, bare workflow without a dev build), skip entirely.
  if (!NativeModules.ExpoScreenCapture) return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('expo-screen-capture') as ScreenCaptureModule;
}

/**
 * Prevents screenshots and screen recordings globally for the entire app.
 * Android: FLAG_SECURE hides content in screenshots, recordings, and recent-apps.
 * iOS: system blocks screen recording; app switcher snapshot blurred.
 * Expo Go / web: silently no-ops (native module not present).
 */
export default function ScreenCaptureGuard() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const ScreenCapture = loadScreenCapture();
    if (!ScreenCapture) return;

    let active = true;

    async function activate() {
      if (!active || !ScreenCapture) return;
      try {
        const available = await ScreenCapture.isAvailableAsync();
        if (!available || !active) return;
        await ScreenCapture.preventScreenCaptureAsync(PROTECTION_KEY);
        if (Platform.OS === 'ios') {
          await ScreenCapture.enableAppSwitcherProtectionAsync?.(0.85);
        }
      } catch {
        // Non-fatal — protection unavailable in this environment
      }
    }

    async function deactivate() {
      if (!ScreenCapture) return;
      try {
        if (Platform.OS === 'ios') {
          await ScreenCapture.disableAppSwitcherProtectionAsync?.();
        }
        await ScreenCapture.allowScreenCaptureAsync(PROTECTION_KEY);
      } catch {
        // Non-fatal
      }
    }

    void activate();

    return () => {
      active = false;
      void deactivate();
    };
  }, []);

  return null;
}
