import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import { useTranslation } from 'react-i18next';
import * as Haptics from '../utils/haptics';
import OnboardingBackground from '../components/OnboardingBackground';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { SafeScreen } from '../components/ui';
import { useGenerateMatchImage } from '../hooks/useGenerateMatchImage';
import { useNumerology } from '../hooks/useNumerology';
import { trackEvent } from '../services/analytics';
import {
  NUMEROLOGY_TUTORIAL_TARGET_KEYS,
  SpotlightTarget,
  TUTORIAL_IDS,
  TUTORIAL_SCREEN_KEYS,
  useTutorial,
  useTutorialTrigger,
} from '../features/tutorial';
import {
  findCoreNumber,
  getLockedSections,
  getNumerologySnapshot,
  getDominantNumber,
  isPremiumUser,
  saveNumerologySnapshot,
} from '../services/numerology.service';
import {
  instagramStory,
  saveToGallery,
  shareImage,
  ShareServiceError,
  type ShareChannel,
} from '../services/share.service';
import {
  CombinedProfileCard,
  GuidanceCard,
  NumberInsightCard,
  NumerologyBridgeCard,
  NumerologyHeroCard,
  NumerologyLoadingSkeleton,
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

function getEmptyStateConfig(variant: 'none' | 'name_missing' | 'birth_date_missing' | 'both_missing', t: ReturnType<typeof useTranslation>['t']): EmptyConfig | null {
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

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 56 : 20,
      paddingBottom: 12,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: C.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: C.border,
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 42, gap: 14 },
    sectionGroup: { gap: 14 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      color: C.subtext,
      marginBottom: -2,
    },
    stateStack: { gap: 12 },
    summaryCard: {
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 18,
      padding: 16,
      gap: 10,
    },
    summaryTitle: {
      color: C.text,
      fontSize: 15,
      fontWeight: '800',
    },
    summaryText: {
      color: C.text,
      fontSize: 14,
      lineHeight: 22,
    },
    shareShotWrap: {
      position: 'absolute',
      left: -4000,
      top: 0,
    },
  });
}

