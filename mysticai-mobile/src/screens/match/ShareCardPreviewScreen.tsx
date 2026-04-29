import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, AccessibleText, SafeScreen, SurfaceHeaderIconButton } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { ACCESSIBILITY } from '../../constants/tokens';
import { useMatchTraits } from '../../hooks/useMatchTraits';
import { useGenerateMatchImage } from '../../hooks/useGenerateMatchImage';
import {
  ShareCardPreview,
  ShareCardPreviewGuru,
  ShareCardPreviewHoroscope,
  ShareCardPreviewNumerology,
  ShareCardPrimaryActions,
  ShareableCardsBackgroundDecor,
  ShareableCardsStateCard,
  ShareableCardsTabs,
  type ShareCardAspectRatioKey,
  type ShareCardIconSetKey,
  type ShareCardLayoutKey,
  type ShareCardThemeKey,
  type ShareCardTypeKey,
  type ShareableCardsActionItem,
  type ShareableCardsPreviewModel,
  type HoroscopePreviewModel,
  type NumerologyPreviewModel,
  type ShareableCardsTabItem,
  type ShareableCardsTabKey,
  type ShareableCardsViewState,
} from '../../components/match/shareableCards';
import { useSmartBackNavigation } from '../../hooks/useSmartBackNavigation';
import { useMatchCardStore } from '../../store/useMatchCardStore';
import { toTraitAxes, type TraitAxis } from '../../services/match.api';
import {
  getSynastry,
  getUserSynastries,
  type RelationshipType,
  type SynastryDisplayMetric,
  type SynastryResponse,
  type SynastryScoreBreakdown,
} from '../../services/synastry.service';
import { useSynastryStore } from '../../store/useSynastryStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useHoroscopeStore } from '../../features/horoscope/store/useHoroscopeStore';
import { fetchNumerology, type NumerologyShareCardPayload } from '../../services/numerology.service';
import { ZODIAC_MAP, getSignEmoji, getSignFromBirthDate, getSignName, resolveZodiacSign } from '../../features/horoscope/utils/zodiacData';
import type { ZodiacSign } from '../../features/horoscope/types/horoscope.types';
import {
  ShareServiceError,
  saveToGallery,
  shareImage,
} from '../../services/share.service';
import { parseLocalizedSignLabel } from '../../utils/matchAstroLabels';
import * as Haptics from '../../utils/haptics';
import { radius, spacing } from '../../theme';
import {
  useModuleMonetization,
  ActionUnlockSheet,
  FEATURE_ACTION_KEYS,
  FEATURE_MODULE_KEYS,
  MonetizationQuickBar,
  PurchaseCatalogSheet,
} from '../../features/monetization';
import { trackEvent } from '../../services/analytics';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useSurfaceNavigationActions } from '../../hooks/useSurfaceNavigationActions';

type ShareAction = 'share' | 'save' | 'download' | 'generate' | null;

type SynastryCardMeta = {
  relationshipType: RelationshipType | null;
  relationLabel: string | null;
  scoreBreakdown: Pick<SynastryScoreBreakdown, 'overall' | 'love' | 'communication' | 'spiritualBond'> | null;
  displayMetrics: SynastryDisplayMetric[] | null;
};

type PreviewSeedSourceKind = 'selected_synastry' | 'saved_draft' | 'live' | 'mock' | 'quick_seed';

type PreviewSeed = {
  score: number;
  summary: string;
  leftName: string;
  rightName: string;
  leftSignLabel: string;
  rightSignLabel: string;
  relationshipType: RelationshipType | null;
  relationLabel: string | null;
  scoreBreakdown: Pick<SynastryScoreBreakdown, 'overall' | 'love' | 'communication' | 'spiritualBond'> | null;
  displayMetrics: SynastryDisplayMetric[] | null;
  traitAxes: TraitAxis[] | null;
  aspectsCount: number;
  sourceKind: PreviewSeedSourceKind;
  sourceLabel: string | null;
};

const MODULE_KEY = FEATURE_MODULE_KEYS.SHARE_CARDS;
const ACTION_KEY_EXPORT = FEATURE_ACTION_KEYS.SHAREABLE_CARD_CREATE;

const CAPTURE_WIDTH = 1080;
const CANVAS_WIDTH = 360;

