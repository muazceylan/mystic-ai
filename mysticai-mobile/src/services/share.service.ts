import { Linking, Platform, Share } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { trackEvent } from './analytics';

export type ShareChannel = 'system' | 'instagram_story' | 'gallery';

export type ShareServiceErrorCode =
  | 'SHARING_UNAVAILABLE'
  | 'MEDIA_LIBRARY_PERMISSION_DENIED'
  | 'MEDIA_LIBRARY_SAVE_FAILED'
  | 'INSTAGRAM_UNAVAILABLE'
  | 'INSTAGRAM_SHARE_FAILED'
  | 'SHARE_FAILED';

export class ShareServiceError extends Error {
  code: ShareServiceErrorCode;
  suggestOpenSettings: boolean;

  constructor(code: ShareServiceErrorCode, message: string, options?: { suggestOpenSettings?: boolean }) {
    super(message);
    this.name = 'ShareServiceError';
    this.code = code;
    this.suggestOpenSettings = options?.suggestOpenSettings ?? false;
  }
}

export interface ShareResult {
  ok: boolean;
  channel: ShareChannel;
  fallbackUsed?: boolean;
  message?: string;
}

type AnalyticsPayload = {
  channel: ShareChannel;
  success: boolean;
  fallbackUsed?: boolean;
  reason?: string;
};

type ShareImageOptions = {
  title?: string;
  message?: string;
  url?: string;
  fileName?: string;
  preferFileOnly?: boolean;
};

function logShareAnalytics(payload: AnalyticsPayload) {
  trackEvent('share_service_result', {
    share_channel: payload.channel,
    success: payload.success,
    fallback_used: payload.fallbackUsed ?? false,
    reason: payload.reason ?? null,
  });
}

function buildPhotosSettingsMessage() {
  if (Platform.OS === 'ios') {
    return 'Galeriye kaydetmek için fotoğraf izni gerekli. Ayarlar > Fotoğraflar > Astro Guru yolundan izin verebilirsiniz.';
  }
  return 'Galeriye kaydetmek için medya izni gerekli. Gerekirse Ayarlar > Fotoğraflar (iOS) veya uygulama izinleri ekranından erişimi açın.';
}

function isShareCancelledError(error: any) {
  const message = String(error?.message ?? '').toLowerCase();
  return message.includes('cancel') || message.includes('canceled') || message.includes('cancelled');
}

function getWebNavigator(): any | null {
  if (Platform.OS !== 'web') return null;
  return typeof globalThis !== 'undefined' ? (globalThis as any).navigator ?? null : null;
}

function getWebDocument(): any | null {
  if (Platform.OS !== 'web') return null;
  return typeof globalThis !== 'undefined' ? (globalThis as any).document ?? null : null;
}

function getWebWindow(): any | null {
  if (Platform.OS !== 'web') return null;
  return typeof globalThis !== 'undefined' ? (globalThis as any).window ?? null : null;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  const navigatorRef = getWebNavigator();
  if (navigatorRef?.clipboard?.writeText) {
    try {
      await navigatorRef.clipboard.writeText(text);
      return true;
    } catch {
      // fall through
    }
  }

  const documentRef = getWebDocument();
  if (!documentRef?.createElement) return false;

  try {
    const textarea = documentRef.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    documentRef.body?.appendChild(textarea);
    textarea.select();
    const copied = documentRef.execCommand?.('copy') ?? false;
    textarea.remove();
    return Boolean(copied);
  } catch {
    return false;
  }
}

