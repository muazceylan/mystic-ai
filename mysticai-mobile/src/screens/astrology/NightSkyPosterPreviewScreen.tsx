import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppHeader, SafeScreen } from '../../components/ui';
import * as Haptics from '../../utils/haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import BirthNightSkyPoster from '../../components/Astrology/BirthNightSkyPoster';
import { useNightSkyPosterStore } from '../../store/useNightSkyPosterStore';
import { useGenerateMatchImage } from '../../hooks/useGenerateMatchImage';
import {
  createNightSkyPosterShareLink,
  fetchNightSkyProjection,
  type NightSkyPosterVariant,
  type NightSkyProjectionResponse,
} from '../../services/astrology.service';
import {
  ShareServiceError,
  instagramStory,
  saveToGallery,
  shareImage,
} from '../../services/share.service';
import { useTranslation } from 'react-i18next';
import { useSmartBackNavigation } from '../../hooks/useSmartBackNavigation';
import { useNatalChartStore } from '../../store/useNatalChartStore';
import { isGuestUser, useAuthStore } from '../../store/useAuthStore';
import { fetchLatestNatalChart } from '../../services/astrology.service';
import { posterTokens } from '../../features/nightSkyPoster/poster.tokens';
import {
  buildCelestialLegendItems,
  buildNightSkyPosterModel,
} from '../../features/nightSkyPoster/poster.utils';
import CelestialLegendSection from '../../components/nightSkyPoster/CelestialLegendSection';
import LunarPhasesSection from '../../components/nightSkyPoster/LunarPhasesSection';

type ShareAction = 'share' | 'instagram' | 'save' | 'pdf' | null;
type VariantOption = { key: NightSkyPosterVariant; label: string; sub: string };

const META_INSTAGRAM_STORY_APP_ID =
  process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || process.env.EXPO_PUBLIC_META_APP_ID || undefined;