function clampScore(value: number | null | undefined, fallback = 80) {
  const raw = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function parseParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseMatchId(value: string | string[] | undefined) {
  const raw = parseParamValue(value);
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function parseRelationshipType(value: string | string[] | undefined): RelationshipType | null {
  const raw = parseParamValue(value);
  const source = String(raw ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '');

  const map: Record<string, RelationshipType> = {
    love: 'LOVE',
    ask: 'LOVE',
    partner: 'LOVE',
    es: 'LOVE',
    relationship: 'LOVE',
    business: 'BUSINESS',
    work: 'BUSINESS',
    is: 'BUSINESS',
    kariyer: 'BUSINESS',
    friend: 'FRIENDSHIP',
    friendship: 'FRIENDSHIP',
    arkadas: 'FRIENDSHIP',
    arkadaslik: 'FRIENDSHIP',
    family: 'FAMILY',
    aile: 'FAMILY',
    rival: 'RIVAL',
    rekabet: 'RIVAL',
    rakip: 'RIVAL',
  };

  return map[source] ?? null;
}

function normalizeComparableName(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ');
}

function aspectRatioValue(aspectRatio: ShareCardAspectRatioKey) {
  return aspectRatio === 'portrait' ? 4 / 5 : 9 / 16;
}

function resolveMetricScore(
  displayMetrics: SynastryDisplayMetric[] | null | undefined,
  keys: string[],
  fallback: number,
) {
  const metric = (displayMetrics ?? []).find((item) => {
    const haystack = `${item.id} ${item.label}`.toLocaleLowerCase('tr-TR');
    return keys.some((key) => haystack.includes(key));
  });

  return typeof metric?.score === 'number' ? clampScore(metric.score, fallback) : fallback;
}

function buildShareCardPdfHtml(title: string, imageUri: string) {
  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <style>
        body { margin:0; padding:26px; background:#f5f1ff; font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif; }
        .wrap { max-width:980px; margin:0 auto; }
        .shell { background:linear-gradient(180deg,#ffffff 0%,#f6efff 100%); border-radius:32px; padding:24px; box-shadow:0 22px 56px rgba(88,61,163,.16); }
        .eyebrow { margin:0 0 8px; color:#8b6ce9; font-size:12px; font-weight:700; letter-spacing:0.4px; text-transform:uppercase; }
        .title { margin:0 0 16px; color:#271d45; font-size:24px; line-height:30px; font-weight:700; }
        .image-wrap { border-radius:28px; overflow:hidden; background:#ffffff; }
        img { width:100%; height:auto; display:block; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="shell">
          <p class="eyebrow">Astro Guru</p>
          <p class="title">${title}</p>
          <div class="image-wrap">
            <img src="${imageUri}" alt="${title}" />
          </div>
        </div>
      </div>
    </body>
  </html>`;
}

function translateShareServiceError(
  error: ShareServiceError,
  t: (key: string) => string,
) {
  if (error.code === 'MEDIA_LIBRARY_PERMISSION_DENIED') {
    return t('shareableCards.alerts.mediaPermissionDenied');
  }
  if (error.code === 'MEDIA_LIBRARY_SAVE_FAILED') {
    return t('shareableCards.alerts.mediaSaveFailed');
  }
  if (error.code === 'SHARING_UNAVAILABLE') {
    return t('shareableCards.alerts.shareUnavailable');
  }
  return t('shareableCards.alerts.genericFailure');
}

function StatusBanner({
  iconName,
  text,
  tone,
}: {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
  tone: 'success' | 'warning' | 'info';
}) {
  const { colors } = useTheme();

  const palette = tone === 'success'
    ? {
        borderColor: colors.successLight,
        backgroundColor: colors.successBg,
        textColor: colors.success,
      }
    : tone === 'warning'
    ? {
        borderColor: colors.warningBg,
        backgroundColor: '#FFF6E8',
        textColor: colors.warningDark,
      }
    : {
        borderColor: colors.violetLight,
        backgroundColor: colors.violetBg,
        textColor: colors.violet,
      };

  return (
    <View
      style={[
        styles.banner,
        {
          borderColor: palette.borderColor,
          backgroundColor: palette.backgroundColor,
        },
      ]}
    >
      <Ionicons name={iconName} size={16} color={palette.textColor} />
      <AccessibleText
        style={[styles.bannerText, { color: palette.textColor }]}
        maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
      >
        {text}
      </AccessibleText>
    </View>
  );
}

export default function ShareCardPreviewScreen() {
  const params = useLocalSearchParams<{
    matchId?: string;
    personAName?: string;
    personBName?: string;
    personASignLabel?: string;
    personBSignLabel?: string;
    overallScore?: string;
    relationshipType?: string;
    relationLabel?: string;
  }>();

  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const goBack = useSmartBackNavigation({ fallbackRoute: '/(tabs)/home' });
  const storedDraft = useMatchCardStore((state) => state.draft);

  // ── Monetization ──
  const monetization = useModuleMonetization(MODULE_KEY);
  const exportUnlockState = monetization.getActionUnlockState(ACTION_KEY_EXPORT);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const { onOpenNotifications } = useSurfaceNavigationActions();
  const [showUnlockSheet, setShowUnlockSheet] = useState(false);
  const [showPurchaseSheet, setShowPurchaseSheet] = useState(false);
  const [featureUnlocked, setFeatureUnlocked] = useState(false);
  const pendingProtectedActionRef = useRef<'share' | 'save' | 'download' | null>(null);
  const screenTrackedRef = useRef(false);
  const notificationBadgeText = unreadCount > 0 ? (unreadCount > 9 ? '9+' : String(unreadCount)) : null;

  // ── User data ──
  const user = useAuthStore((s) => s.user);
  const userZodiac = useMemo<ZodiacSign | null>(() => {
    return resolveZodiacSign(user?.zodiacSign) ?? getSignFromBirthDate(user?.birthDate ?? '');
  }, [user?.zodiacSign, user?.birthDate]);

  // ── Person picker for compatibility ──
  const { savedPeople, isLoadingPeople, loadSavedPeople, isAnalyzing } = useSynastryStore();
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedSynastryId, setSelectedSynastryId] = useState<number | null>(null);
  const [personPickerLoaded, setPersonPickerLoaded] = useState(false);
  const [synastryAnalysisError, setSynastryAnalysisError] = useState<string | null>(null);
  const [personPickerSeed, setPersonPickerSeed] = useState<PreviewSeed | null>(null);

  // ── Existing synastries (Issue #3) ──
  const [existingSynastries, setExistingSynastries] = useState<SynastryResponse[]>([]);
  const [loadingSynastries, setLoadingSynastries] = useState(false);

  // ── Horoscope data ──
  const horoscopeStore = useHoroscopeStore();
  const [horoscopeLoading, setHoroscopeLoading] = useState(false);
  const [horoscopeError, setHoroscopeError] = useState<string | null>(null);

  // ── Numerology data ──
  const [numerologyPayload, setNumerologyPayload] = useState<NumerologyShareCardPayload | null>(null);
  const [numerologyLoading, setNumerologyLoading] = useState(false);
  const [numerologyError, setNumerologyError] = useState<string | null>(null);

  const matchId = parseMatchId(params.matchId);
  const relationshipTypeParam = parseRelationshipType(params.relationshipType);
  const relationLabelParam = parseParamValue(params.relationLabel) ?? null;
  const personANameParam = parseParamValue(params.personAName) ?? '';
  const personBNameParam = parseParamValue(params.personBName) ?? '';
  const personASignLabelParam = parseParamValue(params.personASignLabel) ?? '';
  const personBSignLabelParam = parseParamValue(params.personBSignLabel) ?? '';
  const overallScoreParam = Number.isFinite(Number(parseParamValue(params.overallScore)))
    ? Number(parseParamValue(params.overallScore))
    : null;

  const [meta, setMeta] = useState<SynastryCardMeta>({
    relationshipType: relationshipTypeParam,
    relationLabel: relationLabelParam,
    scoreBreakdown: null,
    displayMetrics: null,
  });
  const [selectedTab, setSelectedTab] = useState<ShareableCardsTabKey>('compatibility');
  const fixedCardType: ShareCardTypeKey = 'guru_card';
  const appliedTheme: ShareCardThemeKey = 'romantic_night';
  const appliedAspectRatio: ShareCardAspectRatioKey = 'story';
  const layoutVariant: ShareCardLayoutKey = 'spotlight';
  const iconSet: ShareCardIconSetKey = 'cosmic';
  const [successText, setSuccessText] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<ShareAction>(null);
  const generateRequestRef = useRef(false);

  // ── Analytics: screen view + monetization entry ──
  useEffect(() => {
    if (screenTrackedRef.current) return;
    screenTrackedRef.current = true;
    trackEvent('share_cards_screen_viewed', {
      match_id: matchId ?? undefined,
      has_stored_draft: Boolean(storedDraft),
      entry_point: matchId ? 'compare' : 'direct',
    });
    monetization.trackEntry();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, loading, error, isMock, refetch } = useMatchTraits(matchId, {
    personAName: personANameParam,
    personBName: personBNameParam,
    personASignLabel: personASignLabelParam,
    personBSignLabel: personBSignLabelParam,
    overallScore: overallScoreParam,
    relationshipType: relationshipTypeParam,
  });

  useEffect(() => {
    let cancelled = false;

    const hydrateFromSynastry = async () => {
      if (!matchId) return;
      try {
        const response = await getSynastry(matchId);
        if (cancelled) return;

        const syn = response.data;
        const synType = parseRelationshipType(syn.relationshipType as unknown as string);
        setMeta({
          relationshipType: relationshipTypeParam ?? synType ?? null,
          relationLabel: relationLabelParam ?? null,
          scoreBreakdown: syn.scoreBreakdown
            ? {
                overall: syn.scoreBreakdown.overall ?? null,
                love: syn.scoreBreakdown.love ?? null,
                communication: syn.scoreBreakdown.communication ?? null,
                spiritualBond: syn.scoreBreakdown.spiritualBond ?? null,
              }
            : null,
          displayMetrics: syn.displayMetrics ?? null,
        });
      } catch {
        if (cancelled) return;
        setMeta((prev) => ({
          ...prev,
          relationshipType: relationshipTypeParam ?? prev.relationshipType ?? null,
          relationLabel: prev.relationLabel ?? relationLabelParam ?? null,
        }));
      }
    };

    void hydrateFromSynastry();

    return () => {
      cancelled = true;
    };
  }, [matchId, relationLabelParam, relationshipTypeParam]);

  // ── Load saved people + existing synastries ──
  useEffect(() => {
    if (personPickerLoaded || !user?.id) return;
    setPersonPickerLoaded(true);
    void loadSavedPeople(user.id);
    setLoadingSynastries(true);
    getUserSynastries(user.id)
      .then((res) => {
        const completed = (res.data ?? []).filter((s) => s.status === 'COMPLETED' && s.harmonyScore != null);
        setExistingSynastries(completed);
      })
      .catch(() => { /* non-critical */ })
      .finally(() => setLoadingSynastries(false));
  }, [user?.id, personPickerLoaded, loadSavedPeople]);

  // ── Fetch horoscope when daily tab selected ──
  useEffect(() => {
    if (selectedTab !== 'daily' || !userZodiac) return;
    if (horoscopeStore.current?.sign === userZodiac && !horoscopeStore.error) return;
    setHoroscopeLoading(true);
    setHoroscopeError(null);
    horoscopeStore.fetch(userZodiac, 'daily')
      .then(() => setHoroscopeLoading(false))
      .catch(() => {
        setHoroscopeLoading(false);
        setHoroscopeError(t('shareableCards.horoscope.horoscopeError'));
      });
  }, [selectedTab, userZodiac]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch numerology when numerology tab selected ──
  useEffect(() => {
    if (selectedTab !== 'numerology') return;
    if (numerologyPayload || numerologyLoading) return;
    const name = user?.name || user?.firstName || '';
    const birthDate = user?.birthDate || '';
    if (!name || !birthDate) {
      setNumerologyError(t('shareableCards.numerologyCard.numerologyError'));
      return;
    }
    setNumerologyLoading(true);
    setNumerologyError(null);
    fetchNumerology({ name, birthDate, locale: i18n.language })
      .then((res) => {
        setNumerologyPayload(res.shareCardPayload);
        setNumerologyLoading(false);
      })
      .catch(() => {
        setNumerologyLoading(false);
        setNumerologyError(t('shareableCards.numerologyCard.numerologyError'));
      });
  }, [selectedTab, numerologyPayload, numerologyLoading, user?.name, user?.firstName, user?.birthDate, i18n.language, t]);

  // ── Build preview seed from a completed synastry ──
  const buildSeedFromSynastry = useCallback((completed: SynastryResponse, personName: string, personSign: string): PreviewSeed => {
    const userName = user?.name || user?.firstName || t('shareableCards.preview.defaultLeftPerson');
    const userSign = userZodiac ? getSignName(userZodiac, i18n.language ?? 'tr') : t('shareableCards.preview.defaultLeftSign');
    return {
      score: clampScore(completed.harmonyScore, 80),
      summary: completed.harmonyInsight || t('shareableCards.preview.defaultSummary'),
      leftName: completed.personAName || userName,
      rightName: completed.personBName || personName,
      leftSignLabel: userSign,
      rightSignLabel: personSign,
      relationshipType: completed.relationshipType ?? 'LOVE',
      relationLabel: null,
      scoreBreakdown: completed.scoreBreakdown ? {
        overall: completed.scoreBreakdown.overall ?? null,
        love: completed.scoreBreakdown.love ?? null,
        communication: completed.scoreBreakdown.communication ?? null,
        spiritualBond: completed.scoreBreakdown.spiritualBond ?? null,
      } : null,
      displayMetrics: completed.displayMetrics ?? null,
      traitAxes: null,
      aspectsCount: completed.crossAspects?.length ?? 0,
      sourceKind: 'selected_synastry',
      sourceLabel: t('shareableCards.preview.source.live'),
    };
  }, [user?.name, user?.firstName, userZodiac, i18n.language, t]);

  // ── Person picker: trigger synastry analysis ──
  const handlePersonSelect = useCallback(async (personId: number) => {
    if (!user?.id) return;
    setSelectedPersonId(personId);
    setSelectedSynastryId(null);
    setSynastryAnalysisError(null);
    setPersonPickerSeed(null);
    try {
      const synastryStore = useSynastryStore.getState();
      const result = await synastryStore.analyzePair({
        userId: user.id,
        savedPersonId: personId,
        relationshipType: 'LOVE',
        locale: i18n.language,
      });
      if (result.id) {
        const completed = await synastryStore.pollSynastry(result.id);
        if (completed.status === 'COMPLETED' && completed.harmonyScore != null) {
          const person = savedPeople.find((p) => p.id === personId);
          const resolvedPersonSign = resolveZodiacSign(person?.sunSign);
          const personSign = resolvedPersonSign
            ? getSignName(resolvedPersonSign, i18n.language ?? 'tr')
            : t('shareableCards.preview.defaultRightSign');
          const seed = buildSeedFromSynastry(completed, person?.name ?? '', personSign);
          setPersonPickerSeed(seed);
          setMeta({
            relationshipType: completed.relationshipType ?? 'LOVE',
            relationLabel: null,
            scoreBreakdown: seed.scoreBreakdown,
            displayMetrics: seed.displayMetrics,
          });
        } else {
          setSynastryAnalysisError(t('shareableCards.personPicker.analysisFailed'));
        }
      }
    } catch {
      setSynastryAnalysisError(t('shareableCards.personPicker.analysisFailed'));
    }
  }, [user?.id, i18n.language, savedPeople, t, buildSeedFromSynastry]);

  // ── Load existing synastry into card ──
  const handleExistingSynastrySelect = useCallback((synastry: SynastryResponse) => {
    const personSign = t('shareableCards.preview.defaultRightSign');
    const seed = buildSeedFromSynastry(synastry, synastry.personBName || synastry.personName || '', personSign);
    setPersonPickerSeed(seed);
    setSelectedPersonId(null);
    setSelectedSynastryId(synastry.id);
    setSynastryAnalysisError(null);
    setMeta({
      relationshipType: synastry.relationshipType ?? 'LOVE',
      relationLabel: null,
      scoreBreakdown: seed.scoreBreakdown,
      displayMetrics: seed.displayMetrics,
    });
  }, [buildSeedFromSynastry, t]);

  const tabs = useMemo<ShareableCardsTabItem[]>(
    () => [
      { key: 'all', label: t('shareableCards.tabs.all'), iconName: 'apps-outline' },
      { key: 'compatibility', label: t('shareableCards.tabs.compatibility'), iconName: 'heart-outline' },
      { key: 'daily', label: t('shareableCards.tabs.daily'), iconName: 'sunny-outline' },
      { key: 'numerology', label: t('shareableCards.tabs.numerology'), iconName: 'keypad-outline' },
    ],
    [t],
  );

  const relationshipLabelFromType = useCallback(
    (relationshipType: RelationshipType | null | undefined) => {
      if (relationshipType === 'BUSINESS') return t('shareableCards.preview.relationships.business');
      if (relationshipType === 'FRIENDSHIP') return t('shareableCards.preview.relationships.friendship');
      if (relationshipType === 'FAMILY') return t('shareableCards.preview.relationships.family');
      if (relationshipType === 'RIVAL') return t('shareableCards.preview.relationships.rival');
      return t('shareableCards.preview.relationships.love');
    },
    [t],
  );

  const storedDraftMatchesContext = useMemo(() => {
    if (!storedDraft) return false;
    const leftParam = normalizeComparableName(personANameParam);
    const rightParam = normalizeComparableName(personBNameParam);
    if (!leftParam && !rightParam) return true;
    return (
      (!leftParam || normalizeComparableName(storedDraft.user1Name) === leftParam) &&
      (!rightParam || normalizeComparableName(storedDraft.user2Name) === rightParam)
    );
  }, [personANameParam, personBNameParam, storedDraft]);

  const storedDraftPreviewSeed = useMemo<PreviewSeed | null>(() => {
    if (storedDraft && storedDraftMatchesContext) {
      return {
        score: clampScore(storedDraft.compatibilityScore, 84),
        summary:
          storedDraft.cardSummary ||
          storedDraft.aiSummary ||
          t('shareableCards.preview.defaultSummary'),
        leftName: storedDraft.user1Name,
        rightName: storedDraft.user2Name,
        leftSignLabel: storedDraft.user1Sign,
        rightSignLabel: storedDraft.user2Sign,
        relationshipType: storedDraft.relationshipType ?? relationshipTypeParam ?? null,
        relationLabel: storedDraft.relationLabel ?? relationLabelParam,
        scoreBreakdown: storedDraft.scoreBreakdown ?? null,
        displayMetrics: storedDraft.displayMetrics ?? null,
        traitAxes: storedDraft.traitAxes ?? null,
        aspectsCount: storedDraft.aspectsCount ?? 0,
        sourceKind: 'saved_draft',
        sourceLabel: t('shareableCards.preview.source.savedDraft'),
      };
    }

    return null;
  }, [
    relationLabelParam,
    relationshipTypeParam,
    storedDraft,
    storedDraftMatchesContext,
    t,
  ]);

  const quickPreviewSeed = useMemo<PreviewSeed>(() => {
    const hasParams = Boolean(personANameParam || personBNameParam || overallScoreParam != null);

    return {
      score: clampScore(overallScoreParam, 86),
      summary: t('shareableCards.preview.defaultSummary'),
      leftName: personANameParam || t('shareableCards.preview.defaultLeftPerson'),
      rightName: personBNameParam || t('shareableCards.preview.defaultRightPerson'),
      leftSignLabel: personASignLabelParam || t('shareableCards.preview.defaultLeftSign'),
      rightSignLabel: personBSignLabelParam || t('shareableCards.preview.defaultRightSign'),
      relationshipType: relationshipTypeParam ?? 'LOVE',
      relationLabel: relationLabelParam,
      scoreBreakdown: null,
      displayMetrics: null,
      traitAxes: null,
      aspectsCount: 0,
      sourceKind: 'quick_seed',
      sourceLabel: hasParams ? t('shareableCards.preview.source.quickSeed') : null,
    };
  }, [
    overallScoreParam,
    personANameParam,
    personASignLabelParam,
    personBNameParam,
    personBSignLabelParam,
    relationLabelParam,
    relationshipTypeParam,
    t,
  ]);

  const dataPreviewSeed = useMemo<PreviewSeed | null>(() => {
    if (data) {
      return {
        score: clampScore(overallScoreParam ?? data.overallScore, 84),
        summary: data.summaryPlain.body || t('shareableCards.preview.defaultSummary'),
        leftName: data.people.left.name || personANameParam || t('shareableCards.preview.defaultLeftPerson'),
        rightName: data.people.right.name || personBNameParam || t('shareableCards.preview.defaultRightPerson'),
        leftSignLabel: personASignLabelParam || data.people.left.signLabel,
        rightSignLabel: personBSignLabelParam || data.people.right.signLabel,
        relationshipType: relationshipTypeParam ?? meta.relationshipType ?? null,
        relationLabel: meta.relationLabel ?? relationLabelParam,
        scoreBreakdown: meta.scoreBreakdown
          ? {
              ...meta.scoreBreakdown,
              overall: clampScore(overallScoreParam ?? data.overallScore, meta.scoreBreakdown.overall ?? 84),
            }
          : null,
        displayMetrics: meta.displayMetrics,
        traitAxes: toTraitAxes(data.axes),
        aspectsCount: data.aspectsEvaluated ?? 0,
        sourceKind: isMock ? 'mock' : 'live',
        sourceLabel: isMock
          ? t('shareableCards.preview.source.mock')
          : t('shareableCards.preview.source.live'),
      };
    }

    return null;
  }, [
    data,
    isMock,
    meta.displayMetrics,
    meta.relationLabel,
    meta.relationshipType,
    meta.scoreBreakdown,
    overallScoreParam,
    personANameParam,
    personASignLabelParam,
    personBNameParam,
    personBSignLabelParam,
    relationLabelParam,
    relationshipTypeParam,
    t,
  ]);

  useEffect(() => {
    if (!existingSynastries.length) return;
    if (personPickerSeed || selectedPersonId != null || selectedSynastryId != null) return;
    if (storedDraftPreviewSeed) return;
    if (dataPreviewSeed?.sourceKind === 'live') return;

    const preferredSynastry = matchId
      ? existingSynastries.find((item) => item.id === matchId) ?? existingSynastries[0]
      : existingSynastries[0];

    if (!preferredSynastry) return;
    handleExistingSynastrySelect(preferredSynastry);
  }, [
    dataPreviewSeed?.sourceKind,
    existingSynastries,
    handleExistingSynastrySelect,
    matchId,
    personPickerSeed,
    selectedPersonId,
    selectedSynastryId,
    storedDraftPreviewSeed,
  ]);

  const compatibilityPreviewSeed = useMemo<PreviewSeed | null>(() => {
    if (personPickerSeed) return personPickerSeed;
    if (storedDraftPreviewSeed) return storedDraftPreviewSeed;
    if (dataPreviewSeed && dataPreviewSeed.sourceKind === 'live') return dataPreviewSeed;
    if (dataPreviewSeed) return dataPreviewSeed;
    return quickPreviewSeed;
  }, [dataPreviewSeed, personPickerSeed, quickPreviewSeed, storedDraftPreviewSeed]);

  const appliedThemeLabel = t('shareableCards.create.options.theme.romanticNight');
  const appliedCardTypeLabel = t('shareableCards.create.options.cardType.guruCard');

  const previewTitle = useMemo(() => {
    if (selectedTab === 'daily') return t('shareableCards.preview.dailyTitle');
    if (selectedTab === 'numerology') return t('shareableCards.preview.numerologyTitle');
    return t('shareableCards.preview.guruCardTitle');
  }, [selectedTab, t]);

  const previewModel = useMemo<ShareableCardsPreviewModel | null>(() => {
    if (!compatibilityPreviewSeed) return null;

    const leftSign = parseLocalizedSignLabel(compatibilityPreviewSeed.leftSignLabel, t('shareableCards.preview.defaultLeftSign'));
    const rightSign = parseLocalizedSignLabel(compatibilityPreviewSeed.rightSignLabel, t('shareableCards.preview.defaultRightSign'));
    const baseScore = clampScore(compatibilityPreviewSeed.score, 84);
    const loveScore = compatibilityPreviewSeed.scoreBreakdown?.love != null
      ? clampScore(compatibilityPreviewSeed.scoreBreakdown.love, baseScore)
      : resolveMetricScore(compatibilityPreviewSeed.displayMetrics, ['love', 'sevgi', 'aşk'], clampScore(baseScore + 4, 84));
    const communicationScore = compatibilityPreviewSeed.scoreBreakdown?.communication != null
      ? clampScore(compatibilityPreviewSeed.scoreBreakdown.communication, baseScore)
      : resolveMetricScore(
          compatibilityPreviewSeed.displayMetrics,
          ['communication', 'ileti', 'message'],
          clampScore(baseScore - 2, 78),
        );
    const balanceScore = compatibilityPreviewSeed.scoreBreakdown?.spiritualBond != null
      ? clampScore(compatibilityPreviewSeed.scoreBreakdown.spiritualBond, baseScore)
      : resolveMetricScore(
          compatibilityPreviewSeed.displayMetrics,
          ['balance', 'bond', 'trust', 'denge', 'uyum'],
          clampScore(baseScore - 4, 76),
        );

    return {
      title: previewTitle,
      cardTypeKey: fixedCardType,
      score: baseScore,
      leftPersonName: compatibilityPreviewSeed.leftName,
      rightPersonName: compatibilityPreviewSeed.rightName,
      leftPersonSignLabel: leftSign.label,
      rightPersonSignLabel: rightSign.label,
      leftPersonSignIcon: leftSign.icon,
      rightPersonSignIcon: rightSign.icon,
      relationshipLabel:
        compatibilityPreviewSeed.relationLabel || relationshipLabelFromType(compatibilityPreviewSeed.relationshipType),
      summary: compatibilityPreviewSeed.summary || t('shareableCards.preview.defaultSummary'),
      themeName: appliedThemeLabel,
      aspectRatio: appliedAspectRatio,
      relationshipType: compatibilityPreviewSeed.relationshipType,
      metrics: [
        {
          id: 'love',
          label: t('shareableCards.preview.love'),
          value: loveScore,
          iconName: 'heart',
        },
        {
          id: 'communication',
          label: t('shareableCards.preview.communication'),
          value: communicationScore,
          iconName: 'chatbubble-ellipses',
        },
        {
          id: 'balance',
          label: t('shareableCards.preview.balance'),
          value: balanceScore,
          iconName: 'sparkles',
        },
      ],
      brandLabel: t('shareableCards.preview.brand'),
      sourceLabel: compatibilityPreviewSeed.sourceLabel,
      cardTypeLabel: appliedCardTypeLabel,
      layoutVariant,
      iconSet,
      themeVariant: appliedTheme,
    };
  }, [
    appliedAspectRatio,
    appliedCardTypeLabel,
    appliedTheme,
    appliedThemeLabel,
    compatibilityPreviewSeed,
    fixedCardType,
    iconSet,
    layoutVariant,
    previewTitle,
    relationshipLabelFromType,
    t,
  ]);

  const guruCardProps = useMemo(() => {
    if (!compatibilityPreviewSeed) return null;
    return {
      user1Name: compatibilityPreviewSeed.leftName,
      user2Name: compatibilityPreviewSeed.rightName,
      user1Sign: compatibilityPreviewSeed.leftSignLabel,
      user2Sign: compatibilityPreviewSeed.rightSignLabel,
      compatibilityScore: compatibilityPreviewSeed.score,
      relationshipType: compatibilityPreviewSeed.relationshipType ?? undefined,
      relationLabel:
        compatibilityPreviewSeed.relationLabel ||
        relationshipLabelFromType(compatibilityPreviewSeed.relationshipType),
      aiSummary: compatibilityPreviewSeed.summary,
      cardSummary: compatibilityPreviewSeed.summary,
      traitAxes: compatibilityPreviewSeed.traitAxes ?? undefined,
      aspectsCount: compatibilityPreviewSeed.aspectsCount,
      scoreBreakdown: compatibilityPreviewSeed.scoreBreakdown,
      displayMetrics: compatibilityPreviewSeed.displayMetrics,
    };
  }, [compatibilityPreviewSeed, relationshipLabelFromType]);

  // ── Horoscope preview model ──
  const horoscopePreviewModel = useMemo<HoroscopePreviewModel | null>(() => {
    const hData = horoscopeStore.current;
    if (!hData || !userZodiac) return null;
    const lang = i18n.language ?? 'tr';
    const today = new Date();
    const dateStr = today.toLocaleDateString(lang.startsWith('en') ? 'en-US' : 'tr-TR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    return {
      title: t('shareableCards.preview.dailyTitle'),
      sign: userZodiac,
      signEmoji: getSignEmoji(userZodiac),
      signName: getSignName(userZodiac, lang),
      date: dateStr,
      generalText: hData.sections?.general || '',
      highlights: hData.highlights || [],
      luckyColor: hData.meta?.lucky_color,
      luckyNumber: hData.meta?.lucky_number,
      mood: hData.meta?.mood,
      brandLabel: t('shareableCards.preview.brand'),
      themeVariant: appliedTheme,
      aspectRatio: appliedAspectRatio,
    };
  }, [horoscopeStore.current, userZodiac, i18n.language, appliedTheme, appliedAspectRatio, t]);

  // ── Numerology preview model ──
  const numerologyPreviewModel = useMemo<NumerologyPreviewModel | null>(() => {
    if (!numerologyPayload) return null;
    return {
      title: t('shareableCards.preview.numerologyTitle'),
      name: numerologyPayload.name,
      mainNumber: numerologyPayload.mainNumber,
      headline: numerologyPayload.headline,
      personalYear: numerologyPayload.personalYear,
      shortTheme: numerologyPayload.shortTheme,
      brandLabel: t('shareableCards.preview.brand'),
      themeVariant: appliedTheme,
      aspectRatio: appliedAspectRatio,
    };
  }, [numerologyPayload, appliedTheme, appliedAspectRatio, t]);

  // ── Which preview is active ──
  const activeCardTab = selectedTab === 'all' ? 'compatibility' : selectedTab;
  const isGuruCardActive = activeCardTab === 'compatibility';
  const hasActivePreview = activeCardTab === 'compatibility'
    ? Boolean(isGuruCardActive ? guruCardProps : previewModel)
    : activeCardTab === 'daily'
    ? Boolean(horoscopePreviewModel)
    : activeCardTab === 'numerology'
    ? Boolean(numerologyPreviewModel)
    : false;

  const isTabLoading = activeCardTab === 'compatibility'
    ? loading || isAnalyzing
    : activeCardTab === 'daily'
    ? horoscopeLoading || horoscopeStore.loading
    : activeCardTab === 'numerology'
    ? numerologyLoading
    : false;

  const tabError = activeCardTab === 'compatibility'
    ? error || synastryAnalysisError
    : activeCardTab === 'daily'
    ? horoscopeError || horoscopeStore.error
    : activeCardTab === 'numerology'
    ? numerologyError
    : null;

  const currentViewState = useMemo<ShareableCardsViewState>(() => {
    if (isTabLoading && !hasActivePreview) return 'loading';
    if (hasActivePreview) return 'ready';
    if (tabError) return 'error';
    if (isTabLoading) return 'loading';
    return 'empty';
  }, [hasActivePreview, isTabLoading, tabError]);

  const aspectRatio = aspectRatioValue(appliedAspectRatio);
  const captureHeight = Math.round(CAPTURE_WIDTH / aspectRatio);
  const canvasHeight = Math.round(CANVAS_WIDTH / aspectRatio);

  const viewShotRef = useRef<ViewShot | null>(null);
  const [layoutTick, setLayoutTick] = useState(0);
  const {
    imageUri,
    loading: imageLoading,
    error: imageError,
    generate,
    clear,
  } = useGenerateMatchImage(viewShotRef, {
    width: CAPTURE_WIDTH,
    height: captureHeight,
    cacheSubdir: 'share-card-preview',
    filePrefix: `share-card-${appliedAspectRatio}`,
  });
  const autoGeneratedForKeyRef = useRef<string | null>(null);

  const previewRenderKey = useMemo(() => {
    if (activeCardTab === 'daily' && horoscopePreviewModel) {
      return ['daily', horoscopePreviewModel.sign, horoscopePreviewModel.date, horoscopePreviewModel.themeVariant, horoscopePreviewModel.aspectRatio].join('|');
    }
    if (activeCardTab === 'numerology' && numerologyPreviewModel) {
      return ['num', numerologyPreviewModel.mainNumber, numerologyPreviewModel.name, numerologyPreviewModel.themeVariant, numerologyPreviewModel.aspectRatio].join('|');
    }
    if (isGuruCardActive && guruCardProps) {
      return [
        'guru',
        guruCardProps.user1Name,
        guruCardProps.user2Name,
        guruCardProps.compatibilityScore,
        guruCardProps.aspectsCount,
        guruCardProps.relationshipType ?? 'REL',
        appliedTheme,
        appliedAspectRatio,
        iconSet,
      ].join('|');
    }
    if (!previewModel) return null;
    return [
      previewModel.leftPersonName,
      previewModel.rightPersonName,
      previewModel.score,
      previewModel.themeVariant,
      previewModel.layoutVariant,
      previewModel.iconSet,
      previewModel.aspectRatio,
      previewModel.cardTypeLabel ?? 'card',
    ].join('|');
  }, [
    activeCardTab,
    appliedAspectRatio,
    appliedTheme,
    guruCardProps,
    horoscopePreviewModel,
    iconSet,
    isGuruCardActive,
    numerologyPreviewModel,
    previewModel,
  ]);

  useEffect(() => {
    if (currentViewState !== 'ready') {
      autoGeneratedForKeyRef.current = null;
      clear();
    }
  }, [clear, currentViewState]);

  useEffect(() => {
    setSuccessText(null);
  }, [previewRenderKey]);

  useEffect(() => {
    if (currentViewState !== 'ready' || !previewRenderKey || !layoutTick) return;
    if (autoGeneratedForKeyRef.current === previewRenderKey) return;
    autoGeneratedForKeyRef.current = previewRenderKey;

    void generate()
      .then(async () => {
        if (generateRequestRef.current) {
          generateRequestRef.current = false;
          setActionLoading(null);
          setSuccessText(t('shareableCards.success.generated'));
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            // no-op
          }
        }
      })
      .catch(async (captureError) => {
        if (generateRequestRef.current) {
          generateRequestRef.current = false;
          setActionLoading(null);
          Alert.alert(
            t('shareableCards.alerts.generateTitle'),
            t('shareableCards.error.captureDescription'),
          );
        }
        return captureError;
      });
  }, [currentViewState, generate, layoutTick, previewRenderKey, t]);

  useEffect(() => {
    if (!successText) return;
    const timer = setTimeout(() => setSuccessText(null), 1800);
    return () => clearTimeout(timer);
  }, [successText]);

  const notifySuccess = useCallback(async (message: string) => {
    setSuccessText(message);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // no-op
    }
  }, []);

  const presentShareError = useCallback(
    async (title: string, cause: unknown) => {
      const errorObj =
        cause instanceof ShareServiceError
          ? cause
          : new Error((cause as any)?.message ?? t('shareableCards.alerts.genericFailure'));
      const errorMessage = errorObj instanceof ShareServiceError
        ? translateShareServiceError(errorObj, t)
        : t('shareableCards.alerts.genericFailure');

      const openSettings = async () => {
        try {
          await Linking.openSettings();
        } catch {
          Alert.alert(
            t('shareableCards.alerts.settingsOpenTitle'),
            t('shareableCards.alerts.settingsOpenDescription'),
          );
        }
      };

      if (errorObj instanceof ShareServiceError && errorObj.suggestOpenSettings) {
        Alert.alert(title, errorMessage, [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('shareableCards.alerts.openSettings'),
            onPress: () => void openSettings(),
          },
        ]);
        return;
      }

      Alert.alert(title, errorMessage);
    },
    [t],
  );

  const runShareAction = useCallback(
    async (
      action: Exclude<ShareAction, null>,
      errorTitle: string,
      fn: () => Promise<void>,
    ) => {
      if (!imageUri) return;
      setActionLoading(action);
      try {
        await fn();
      } catch (shareError) {
        await presentShareError(errorTitle, shareError);
      } finally {
        setActionLoading(null);
      }
    },
    [imageUri, presentShareError],
  );

  /**
   * Monetization gate: checks if the export action requires Guru/ad unlock.
   * Returns true if the action should proceed, false if a gate was shown.
   */
  const checkMonetizationGate = useCallback((pendingAction: 'share' | 'save' | 'download'): boolean => {
    if (featureUnlocked || !exportUnlockState.usesMonetization) return true;
    pendingProtectedActionRef.current = pendingAction;
    setShowUnlockSheet(true);
    return false;
  }, [exportUnlockState.usesMonetization, featureUnlocked]);

  const handleShare = useCallback(async () => {
    if (!checkMonetizationGate('share')) return;
    trackEvent('share_cards_action', { action: 'share' });
    await runShareAction('share', t('shareableCards.alerts.shareTitle'), async () => {
      await shareImage(imageUri!);
      await notifySuccess(t('shareableCards.success.share'));
    });
  }, [checkMonetizationGate, imageUri, notifySuccess, runShareAction, t]);

  const handleSave = useCallback(async () => {
    if (!checkMonetizationGate('save')) return;
    trackEvent('share_cards_action', { action: 'save' });
    await runShareAction('save', t('shareableCards.alerts.saveTitle'), async () => {
      await saveToGallery(imageUri!);
      await notifySuccess(t('shareableCards.success.save'));
    });
  }, [checkMonetizationGate, imageUri, notifySuccess, runShareAction, t]);

  const handleDownload = useCallback(async () => {
    if (!checkMonetizationGate('download')) return;
    trackEvent('share_cards_action', { action: 'download' });
    await runShareAction('download', t('shareableCards.alerts.downloadTitle'), async () => {
      let embedUri = imageUri!;
      try {
        const base64: string = await FileSystem.readAsStringAsync(imageUri!, { encoding: 'base64' });
        embedUri = `data:image/png;base64,${base64}`;
      } catch {
        embedUri = imageUri!;
      }

      const html = buildShareCardPdfHtml(
        previewModel?.relationshipLabel
          ? `${previewModel.title} • ${previewModel.relationshipLabel}`
          : (previewModel?.title ?? t('shareableCards.title')),
        embedUri,
      );
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: t('shareableCards.actions.download'),
        });
      }
      await notifySuccess(t('shareableCards.success.download'));
    });
  }, [checkMonetizationGate, imageUri, notifySuccess, previewModel?.relationshipLabel, previewModel?.title, runShareAction, t]);

  const replayPendingProtectedAction = useCallback(() => {
    const pendingAction = pendingProtectedActionRef.current;
    pendingProtectedActionRef.current = null;
    if (pendingAction === 'share') {
      void handleShare();
      return;
    }
    if (pendingAction === 'save') {
      void handleSave();
      return;
    }
    if (pendingAction === 'download') {
      void handleDownload();
    }
  }, [handleDownload, handleSave, handleShare]);

  const handleRetry = useCallback(async () => {
    autoGeneratedForKeyRef.current = null;
    clear();
    if (activeCardTab === 'daily' && userZodiac) {
      setHoroscopeLoading(true);
      setHoroscopeError(null);
      try {
        await horoscopeStore.fetch(userZodiac, 'daily');
      } catch { /* handled by store */ }
      setHoroscopeLoading(false);
      generateRequestRef.current = true;
      setActionLoading('generate');
      setLayoutTick(Date.now());
      return;
    }
    if (activeCardTab === 'numerology') {
      setNumerologyPayload(null);
      setNumerologyLoading(false);
      setNumerologyError(null);
      // re-trigger fetch via effect
      return;
    }
    if (matchId) {
      await refetch();
      return;
    }
    generateRequestRef.current = true;
    setActionLoading('generate');
    setLayoutTick(Date.now());
  }, [activeCardTab, clear, matchId, refetch, userZodiac]); // eslint-disable-line react-hooks/exhaustive-deps

  const primaryActionsDisabled = currentViewState !== 'ready' || !imageUri || imageLoading || actionLoading === 'generate';
  const primaryActions = useMemo<ShareableCardsActionItem[]>(
    () => [
      {
        key: 'save',
        label: t('shareableCards.actions.save'),
        iconName: 'bookmark-outline',
        onPress: () => {
          void handleSave();
        },
        disabled: primaryActionsDisabled || actionLoading === 'share' || actionLoading === 'download',
        loading: actionLoading === 'save',
      },
      {
        key: 'download',
        label: t('shareableCards.actions.download'),
        iconName: 'download-outline',
        onPress: () => {
          void handleDownload();
        },
        disabled: primaryActionsDisabled || actionLoading === 'share' || actionLoading === 'save',
        loading: actionLoading === 'download',
      },
      {
        key: 'share',
        label: t('shareableCards.actions.share'),
        iconName: 'share-social-outline',
        onPress: () => {
          void handleShare();
        },
        disabled: primaryActionsDisabled || actionLoading === 'save' || actionLoading === 'download',
        loading: actionLoading === 'share',
        tone: 'accent',
      },
    ],
    [
      actionLoading,
      handleDownload,
      handleSave,
      handleShare,
      primaryActionsDisabled,
      t,
    ],
  );

  const liveDataWarning = currentViewState === 'ready' && activeCardTab === 'compatibility'
    ? compatibilityPreviewSeed?.sourceKind === 'mock' && Boolean(matchId)
      ? t('shareableCards.banner.mockPreview')
      : compatibilityPreviewSeed?.sourceKind === 'quick_seed' && Boolean(compatibilityPreviewSeed?.sourceLabel)
      ? t('shareableCards.banner.seedPreview')
      : null
    : null;

  const stageStateProps = useMemo(() => {
    if (currentViewState === 'loading') {
      const loadDesc = activeCardTab === 'daily'
        ? t('shareableCards.horoscope.loadingHoroscope')
        : activeCardTab === 'numerology'
        ? t('shareableCards.numerologyCard.loadingNumerology')
        : t('shareableCards.loading.description');
      return {
        state: 'loading' as const,
        title: t('shareableCards.loading.title'),
        description: loadDesc,
      };
    }

    if (currentViewState === 'error') {
      const errDesc = activeCardTab === 'daily'
        ? t('shareableCards.horoscope.horoscopeError')
        : activeCardTab === 'numerology'
        ? t('shareableCards.numerologyCard.numerologyError')
        : t('shareableCards.error.description');
      return {
        state: 'error' as const,
        title: t('shareableCards.error.title'),
        description: errDesc,
        actionLabel: t('shareableCards.error.retry'),
        onAction: () => {
          void handleRetry();
        },
      };
    }

    return {
      state: 'empty' as const,
      title: t('shareableCards.empty.title'),
      description: t('shareableCards.empty.description'),
      actionLabel: t('shareableCards.error.retry'),
      onAction: () => {
        void handleRetry();
      },
    };
  }, [activeCardTab, currentViewState, handleRetry, t]);

  return (
    <SafeScreen
      edges={['top', 'left', 'right']}
      showStandardBackground={false}
      style={styles.screen}
    >
      <ShareableCardsBackgroundDecor />

      {/* ── Hidden capture target ── */}
      <View pointerEvents="none" style={styles.captureHost}>
        <ViewShot
          ref={viewShotRef}
          style={{ width: CANVAS_WIDTH, height: canvasHeight }}
          onLayout={() => setLayoutTick(Date.now())}
          options={{
            format: 'png',
            quality: 1,
            result: 'tmpfile',
            width: CAPTURE_WIDTH,
            height: captureHeight,
          } as any}
        >
          {currentViewState === 'ready' ? (
            <View style={{ flex: 1 }}>
              {activeCardTab === 'daily' && horoscopePreviewModel ? (
                <ShareCardPreviewHoroscope model={horoscopePreviewModel} variant="capture" style={styles.captureCard} />
              ) : activeCardTab === 'numerology' && numerologyPreviewModel ? (
                <ShareCardPreviewNumerology model={numerologyPreviewModel} variant="capture" style={styles.captureCard} />
              ) : isGuruCardActive && guruCardProps ? (
                <ShareCardPreviewGuru
                  matchCardProps={guruCardProps}
                  iconSet={iconSet}
                  aspectRatio={appliedAspectRatio}
                  themeVariant={appliedTheme}
                  ornamentLabel={appliedCardTypeLabel}
                  variant="capture"
                  style={styles.captureCard}
                />
              ) : previewModel ? (
                <ShareCardPreview model={previewModel} variant="capture" style={styles.captureCard} />
              ) : (
                <View style={styles.capturePlaceholder} />
              )}
            </View>
          ) : (
            <View style={styles.capturePlaceholder} />
          )}
        </ViewShot>
      </View>

      {/* ── Main scroll content ── */}
      <View style={styles.content}>
        <AppHeader
          title={t('shareableCards.title')}
          subtitle={t('shareableCards.subtitle')}
          onBack={goBack}
          rightActions={(
            <>
              <MonetizationQuickBar />
              <SurfaceHeaderIconButton
                iconName="notifications-outline"
                onPress={onOpenNotifications}
                accessibilityLabel={t('profile.menu.notifications')}
                badgeText={notificationBadgeText}
              />
            </>
          )}
        />

        {successText ? (
          <StatusBanner iconName="checkmark-circle" text={successText} tone="success" />
        ) : null}

        {liveDataWarning ? (
          <StatusBanner iconName="information-circle-outline" text={liveDataWarning} tone="info" />
        ) : null}

        {imageError && currentViewState === 'ready' ? (
          <StatusBanner
            iconName="alert-circle-outline"
            text={t('shareableCards.error.captureDescription')}
            tone="warning"
          />
        ) : null}

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Tabs ── */}
          <ShareableCardsTabs
            tabs={tabs}
            selectedTab={selectedTab}
            onSelect={setSelectedTab}
          />

          {/* ── Person picker for compatibility ── */}
          {(activeCardTab === 'compatibility') && (
            <View style={styles.personPickerSection}>
              <AccessibleText
                style={[styles.personPickerTitle, { color: colors.text }]}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              >
                {t('shareableCards.personPicker.title')}
              </AccessibleText>
              {loadingSynastries ? (
                <View style={styles.analyzingRow}>
                  <ActivityIndicator size="small" color={colors.violet} />
                  <AccessibleText
                    style={[styles.analyzingText, { color: colors.subtext }]}
                    maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                  >
                    {t('shareableCards.personPicker.loadingSaved')}
                  </AccessibleText>
                </View>
              ) : existingSynastries.length > 0 ? (
                <>
                  <AccessibleText
                    style={[styles.personPickerSubheading, { color: colors.subtext }]}
                    maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                  >
                    {t('shareableCards.personPicker.readyCards')}
                  </AccessibleText>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.analysisChipsRow}
                  >
                    {existingSynastries.slice(0, 8).map((synastry) => {
                      const isSelected = synastry.id === selectedSynastryId;
                      return (
                        <Pressable
                          key={synastry.id}
                          onPress={() => handleExistingSynastrySelect(synastry)}
                          style={({ pressed }) => [
                            styles.analysisChip,
                            isSelected
                              ? { backgroundColor: colors.violetBg, borderColor: colors.violetLight }
                              : { backgroundColor: '#FFFFFF', borderColor: 'rgba(180, 165, 210, 0.38)' },
                            pressed && styles.pressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                        >
                          <AccessibleText
                            style={[styles.analysisChipName, { color: colors.text }]}
                            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                            numberOfLines={1}
                          >
                            {synastry.personBName || synastry.personName || t('shareableCards.preview.defaultRightPerson')}
                          </AccessibleText>
                          <AccessibleText
                            style={[styles.analysisChipScore, { color: colors.violet }]}
                            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                          >
                            {clampScore(synastry.harmonyScore, 80)}
                          </AccessibleText>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </>
              ) : null}
              {isLoadingPeople ? (
                <ActivityIndicator size="small" color={colors.violet} />
              ) : savedPeople.length === 0 ? (
                <AccessibleText
                  style={[styles.personPickerHint, { color: colors.subtext }]}
                  maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                >
                  {t('shareableCards.personPicker.noPeople')}
                </AccessibleText>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.personChipsRow}
                >
                  {savedPeople.map((person) => {
                    const isSelected = person.id === selectedPersonId;
                    return (
                      <Pressable
                        key={person.id}
                        onPress={() => void handlePersonSelect(person.id)}
                        disabled={isAnalyzing}
                        style={({ pressed }) => [
                          styles.personChip,
                          isSelected
                            ? { backgroundColor: colors.violet, borderColor: colors.violet }
                            : { backgroundColor: '#FFFFFF', borderColor: 'rgba(180, 165, 210, 0.40)' },
                          pressed && styles.pressed,
                          isAnalyzing && styles.disabled,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                      >
                        <AccessibleText
                          style={[
                            styles.personChipEmoji,
                            { color: isSelected ? '#FFFFFF' : colors.text },
                          ]}
                        >
                          {getSignEmoji(resolveZodiacSign(person.sunSign) ?? 'aries')}
                        </AccessibleText>
                        <AccessibleText
                          style={[
                            styles.personChipName,
                            { color: isSelected ? '#FFFFFF' : colors.text },
                          ]}
                          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                          numberOfLines={1}
                        >
                          {person.name}
                        </AccessibleText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
              {isAnalyzing && (
                <View style={styles.analyzingRow}>
                  <ActivityIndicator size="small" color={colors.violet} />
                  <AccessibleText
                    style={[styles.analyzingText, { color: colors.subtext }]}
                    maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                  >
                    {t('shareableCards.personPicker.analyzing')}
                  </AccessibleText>
                </View>
              )}
              {synastryAnalysisError && (
                <AccessibleText
                  style={[styles.personPickerHint, { color: colors.error }]}
                  maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                >
                  {synastryAnalysisError}
                </AccessibleText>
              )}
            </View>
          )}
          {/* ── Preview stage ── */}
          <View style={styles.stageOuter}>
            <LinearGradient
              colors={['#C9B0F0', '#B89AE8', '#D4BCE8', '#E0CCF5']}
              locations={[0, 0.3, 0.7, 1]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={[
                styles.stageCanvas,
                { minHeight: appliedAspectRatio === 'story' ? 640 : 520 },
              ]}
            >
              {/* Atmospheric cloud layers */}
              <View style={styles.cloudLayerA} />
              <View style={styles.cloudLayerB} />
              <View style={styles.cloudLayerC} />
              <View style={styles.cloudLayerD} />

              {currentViewState === 'ready' ? (
                <View style={styles.stageRow}>
                  <View style={styles.previewFrame}>
                    <View style={[styles.previewShell, { aspectRatio }]}>
                      {activeCardTab === 'daily' && horoscopePreviewModel ? (
                        <ShareCardPreviewHoroscope model={horoscopePreviewModel} style={styles.previewCard} />
                      ) : activeCardTab === 'numerology' && numerologyPreviewModel ? (
                        <ShareCardPreviewNumerology model={numerologyPreviewModel} style={styles.previewCard} />
                      ) : isGuruCardActive && guruCardProps ? (
                        <ShareCardPreviewGuru
                          matchCardProps={guruCardProps}
                          iconSet={iconSet}
                          aspectRatio={appliedAspectRatio}
                          themeVariant={appliedTheme}
                          ornamentLabel={appliedCardTypeLabel}
                          style={styles.previewCard}
                        />
                      ) : previewModel ? (
                        <ShareCardPreview model={previewModel} style={styles.previewCard} />
                      ) : null}
                    </View>
                  </View>
                </View>
              ) : (
                <ShareableCardsStateCard
                  state={stageStateProps.state}
                  title={stageStateProps.title}
                  description={stageStateProps.description}
                  actionLabel={stageStateProps.actionLabel}
                  onAction={stageStateProps.onAction}
                  actionLoading={actionLoading === 'generate'}
                />
              )}
            </LinearGradient>
          </View>

          {/* ── Inline primary actions ── */}
          <ShareCardPrimaryActions actions={primaryActions} />

          {/* ── Generating indicator ── */}
          {(actionLoading === 'generate' || imageLoading) && currentViewState === 'ready' ? (
            <View style={styles.generatingInline}>
              <ActivityIndicator size="small" color={colors.violet} />
              <AccessibleText
                style={[styles.generatingText, { color: colors.subtext }]}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              >
                {t('shareableCards.loading.inline')}
              </AccessibleText>
            </View>
          ) : null}
        </ScrollView>
      </View>

      {/* ── Monetization modals ── */}
      <ActionUnlockSheet
        visible={showUnlockSheet}
        moduleKey={MODULE_KEY}
        actionKey={ACTION_KEY_EXPORT}
        title={t('shareableCards.title')}
        onClose={() => setShowUnlockSheet(false)}
        onUnlocked={async () => {
          setFeatureUnlocked(true);
          trackEvent('share_cards_guru_unlocked');
          replayPendingProtectedAction();
        }}
        onShowPurchase={exportUnlockState.purchaseEnabled ? () => {
          setShowUnlockSheet(false);
          setShowPurchaseSheet(true);
        } : undefined}
      />

      <PurchaseCatalogSheet
        visible={showPurchaseSheet}
        onDismiss={() => setShowPurchaseSheet(false)}
      />
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  captureHost: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    left: -9999,
    top: -9999,
  },
  captureCard: {
    flex: 1,
  },
  capturePlaceholder: {
    flex: 1,
    backgroundColor: '#E4D8F4',
    borderRadius: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xs,
    gap: spacing.cardGap,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: spacing.sm,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  scrollContent: {
    gap: spacing.sectionGap,
  },

  /* ── Preview stage ── */
  stageOuter: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  stageCanvas: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: 2,
  },
  cloudLayerA: {
    position: 'absolute',
    width: 320,
    height: 260,
    top: -50,
    right: -80,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  cloudLayerB: {
    position: 'absolute',
    width: 280,
    height: 240,
    bottom: -60,
    left: -70,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  cloudLayerC: {
    position: 'absolute',
    width: 200,
    height: 160,
    top: 80,
    left: -40,
    borderRadius: 999,
    backgroundColor: 'rgba(240, 210, 255, 0.25)',
  },
  cloudLayerD: {
    position: 'absolute',
    width: 220,
    height: 180,
    bottom: 40,
    right: -30,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 230, 245, 0.20)',
  },

  stageRow: {
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    gap: 2,
  },
  previewFrame: {
    width: '100%',
    maxWidth: 376,
  },
  previewShell: {
    width: '100%',
    alignSelf: 'center',
  },
  previewCard: {
    flex: 1,
  },

  /* ── Misc ── */
  generatingInline: {
    minHeight: 44,
    borderRadius: radius.card,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(180, 165, 210, 0.25)',
    paddingHorizontal: spacing.cardPadding,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  generatingText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  /* ── Person picker ── */
  personPickerSection: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(180, 165, 210, 0.30)',
    borderRadius: radius.hero,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  personPickerTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  personPickerHint: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  personPickerSubheading: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  personChipsRow: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  analysisChipsRow: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  analysisChip: {
    minWidth: 96,
    minHeight: 52,
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 4,
    justifyContent: 'center',
  },
  analysisChipName: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  analysisChipScore: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  personChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    minHeight: 42,
  },
  personChipEmoji: {
    fontSize: 16,
  },
  personChipName: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  analyzingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  analyzingText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },

  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.45,
  },
});