function createWebBlobFromDataUri(uri: string): Blob | null {
  if (!uri.startsWith('data:')) return null;

  const BlobCtor = typeof globalThis !== 'undefined' ? (globalThis as any).Blob : undefined;
  const atobRef = typeof globalThis !== 'undefined' ? (globalThis as any).atob : undefined;
  if (typeof BlobCtor !== 'function' || typeof atobRef !== 'function') return null;

  const match = uri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  try {
    const [, mimeType, base64Data] = match;
    const binary = atobRef(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new BlobCtor([bytes], { type: mimeType || 'image/png' });
  } catch {
    return null;
  }
}

function createWebShareFileFromDataUri(uri: string, fileName: string): any | null {
  const blob = createWebBlobFromDataUri(uri);
  const FileCtor = typeof globalThis !== 'undefined' ? (globalThis as any).File : undefined;
  if (!blob || typeof FileCtor !== 'function') return null;

  const extension = blob.type?.includes('jpeg') ? 'jpg' : blob.type?.includes('webp') ? 'webp' : 'png';
  const normalizedName = /\.[a-z0-9]+$/i.test(fileName) ? fileName : `${fileName}.${extension}`;
  return new FileCtor([blob], normalizedName, { type: blob.type || 'image/png' });
}

export function createWebShareFileSync(uri: string, fileName: string): any | null {
  if (Platform.OS !== 'web') return null;
  return createWebShareFileFromDataUri(uri, fileName);
}

async function triggerWebDownload(uri: string, fileName: string) {
  const documentRef = getWebDocument();
  if (!documentRef?.createElement) {
    throw new ShareServiceError(
      'MEDIA_LIBRARY_SAVE_FAILED',
      'Tarayici indirme aksiyonu baslatilamadi.',
    );
  }

  const windowRef = getWebWindow();
  const objectUrlFactory = windowRef?.URL;
  const dataBlob = createWebBlobFromDataUri(uri);
  const downloadUri =
    dataBlob && typeof objectUrlFactory?.createObjectURL === 'function'
      ? objectUrlFactory.createObjectURL(dataBlob)
      : uri;

  const link = documentRef.createElement('a');
  link.href = downloadUri;
  link.download = fileName;
  link.rel = 'noopener';
  link.target = '_blank';
  link.style.display = 'none';
  documentRef.body?.appendChild(link);
  link.click();

  windowRef?.setTimeout?.(() => {
    link.remove();
    if (downloadUri !== uri && typeof objectUrlFactory?.revokeObjectURL === 'function') {
      objectUrlFactory.revokeObjectURL(downloadUri);
    }
  }, 1200);
}

async function createWebShareFile(uri: string, fileName: string): Promise<any | null> {
  if (Platform.OS !== 'web') return null;

  const syncFile = createWebShareFileFromDataUri(uri, fileName);
  if (syncFile) return syncFile;

  if (typeof fetch !== 'function') return null;

  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const FileCtor = typeof globalThis !== 'undefined' ? (globalThis as any).File : undefined;
    if (typeof FileCtor !== 'function') return null;
    const extension = blob.type?.includes('jpeg') ? 'jpg' : 'png';
    const normalizedName = /\.[a-z0-9]+$/i.test(fileName) ? fileName : `${fileName}.${extension}`;
    return new FileCtor([blob], normalizedName, { type: blob.type || 'image/png' });
  } catch {
    return null;
  }
}

function buildShareText(message?: string, url?: string) {
  return [message, url].filter(Boolean).join('\n');
}

async function shareUrlWeb(url: string, options?: Pick<ShareImageOptions, 'title' | 'message'>): Promise<ShareResult> {
  const navigatorRef = getWebNavigator();
  const text = buildShareText(options?.message, url);

  if (navigatorRef?.share) {
    try {
      await navigatorRef.share({
        title: options?.title,
        text,
        url,
      });
      return { ok: true, channel: 'system' };
    } catch (error) {
      if (isShareCancelledError(error)) {
        return { ok: true, channel: 'system' };
      }
    }
  }

  const copied = await copyTextToClipboard(url);
  if (copied) {
    return {
      ok: true,
      channel: 'system',
      fallbackUsed: true,
      message: 'LINK_COPIED',
    };
  }

  throw new ShareServiceError(
    'SHARING_UNAVAILABLE',
    'Bu tarayicida paylasim menusu acilamadi. Lutfen farkli bir tarayici deneyin.',
  );
}

