import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import ViewShot from 'react-native-view-shot';
import { useTranslation } from 'react-i18next';
import * as Haptics from '../utils/haptics';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { GuestGate, useGuestGate } from '../components/GuestGate';
import { SafeScreen, SurfaceHeaderIconButton, TabHeader } from '../components/ui';
import { useGenerateMatchImage } from '../hooks/useGenerateMatchImage';
import { useSmartBackNavigation } from '../hooks/useSmartBackNavigation';
import { useNumerology } from '../hooks/useNumerology';
import { trackEvent } from '../services/analytics';
import {
  useModuleMonetization,
  AdOfferCard,
  GuruUnlockModal,
  PurchaseCatalogSheet,
  MonetizationEvents,
} from '../features/monetization';
import {
  NUMEROLOGY_TUTORIAL_TARGET_KEYS,
  SpotlightTarget,
  TUTORIAL_IDS,
  TUTORIAL_SCREEN_KEYS,
  useTutorial,
  useTutorialTrigger,
} from '../features/tutorial';
import {
  countNumerologyWeeklyCheckIns,
  findCoreNumber,
  getDominantNumber,
  getNumerologyCheckInState,
  getNumerologySnapshot,
  hasNumerologyCheckInOnDate,
  isPremiumUser,
  markNumerologyCheckIn,
  saveNumerologySnapshot,
} from '../services/numerology.service';
import { buildNumerologyViewModel } from '../services/numerology.viewmodel';
import {
  instagramStory,
  saveToGallery,
  shareImage,
  ShareServiceError,
  type ShareChannel,
} from '../services/share.service';
import {
  GuidanceCard,
  NumberInsightCard,
  NumerologyAdvancedSheet,
  NumerologyBridgeCard,
  NumerologyCheckInCard,
  NumerologyConceptSheet,
  NumerologyHeroCard,
  NumerologyLoadingSkeleton,
  NumerologySnapshotCard,
  NumerologyShareCard,
  NumerologyStateCard,
  NumerologyTimingCard,
  ProfileInsightCard,
  TrustInfoSheet,
} from '../components/Numerology/NumerologyCards';

type EmptyConfig = {
  title: string;
  description: string;
  ctaLabel: string;
  route: string;
};

type ShareVariant = 'story_vertical' | 'standard_square';
type TimingConcept = 'personalYear' | 'universalYear' | 'cycleProgress';

function normalizeEntryPoint(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    return 'direct';
  }
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || 'direct';
}

function getEmptyStateConfig(
  variant: 'none' | 'name_missing' | 'birth_date_missing' | 'both_missing',
  t: ReturnType<typeof useTranslation>['t'],
): EmptyConfig | null {
  switch (variant) {
    case 'name_missing':
      return {
        title: t('numerology.empty.nameMissingTitle'),
        description: t('numerology.empty.nameMissingDescription'),
        ctaLabel: t('numerology.empty.nameMissingCta'),
        route: '/edit-profile-name',
      };
    case 'birth_date_missing':
      return {
        title: t('numerology.empty.birthDateMissingTitle'),
        description: t('numerology.empty.birthDateMissingDescription'),
        ctaLabel: t('numerology.empty.birthDateMissingCta'),
        route: '/edit-birth-info',
      };
    case 'both_missing':
      return {
        title: t('numerology.empty.bothMissingTitle'),
        description: t('numerology.empty.bothMissingDescription'),
        ctaLabel: t('numerology.empty.bothMissingCta'),
        route: '/(tabs)/profile',
      };
    default:
      return null;
  }
}

function createStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20, paddingBottom: 44, gap: 14 },
    sectionGroup: { gap: 12 },
    sectionTitle: {
      color: C.subtext,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    summaryWrap: {
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 16,
      backgroundColor: C.surface,
      padding: 14,
      gap: 8,
    },
    summaryTitle: {
      color: C.text,
      fontSize: 14,
      fontWeight: '800',
    },
    summaryText: {
      color: C.text,
      fontSize: 14,
      lineHeight: 21,
    },
    shareShotWrap: {
      position: 'absolute',
      top: 0,
      left: -5000,
    },
  });
}

