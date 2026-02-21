/**
 * Erişilebilirlik hook'ları
 */

import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';
import {
  getFontScale,
  announceForAccessibility as announceUtil,
  isScreenReaderEnabled,
  isReduceMotionEnabled,
} from '../utils/accessibility';

/** Sistem font ölçeğini izler — Dynamic Type değişikliklerini yakalar */
export function useFontScale(): number {
  const [scale, setScale] = useState(() => getFontScale());

  useEffect(() => {
    const handler = () => setScale(getFontScale());
    const sub = Dimensions.addEventListener('change', handler);
    return () => sub?.remove?.();
  }, []);

  return scale;
}

/** Screen reader için anons — loading/hata/başarı mesajlarında */
export function useAnnounce() {
  return announceUtil;
}

/** Screen reader aktif mi? (isteğe bağlı UI değişikliği için) */
export function useScreenReaderEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let isMounted = true;
    isScreenReaderEnabled().then((v) => isMounted && setEnabled(v));
    return () => { isMounted = false; };
  }, []);

  return enabled;
}

/** Reduce motion tercihini izler */
export function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let isMounted = true;
    isReduceMotionEnabled().then((v) => isMounted && setReduced(v));
    return () => { isMounted = false; };
  }, []);

  return reduced;
}