async function shareImageWeb(uri: string, options?: ShareImageOptions): Promise<ShareResult> {
  const navigatorRef = getWebNavigator();
  const fileName = options?.fileName ?? 'astro-guru-poster.png';
  const file = await createWebShareFile(uri, fileName);
  const text = buildShareText(options?.message, options?.url);
  const preferFileOnly = options?.preferFileOnly ?? false;

  if (navigatorRef?.share) {
    try {
      if (file && typeof navigatorRef.canShare === 'function' && navigatorRef.canShare({ files: [file] })) {
        await navigatorRef.share({
          title: options?.title,
          text,
          files: [file],
        });
        return { ok: true, channel: 'system' };
      }

      if (!preferFileOnly && (text || options?.url)) {
        await navigatorRef.share({
          title: options?.title,
          text,
          url: options?.url,
        });
        return { ok: true, channel: 'system', fallbackUsed: true };
      }
    } catch (error) {
      if (isShareCancelledError(error)) {
        return { ok: true, channel: 'system' };
      }
    }
  }

  const copied = options?.url ? await copyTextToClipboard(options.url) : false;
  await triggerWebDownload(uri, fileName);
  return {
    ok: true,
    channel: 'system',
    fallbackUsed: true,
    message: copied ? 'DOWNLOADED_AND_COPIED' : 'DOWNLOADED',
  };
}

export async function sharePreparedWebImage(
  file: any,
  options?: Pick<ShareImageOptions, 'title' | 'message' | 'url'>,
): Promise<ShareResult> {
  if (Platform.OS !== 'web') {
    throw new ShareServiceError('SHARING_UNAVAILABLE', 'Hazir web paylasimi sadece web platformunda desteklenir.');
  }

  const navigatorRef = getWebNavigator();
  if (!navigatorRef?.share || !file) {
    throw new ShareServiceError(
      'SHARING_UNAVAILABLE',
      'Bu tarayicida gorsel paylasim menusu acilamadi. Lutfen farkli bir tarayici deneyin.',
    );
  }

  const text = buildShareText(options?.message, options?.url);

  try {
    const supportsFiles =
      typeof navigatorRef.canShare !== 'function' || navigatorRef.canShare({ files: [file] });

    if (!supportsFiles) {
      throw new ShareServiceError(
        'SHARING_UNAVAILABLE',
        'Bu tarayici dosya tabanli gorsel paylasimini desteklemiyor.',
      );
    }

    await navigatorRef.share({
      title: options?.title,
      text,
      files: [file],
    });
    return { ok: true, channel: 'system' };
  } catch (error) {
    if (isShareCancelledError(error)) {
      return { ok: true, channel: 'system' };
    }
    if (error instanceof ShareServiceError) {
      throw error;
    }
    throw new ShareServiceError(
      'SHARE_FAILED',
      (error as any)?.message ?? 'Paylaşım başlatılamadı.',
    );
  }
}

