import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { AppHeader, SafeScreen } from '../../components/ui';
import * as Haptics from '../../utils/haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import NatalChartProPanels from '../../components/Astrology/NatalChartProPanels';
import { useNatalVisualsStore, type NatalVisualPresetKey } from '../../store/useNatalVisualsStore';
import { useGenerateMatchImage } from '../../hooks/useGenerateMatchImage';
import {
  ShareServiceError,
  saveToGallery,
  shareImage,
} from '../../services/share.service';
import { useSmartBackNavigation } from '../../hooks/useSmartBackNavigation';
import { useTranslation } from 'react-i18next';

type CaptureAction = 'share' | 'save' | 'pdf' | null;

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

function clampTranslation(value: number, scale: number, size: number) {
  'worklet';
  if (scale <= 1 || size <= 0) return 0;
  const limit = ((scale - 1) * size) / 2;
  return Math.min(limit, Math.max(-limit, value));
}

type VisualPreset = {
  key: NatalVisualPresetKey;
  label: string;
  sub: string;
  panels?: Array<'wheel' | 'matrix' | 'balance'>;
  captureWidth: number;
  captureHeight: number;
  canvasWidth: number;
};

function buildVisualsPdfHtml(imageUri: string, title: string, options?: { bare?: boolean }) {
  if (options?.bare) {
    return `
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <style>
          body { margin:0; padding:24px; background:#f6f3ec; font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif; }
          .wrap { max-width:1080px; margin:0 auto; }
          img { width:100%; height:auto; display:block; border-radius:28px; background:#f6f3ec; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <img src="${imageUri}" alt="${title}" />
        </div>
      </body>
    </html>`;
  }

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <style>
        body { margin:0; padding:32px; background:#0f172a; font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif; }
        .wrap { max-width:1080px; margin:0 auto; }
        .card { background:linear-gradient(180deg,#111c36 0%,#0f172a 100%); border:1px solid rgba(255,255,255,0.08); border-radius:28px; padding:28px; box-shadow:0 20px 56px rgba(15,23,42,0.34); }
        h1 { margin:0 0 16px; font-size:20px; color:#f8fafc; letter-spacing:0.3px; }
        img { width:100%; height:auto; display:block; border-radius:22px; box-shadow:0 18px 40px rgba(2,6,23,0.28); background:#fff; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="card">
          <h1>${title}</h1>
          <img src="${imageUri}" />
        </div>
      </div>
    </body>
  </html>`;
}

export default function NatalVisualsPreviewScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const draft = useNatalVisualsStore((s) => s.draft);
  const clearDraft = useNatalVisualsStore((s) => s.clearDraft);
  const goBack = useSmartBackNavigation({ fallbackRoute: '/(tabs)/home' });

  const viewShotRef = useRef<ViewShot | null>(null);
  const [layoutTick, setLayoutTick] = useState(0);
  const [actionLoading, setActionLoading] = useState<CaptureAction>(null);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [isZoomActive, setIsZoomActive] = useState(false);
  const [nativeZoomKey, setNativeZoomKey] = useState(0);
  const presetKey = draft?.presetKey ?? 'wheel';
  const isWheelPreset = presetKey === 'wheel';
  const useNativePreviewZoom = Platform.OS === 'ios';
  const maxZoomScale = isWheelPreset ? 4 : 3;

  const zoomScale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const previewWidth = useSharedValue(0);
  const previewHeight = useSharedValue(0);
  const presets = useMemo<VisualPreset[]>(
    () => [
      {
        key: 'wheel',
        label: t('natalVisualsPreview.presets.wheel.label'),
        sub: t('natalVisualsPreview.presets.wheel.sub'),
        panels: ['wheel'],
        captureWidth: 1800,
        captureHeight: 1800,
        canvasWidth: 760,
      },
      {
        key: 'matrix',
        label: t('natalVisualsPreview.presets.matrix.label'),
        sub: t('natalVisualsPreview.presets.matrix.sub'),
        panels: ['matrix'],
        captureWidth: 1600,
        captureHeight: 1320,
        canvasWidth: 720,
      },
      {
        key: 'balance',
        label: t('natalVisualsPreview.presets.balance.label'),
        sub: t('natalVisualsPreview.presets.balance.sub'),
        panels: ['balance'],
        captureWidth: 1320,
        captureHeight: 1320,
        canvasWidth: 560,
      },
    ],
    [t],
  );

  const preset = useMemo(
    () => presets.find((item) => item.key === presetKey) ?? presets[0],
    [presetKey, presets],
  );
  const captureCanvasHeight = useMemo(
    () => Math.round((preset.canvasWidth * preset.captureHeight) / preset.captureWidth),
    [preset.canvasWidth, preset.captureHeight, preset.captureWidth],
  );
  const previewAspectRatio = useMemo(
    () => preset.captureWidth / preset.captureHeight,
    [preset.captureHeight, preset.captureWidth],
  );

  const captureConfig = useMemo(
    () => ({
      width: preset.captureWidth,
      height: preset.captureHeight,
      cacheSubdir: 'natal-visuals-share',
      filePrefix: `natal-visuals-${preset.key}`,
    }),
    [preset.captureWidth, preset.captureHeight, preset.key],
  );

  const { imageUri, loading, error, generate, retry } = useGenerateMatchImage(viewShotRef, captureConfig);
  const autoGeneratedForKeyRef = useRef<string | null>(null);

  const draftKey = useMemo(
    () =>
      draft
        ? `${draft.name}|${draft.birthDate}|${draft.birthTime ?? 'unknown'}|${draft.createdAt}`
        : null,
    [draft],
  );

  const renderKey = useMemo(
    () => (draftKey ? `${draftKey}|${preset.key}` : null),
    [draftKey, preset.key],
  );

  useEffect(() => {
    return () => {
      clearDraft();
    };
  }, [clearDraft]);

  useEffect(() => {
    if (!draft || !layoutTick || !renderKey) return;
    if (autoGeneratedForKeyRef.current === renderKey) return;
    autoGeneratedForKeyRef.current = renderKey;
    void generate().catch(() => {
      // handled by hook
    });
  }, [draft, layoutTick, renderKey, generate]);

  useEffect(() => {
    if (!successText) return;
    const timer = setTimeout(() => setSuccessText(null), 1800);
    return () => clearTimeout(timer);
  }, [successText]);

  const syncZoomState = useCallback((active: boolean) => {
    setIsZoomActive(active);
  }, []);

  const resetPreviewZoom = useCallback(() => {
    savedScale.value = 1;
    zoomScale.value = withTiming(1, { duration: 180 });
    startX.value = 0;
    startY.value = 0;
    translateX.value = withTiming(0, { duration: 180 });
    translateY.value = withTiming(0, { duration: 180 });
    setIsZoomActive(false);
    setNativeZoomKey((value) => value + 1);
  }, [savedScale, startX, startY, translateX, translateY, zoomScale]);

  useEffect(() => {
    resetPreviewZoom();
  }, [imageUri, preset.key, resetPreviewZoom]);

  const zoomPreviewStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: zoomScale.value },
    ],
  }));

  const pinchGesture = useMemo(
    () => Gesture.Pinch()
      .onUpdate((event) => {
        const nextScale = clamp(savedScale.value * event.scale, 1, maxZoomScale);
        zoomScale.value = nextScale;
        translateX.value = clampTranslation(translateX.value, nextScale, previewWidth.value);
        translateY.value = clampTranslation(translateY.value, nextScale, previewHeight.value);
      })
      .onEnd(() => {
        if (zoomScale.value <= 1.01) {
          savedScale.value = 1;
          zoomScale.value = withTiming(1, { duration: 180 });
          translateX.value = withTiming(0, { duration: 180 });
          translateY.value = withTiming(0, { duration: 180 });
          startX.value = 0;
          startY.value = 0;
          runOnJS(syncZoomState)(false);
          return;
        }

        savedScale.value = zoomScale.value;
        translateX.value = clampTranslation(translateX.value, zoomScale.value, previewWidth.value);
        translateY.value = clampTranslation(translateY.value, zoomScale.value, previewHeight.value);
        startX.value = translateX.value;
        startY.value = translateY.value;
        runOnJS(syncZoomState)(true);
      }),
    [maxZoomScale, previewHeight, previewWidth, savedScale, startX, startY, syncZoomState, translateX, translateY, zoomScale],
  );

  const panGesture = useMemo(
    () => Gesture.Pan()
      .minDistance(2)
      .onStart(() => {
        startX.value = translateX.value;
        startY.value = translateY.value;
      })
      .onUpdate((event) => {
        if (zoomScale.value <= 1.01) return;
        translateX.value = clampTranslation(startX.value + event.translationX, zoomScale.value, previewWidth.value);
        translateY.value = clampTranslation(startY.value + event.translationY, zoomScale.value, previewHeight.value);
      })
      .onEnd(() => {
        startX.value = translateX.value;
        startY.value = translateY.value;
      }),
    [previewHeight, previewWidth, startX, startY, translateX, translateY, zoomScale],
  );

  const doubleTapGesture = useMemo(
    () => Gesture.Tap()
      .numberOfTaps(2)
      .maxDuration(250)
      .onEnd(() => {
        savedScale.value = 1;
        zoomScale.value = withTiming(1, { duration: 180 });
        startX.value = 0;
        startY.value = 0;
        translateX.value = withTiming(0, { duration: 180 });
        translateY.value = withTiming(0, { duration: 180 });
        runOnJS(syncZoomState)(false);
      }),
    [savedScale, startX, startY, syncZoomState, translateX, translateY, zoomScale],
  );

  const previewGesture = useMemo(
    () => Gesture.Exclusive(doubleTapGesture, Gesture.Simultaneous(panGesture, pinchGesture)),
    [doubleTapGesture, panGesture, pinchGesture],
  );

  const notifySuccess = useCallback(async (message: string) => {
    setSuccessText(message);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // no-op
    }
  }, []);

  const presentShareError = useCallback(async (title: string, cause: unknown) => {
    const error =
      cause instanceof ShareServiceError
        ? cause
        : new Error((cause as any)?.message ?? t('common.operationFailed'));

    const openSettings = async () => {
      try {
        await Linking.openSettings();
      } catch {
        Alert.alert(
          t('common.settingsUnavailableTitle'),
          t('common.settingsUnavailableDescription'),
        );
      }
    };

    if (error instanceof ShareServiceError && error.suggestOpenSettings) {
      Alert.alert(title, error.message, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.openSettings'), onPress: () => void openSettings() },
      ]);
      return;
    }

    Alert.alert(title, error.message);
  }, [t]);

  const runAction = useCallback(
    async (action: Exclude<CaptureAction, null>, title: string, fn: () => Promise<void>) => {
      if (!imageUri) return;
      setActionLoading(action);
      try {
        await fn();
      } catch (e) {
        await presentShareError(title, e);
      } finally {
        setActionLoading(null);
      }
    },
    [imageUri, presentShareError],
  );

  const handleRegenerate = useCallback(async () => {
    setSuccessText(null);
    autoGeneratedForKeyRef.current = null;
    try {
      await retry();
    } catch {
      await presentShareError(
        t('natalVisualsPreview.regenerateErrorTitle'),
        new Error(t('natalVisualsPreview.regenerateErrorMessage')),
      );
    }
  }, [retry, presentShareError, t]);

  const handleShare = useCallback(async () => {
    await runAction('share', t('natalVisualsPreview.shareErrorTitle'), async () => {
      await shareImage(imageUri!);
      await notifySuccess(t('natalVisualsPreview.successShare'));
    });
  }, [runAction, imageUri, notifySuccess, t]);

  const handleSave = useCallback(async () => {
    await runAction('save', t('natalVisualsPreview.saveErrorTitle'), async () => {
      const result = await saveToGallery(imageUri!);
      await notifySuccess(result.message ?? t('natalVisualsPreview.successSave'));
    });
  }, [runAction, imageUri, notifySuccess, t]);

  const handleExportPdf = useCallback(async () => {
    await runAction('pdf', t('natalVisualsPreview.pdfErrorTitle'), async () => {
      // expo-print WebView cannot load local file:// URIs — convert to base64 data URI first
      let embedUri = imageUri!;
      try {
        const fs = require('expo-file-system');
        const base64: string = await fs.readAsStringAsync(imageUri!, { encoding: 'base64' });
        embedUri = `data:image/png;base64,${base64}`;
      } catch {
        // fall back to raw URI
      }

      const html = buildVisualsPdfHtml(
        embedUri,
        `${preset.label} • ${draft?.name ?? t('natalVisualsPreview.profileFallback')}`,
        { bare: isWheelPreset },
      );
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `${preset.label} (PDF)`,
        });
      }
      await notifySuccess(t('natalVisualsPreview.successPdf'));
    });
  }, [runAction, imageUri, draft?.name, notifySuccess, preset.label, isWheelPreset, t]);

  if (!draft) {
    return (
      <SafeScreen edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.emptyWrap}>
          <Ionicons name="scan-outline" size={28} color={colors.violet} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('natalVisualsPreview.emptyTitle')}</Text>
          <Text style={[styles.emptySub, { color: colors.subtext }]}>
            {t('natalVisualsPreview.emptySubtitle')}
          </Text>
          <Pressable style={[styles.primaryBtn, { backgroundColor: colors.violet }]} onPress={goBack}>
            <Text style={styles.primaryBtnText}>{t('common.back')}</Text>
          </Pressable>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View pointerEvents="none" style={styles.captureHost}>
        <ViewShot
          ref={viewShotRef}
          style={[styles.captureCanvas, { width: preset.canvasWidth, height: captureCanvasHeight }]}
          onLayout={() => setLayoutTick(Date.now())}
          options={{
            format: 'png',
            quality: 1,
            result: 'tmpfile',
            width: preset.captureWidth,
            height: preset.captureHeight,
          } as any}
        >
          <View
            style={[
              styles.captureCard,
              isWheelPreset && styles.captureCardWheel,
              {
                backgroundColor: colors.background,
                borderColor: isWheelPreset ? 'transparent' : colors.border,
                minHeight: captureCanvasHeight,
              },
            ]}
          >
            {!isWheelPreset ? (
              <View style={styles.captureHeader}>
                <Text style={[styles.captureTitle, { color: colors.text }]}>
                  {draft.name ?? t('natalVisualsPreview.chartFallback')}
                </Text>
                <Text style={[styles.captureMeta, { color: colors.subtext }]}>
                  {draft.birthDate} • {draft.birthTime?.slice(0, 5) ?? t('natalVisualsPreview.timeUnknown')} •{' '}
                  {draft.birthLocation ?? t('natalVisualsPreview.locationFallback')}
                </Text>
              </View>
            ) : null}
            <View
              style={[
                styles.captureVisualFrame,
                isWheelPreset
                  ? styles.captureVisualFrameWheel
                  : { backgroundColor: colors.surface, borderColor: colors.borderLight },
              ]}
            >
              <NatalChartProPanels
                planets={draft.planets}
                houses={draft.houses}
                aspects={draft.aspects}
                risingSign={draft.risingSign}
                panels={preset.panels}
                renderWidthOverride={isWheelPreset ? preset.canvasWidth - 2 : preset.canvasWidth - 40}
                presentation={isWheelPreset ? 'poster' : 'default'}
              />
            </View>
          </View>
        </ViewShot>
      </View>

      <AppHeader
        title={preset.label}
        subtitle={isWheelPreset ? t('natalVisualsPreview.headerWheelSubtitle') : preset.sub}
        onBack={goBack}
      />

      {successText ? (
        <View style={[styles.successBanner, { backgroundColor: colors.successBg, borderColor: colors.successLight }]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={[styles.successText, { color: colors.success }]}>{successText}</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isZoomActive}
      >
        {!isWheelPreset ? (
          <View style={[styles.posterInfoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{preset.label}</Text>
            <Text style={[styles.sectionSub, { color: colors.subtext }]}>
              {t('natalVisualsPreview.posterInfoSubtitle', { preset: preset.label })}
            </Text>
            <View style={styles.posterInfoRow}>
              <View style={[styles.posterInfoPill, { backgroundColor: colors.primaryTint, borderColor: colors.borderLight }]}>
                <Text style={[styles.posterInfoPillText, { color: colors.violet }]}>PNG {preset.captureWidth}×{preset.captureHeight}</Text>
              </View>
              <View style={[styles.posterInfoPill, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}>
                <Text style={[styles.posterInfoPillText, { color: colors.textMuted }]}>
                  {draft.name ?? t('natalVisualsPreview.profileFallback')}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <View
          style={[
            styles.previewShell,
            isWheelPreset && styles.previewShellWheel,
            { backgroundColor: isWheelPreset ? 'transparent' : colors.surface, borderColor: isWheelPreset ? 'transparent' : colors.border },
          ]}
        >
          {loading ? (
            <View style={styles.loaderWrap}>
              <View style={[styles.loaderGhost, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]} />
              <ActivityIndicator size="large" color={colors.violet} />
              <Text style={[styles.loaderTitle, { color: colors.text }]}>{t('natalVisualsPreview.loaderTitle')}</Text>
              <Text style={[styles.loaderSub, { color: colors.subtext }]}>
                {t('natalVisualsPreview.loaderSubtitle', { preset: preset.label })}
              </Text>
            </View>
          ) : imageUri ? (
            <>
              <View
                style={[
                  styles.previewImageWrap,
                  isWheelPreset && styles.previewImageWrapWheel,
                  {
                    backgroundColor: colors.background,
                    borderColor: isWheelPreset ? 'transparent' : colors.border,
                    aspectRatio: previewAspectRatio,
                  },
                ]}
                onLayout={({ nativeEvent }) => {
                  previewWidth.value = nativeEvent.layout.width;
                  previewHeight.value = nativeEvent.layout.height;
                }}
              >
                {useNativePreviewZoom ? (
                  <ScrollView
                    key={`native-zoom-${nativeZoomKey}`}
                    style={styles.previewNativeZoomScroll}
                    contentContainerStyle={styles.previewNativeZoomContent}
                    minimumZoomScale={1}
                    maximumZoomScale={maxZoomScale}
                    pinchGestureEnabled
                    bouncesZoom={false}
                    centerContent
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    scrollEventThrottle={16}
                    onScroll={(event) => {
                      const nextZoomScale = (event.nativeEvent as any)?.zoomScale ?? 1;
                      setIsZoomActive(nextZoomScale > 1.01);
                    }}
                  >
                    <View style={styles.previewNativeZoomSurface} collapsable={false}>
                      <Image
                        source={{ uri: imageUri }}
                        style={styles.previewImage}
                        resizeMode="contain"
                      />
                    </View>
                  </ScrollView>
                ) : (
                  <GestureDetector gesture={previewGesture}>
                    <Animated.View style={[styles.previewZoomLayer, zoomPreviewStyle]}>
                      <Image
                        source={{ uri: imageUri }}
                        style={styles.previewImage}
                        resizeMode="contain"
                      />
                    </Animated.View>
                  </GestureDetector>
                )}
              </View>
              {!isWheelPreset ? (
                <Text style={[styles.previewMeta, { color: colors.subtext }]}>
                  {t('natalVisualsPreview.previewMeta', {
                    preset: preset.label,
                    name: draft.name ?? t('natalVisualsPreview.profileFallback'),
                    birthDate: draft.birthDate,
                    width: preset.captureWidth,
                    height: preset.captureHeight,
                  })}
                </Text>
              ) : null}
            </>
          ) : (
            <View style={styles.loaderWrap}>
              <Ionicons name="warning-outline" size={24} color={colors.warning} />
              <Text style={[styles.loaderTitle, { color: colors.text }]}>{t('natalVisualsPreview.errorTitle')}</Text>
              <Text style={[styles.loaderSub, { color: colors.subtext }]}>
                {error ?? t('natalVisualsPreview.unexpectedError')}
              </Text>
              <Pressable style={[styles.primaryBtn, { backgroundColor: colors.violet }]} onPress={handleRegenerate}>
                <Text style={styles.primaryBtnText}>{t('common.retry')}</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.actionsBlock}>
          <Pressable
            style={[styles.secondaryWideBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleRegenerate}
            disabled={loading || actionLoading != null}
          >
            <Ionicons name="refresh" size={16} color={colors.text} />
            <Text style={[styles.secondaryWideBtnText, { color: colors.text }]}>
              {t('natalVisualsPreview.regenerate')}
            </Text>
          </Pressable>

          {imageUri && !loading ? (
            <>
              <Pressable
                style={[styles.primaryBtn, { backgroundColor: colors.violet }, actionLoading && styles.btnDisabled]}
                onPress={handleShare}
                disabled={actionLoading != null}
              >
                {actionLoading === 'share' ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="share-social" size={16} color="#FFF" />
                )}
                <Text style={styles.primaryBtnText}>{t('natalVisualsPreview.share')}</Text>
              </Pressable>

              <View style={styles.secondaryRow}>
                <Pressable
                  style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.border }, actionLoading && styles.btnDisabled]}
                  onPress={handleSave}
                  disabled={actionLoading != null}
                >
                  {actionLoading === 'save' ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <Ionicons name="download-outline" size={16} color={colors.text} />
                  )}
                  <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
                    {t('natalVisualsPreview.saveToGallery')}
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.border }, actionLoading && styles.btnDisabled]}
                  onPress={handleExportPdf}
                  disabled={actionLoading != null}
                >
                  {actionLoading === 'pdf' ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <Ionicons name="document-text-outline" size={16} color={colors.text} />
                  )}
                  <Text style={[styles.secondaryBtnText, { color: colors.text }]}>PDF</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  captureHost: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    opacity: 0,
  },
  captureCanvas: {
    width: 680,
    height: 680,
  },
  captureCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 14,
    overflow: 'hidden',
  },
  captureCardWheel: {
    borderRadius: 0,
    borderWidth: 0,
    padding: 0,
    gap: 0,
    justifyContent: 'center',
  },
  captureHeader: {
    gap: 4,
  },
  captureEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  captureTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  captureMeta: {
    fontSize: 12,
    lineHeight: 17,
  },
  captureVisualFrame: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 10,
  },
  captureVisualFrameWheel: {
    borderRadius: 0,
    borderWidth: 0,
    padding: 0,
    backgroundColor: 'transparent',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureFooter: {
    alignItems: 'center',
  },
  captureFooterText: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  headerSub: { fontSize: 12, lineHeight: 17 },
  successBanner: {
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  successText: { fontSize: 12, fontWeight: '600' },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 14,
  },
  posterInfoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  sectionSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  posterInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  posterInfoPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  posterInfoPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  previewShell: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  previewShellWheel: {
    borderWidth: 0,
    padding: 0,
    gap: 0,
  },
  previewImageWrap: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImageWrapWheel: {
    borderRadius: 0,
    borderWidth: 0,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewZoomLayer: {
    width: '100%',
    height: '100%',
  },
  previewNativeZoomScroll: {
    width: '100%',
    height: '100%',
  },
  previewNativeZoomContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewNativeZoomSurface: {
    width: '100%',
    height: '100%',
  },
  previewMeta: {
    fontSize: 11.5,
    lineHeight: 16,
    textAlign: 'center',
  },
  loaderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 320,
    gap: 8,
    paddingHorizontal: 16,
  },
  loaderGhost: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    borderWidth: 1,
  },
  loaderTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  loaderSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  actionsBlock: {
    gap: 10,
  },
  primaryBtn: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
  },
  secondaryBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  secondaryWideBtn: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  secondaryWideBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.65,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
  },
});