export default function NumerologyScreen() {
  const { t, i18n } = useTranslation();
  const searchParams = useLocalSearchParams<{ entry_point?: string; entryPoint?: string }>();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const user = useAuthStore((s) => s.user);
  const { reopenTutorialById } = useTutorial();
  const { triggerInitial: triggerInitialTutorials } = useTutorialTrigger(TUTORIAL_SCREEN_KEYS.NUMEROLOGY);
  const { checkGated: checkPremiumGated, guestGateProps: premiumGateProps } = useGuestGate('premium_access');

  const [guidancePeriod, setGuidancePeriod] = useState<'day' | 'week'>('day');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [trustVisible, setTrustVisible] = useState(false);
  const [advancedVisible, setAdvancedVisible] = useState(false);
  const [conceptVisible, setConceptVisible] = useState(false);
  const [activeConcept, setActiveConcept] = useState<TimingConcept>('personalYear');
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [snapshotExists, setSnapshotExists] = useState<boolean | null>(null);
  const [checkInDates, setCheckInDates] = useState<string[]>([]);

  // ── Monetization ──
  const monetization = useModuleMonetization('numerology');
  const [showAdOffer, setShowAdOffer] = useState(false);
  const [showGuruModal, setShowGuruModal] = useState(false);
  const [showPurchaseSheet, setShowPurchaseSheet] = useState(false);
  const monetizationEntryRef = useRef(false);

  const startRef = useRef(Date.now());
  const tutorialBootstrapRef = useRef<string | null>(null);
  const screenViewedRef = useRef(false);
  const emptyViewedRef = useRef(false);
  const loadedRef = useRef(false);
  const staleRef = useRef(false);
  const pushEntryRef = useRef(false);
  const checkInCardViewedRef = useRef(false);

  const effectiveDate = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = `${now.getMonth() + 1}`.padStart(2, '0');
    const d = `${now.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const numerology = useNumerology({
    user,
    locale: i18n.language,
    effectiveDate,
    guidancePeriod,
  });

  const premium = isPremiumUser(user?.roles);
  const entryPoint = normalizeEntryPoint(searchParams.entry_point ?? searchParams.entryPoint);
  const data = numerology.data;
  const emptyConfig = getEmptyStateConfig(numerology.emptyVariant, t);

  const userScopeId = useMemo(
    () => String(user?.id ?? user?.username ?? data?.name ?? 'guest'),
    [data?.name, user?.id, user?.username],
  );

  const dominantNumber = getDominantNumber(data);
  const mainNumber = findCoreNumber(data, data?.combinedProfile?.dominantNumberId ?? 'lifePath');

  // Presentation layer — kullanıcıya gösterilecek display metinleri
  const viewModel = useMemo(() => buildNumerologyViewModel(data), [data]);

  const checkedInToday = useMemo(
    () => hasNumerologyCheckInOnDate({ checkInDates, lastCheckInDate: null, lastCheckInAt: null }, effectiveDate),
    [checkInDates, effectiveDate],
  );

  const weeklyCheckIns = useMemo(
    () => countNumerologyWeeklyCheckIns({ checkInDates, lastCheckInDate: null, lastCheckInAt: null }, effectiveDate),
    [checkInDates, effectiveDate],
  );

  const conceptContent = useMemo(() => {
    const map: Record<TimingConcept, { title: string; description: string }> = {
      personalYear: {
        title: t('numerology.personalYearLabel'),
        description: t('numerology.personalYearExplain'),
      },
      universalYear: {
        title: t('numerology.universalYearLabel'),
        description: t('numerology.universalYearExplain'),
      },
      cycleProgress: {
        title: t('numerology.cycleProgress'),
        description: t('numerology.cycleProgressExplain'),
      },
    };
    return map[activeConcept];
  }, [activeConcept, t]);

  const storyShotRef = useRef<ViewShot | null>(null);
  const squareShotRef = useRef<ViewShot | null>(null);

  const { loading: storyShareLoading, generate: generateStoryCard } = useGenerateMatchImage(storyShotRef, {
    width: 1080,
    height: 1920,
    cacheSubdir: 'numerology-share',
    filePrefix: 'numerology-story-card',
  });

  const { loading: squareShareLoading, generate: generateSquareCard } = useGenerateMatchImage(squareShotRef, {
    width: 1080,
    height: 1080,
    cacheSubdir: 'numerology-share',
    filePrefix: 'numerology-standard-card',
  });

  const shareLoading = storyShareLoading || squareShareLoading;
  const goBack = useSmartBackNavigation({ fallbackRoute: '/(tabs)/home' });

  // Track monetization module entry (once per stack screen mount)
  useEffect(() => {
    if (!monetizationEntryRef.current) {
      monetizationEntryRef.current = true;
      monetization.trackEntry();
    }
  }, [monetization.trackEntry]);

  useEffect(() => {
    const scope = user?.id ? String(user.id) : 'guest';
    if (tutorialBootstrapRef.current === scope) {
      return;
    }
    tutorialBootstrapRef.current = scope;
    void triggerInitialTutorials();
  }, [triggerInitialTutorials, user?.id]);

  useEffect(() => {
    let cancelled = false;

    const resolveSnapshot = async () => {
      if (!data?.annualSnapshotKey) {
        if (!cancelled) setSnapshotExists(null);
        return;
      }
      try {
        const snapshot = await getNumerologySnapshot(user?.id ?? user?.username ?? data.name, data.annualSnapshotKey);
        if (!cancelled) setSnapshotExists(Boolean(snapshot));
      } catch {
        if (!cancelled) setSnapshotExists(null);
      }
    };

    void resolveSnapshot();
    return () => {
      cancelled = true;
    };
  }, [data?.annualSnapshotKey, data?.name, user?.id, user?.username]);

  useEffect(() => {
    let cancelled = false;

    const loadCheckIns = async () => {
      try {
        const state = await getNumerologyCheckInState(userScopeId);
        if (!cancelled) setCheckInDates(state.checkInDates ?? []);
      } catch {
        if (!cancelled) setCheckInDates([]);
      }
    };

    void loadCheckIns();

    return () => {
      cancelled = true;
    };
  }, [userScopeId]);

  const commonEventProps = useMemo(
    () => ({
      source_surface: 'numerology_screen',
      entry_point: entryPoint,
      has_birth_date: numerology.hasRequiredProfile ? true : !numerology.missingFields.includes('birthDate'),
      has_name: numerology.hasRequiredProfile ? true : !numerology.missingFields.includes('name'),
      is_premium_user: premium,
      personal_year: data?.timing?.personalYear ?? null,
      dominant_number: dominantNumber,
      response_version: data?.contentVersion ?? data?.version ?? null,
      guidance_period: guidancePeriod,
      cache_status: numerology.cacheStatus,
      snapshot_exists: snapshotExists,
      locale: data?.locale ?? numerology.locale ?? i18n.language ?? null,
      checked_in_today: checkedInToday,
      weekly_checkin_count: weeklyCheckIns,
    }),
    [
      checkedInToday,
      data?.contentVersion,
      data?.locale,
      data?.timing?.personalYear,
      data?.version,
      dominantNumber,
      entryPoint,
      guidancePeriod,
      i18n.language,
      numerology.cacheStatus,
      numerology.hasRequiredProfile,
      numerology.locale,
      numerology.missingFields,
      premium,
      snapshotExists,
      weeklyCheckIns,
    ],
  );

  useEffect(() => {
    if (entryPoint !== 'push_numerology_checkin' || pushEntryRef.current) {
      return;
    }
    pushEntryRef.current = true;
    setGuidancePeriod('day');
    trackEvent('numerology_push_entry_opened', commonEventProps);
  }, [commonEventProps, entryPoint]);

  useEffect(() => {
    if (screenViewedRef.current) {
      return;
    }
    screenViewedRef.current = true;
    trackEvent('numerology_screen_viewed', commonEventProps);
  }, [commonEventProps]);

  useEffect(() => {
    if (!emptyConfig || emptyViewedRef.current) {
      return;
    }
    emptyViewedRef.current = true;
    trackEvent('numerology_empty_state_viewed', {
      ...commonEventProps,
      empty_variant: numerology.emptyVariant,
      missing_fields: numerology.missingFields.join(','),
    });
  }, [commonEventProps, emptyConfig, numerology.emptyVariant, numerology.missingFields]);

  useEffect(() => {
    if (!data || loadedRef.current) {
      return;
    }
    loadedRef.current = true;
    trackEvent('numerology_loaded', {
      ...commonEventProps,
      load_time_ms: Date.now() - startRef.current,
      is_partial: numerology.isPartial,
      generated_at: data.generatedAt,
    });
  }, [commonEventProps, data, numerology.isPartial]);

  useEffect(() => {
    if (!numerology.hasStaleFallback || staleRef.current) {
      return;
    }
    staleRef.current = true;
    trackEvent('numerology_stale_cache_seen', {
      ...commonEventProps,
      generated_at: data?.generatedAt ?? null,
    });
  }, [commonEventProps, data?.generatedAt, numerology.hasStaleFallback]);

  useEffect(() => {
    if (!data || checkInCardViewedRef.current) {
      return;
    }
    checkInCardViewedRef.current = true;
    trackEvent('numerology_checkin_card_viewed', commonEventProps);
  }, [commonEventProps, data]);

  const handleToggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = !prev[sectionId];
      if (next) {
        trackEvent('numerology_section_expanded', {
          ...commonEventProps,
          section_id: sectionId,
          is_locked: false,
        });
      }
      return {
        ...prev,
        [sectionId]: next,
      };
    });
  };

  const handleGuidancePeriodChange = (period: 'day' | 'week') => {
    setGuidancePeriod(period);
    trackEvent('numerology_guidance_period_changed', {
      ...commonEventProps,
      next_guidance_period: period,
    });
  };

  const handleOpenConcept = (concept: TimingConcept) => {
    setActiveConcept(concept);
    setConceptVisible(true);
    trackEvent('numerology_concept_opened', {
      ...commonEventProps,
      concept_key: concept,
    });
  };

  const handleOpenAdvanced = () => {
    if (checkPremiumGated()) return;

    // Monetization gate: if guru unlock is configured for this action, gate it
    const advancedAction = monetization.getAction('advanced_analysis');
    if (advancedAction && monetization.guruEnabled) {
      if (monetization.canAffordAction('advanced_analysis')) {
        MonetizationEvents.gateSeen('numerology', 'advanced_analysis', 'guru_spend');
        setShowGuruModal(true);
        return;
      }
      // Can't afford — show ad offer if eligible, else show guru modal with insufficient state
      if (monetization.shouldShowAd && monetization.adsEnabled) {
        MonetizationEvents.gateSeen('numerology', 'advanced_analysis', 'ad');
        setShowAdOffer(true);
        return;
      }
      MonetizationEvents.gateSeen('numerology', 'advanced_analysis', 'guru_spend');
      setShowGuruModal(true);
      return;
    }

    setAdvancedVisible(true);
    trackEvent('numerology_advanced_opened', commonEventProps);
  };

  const handleRetry = () => {
    trackEvent('numerology_retry_clicked', {
      ...commonEventProps,
      error_type: numerology.errorType,
    });
    void numerology.refetch();
  };

  const handleEmptyCta = () => {
    if (!emptyConfig) return;
    trackEvent('numerology_profile_cta_clicked', {
      ...commonEventProps,
      empty_variant: numerology.emptyVariant,
    });
    router.push(emptyConfig.route as any);
  };

  const handleOpenTrust = () => {
    setTrustVisible(true);
    trackEvent('numerology_trust_opened', commonEventProps);
  };

  const handleOpenWeekly = () => {
    handleGuidancePeriodChange('week');
    trackEvent('numerology_weekly_return_clicked', commonEventProps);
  };

  const handleCheckIn = async () => {
    trackEvent('numerology_checkin_clicked', {
      ...commonEventProps,
      checked_in_today: checkedInToday,
    });

    try {
      const next = await markNumerologyCheckIn(userScopeId, effectiveDate);
      setCheckInDates(next.checkInDates);
      trackEvent('numerology_checkin_completed', {
        ...commonEventProps,
        checked_in_today: true,
        weekly_checkin_count: countNumerologyWeeklyCheckIns(next, effectiveDate),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert(t('common.error'), t('numerology.checkInError'));
    }
  };

  const executeShare = async (variant: ShareVariant, channel: ShareChannel) => {
    if (!data?.shareCardPayload) return;

    trackEvent('numerology_share_clicked', {
      ...commonEventProps,
      share_format: variant,
      share_channel: channel,
      payload_version: data.shareCardPayload.payloadVersion,
    });

    try {
      const uri = variant === 'story_vertical' ? await generateStoryCard() : await generateSquareCard();
      if (channel === 'gallery') {
        await saveToGallery(uri);
      } else if (channel === 'instagram_story') {
        await instagramStory(uri);
      } else {
        await shareImage(uri);
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      const message = error instanceof ShareServiceError ? error.message : t('numerology.shareError');
      Alert.alert(t('common.error'), message);
    }
  };

  const handleShare = () => {
    if (!data?.shareCardPayload) return;

    Alert.alert(
      t('numerology.shareMenuTitle'),
      t('numerology.shareMenuDescription'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('numerology.shareOptionStory'), onPress: () => { void executeShare('story_vertical', 'instagram_story'); } },
        { text: t('numerology.shareOptionStandard'), onPress: () => { void executeShare('standard_square', 'system'); } },
        { text: t('numerology.shareOptionGallery'), onPress: () => { void executeShare('standard_square', 'gallery'); } },
      ],
    );
  };

  const handleSaveSnapshot = async () => {
    if (!data) return;

    trackEvent('numerology_save_snapshot_clicked', {
      ...commonEventProps,
      snapshot_scope: 'annual',
      snapshot_year: data.annualSnapshotKey?.slice(-4) ?? null,
    });

    try {
      setSavingSnapshot(true);
      await saveNumerologySnapshot({ userId: user?.id ?? user?.username ?? data.name, response: data });
      setSnapshotExists(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('common.saved'), t('numerology.snapshotSaved'));
    } catch {
      Alert.alert(t('common.error'), t('numerology.snapshotSaveError'));
    } finally {
      setSavingSnapshot(false);
    }
  };

  const handleNameAnalysis = () => {
    trackEvent('numerology_name_analysis_clicked', commonEventProps);
    router.push('/(tabs)/name-analysis' as any);
  };

  const handlePressTutorialHelp = useCallback(() => {
    void reopenTutorialById(TUTORIAL_IDS.NUMEROLOGY_FOUNDATION, 'numerology');
  }, [reopenTutorialById]);

  return (
    <SafeScreen>
      <View style={styles.container}>
        <TabHeader
          title={t('home.numerology')}
          onBack={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            goBack();
          }}
        />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <SpotlightTarget targetKey={NUMEROLOGY_TUTORIAL_TARGET_KEYS.INPUT_AREA}>
            {emptyConfig ? (
              <NumerologyStateCard
                icon="person-circle-outline"
                title={emptyConfig.title}
                description={emptyConfig.description}
                ctaLabel={emptyConfig.ctaLabel}
                onPress={handleEmptyCta}
              />
            ) : numerology.isLoading ? (
              <NumerologyLoadingSkeleton />
            ) : numerology.isError ? (
              <NumerologyStateCard
                icon="cloud-offline-outline"
                title={t('numerology.networkErrorTitle')}
                description={t('numerology.networkErrorDescription')}
                ctaLabel={t('common.retry')}
                onPress={handleRetry}
              />
            ) : data ? (
              <>
                {numerology.hasStaleFallback ? (
                  <NumerologyStateCard
                    icon="time-outline"
                    title={t('numerology.staleStateTitle')}
                    description={t('numerology.staleStateDescription', {
                      date: data.generatedAt?.slice(0, 10) ?? t('common.unknown'),
                    })}
                    ctaLabel={t('numerology.refreshCta')}
                    onPress={handleRetry}
                  />
                ) : null}

                <SpotlightTarget targetKey={NUMEROLOGY_TUTORIAL_TARGET_KEYS.RESULT_CARD}>
                  <NumerologyHeroCard
                    name={data.name}
                    headline={data.headline}
                    mainNumber={dominantNumber}
                    mainTitle={mainNumber?.title ?? t('numerology.lifePath')}
                    mainArchetype={mainNumber?.archetype}
                    lifePathShortDesc={viewModel.lifePathShortDesc}
                    personalYear={data.timing?.personalYear ?? null}
                    shortTheme={data.timing?.shortTheme}
                    yearThemeTitle={viewModel.yearThemeTitle}
                    yearThemeDesc={viewModel.yearThemeDesc}
                    cacheStatus={numerology.cacheStatus}
                    generatedAt={data.generatedAt}
                    onShare={handleShare}
                    onSaveSnapshot={handleSaveSnapshot}
                    onOpenTrust={handleOpenTrust}
                    shareLoading={shareLoading}
                    savingSnapshot={savingSnapshot}
                  />
                </SpotlightTarget>

                <NumerologyCheckInCard
                  checkedInToday={checkedInToday}
                  weeklyCount={weeklyCheckIns}
                  nextRefreshAt={data.timing?.nextRefreshAt}
                  onCheckIn={() => { void handleCheckIn(); }}
                  onOpenWeekly={handleOpenWeekly}
                />

                {showAdOffer && monetization.adsEnabled && (
                  <AdOfferCard
                    moduleKey="numerology"
                    actionKey="advanced_analysis"
                    onComplete={() => {
                      setShowAdOffer(false);
                      // Ad completed successfully — do NOT auto-open advanced
                      // User earned Guru and can now afford the action
                    }}
                    onDismiss={() => {
                      setShowAdOffer(false);
                      // Dismiss does NOT grant access
                    }}
                  />
                )}

                {data.timing ? (
                  <NumerologyTimingCard
                    personalYear={data.timing.personalYear}
                    universalYear={data.timing.universalYear}
                    personalMonth={data.timing.personalMonth ?? data.timing.personalYear}
                    personalDay={data.timing.personalDay ?? data.timing.personalYear}
                    cycleProgress={data.timing.cycleProgress}
                    yearPhase={data.timing.yearPhase}
                    currentPeriodFocus={data.timing.currentPeriodFocus}
                    shortTheme={data.timing.shortTheme}
                    nextRefreshAt={data.timing.nextRefreshAt}
                    onOpenConcept={handleOpenConcept}
                  />
                ) : (
                  <NumerologyStateCard
                    icon="analytics-outline"
                    title={t('numerology.partial.timingTitle')}
                    description={t('numerology.partial.timingDescription')}
                  />
                )}

                <NumerologySnapshotCard
                  todayText={data.miniGuidance?.dailyFocus}
                  weekText={data.miniGuidance?.miniGuidance}
                  personalMonth={data.timing?.personalMonth}
                  personalDay={data.timing?.personalDay}
                  yearPhase={data.timing?.yearPhase}
                  currentFocus={data.timing?.currentPeriodFocus}
                />

                {data.miniGuidance ? (
                  <GuidanceCard
                    guidance={data.miniGuidance}
                    guidancePeriod={guidancePeriod}
                    onChangePeriod={handleGuidancePeriodChange}
                    isStale={numerology.cacheStatus === 'stale'}
                    angelSignal={data.angelSignal}
                    signalNumberMeaning={viewModel.displaySignalNumberMeaning}
                  />
                ) : (
                  <NumerologyStateCard
                    icon="sparkles-outline"
                    title={t('numerology.partial.guidanceTitle')}
                    description={t('numerology.partial.guidanceDescription')}
                  />
                )}

                <NumerologyBridgeCard
                  icon="layers-outline"
                  title={t('numerology.advancedTitle')}
                  description={t('numerology.advancedDescription')}
                  ctaLabel={t('numerology.advancedCta')}
                  onPress={handleOpenAdvanced}
                />

                <SpotlightTarget targetKey={NUMEROLOGY_TUTORIAL_TARGET_KEYS.DETAIL_SECTION}>
                  <View style={styles.sectionGroup}>
                    <Text style={styles.sectionTitle}>{t('numerology.coreNumbersTitle')}</Text>
                    {data.coreNumbers.map((number) => (
                      <NumberInsightCard
                        key={number.id}
                        number={number}
                        expanded={Boolean(expandedSections[`core-${number.id}`])}
                        onToggle={handleToggleSection}
                      />
                    ))}
                  </View>
                </SpotlightTarget>

                {data.profile ? (
                  <ProfileInsightCard
                    profile={data.profile}
                    combinedProfile={data.combinedProfile}
                    profileIntroText={viewModel.profileIntroText}
                  />
                ) : (
                  <NumerologyStateCard
                    icon="document-text-outline"
                    title={t('numerology.partial.profileTitle')}
                    description={t('numerology.partial.profileDescription')}
                  />
                )}

                <NumerologyBridgeCard
                  icon="text-outline"
                  title={t('numerology.bridgeTitle')}
                  description={t('numerology.bridgeDescription')}
                  ctaLabel={t('numerology.bridgeCta')}
                  onPress={handleNameAnalysis}
                />

                {numerology.summaryFallbackUsed ? (
                  <View style={styles.summaryWrap}>
                    <Text style={styles.summaryTitle}>{t('numerology.summaryFallbackBodyTitle')}</Text>
                    <Text style={styles.summaryText}>{data.summary}</Text>
                  </View>
                ) : null}
              </>
            ) : null}
          </SpotlightTarget>
        </ScrollView>

        <TrustInfoSheet
          visible={trustVisible}
          onClose={() => setTrustVisible(false)}
          calculationMeta={data?.calculationMeta}
        />

        <NumerologyConceptSheet
          visible={conceptVisible}
          onClose={() => setConceptVisible(false)}
          title={conceptContent.title}
          description={conceptContent.description}
        />

        <NumerologyAdvancedSheet
          visible={advancedVisible}
          onClose={() => setAdvancedVisible(false)}
          angelSignal={data?.angelSignal}
          classicCycle={data?.classicCycle}
          karmicDebt={data?.karmicDebt}
        />

        {data?.shareCardPayload ? (
          <View style={styles.shareShotWrap} pointerEvents="none">
            <ViewShot ref={storyShotRef} options={{ format: 'png', quality: 1, result: 'tmpfile' }}>
              <NumerologyShareCard payload={data.shareCardPayload} variant="story_vertical" />
            </ViewShot>
            <View style={{ height: 18 }} />
            <ViewShot ref={squareShotRef} options={{ format: 'png', quality: 1, result: 'tmpfile' }}>
              <NumerologyShareCard payload={data.shareCardPayload} variant="standard_square" />
            </ViewShot>
          </View>
        ) : null}
      </View>

      <GuestGate {...premiumGateProps} />

      <GuruUnlockModal
        visible={showGuruModal}
        moduleKey="numerology"
        actionKey="advanced_analysis"
        onUnlocked={() => {
          setShowGuruModal(false);
          setAdvancedVisible(true);
          trackEvent('numerology_advanced_opened', commonEventProps);
        }}
        onDismiss={() => setShowGuruModal(false)}
        onShowAdOffer={monetization.adsEnabled ? () => {
          setShowGuruModal(false);
          setShowAdOffer(true);
        } : undefined}
        onShowPurchase={monetization.isActionPurchaseAllowed('advanced_analysis') ? () => {
          setShowGuruModal(false);
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