export async function shareImage(uri: string, options?: ShareImageOptions): Promise<ShareResult> {
  if (Platform.OS === 'web') {
    try {
      const result = await shareImageWeb(uri, options);
      logShareAnalytics({
        channel: 'system',
        success: true,
        fallbackUsed: result.fallbackUsed,
        reason: result.message,
      });
      return result;
    } catch (error: any) {
      if (error instanceof ShareServiceError) {
        logShareAnalytics({ channel: 'system', success: false, reason: error.message });
        throw error;
      }
      const message = error?.message ?? 'Paylaşım başlatılamadı.';
      logShareAnalytics({ channel: 'system', success: false, reason: message });
      throw new ShareServiceError('SHARE_FAILED', message);
    }
  }

  try {
    const sharingAvailable = await Sharing.isAvailableAsync();

    if (sharingAvailable) {
      await Sharing.shareAsync(uri, {
        dialogTitle: 'Yıldız kartını paylaş',
        mimeType: 'image/png',
        UTI: 'public.png',
      });
      logShareAnalytics({ channel: 'system', success: true });
      return { ok: true, channel: 'system' };
    }

    // Fallback: React Native Share (Expo Go uyumlu)
    try {
      await Share.share({
        url: uri,
        title: 'Yıldız kartını paylaş',
        message: options?.message ?? 'Yıldız kartımı seninle paylaşıyorum!',
      });
      logShareAnalytics({ channel: 'system', success: true, fallbackUsed: true });
      return { ok: true, channel: 'system', fallbackUsed: true };
    } catch (fallbackError: any) {
      if (isShareCancelledError(fallbackError)) {
        logShareAnalytics({ channel: 'system', success: true, fallbackUsed: true, reason: 'user_cancelled' });
        return { ok: true, channel: 'system', fallbackUsed: true };
      }

      throw new ShareServiceError(
        'SHARING_UNAVAILABLE',
        'Bu cihazda paylaşım özelliği kullanılamıyor. Lütfen başka bir cihazda tekrar deneyin.',
      );
    }
  } catch (e: any) {
    if (e instanceof ShareServiceError) {
      logShareAnalytics({ channel: 'system', success: false, reason: e.message });
      throw e;
    }
    if (isShareCancelledError(e)) {
      logShareAnalytics({ channel: 'system', success: true, reason: 'user_cancelled' });
      return { ok: true, channel: 'system' };
    }
    const message = e?.message ?? 'Paylaşım başlatılamadı.';
    logShareAnalytics({ channel: 'system', success: false, reason: message });
    throw new ShareServiceError('SHARE_FAILED', message);
  }
}

export async function shareUrl(url: string, options?: Pick<ShareImageOptions, 'title' | 'message'>): Promise<ShareResult> {
  if (Platform.OS === 'web') {
    try {
      const result = await shareUrlWeb(url, options);
      logShareAnalytics({
        channel: 'system',
        success: true,
        fallbackUsed: result.fallbackUsed,
        reason: result.message,
      });
      return result;
    } catch (error: any) {
      if (error instanceof ShareServiceError) {
        logShareAnalytics({ channel: 'system', success: false, reason: error.message });
        throw error;
      }
      const message = error?.message ?? 'Paylaşım başlatılamadı.';
      logShareAnalytics({ channel: 'system', success: false, reason: message });
      throw new ShareServiceError('SHARE_FAILED', message);
    }
  }

  try {
    await Share.share({
      title: options?.title,
      message: buildShareText(options?.message, url) || url,
      url,
    });
    logShareAnalytics({ channel: 'system', success: true });
    return { ok: true, channel: 'system' };
  } catch (error: any) {
    if (isShareCancelledError(error)) {
      logShareAnalytics({ channel: 'system', success: true, reason: 'user_cancelled' });
      return { ok: true, channel: 'system' };
    }
    const message = error?.message ?? 'Paylaşım başlatılamadı.';
    logShareAnalytics({ channel: 'system', success: false, reason: message });
    throw new ShareServiceError('SHARE_FAILED', message);
  }
}

