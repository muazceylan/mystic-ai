import { Linking, Platform, Share } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';

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

function logShareAnalytics(payload: AnalyticsPayload) {
  // TODO: replace with real analytics SDK integration
  console.info('[analytics][match_card_share]', payload);
}

function buildPhotosSettingsMessage() {
  if (Platform.OS === 'ios') {
    return 'Galeriye kaydetmek için fotoğraf izni gerekli. Ayarlar > Fotoğraflar > Mystic AI yolundan izin verebilirsiniz.';
  }
  return 'Galeriye kaydetmek için medya izni gerekli. Gerekirse Ayarlar > Fotoğraflar (iOS) veya uygulama izinleri ekranından erişimi açın.';
}

function isShareCancelledError(error: any) {
  const message = String(error?.message ?? '').toLowerCase();
  return message.includes('cancel') || message.includes('canceled') || message.includes('cancelled');
}

export async function shareImage(uri: string): Promise<ShareResult> {
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
        message: 'Yıldız kartımı seninle paylaşıyorum!',
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

export async function saveToGallery(uri: string): Promise<ShareResult> {
  try {
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) {
      const message = buildPhotosSettingsMessage();
      throw new ShareServiceError('MEDIA_LIBRARY_PERMISSION_DENIED', message, {
        suggestOpenSettings: true,
      });
    }

    await MediaLibrary.saveToLibraryAsync(uri);
    logShareAnalytics({ channel: 'gallery', success: true });
    return { ok: true, channel: 'gallery', message: 'Kart galeriye kaydedildi.' };
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