export default function NumerologyScreen() {
  const { t, i18n } = useTranslation();
  const searchParams = useLocalSearchParams<{ entry_point?: string; entryPoint?: string }>();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const { reopenTutorialById } = useTutorial();
  const { triggerInitial: triggerInitialTutorials } = useTutorialTrigger(TUTORIAL_SCREEN_KEYS.NUMEROLOGY);
  const styles = makeStyles(colors);

  const [guidancePeriod, setGuidancePeriod] = useState<'day' | 'week'>('day');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [trustVisible, setTrustVisible] = useState(false);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [snapshotExists, setSnapshotExists] = useState<boolean | null>(null);

  const startRef = useRef(Date.now());
  const tutorialBootstrapRef = useRef<string | null>(null);
  const screenViewTrackedRef = useRef(false);
  const emptyTrackedRef = useRef(false);
  const loadedTrackedRef = useRef(false);
  const partialTrackedRef = useRef(false);
  const staleTrackedRef = useRef(false);

  const effectiveDate = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    const day = `${now.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
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
  const dominantNumber = getDominantNumber(data);
  const mainNumber = findCoreNumber(data, data?.combinedProfile?.dominantNumberId ?? 'lifePath');
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
  const lockedSections = useMemo(
    () => getLockedSections(data?.sectionLockState, premium),
    [data?.sectionLockState, premium],
  );

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
        if (!cancelled) {
          setSnapshotExists(null);
        }
        return;
      }

      try {
        const snapshot = await getNumerologySnapshot(
          user?.id ?? user?.username ?? data.name,
          data.annualSnapshotKey,
        );
        if (!cancelled) {
          setSnapshotExists(Boolean(snapshot));
        }
      } catch {
        if (!cancelled) {
          setSnapshotExists(null);
        }
      }
    };

    void resolveSnapshot();
    return () => {
      cancelled = true;
    };
  }, [data?.annualSnapshotKey, data?.name, user?.id, user?.username]);

  const commonEventProps = useMemo(
    () => ({
      source_surface: 'numerology_screen',
      has_birth_date: numerology.hasRequiredProfile ? true : numerology.missingFields.indexOf('birthDate') === -1,
      has_name: numerology.hasRequiredProfile ? true : numerology.missingFields.indexOf('name') === -1,
      is_premium_user: premium,
      locked_sections: lockedSections.length ? lockedSections.join(',') : 'none',
      personal_year: data?.timing?.personalYear ?? null,
      dominant_number: dominantNumber,
      response_version: data?.contentVersion ?? data?.version ?? null,
      guidance_period: guidancePeriod,
      cache_status: numerology.cacheStatus,
      entry_point: entryPoint,
      snapshot_exists: snapshotExists,
      locale: data?.locale ?? numerology.locale ?? i18n.language ?? null,
    }),
    [
      data?.contentVersion,
      data?.locale,
      data?.timing?.personalYear,
      data?.version,
      dominantNumber,
      entryPoint,
      guidancePeriod,
      i18n.language,
      lockedSections,
      numerology.cacheStatus,
      numerology.hasRequiredProfile,
      numerology.locale,
      numerology.missingFields,
      premium,
      snapshotExists,
    ],
  );

  useEffect(() => {
    if (screenViewTrackedRef.current) {
      return;
    }
    screenViewTrackedRef.current = true;
    trackEvent('numerology_screen_viewed', commonEventProps);
  }, [commonEventProps]);

  useEffect(() => {
    if (!emptyConfig || emptyTrackedRef.current) {
      return;
    }
    emptyTrackedRef.current = true;
    trackEvent('numerology_empty_state_viewed', {
      ...commonEventProps,
      empty_variant: numerology.emptyVariant,
      missing_fields: numerology.missingFields.join(','),
    });
  }, [commonEventProps, emptyConfig, numerology.emptyVariant, numerology.missingFields]);

  useEffect(() => {
    if (!data || loadedTrackedRef.current) {
      return;
    }
    loadedTrackedRef.current = true;
    trackEvent('numerology_loaded', {
      ...commonEventProps,
      load_time_ms: Date.now() - startRef.current,
      is_partial: numerology.isPartial,
      generated_at: data.generatedAt,
    });
  }, [commonEventProps, data, numerology.isPartial]);

  useEffect(() => {
    if (!data || !numerology.isPartial || partialTrackedRef.current) {
      return;
    }
    partialTrackedRef.current = true;
    trackEvent('numerology_partial_response_seen', {
      ...commonEventProps,
      missing_sections: numerology.partialSections.join(','),
    });
  }, [commonEventProps, data, numerology.isPartial, numerology.partialSections]);

  useEffect(() => {
    if (!numerology.hasStaleFallback || staleTrackedRef.current) {
      return;
    }
    staleTrackedRef.current = true;
    trackEvent('numerology_stale_cache_seen', {
      ...commonEventProps,
      generated_at: data?.generatedAt ?? null,
    });
  }, [commonEventProps, data?.generatedAt, numerology.hasStaleFallback]);

  const handleToggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const nextValue = !prev[sectionId];
      if (nextValue) {
        trackEvent('numerology_section_expanded', {
          ...commonEventProps,
          section_id: sectionId,
          is_locked: false,
        });
      }
      return {
        ...prev,
        [sectionId]: nextValue,
      };
    });
  };

  const handleRetry = () => {
    trackEvent('numerology_retry_clicked', {
      ...commonEventProps,
      error_type: numerology.errorType,
    });
    void numerology.refetch();
  };

  const handleEmptyCta = () => {
    if (!emptyConfig) {
      return;
    }
    trackEvent('numerology_profile_cta_clicked', {
      ...commonEventProps,
      empty_variant: numerology.emptyVariant,
    });
    router.push(emptyConfig.route as any);
  };

  const handleOpenTrust = () => {
    trackEvent('numerology_trust_opened', commonEventProps);
    setTrustVisible(true);
  };

  const executeShare = async (variant: ShareVariant, channel: ShareChannel) => {
    if (!data?.shareCardPayload) {
      return;
    }

    trackEvent('numerology_share_clicked', {
      ...commonEventProps,
      share_format: variant,
      share_channel: channel,
      payload_version: data.shareCardPayload.payloadVersion,
    });

    try {
      const uri = variant === 'story_vertical'
        ? await generateStoryCard()
        : await generateSquareCard();

      if (channel === 'gallery') {
        await saveToGallery(uri);
      } else if (channel === 'instagram_story') {
        await instagramStory(uri);
      } else {
        await shareImage(uri);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      const message = error instanceof ShareServiceError
        ? error.message
        : t('numerology.shareError');
      Alert.alert(t('common.error'), message);
    }
  };

  const handleShare = () => {
    if (!data?.shareCardPayload) {
      return;
    }

    Alert.alert(
      t('numerology.shareMenuTitle'),
      t('numerology.shareMenuDescription'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('numerology.shareOptionStory'),
          onPress: () => { void executeShare('story_vertical', 'instagram_story'); },
        },
        {
          text: t('numerology.shareOptionStandard'),
          onPress: () => { void executeShare('standard_square', 'system'); },
        },
        {
          text: t('numerology.shareOptionGallery'),
          onPress: () => { void executeShare('standard_square', 'gallery'); },
        },
      ],
    );
  };

  const handleSaveSnapshot = async () => {
    if (!data) {
      return;
    }
    trackEvent('numerology_save_snapshot_clicked', {
      ...commonEventProps,
      snapshot_scope: 'annual',
      snapshot_year: data.annualSnapshotKey?.slice(-4) ?? null,
    });

    try {
      setSavingSnapshot(true);
      await saveNumerologySnapshot({
        userId: user?.id ?? user?.username ?? data.name,
        response: data,
      });
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
        <OnboardingBackground />

        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={styles.backBtn}
            accessibilityLabel={t('common.back')}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('home.numerology')}</Text>
          <SpotlightTarget targetKey={NUMEROLOGY_TUTORIAL_TARGET_KEYS.HELP_ENTRY}>
            <TouchableOpacity
              onPress={handlePressTutorialHelp}
              style={styles.backBtn}
              accessibilityLabel="Numeroloji rehberini tekrar aç"
              accessibilityRole="button"
            >
              <Ionicons name="help-circle-outline" size={22} color={colors.text} />
            </TouchableOpacity>
          </SpotlightTarget>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
                  personalYear={data.timing?.personalYear ?? null}
                  shortTheme={data.timing?.shortTheme}
                  cacheStatus={numerology.cacheStatus}
                  generatedAt={data.generatedAt}
                  onShare={handleShare}
                  onSaveSnapshot={handleSaveSnapshot}
                  onOpenTrust={handleOpenTrust}
                  shareLoading={shareLoading}
                  savingSnapshot={savingSnapshot}
                />
              </SpotlightTarget>

              {data.timing ? (
                <NumerologyTimingCard
                  personalYear={data.timing.personalYear}
                  universalYear={data.timing.universalYear}
                  cycleProgress={data.timing.cycleProgress}
                  yearPhase={data.timing.yearPhase}
                  currentPeriodFocus={data.timing.currentPeriodFocus}
                  shortTheme={data.timing.shortTheme}
                />
              ) : (
                <NumerologyStateCard
                  icon="analytics-outline"
                  title={t('numerology.partial.timingTitle')}
                  description={t('numerology.partial.timingDescription')}
                />
              )}

              {data.miniGuidance ? (
                <GuidanceCard
                  guidance={data.miniGuidance}
                  guidancePeriod={guidancePeriod}
                  onChangePeriod={setGuidancePeriod}
                  isStale={numerology.cacheStatus === 'stale'}
                />
              ) : (
                <NumerologyStateCard
                  icon="sparkles-outline"
                  title={t('numerology.partial.guidanceTitle')}
                  description={t('numerology.partial.guidanceDescription')}
                />
              )}

              <SpotlightTarget targetKey={NUMEROLOGY_TUTORIAL_TARGET_KEYS.DETAIL_SECTION}>
                <View style={styles.sectionGroup}>
                  <Text style={styles.sectionTitle}>{t('numerology.coreNumbersTitle')}</Text>
                  {data.coreNumbers.map((number) => {
                    const sectionId = `coreNumbers.${number.id}`;
                    return (
                      <NumberInsightCard
                        key={sectionId}
                        number={number}
                        expanded={Boolean(expandedSections[`core-${number.id}`])}
                        onToggle={handleToggleSection}
                      />
                    );
                  })}
                </View>
              </SpotlightTarget>

              <View style={styles.sectionGroup}>
                <Text style={styles.sectionTitle}>{t('numerology.profileSectionTitle')}</Text>
                {data.combinedProfile ? (
                  <CombinedProfileCard
                    profile={data.combinedProfile}
                    expanded={Boolean(expandedSections['combined-profile'])}
                    onToggle={handleToggleSection}
                  />
                ) : (
                  <NumerologyStateCard
                    icon="git-merge-outline"
                    title={t('numerology.partial.combinedTitle')}
                    description={t('numerology.partial.combinedDescription')}
                  />
                )}

                {data.profile ? (
                  <ProfileInsightCard
                    profile={data.profile}
                    showDeepInsights
                  />
                ) : (
                  <NumerologyStateCard
                    icon="document-text-outline"
                    title={t('numerology.partial.profileTitle')}
                    description={t('numerology.partial.profileDescription')}
                  />
                )}
              </View>

              <NumerologyBridgeCard
                icon="text-outline"
                title={t('numerology.bridgeTitle')}
                description={t('numerology.bridgeDescription')}
                ctaLabel={t('numerology.bridgeCta')}
                onPress={handleNameAnalysis}
              />

              {numerology.summaryFallbackUsed ? (
                <View style={styles.stateStack}>
                  <NumerologyStateCard
                    icon="document-attach-outline"
                    title={t('numerology.summaryFallbackTitle')}
                    description={t('numerology.summaryFallbackDescription')}
                  />
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>{t('numerology.summaryFallbackBodyTitle')}</Text>
                    <Text style={styles.summaryText}>{data.summary}</Text>
                  </View>
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
    </SafeScreen>
  );
}
