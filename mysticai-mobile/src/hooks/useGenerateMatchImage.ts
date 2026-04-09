import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { InteractionManager } from 'react-native';
import type ViewShot from 'react-native-view-shot';

type CaptureMode = 'high' | 'medium' | 'low';

export interface CaptureImageConfig {
  width?: number;
  height?: number;
  cacheSubdir?: string;
  filePrefix?: string;
  result?: 'tmpfile' | 'base64' | 'data-uri';
}

type ExpoFileSystemModule = {
  cacheDirectory?: string | null;
  makeDirectoryAsync?: (uri: string, options?: { intermediates?: boolean }) => Promise<void>;
  copyAsync?: (options: { from: string; to: string }) => Promise<void>;
  deleteAsync?: (uri: string, options?: { idempotent?: boolean }) => Promise<void>;
};

export interface UseGenerateMatchImageResult {
  imageUri: string | null;
  loading: boolean;
  error: string | null;
  generate: () => Promise<string>;
  retry: () => Promise<string>;
  clear: () => void;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function getExpoFileSystem(): ExpoFileSystemModule | null {
  try {
    return require('expo-file-system') as ExpoFileSystemModule;
  } catch {
    return null;
  }
}

function buildCaptureOptions(mode: CaptureMode, config?: CaptureImageConfig) {
  const width = config?.width;
  const height = config?.height;
  const result = config?.result ?? 'tmpfile';
  switch (mode) {
    case 'high':
      return {
        format: 'png',
        quality: 1,
        result,
        width: width ?? 1080,
        height: height ?? 1350,
      } as const;
    case 'medium':
      return {
        format: 'png',
        quality: 0.95,
        result,
        width: width ? Math.round(width * 0.78) : 840,
        height: height ? Math.round(height * 0.78) : 1050,
      } as const;
    case 'low':
    default:
      return {
        format: 'png',
        quality: 0.9,
        result,
        width: width ? Math.round(width * 0.66) : 720,
        height: height ? Math.round(height * 0.66) : 900,
      } as const;
  }
}

async function waitForStableFrame() {
  await new Promise<void>((resolve) => {
    let settled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      if (settled) return;
      settled = true;
      resolve();
    });
    setTimeout(() => {
      if (settled) return;
      settled = true;
      task?.cancel?.();
      resolve();
    }, 350);
  });

  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  await sleep(80);
}

async function captureWithTimeout(ref: ViewShot, mode: CaptureMode, config?: CaptureImageConfig): Promise<string> {
  const timeoutMs = mode === 'high' ? 12000 : mode === 'medium' ? 9000 : 7000;
  const capturePromise = (ref.capture as any)(buildCaptureOptions(mode, config) as any);
  const timeoutPromise = new Promise<string>((_, reject) => {
    setTimeout(() => reject(new Error('Kart oluşturma zaman aşımına uğradı.')), timeoutMs);
  });

  const uri = await Promise.race([capturePromise, timeoutPromise]);
  if (!uri || typeof uri !== 'string') {
    throw new Error('Kart görseli oluşturulamadı.');
  }
  return uri;
}

async function ensureShareableCacheCopy(uri: string, config?: CaptureImageConfig): Promise<string> {
  if (!uri.startsWith('file://')) {
    return uri;
  }

  const fs = getExpoFileSystem();
  if (!fs?.cacheDirectory || !fs.copyAsync || !fs.makeDirectoryAsync) {
    return uri;
  }

  const baseDir = fs.cacheDirectory.endsWith('/') ? fs.cacheDirectory : `${fs.cacheDirectory}/`;
  const subdir = config?.cacheSubdir ?? 'match-card-share';
  const filePrefix = config?.filePrefix ?? 'match-card';
  const targetDir = `${baseDir}${subdir}`;
  const targetUri = `${targetDir}/${filePrefix}-${Date.now()}-${Math.round(Math.random() * 1_000_000)}.png`;

  try {
    await fs.makeDirectoryAsync(targetDir, { intermediates: true });
  } catch {
    // Directory may already exist.
  }

  try {
    await fs.copyAsync({ from: uri, to: targetUri });
    return targetUri;
  } catch {
    return uri;
  }
}

async function cleanupManagedUri(uri: string | null) {
  if (!uri) return;

  const fs = getExpoFileSystem();
  if (!fs?.deleteAsync) return;

  try {
    await fs.deleteAsync(uri, { idempotent: true });
  } catch {
    // best effort
  }
}

export function useGenerateMatchImage(
  viewShotRef: RefObject<ViewShot | null>,
  captureConfig?: CaptureImageConfig,
): UseGenerateMatchImageResult {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const managedUriRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      void cleanupManagedUri(managedUriRef.current);
      managedUriRef.current = null;
    };
  }, []);

  const generate = useCallback(async () => {
    const target = viewShotRef.current;
    if (!target?.capture) {
      const message = 'Kart henüz render edilmedi.';
      if (mountedRef.current) setError(message);
      throw new Error(message);
    }

    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      await waitForStableFrame();

      let rawUri: string;
      try {
        rawUri = await captureWithTimeout(target, 'high', captureConfig);
      } catch {
        try {
          rawUri = await captureWithTimeout(target, 'medium', captureConfig);
        } catch {
          rawUri = await captureWithTimeout(target, 'low', captureConfig);
        }
      }

      const finalUri = await ensureShareableCacheCopy(rawUri, captureConfig);

      if (managedUriRef.current && managedUriRef.current !== finalUri) {
        void cleanupManagedUri(managedUriRef.current);
      }
      const managedMarker = `/${captureConfig?.cacheSubdir ?? 'match-card-share'}/`;
      managedUriRef.current = finalUri.includes(managedMarker) ? finalUri : null;

      if (mountedRef.current) {
        setImageUri(finalUri);
        setLoading(false);
      }
      return finalUri;
    } catch (e: any) {
      const message = e?.message ?? 'Kart görseli üretilemedi.';
      if (mountedRef.current) {
        setError(message);
        setLoading(false);
      }
      throw new Error(message);
    }
  }, [viewShotRef, captureConfig]);

  const retry = useCallback(async () => generate(), [generate]);

  const clear = useCallback(() => {
    const previousManagedUri = managedUriRef.current;
    managedUriRef.current = null;
    void cleanupManagedUri(previousManagedUri);

    if (!mountedRef.current) return;
    setImageUri(null);
    setError(null);
    setLoading(false);
  }, []);

  return { imageUri, loading, error, generate, retry, clear };
}

export default useGenerateMatchImage;