export async function saveToGallery(uri: string): Promise<ShareResult> {
  if (Platform.OS === 'web') {
    try {
      await triggerWebDownload(uri, 'astro-guru-poster.png');
      logShareAnalytics({ channel: 'gallery', success: true, reason: 'download_started' });
      return { ok: true, channel: 'gallery', fallbackUsed: true, message: 'DOWNLOADED' };
    } catch (error: any) {
      const message = error?.message ?? 'Poster indirilemedi.';
      logShareAnalytics({ channel: 'gallery', success: false, reason: message });
      throw new ShareServiceError('MEDIA_LIBRARY_SAVE_FAILED', message);
    }
  }

  // 1. Request permission (writeOnly = true for iOS 14+ limited access)
  let permission: MediaLibrary.PermissionResponse;
  try {
    permission = await MediaLibrary.requestPermissionsAsync(true);
  } catch (permErr: any) {
    // requestPermissionsAsync itself can crash on misconfigured native modules
    const message = buildPhotosSettingsMessage();
    logShareAnalytics({ channel: 'gallery', success: false, reason: `permission_request_failed: ${permErr?.message}` });
    throw new ShareServiceError('MEDIA_LIBRARY_PERMISSION_DENIED', message, {
      suggestOpenSettings: true,
    });
  }

  if (!permission.granted) {
    const message = buildPhotosSettingsMessage();
    logShareAnalytics({ channel: 'gallery', success: false, reason: 'permission_denied' });
    throw new ShareServiceError('MEDIA_LIBRARY_PERMISSION_DENIED', message, {
      suggestOpenSettings: true,
    });
  }

  // 2. Save to gallery
  try {
    await MediaLibrary.saveToLibraryAsync(uri);
    logShareAnalytics({ channel: 'gallery', success: true });
    return { ok: true, channel: 'gallery', message: 'Görsel galeriye kaydedildi.' };
  } catch (e: any) {
    if (e instanceof ShareServiceError) {
      logShareAnalytics({ channel: 'gallery', success: false, reason: e.message });
      throw e;
    }

    const message = e?.message ?? 'Galeriye kaydetme başarısız.';
    logShareAnalytics({ channel: 'gallery', success: false, reason: message });
    throw new ShareServiceError('MEDIA_LIBRARY_SAVE_FAILED', message);
  }
}

export async function instagramStory(
  uri: string,
  options?: {
    appId?: string;
    attributionURL?: string;
    fallbackToSystemShare?: boolean;
  },
): Promise<ShareResult> {
  // Expo Go'da doğrudan Instagram Story API yok; sistem paylaşımı kullanıyoruz.
  // Kullanıcı paylaşım ekranından Instagram'ı seçebilir.
  const fallbackToSystemShare = options?.fallbackToSystemShare ?? true;

  if (Platform.OS === 'web') {
    if (!fallbackToSystemShare) {
      throw new ShareServiceError(
        'INSTAGRAM_UNAVAILABLE',
        'Instagram Story şu anda açılamıyor. İsterseniz sistem paylaşımı ile devam edebilirsiniz.',
      );
    }

    const result = await shareImage(uri, {
      title: 'Instagram Story',
      message: "Posterimi Story'de paylaşmak için indiriyorum.",
      url: options?.attributionURL,
      fileName: 'astro-guru-night-sky-story.png',
      preferFileOnly: true,
    });
    logShareAnalytics({ channel: 'instagram_story', success: true, fallbackUsed: true, reason: result.message });
    return {
      ok: true,
      channel: 'instagram_story',
      fallbackUsed: true,
      message: result.message,
    };
  }

  const canOpen =
    Platform.OS === 'ios' || Platform.OS === 'android'
      ? await Linking.canOpenURL('instagram-stories://share')
      : false;

  if (!canOpen && !fallbackToSystemShare) {
    throw new ShareServiceError(
      'INSTAGRAM_UNAVAILABLE',
      'Instagram Story şu anda açılamıyor. İsterseniz sistem paylaşımı ile devam edebilirsiniz.',
    );
  }

  try {
    await shareImage(uri);
    logShareAnalytics({ channel: 'instagram_story', success: true, fallbackUsed: true });
    return {
      ok: true,
      channel: 'instagram_story',
      fallbackUsed: true,
      message: "Paylaşım ekranı açıldı. Instagram'ı seçerek Story paylaşabilirsiniz.",
    };
  } catch (e: any) {
    const error =
      e instanceof ShareServiceError
        ? e
        : new ShareServiceError(
            'INSTAGRAM_SHARE_FAILED',
            e?.message ?? 'Instagram Story paylaşımı başlatılamadı.',
          );
    logShareAnalytics({ channel: 'instagram_story', success: false, reason: error.message });
    throw error;
  }
}

// Backward-compatible export used in older modules.
export const shareToInstagram = instagramStory;