function buildPosterPdfHtml(imageUri: string, title: string) {
  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <style>
        body { margin:0; padding:0; background:#0a0d14; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; }
        .page { width:100%; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:18px; box-sizing:border-box; }
        .wrap { width:100%; max-width:720px; }
        .title { color:#f8fafc; text-align:center; font-size:18px; margin:0 0 12px; letter-spacing:0.3px; }
        img { width:100%; height:auto; border-radius:16px; display:block; box-shadow: 0 10px 36px rgba(0,0,0,.35); }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="wrap">
          <p class="title">${title}</p>
          <img src="${imageUri}" />
        </div>
      </div>
    </body>
  </html>`;
}

export default function NightSkyPosterPreviewScreen() {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language?.startsWith('en');
  const draft = useNightSkyPosterStore((s) => s.draft);
  const setDraft = useNightSkyPosterStore((s) => s.setDraft);
  const clearDraft = useNightSkyPosterStore((s) => s.clearDraft);
  const goBack = useSmartBackNavigation({ fallbackRoute: '/(tabs)/home' });
  const cachedChart = useNatalChartStore((s) => s.chart);
  const user = useAuthStore((s) => s.user);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const bootstrapAttemptedRef = useRef(false);
  const missingChartMessage = t('nightSkyPosterPreview.missingChartMessage');
  const variantOptions = useMemo<VariantOption[]>(
    () => [
      {
        key: 'minimal',
        label: t('nightSkyPosterPreview.variants.minimal.label'),
        sub: t('nightSkyPosterPreview.variants.minimal.sub'),
      },
      {
        key: 'constellation_heavy',
        label: t('nightSkyPosterPreview.variants.constellation.label'),
        sub: t('nightSkyPosterPreview.variants.constellation.sub'),
      },
      {
        key: 'gold_edition',
        label: t('nightSkyPosterPreview.variants.gold.label'),
        sub: t('nightSkyPosterPreview.variants.gold.sub'),
      },
    ],
    [i18n.language, t],
  );

  // Auto-build draft from natal chart store or API when draft is missing
  useEffect(() => {
    if (draft || bootstrapAttemptedRef.current) return;
    bootstrapAttemptedRef.current = true;

    const buildDraftFromChart = (chart: typeof cachedChart) => {
      if (!chart) return;
      setDraft({
        userId: user?.id ?? chart.userId,
        chartId: chart.id,
        name: chart.name ?? user?.name ?? null,
        fullName: user?.name ?? ([user?.firstName, user?.lastName].filter(Boolean).join(' ') || chart.name || null),
        firstName: user?.firstName ?? null,
        lastName: user?.lastName ?? null,
        isGuest: isGuestUser(user),
        birthDate: String(chart.birthDate),
        birthTime: chart.birthTime ?? null,
        birthLocation: chart.birthLocation ?? '',
        latitude: chart.latitude,
        longitude: chart.longitude,
        shareUrl: '',
        planets: chart.planets ?? [],
        houses: chart.houses ?? [],
        createdAt: Date.now(),
      });
    };

    if (cachedChart) {
      buildDraftFromChart(cachedChart);
      return;
    }

    // Fetch from API
    const userId = user?.id;
    if (!userId) {
      setBootstrapError(missingChartMessage);
      return;
    }

    setBootstrapLoading(true);
    fetchLatestNatalChart(userId)
      .then((res) => {
        buildDraftFromChart(res.data);
      })
      .catch(() => {
        setBootstrapError(missingChartMessage);
      })
      .finally(() => setBootstrapLoading(false));
  }, [draft, cachedChart, user, setDraft, missingChartMessage]);

  const viewShotRef = useRef<ViewShot | null>(null);
  const [layoutTick, setLayoutTick] = useState(0);
  const [actionLoading, setActionLoading] = useState<ShareAction>(null);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [variant, setVariant] = useState<NightSkyPosterVariant>('minimal');
  const [projection, setProjection] = useState<NightSkyProjectionResponse | null>(null);
  const [projectionLoading, setProjectionLoading] = useState(false);
  const [projectionError, setProjectionError] = useState<string | null>(null);
  const [resolvedShareUrl, setResolvedShareUrl] = useState<string | null>(null);
  const [shareLinkLoading, setShareLinkLoading] = useState(false);
  const [shareLinkError, setShareLinkError] = useState<string | null>(null);

  const captureConfig = useMemo(
    () => ({
      width: 1080,
      height: 1920,
      cacheSubdir: 'night-sky-share',
      filePrefix: 'night-sky-poster',
    }),
    [],
  );

  const { imageUri, loading, error, generate, retry } = useGenerateMatchImage(viewShotRef, captureConfig);
  const autoGeneratedForKeyRef = useRef<string | null>(null);
  const backendLoadSeqRef = useRef(0);

  const draftKey = useMemo(
    () => (draft ? `${draft.name}|${draft.birthDate}|${draft.birthTime ?? 'unknown'}|${draft.createdAt}` : null),
    [draft],
  );

  const renderKey = useMemo(
    () =>
      draftKey
        ? `${draftKey}|${variant}|${projection?.generatedAtUtc ?? 'no-proj'}|${resolvedShareUrl ?? draft?.shareUrl ?? 'no-share'}`
        : null,
    [draftKey, variant, projection?.generatedAtUtc, resolvedShareUrl, draft?.shareUrl],
  );

  const posterModel = useMemo(() => {
    if (!draft) return null;

    return buildNightSkyPosterModel({
      titleLabel: t('nightSkyPosterPreview.posterBadgeTitle'),
      displayName: draft.fullName ?? null,
      fullName: draft.fullName,
      firstName: draft.firstName,
      lastName: draft.lastName,
      username: null,
      isGuest: draft.isGuest,
      birthDate: draft.birthDate,
      birthTime: draft.birthTime,
      birthLocation: draft.birthLocation,
      latitude: draft.latitude,
      longitude: draft.longitude,
      planets: draft.planets,
      houses: draft.houses,
      variant,
      projection,
      shareUrl: resolvedShareUrl ?? draft.shareUrl,
      locale: isEnglish ? 'en' : 'tr',
    });
  }, [
    draft,
    isEnglish,
    projection,
    resolvedShareUrl,
    t,
    variant,
  ]);

  const legendItems = useMemo(() => {
    if (!posterModel) return [];
    return buildCelestialLegendItems({
      celestialBodies: posterModel.celestialBodies,
      locale: isEnglish ? 'en' : 'tr',
    });
  }, [posterModel, isEnglish]);

  useEffect(() => {
    autoGeneratedForKeyRef.current = null;
    setSuccessText(null);
    setVariant('minimal');
    setProjection(null);
    setProjectionError(null);
    setProjectionLoading(false);
    setResolvedShareUrl(draft?.shareUrl ?? null);
    setShareLinkError(null);
    setShareLinkLoading(false);
  }, [draftKey]);

  const loadBackendPosterData = useCallback(
    async (selectedVariant: NightSkyPosterVariant) => {
      if (!draft) return;
      const seq = ++backendLoadSeqRef.current;
      setProjectionLoading(true);
      setProjectionError(null);
      setShareLinkLoading(true);
      setShareLinkError(null);

      const projectionPromise = fetchNightSkyProjection({
        userId: draft.userId,
        chartId: draft.chartId,
        name: draft.name ?? undefined,
        birthDate: draft.birthDate,
        birthTime: draft.birthTime,
        birthLocation: draft.birthLocation,
        latitude: draft.latitude,
        longitude: draft.longitude,
        timezone: draft.timezone,
      });

      const shareLinkPromise = createNightSkyPosterShareLink({
        userId: draft.userId,
        chartId: draft.chartId,
        name: draft.name ?? undefined,
        birthDate: draft.birthDate,
        birthTime: draft.birthTime,
        birthLocation: draft.birthLocation,
        latitude: draft.latitude,
        longitude: draft.longitude,
        timezone: draft.timezone,
        variant: selectedVariant,
      });

      const [projectionRes, shareLinkRes] = await Promise.allSettled([projectionPromise, shareLinkPromise]);
      if (backendLoadSeqRef.current !== seq) return;

      if (projectionRes.status === 'fulfilled') {
        setProjection(projectionRes.value.data);
        setProjectionError(null);
      } else {
        setProjection(null);
        setProjectionError(
          (projectionRes.reason as any)?.response?.data?.message ??
            (projectionRes.reason as any)?.message ??
            t('nightSkyPosterPreview.projectionError'),
        );
      }
      setProjectionLoading(false);

      if (shareLinkRes.status === 'fulfilled') {
        setResolvedShareUrl(shareLinkRes.value.data.shareUrl || draft.shareUrl);
        setShareLinkError(null);
      } else {
        setResolvedShareUrl(draft.shareUrl);
        setShareLinkError(
          (shareLinkRes.reason as any)?.response?.data?.message ??
            (shareLinkRes.reason as any)?.message ??
            t('nightSkyPosterPreview.shareLinkError'),
        );
      }
      setShareLinkLoading(false);
    },
    [draft, t],
  );

  useEffect(() => {
    return () => {
      clearDraft();
      bootstrapAttemptedRef.current = false;
    };
  }, [clearDraft]);

  useEffect(() => {
    if (!draft) return;
    void loadBackendPosterData(variant);
  }, [draft, variant, loadBackendPosterData]);

  useEffect(() => {
    if (!draft || !layoutTick) return;
    if (autoGeneratedForKeyRef.current === renderKey) return;
    autoGeneratedForKeyRef.current = renderKey;
    void generate().catch(() => {
      // handled by hook state
    });
  }, [draft, layoutTick, renderKey, generate]);

  useEffect(() => {
    if (!successText) return;
    const timer = setTimeout(() => setSuccessText(null), 1800);
    return () => clearTimeout(timer);
  }, [successText]);

  const notifySuccess = async (message: string) => {
    setSuccessText(message);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // no-op
    }
  };

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

  const runShareAction = async (
    action: Exclude<ShareAction, null>,
    errorTitle: string,
    fn: () => Promise<void>,
  ) => {
    if (!imageUri) return;
    setActionLoading(action);
    try {
      await fn();
    } catch (e) {
      await presentShareError(errorTitle, e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleShare = async () => {
    await runShareAction('share', t('nightSkyPosterPreview.shareErrorTitle'), async () => {
      await shareImage(imageUri!);
      await notifySuccess(t('nightSkyPosterPreview.successShare'));
    });
  };

  const handleInstagram = async () => {
    await runShareAction('instagram', t('nightSkyPosterPreview.instagramErrorTitle'), async () => {
      const result = await instagramStory(imageUri!, {
        attributionURL: resolvedShareUrl ?? draft?.shareUrl,
        appId: META_INSTAGRAM_STORY_APP_ID,
        fallbackToSystemShare: true,
      });
      await notifySuccess(
        result.fallbackUsed
          ? t('nightSkyPosterPreview.successSystemShare')
          : t('nightSkyPosterPreview.successInstagram'),
      );
    });
  };

  const handleSave = async () => {
    await runShareAction('save', t('nightSkyPosterPreview.saveErrorTitle'), async () => {
      const result = await saveToGallery(imageUri!);
      await notifySuccess(result.message ?? t('nightSkyPosterPreview.successSave'));
    });
  };

  const handleExportPdf = async () => {
    await runShareAction('pdf', t('nightSkyPosterPreview.pdfErrorTitle'), async () => {
      const pdfDisplayName = draft?.isGuest ? null : draft?.fullName ?? null;
      const pdfTitle = pdfDisplayName
        ? t('nightSkyPosterPreview.pdfTitleWithName', { name: pdfDisplayName })
        : t('nightSkyPosterPreview.pdfTitle');

      // expo-print WebView cannot load local file:// URIs — convert to base64 data URI first
      let embedUri = imageUri!;
      try {
        const fs = require('expo-file-system');
        const base64: string = await fs.readAsStringAsync(imageUri!, { encoding: 'base64' });
        embedUri = `data:image/png;base64,${base64}`;
      } catch {
        // fall back to raw URI
      }

      const html = buildPosterPdfHtml(embedUri, pdfTitle);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: t('nightSkyPosterPreview.pdfDialogTitle'),
        });
      }
      await notifySuccess(t('nightSkyPosterPreview.successPdf'));
    });
  };

  const handleRegenerate = async () => {
    setSuccessText(null);
    try {
      if (draft) {
        await loadBackendPosterData(variant);
      }
      await retry();
    } catch {
      await presentShareError(
        t('nightSkyPosterPreview.regenerateErrorTitle'),
        new Error(t('nightSkyPosterPreview.regenerateErrorMessage')),
      );
    }
  };

  if (!draft) {
    return (
      <SafeScreen edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.emptyWrap}>
          {bootstrapLoading ? (
            <>
              <ActivityIndicator size="large" color={colors.violet} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {t('nightSkyPosterPreview.emptyLoadingTitle')}
              </Text>
              <Text style={[styles.emptySub, { color: colors.subtext }]}>
                {t('nightSkyPosterPreview.emptyLoadingSubtitle')}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="moon-outline" size={28} color={colors.violet} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {bootstrapError ?? t('nightSkyPosterPreview.emptyTitle')}
              </Text>
              <Text style={[styles.emptySub, { color: colors.subtext }]}>
                {t('nightSkyPosterPreview.emptySubtitle')}
              </Text>
              <Pressable style={[styles.primaryBtn, { backgroundColor: colors.violet }]} onPress={goBack}>
                <Text style={styles.primaryBtnText}>{t('common.back')}</Text>
              </Pressable>
            </>
          )}
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View pointerEvents="none" style={styles.captureHost}>
        <ViewShot
          ref={viewShotRef}
          style={styles.captureCanvas}
          onLayout={() => setLayoutTick(Date.now())}
          options={{
            format: 'png',
            quality: 1,
            result: 'tmpfile',
            width: 1080,
            height: Math.round((1080 * posterTokens.frame.height) / posterTokens.frame.width),
          } as any}
        >
          <BirthNightSkyPoster
            name={draft.name}
            fullName={draft.fullName}
            firstName={draft.firstName}
            lastName={draft.lastName}
            isGuest={draft.isGuest}
            birthDate={draft.birthDate}
            birthTime={draft.birthTime}
            birthLocation={draft.birthLocation}
            latitude={draft.latitude}
            longitude={draft.longitude}
            shareUrl={resolvedShareUrl ?? draft.shareUrl}
            planets={draft.planets}
            houses={draft.houses}
            variant={variant}
            projection={projection}
          />
        </ViewShot>
      </View>

      <AppHeader
        title={t('natalChart.birthNightTitle')}
        subtitle={t('nightSkyPosterPreview.headerSubtitle')}
        onBack={goBack}
      />

      {successText ? (
        <View style={[styles.successBanner, { backgroundColor: colors.successBg, borderColor: colors.successLight }]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={[styles.successText, { color: colors.success }]}>{successText}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.variantCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.variantHeader}>
            <View>
              <Text style={[styles.variantTitle, { color: colors.text }]}>
                {t('nightSkyPosterPreview.styleTitle')}
              </Text>
              <Text style={[styles.variantSub, { color: colors.subtext }]}>
                {t('nightSkyPosterPreview.styleSubtitle')}
              </Text>
            </View>
            {(projectionLoading || shareLinkLoading) ? (
              <View style={styles.variantSyncWrap}>
                <ActivityIndicator size="small" color={colors.violet} />
                <Text style={[styles.variantSyncText, { color: colors.subtext }]}>
                  {t('nightSkyPosterPreview.syncing')}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.variantRow}>
            {variantOptions.map((opt) => {
              const active = variant === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={[
                    styles.variantChip,
                    { backgroundColor: colors.background, borderColor: colors.border },
                    active && { borderColor: colors.violet, backgroundColor: colors.surfaceAlt },
                  ]}
                  onPress={() => setVariant(opt.key)}
                  disabled={loading || actionLoading != null}
                >
                  <Text style={[styles.variantChipLabel, { color: active ? colors.violet : colors.text }]}>{opt.label}</Text>
                  <Text style={[styles.variantChipSub, { color: colors.subtext }]} numberOfLines={1}>
                    {opt.sub}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {projectionError ? (
            <View style={[styles.backendBadge, { backgroundColor: colors.warningBg ?? colors.surfaceAlt, borderColor: colors.border }]}>
              <Ionicons name="warning-outline" size={14} color={colors.warning} />
              <Text style={[styles.backendBadgeText, { color: colors.warning }]}>{projectionError}</Text>
            </View>
          ) : null}

          {shareLinkError ? (
            <View style={[styles.backendBadge, { backgroundColor: colors.warningBg ?? colors.surfaceAlt, borderColor: colors.border }]}>
              <Ionicons name="link-outline" size={14} color={colors.warning} />
              <Text style={[styles.backendBadgeText, { color: colors.warning }]}>{shareLinkError}</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.previewShell, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {loading ? (
            <View style={styles.loaderWrap}>
              <View style={[styles.loaderGhost, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]} />
              <ActivityIndicator size="large" color={colors.violet} />
              <Text style={[styles.loaderTitle, { color: colors.text }]}>
                {t('nightSkyPosterPreview.loaderTitle')}
              </Text>
              <Text style={[styles.loaderSub, { color: colors.subtext }]}>
                {t('nightSkyPosterPreview.loaderSubtitle')}
              </Text>
            </View>
          ) : imageUri ? (
            <>
              <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
              <Text style={[styles.previewMeta, { color: colors.subtext }]}>
                {draft.birthDate} • {draft.birthTime?.slice(0, 5) ?? t('birthInfo.timeUnknown')} •{' '}
                {variantOptions.find((v) => v.key === variant)?.label ?? t('nightSkyPosterPreview.variants.minimal.label')}
              </Text>
              <Text style={[styles.previewMeta, { color: colors.subtext }]}>
                {projection
                  ? t('nightSkyPosterPreview.projectionMeta', '{{timezone}} • Swiss Ephemeris horizontal coords', {
                      timezone: projection.timezoneUsed,
                    })
                  : t('nightSkyPosterPreview.fallbackMeta')}
              </Text>

              <View style={styles.actionsBlock}>
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
                  <Text style={styles.primaryBtnText}>{t('nightSkyPosterPreview.share')}</Text>
                </Pressable>

                <View style={styles.secondaryRow}>
                  <Pressable
                    style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.border }, actionLoading && styles.btnDisabled]}
                    onPress={handleInstagram}
                    disabled={actionLoading != null}
                  >
                    {actionLoading === 'instagram' ? (
                      <ActivityIndicator size="small" color={colors.text} />
                    ) : (
                      <Ionicons name="logo-instagram" size={16} color={colors.text} />
                    )}
                    <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
                      {t('nightSkyPosterPreview.instagram')}
                    </Text>
                  </Pressable>

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
                      {t('nightSkyPosterPreview.gallery')}
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  style={[styles.secondaryWideBtn, { backgroundColor: colors.surface, borderColor: colors.border }, actionLoading && styles.btnDisabled]}
                  onPress={handleExportPdf}
                  disabled={actionLoading != null}
                >
                  {actionLoading === 'pdf' ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <Ionicons name="document-text-outline" size={16} color={colors.text} />
                  )}
                  <Text style={[styles.secondaryWideBtnText, { color: colors.text }]}>
                    {t('nightSkyPosterPreview.pdf')}
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.secondaryWideBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={handleRegenerate}
                  disabled={loading || actionLoading != null}
                >
                  <Ionicons name="refresh" size={16} color={colors.text} />
                  <Text style={[styles.secondaryWideBtnText, { color: colors.text }]}>
                    {t('nightSkyPosterPreview.refresh')}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.loaderWrap}>
              <Ionicons name="warning-outline" size={24} color={colors.warning} />
              <Text style={[styles.loaderTitle, { color: colors.text }]}>
                {t('nightSkyPosterPreview.errorTitle')}
              </Text>
              <Text style={[styles.loaderSub, { color: colors.subtext }]}>
                {error ?? t('nightSkyPosterPreview.unexpectedError')}
              </Text>
              <Pressable style={[styles.primaryBtn, { backgroundColor: colors.violet }]} onPress={handleRegenerate}>
                <Text style={styles.primaryBtnText}>{t('common.retry')}</Text>
              </Pressable>
            </View>
          )}
        </View>

        {posterModel ? (
          <LunarPhasesSection
            model={posterModel}
            title={t('nightSkyPosterPreview.moonPhaseTitle')}
            subtitle={t('nightSkyPosterPreview.moonPhaseSubtitle')}
            illuminationLabel={t('nightSkyPosterPreview.illumination')}
          />
        ) : null}

        {legendItems.length ? (
          <CelestialLegendSection
            title={t('nightSkyPosterPreview.celestialMarkersTitle')}
            subtitle={t('nightSkyPosterPreview.celestialMarkersSubtitle')}
            items={legendItems}
          />
        ) : null}

      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  captureHost: {
    position: 'absolute',
    opacity: 0,
    left: -9999,
    top: -9999,
  },
  captureCanvas: {
    width: posterTokens.frame.width,
    height: posterTokens.frame.height,
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
  variantCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  variantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  variantTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  variantSub: {
    marginTop: 2,
    fontSize: 11.5,
    lineHeight: 16,
  },
  variantSyncWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
  },
  variantSyncText: {
    fontSize: 11,
    fontWeight: '600',
  },
  variantRow: {
    flexDirection: 'row',
    gap: 8,
  },
  variantChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    minHeight: 56,
  },
  variantChipLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  variantChipSub: {
    marginTop: 2,
    fontSize: 10.5,
  },
  backendBadge: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backendBadgeText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '600',
  },
  previewShell: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 320,
  },
  previewImage: {
    width: '100%',
    aspectRatio: posterTokens.frame.width / posterTokens.frame.height,
    borderRadius: 14,
    backgroundColor: '#000',
  },
  previewMeta: {
    marginTop: 8,
    fontSize: 11.5,
  },
  loaderWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  loaderGhost: {
    width: '100%',
    aspectRatio: posterTokens.frame.width / posterTokens.frame.height,
    borderRadius: 14,
    borderWidth: 1,
  },
  loaderTitle: { fontSize: 14, fontWeight: '700' },
  loaderSub: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 280,
  },
  actionsBlock: {
    width: '100%',
    gap: 10,
    marginTop: 14,
  },
  primaryBtn: {
    minHeight: 46,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#FFF',
    fontWeight: '700',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryWideBtn: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptySub: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
