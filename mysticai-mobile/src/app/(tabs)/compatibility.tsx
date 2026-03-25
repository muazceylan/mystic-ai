import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '../../store/useAuthStore';
import { useNatalChartStore } from '../../store/useNatalChartStore';
import { useSynastryStore } from '../../store/useSynastryStore';
import {
  useModuleMonetization,
  AdOfferCard,
  GuruUnlockModal,
  PurchaseCatalogSheet,
  GuruBalanceBadge,
  MonetizationEvents,
} from '../../features/monetization';
import {
  RelationshipType,
  SavedPersonResponse,
  SynastryRequest,
} from '../../services/synastry.service';
import { useTheme } from '../../context/ThemeContext';
import i18n from '../../i18n';
import { ErrorStateCard, SafeScreen, TabHeader, SurfaceHeaderIconButton } from '../../components/ui';
import { useTabHeaderActions } from '../../hooks/useTabHeaderActions';
import type { RelationshipType as CompareRelationshipType } from '../../types/compare';
import {
  COMPATIBILITY_TUTORIAL_TARGET_KEYS,
  SpotlightTarget,
  TUTORIAL_IDS,
  TUTORIAL_SCREEN_KEYS,
  useTutorial,
  useTutorialTrigger,
} from '../../features/tutorial';

interface RelationshipTypeOption {
  key: RelationshipType;
  emoji: string;
  labelKey: string;
  color: string;
  bgColor: string;
}

function getRelationshipTypes(C: ReturnType<typeof useTheme>['colors']): RelationshipTypeOption[] {
  return [
    { key: 'LOVE', emoji: '💍', labelKey: 'compatibility.relationshipOptions.love', color: C.pink, bgColor: C.pinkBg },
    { key: 'BUSINESS', emoji: '🤝', labelKey: 'compatibility.relationshipOptions.business', color: C.blue, bgColor: C.blueBg },
    { key: 'FRIENDSHIP', emoji: '🌟', labelKey: 'compatibility.relationshipOptions.friendship', color: C.orange, bgColor: C.neutralBg },
    { key: 'FAMILY', emoji: '🏠', labelKey: 'compatibility.relationshipOptions.family', color: C.violet, bgColor: C.violetBg },
    { key: 'RIVAL', emoji: '🥊', labelKey: 'compatibility.relationshipOptions.rival', color: C.redDark, bgColor: C.redBg },
  ];
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInt(value: string | string[] | undefined): number | null {
  const raw = firstParam(value);
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

function parseRelationshipType(value: string | string[] | undefined): RelationshipType | null {
  const raw = firstParam(value);
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (
    upper === 'LOVE' ||
    upper === 'BUSINESS' ||
    upper === 'FRIENDSHIP' ||
    upper === 'FAMILY' ||
    upper === 'RIVAL'
  ) {
    return upper;
  }
  return null;
}

function mapToCompareRelationshipType(value: RelationshipType): CompareRelationshipType {
  if (value === 'LOVE') return 'love';
  if (value === 'BUSINESS') return 'work';
  if (value === 'FAMILY') return 'family';
  if (value === 'RIVAL') return 'rival';
  return 'friend';
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },
    section: { paddingHorizontal: 20, marginTop: 24 },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    addButton: { padding: 4 },
    emptyPeopleCard: {
      alignItems: 'center',
      padding: 32,
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: C.border,
      borderStyle: 'dashed',
      gap: 8,
    },
    emptyPeopleText: { fontSize: 15, color: C.subtext, fontWeight: '600' },
    emptyPeopleHint: { fontSize: 12, color: C.subtext, textAlign: 'center' },
    peopleScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
    addPersonCard: {
      width: 76,
      height: 96,
      backgroundColor: C.surface,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: C.primary,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
      gap: 6,
    },
    addPersonIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: C.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addPersonLabel: { fontSize: 11, color: C.primary, fontWeight: '600' },
    personCard: {
      width: 76,
      height: 96,
      backgroundColor: C.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
      padding: 8,
      gap: 4,
    },
    personCardSelected: { borderColor: C.primary, borderWidth: 2 },
    personAvatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: C.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    personAvatarSelected: { backgroundColor: C.primary },
    personAvatarText: { fontSize: 17, fontWeight: '700', color: C.primary },
    personAvatarTextSelected: { color: C.white },
    personName: { fontSize: 11, color: C.text, fontWeight: '600', textAlign: 'center' },
    personSign: { fontSize: 10, color: C.subtext },
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 4,
    },
    typeCard: {
      width: '46.5%',
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: C.border,
      paddingVertical: 20,
      alignItems: 'center',
      gap: 8,
      minHeight: 88,
    },
    typeEmoji: { fontSize: 28 },
    typeLabel: { fontSize: 14, fontWeight: '700', color: C.text },
    analyzeSection: { paddingHorizontal: 20, marginTop: 28 },
    analyzeButton: {
      backgroundColor: C.primary,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 10,
      minHeight: 52,
    },
    analyzeButtonDisabled: { opacity: 0.6 },
    analyzeButtonText: { fontSize: 16, fontWeight: '700', color: C.white },
    analysisLoadingCard: {
      marginHorizontal: 20,
      marginTop: 20,
      borderRadius: 16,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    analysisLoadingText: {
      fontSize: 13,
      color: C.subtext,
      fontWeight: '600',
      flex: 1,
    },
    resultSection: {
      paddingHorizontal: 14,
      marginTop: 8,
      gap: 12,
    },
    newAnalysisButton: {
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: C.surface,
      minHeight: 48,
    },
    newAnalysisText: { fontSize: 14, color: C.subtext, fontWeight: '600' },
    errorCard: {
      margin: 20,
      padding: 24,
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: 'center',
      gap: 12,
    },
  });
}

export default function CompatibilityScreen() {
  const params = useLocalSearchParams<{
    autoCompare?: string;
    personAId?: string;
    personBId?: string;
    savedPersonId?: string;
    relationshipType?: string;
    personAName?: string;
    personBName?: string;
    personAAvatarUri?: string;
    personBAvatarUri?: string;
    personASignLabel?: string;
    personBSignLabel?: string;
  }>();

  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const RELATIONSHIP_TYPES = getRelationshipTypes(colors);
  const { reopenTutorialById } = useTutorial();
  const { triggerInitial: triggerInitialTutorials } = useTutorialTrigger(TUTORIAL_SCREEN_KEYS.COMPATIBILITY);
  const tutorialBootstrapRef = useRef<string | null>(null);

  const { user } = useAuthStore();
  const natalChart = useNatalChartStore((state) => state.chart);
  const {
    savedPeople,
    currentSynastry,
    isLoadingPeople,
    isAnalyzing,
    error,
    loadSavedPeople,
    analyzePair,
    pollSynastry,
    clearSynastry,
  } = useSynastryStore();

  const { t } = useTranslation();
  const locale = i18n.language;
  const userId = user?.id ?? null;
  const tabHeaderActions = useTabHeaderActions();

  const [selectedPerson, setSelectedPerson] = useState<SavedPersonResponse | null>(null);
  const [selectedType, setSelectedType] = useState<RelationshipType | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const autoRunKeyRef = useRef<string | null>(null);
  const redirectedSynastryRef = useRef<number | null>(null);

  // ── Monetization ──
  const monetization = useModuleMonetization('compatibility');
  const [showAdOffer, setShowAdOffer] = useState(false);
  const [showGuruModal, setShowGuruModal] = useState(false);
  const [showPurchaseSheet, setShowPurchaseSheet] = useState(false);
  const focusCountRef = useRef(0);

  const autoCompare = firstParam(params.autoCompare) === '1';
  const personAIdParam = parsePositiveInt(params.personAId);
  const personBIdParam = parsePositiveInt(params.personBId) ?? parsePositiveInt(params.savedPersonId);
  const relationshipTypeParam = parseRelationshipType(params.relationshipType);

  const userDisplayName = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Sen';

  // Track monetization module entry on each focus (tab re-visits)
  useFocusEffect(
    useCallback(() => {
      focusCountRef.current += 1;
      monetization.trackEntry();
    }, [monetization.trackEntry]),
  );

  useEffect(() => {
    if (userId) {
      loadSavedPeople(userId);
    }
  }, [userId, loadSavedPeople]);

  useEffect(() => {
    const scope = userId ? String(userId) : null;
    if (!scope) {
      tutorialBootstrapRef.current = null;
      return;
    }

    if (tutorialBootstrapRef.current === scope) {
      return;
    }

    tutorialBootstrapRef.current = scope;
    void triggerInitialTutorials();
  }, [triggerInitialTutorials, userId]);

  useEffect(() => {
    if (!relationshipTypeParam) return;
    setSelectedType(relationshipTypeParam);
  }, [relationshipTypeParam]);

  useEffect(() => {
    if (!personBIdParam || savedPeople.length === 0) return;
    const preselected = savedPeople.find((person) => person.id === personBIdParam) ?? null;
    setSelectedPerson(preselected);
  }, [personBIdParam, savedPeople]);

  const runComparison = useCallback(
    async (request: SynastryRequest) => {
      // Allow redirect even if backend reuses the same synastry id for a new run.
      redirectedSynastryRef.current = null;
      clearSynastry();
      const started = await analyzePair(request);
      if (started.status !== 'COMPLETED' && started.status !== 'FAILED') {
        setIsPolling(true);
        try {
          await pollSynastry(started.id);
        } finally {
          setIsPolling(false);
        }
      }
    },
    [analyzePair, pollSynastry, clearSynastry],
  );

  useEffect(() => {
    if (!autoCompare || !userId || !personBIdParam) return;

    const relation = relationshipTypeParam ?? 'FRIENDSHIP';
    const runKey = `${userId}:${personAIdParam ?? 'self'}:${personBIdParam}:${relation}`;
    if (autoRunKeyRef.current === runKey) return;
    autoRunKeyRef.current = runKey;

    void (async () => {
      try {
        await runComparison({
          userId,
          savedPersonId: personBIdParam,
          personAId: personAIdParam,
          personBId: personBIdParam,
          relationshipType: relation,
          userGender: user?.gender ?? null,
          locale: i18n.language,
        });
      } catch (e: any) {
        Alert.alert(
          t('compatibility.analysisStartErrorTitle'),
          e?.response?.data?.message ?? t('compatibility.analysisStartErrorMessage'),
        );
      }
    })();
  }, [
    autoCompare,
    userId,
    user?.gender,
    personAIdParam,
    personBIdParam,
    relationshipTypeParam,
    runComparison,
  ]);

  const executeAnalyze = async () => {
    if (!selectedPerson || !selectedType || !userId) return;

    try {
      await runComparison({
        userId,
        savedPersonId: selectedPerson.id,
        personBId: selectedPerson.id,
        relationshipType: selectedType,
        userGender: user?.gender ?? null,
        locale,
      });
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.response?.data?.message ?? t('natalChart.analysisStartError'));
    }
  };

  const handleAnalyze = async () => {
    if (!selectedPerson || !selectedType || !userId) return;

    // Check monetization gate on CTA click
    const analyzeAction = monetization.getAction('ai_compare');
    if (analyzeAction && monetization.guruEnabled) {
      if (monetization.canAffordAction('ai_compare')) {
        MonetizationEvents.gateSeen('compatibility', 'ai_compare', 'guru_spend');
        setShowGuruModal(true);
        return;
      }
      if (monetization.shouldShowAd && monetization.adsEnabled) {
        MonetizationEvents.gateSeen('compatibility', 'ai_compare', 'ad');
        setShowAdOffer(true);
        return;
      }
      MonetizationEvents.gateSeen('compatibility', 'ai_compare', 'guru_spend');
      setShowGuruModal(true);
      return;
    }

    // No monetization gate configured — proceed directly
    await executeAnalyze();
  };

  const handleRetry = async () => {
    if (autoCompare && userId && personBIdParam) {
      const relation = relationshipTypeParam ?? selectedType ?? 'FRIENDSHIP';
      try {
        await runComparison({
          userId,
          savedPersonId: personBIdParam,
          personAId: personAIdParam,
          personBId: personBIdParam,
          relationshipType: relation,
          userGender: user?.gender ?? null,
          locale,
        });
      } catch (e: any) {
        Alert.alert(t('common.error'), e?.response?.data?.message ?? t('natalChart.analysisStartError'));
      }
      return;
    }
    await handleAnalyze();
  };

  const handlePressTutorialHelp = useCallback(() => {
    void reopenTutorialById(TUTORIAL_IDS.COMPATIBILITY_FOUNDATION, 'compatibility');
  }, [reopenTutorialById]);

  const isLoading = isAnalyzing || isPolling;
  const showResults = currentSynastry?.status === 'COMPLETED';

  const activeRelationshipType =
    currentSynastry?.relationshipType ?? selectedType ?? relationshipTypeParam ?? 'FRIENDSHIP';

  const personAFromSaved = useMemo(() => {
    if (!personAIdParam) return null;
    return savedPeople.find((person) => person.id === personAIdParam) ?? null;
  }, [personAIdParam, savedPeople]);

  const personBFromSaved = useMemo(() => {
    const resolvedId = currentSynastry?.personBId ?? currentSynastry?.savedPersonId ?? personBIdParam;
    if (!resolvedId) return null;
    return savedPeople.find((person) => person.id === resolvedId) ?? null;
  }, [currentSynastry?.personBId, currentSynastry?.savedPersonId, personBIdParam, savedPeople]);

  const personAName =
    currentSynastry?.personAName ??
    firstParam(params.personAName) ??
    personAFromSaved?.name ??
    userDisplayName;

  const personBName =
    currentSynastry?.personBName ??
    firstParam(params.personBName) ??
    personBFromSaved?.name ??
    selectedPerson?.name ??
    currentSynastry?.personName ??
    'Partner';

  const personAAvatarUri =
    firstParam(params.personAAvatarUri) ??
    (personAFromSaved as any)?.avatarUri ??
    (user?.avatarUri ?? user?.avatarUrl ?? null);

  const personBAvatarUri =
    firstParam(params.personBAvatarUri) ??
    (personBFromSaved as any)?.avatarUri ??
    ((selectedPerson as any)?.avatarUri ?? null);

  const personASignLabel =
    firstParam(params.personASignLabel) ?? personAFromSaved?.sunSign ?? natalChart?.sunSign ?? '—';

  const personBSignLabel =
    firstParam(params.personBSignLabel) ?? personBFromSaved?.sunSign ?? selectedPerson?.sunSign ?? '—';

  const showResultMode = showResults && Boolean(currentSynastry);
  const shouldShowRedirectLoader =
    showResultMode &&
    currentSynastry !== null &&
    currentSynastry !== undefined &&
    redirectedSynastryRef.current !== currentSynastry.id;

  useEffect(() => {
    if (!showResultMode || !currentSynastry) {
      redirectedSynastryRef.current = null;
      return;
    }

    if (redirectedSynastryRef.current === currentSynastry.id) return;
    redirectedSynastryRef.current = currentSynastry.id;

    router.push({
      pathname: '/compare',
      params: {
        matchId: String(currentSynastry.id),
        type: mapToCompareRelationshipType(activeRelationshipType),
        navKey: String(Date.now()),
        leftName: personAName,
        rightName: personBName,
        ...(personAAvatarUri ? { leftAvatarUri: personAAvatarUri } : {}),
        ...(personBAvatarUri ? { rightAvatarUri: personBAvatarUri } : {}),
        ...(personASignLabel ? { leftSignLabel: personASignLabel } : {}),
        ...(personBSignLabel ? { rightSignLabel: personBSignLabel } : {}),
      },
    } as any);

    // Prevent returning to an empty completed state on compatibility screen.
    clearSynastry();
  }, [
    activeRelationshipType,
    clearSynastry,
    currentSynastry,
    personAAvatarUri,
    personAName,
    personASignLabel,
    personBAvatarUri,
    personBName,
    personBSignLabel,
    showResultMode,
  ]);

  if (shouldShowRedirectLoader && currentSynastry) {
    return (
      <SafeScreen
        edges={['top', 'left', 'right']}
        style={{ ...styles.container, backgroundColor: '#F7F5FB' }}
      >
        <View
          style={[
            styles.analysisLoadingCard,
            { marginTop: 24, backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.analysisLoadingText}>
            {t('compatibility.loadingRedirect')}
          </Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edges={['top', 'left', 'right']} style={styles.container}>
      <SpotlightTarget targetKey={COMPATIBILITY_TUTORIAL_TARGET_KEYS.SUMMARY_HEADER}>
        <TabHeader
          title={t('compatibility.title')}
          subtitle={t('compatibility.subtitle')}
          rightActions={(
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {monetization.guruEnabled && <GuruBalanceBadge />}
              <SpotlightTarget targetKey={COMPATIBILITY_TUTORIAL_TARGET_KEYS.HELP_ENTRY}>
                <SurfaceHeaderIconButton
                  iconName="help-circle-outline"
                  onPress={handlePressTutorialHelp}
                  accessibilityLabel={t('compatibility.helpAccessibility')}
                />
              </SpotlightTarget>
            </View>
          )}
          {...tabHeaderActions}
        />
      </SpotlightTarget>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <>
            <SpotlightTarget targetKey={COMPATIBILITY_TUTORIAL_TARGET_KEYS.SECTION_TABS}>
              <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('compatibility.importantPeople')}</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => router.push('/add-person')}
                  accessibilityLabel={t('compatibility.addPersonAccessibility')}
                  accessibilityRole="button"
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="add-circle" size={26} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {isLoadingPeople ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
              ) : error ? (
                <ErrorStateCard
                  message={error}
                  onRetry={() => userId && loadSavedPeople(userId)}
                  style={{ marginTop: 16 }}
                  accessibilityLabel={t('compatibility.reloadPeopleAccessibility')}
                />
              ) : savedPeople.length === 0 ? (
                <TouchableOpacity
                  style={styles.emptyPeopleCard}
                  onPress={() => router.push('/add-person')}
                  accessibilityLabel={t('compatibility.addPersonAccessibility')}
                  accessibilityRole="button"
                >
                  <Ionicons name="person-add-outline" size={32} color={colors.subtext} />
                  <Text style={styles.emptyPeopleText}>{t('compatibility.addPerson')}</Text>
                  <Text style={styles.emptyPeopleHint}>{t('compatibility.addPersonHint')}</Text>
                </TouchableOpacity>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.peopleScroll}>
                  <TouchableOpacity
                    style={styles.addPersonCard}
                    onPress={() => router.push('/add-person')}
                    accessibilityLabel={t('compatibility.addPersonAccessibility')}
                    accessibilityRole="button"
                  >
                    <View style={styles.addPersonIcon}>
                      <Ionicons name="add" size={22} color={colors.primary} />
                    </View>
                    <Text style={styles.addPersonLabel}>{t('compatibility.add')}</Text>
                  </TouchableOpacity>

                  {savedPeople.map((person) => (
                    <TouchableOpacity
                      key={person.id}
                      style={[
                        styles.personCard,
                        selectedPerson?.id === person.id && styles.personCardSelected,
                      ]}
                      onPress={() => {
                        setSelectedPerson(person);
                        clearSynastry();
                      }}
                      accessibilityLabel={t('compatibility.selectPersonAccessibility', { name: person.name })}
                      accessibilityRole="button"
                      onLongPress={() => {
                        Alert.alert(person.name, t('compatibility.deletePersonConfirm'), [
                          { text: t('common.cancel'), style: 'cancel' },
                          {
                            text: t('common.delete'),
                            style: 'destructive',
                            onPress: async () => {
                              if (!userId) return;
                              try {
                                await useSynastryStore.getState().removePerson(person.id, userId);
                              } catch {
                                Alert.alert(t('common.error'), t('natalChart.deletePersonError'));
                              }
                            },
                          },
                        ]);
                      }}
                    >
                      <View
                        style={[
                          styles.personAvatar,
                          selectedPerson?.id === person.id && styles.personAvatarSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.personAvatarText,
                            selectedPerson?.id === person.id && styles.personAvatarTextSelected,
                          ]}
                        >
                          {person.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.personName} numberOfLines={1}>
                        {person.name}
                      </Text>
                      <Text style={styles.personSign}>{person.sunSign ?? '–'}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
            </SpotlightTarget>

            {selectedPerson && (
              <SpotlightTarget targetKey={COMPATIBILITY_TUTORIAL_TARGET_KEYS.SCORE_AREA}>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('compatibility.relationshipType')}</Text>
                  <View style={styles.typeGrid}>
                    {RELATIONSHIP_TYPES.map((item) => {
                      const isSelected = selectedType === item.key;
                      return (
                        <TouchableOpacity
                          key={item.key}
                          style={[
                            styles.typeCard,
                            isSelected && { borderColor: item.color, backgroundColor: item.bgColor },
                          ]}
                          onPress={() => {
                            setSelectedType(item.key);
                            clearSynastry();
                          }}
                          accessibilityLabel={t(item.labelKey)}
                          accessibilityRole="button"
                        >
                          <Text style={styles.typeEmoji}>{item.emoji}</Text>
                          <Text style={[styles.typeLabel, isSelected && { color: item.color }]}>
                            {t(item.labelKey)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </SpotlightTarget>
            )}

            {selectedPerson && selectedType && (
              <SpotlightTarget targetKey={COMPATIBILITY_TUTORIAL_TARGET_KEYS.SAVE_SHARE_ENTRY}>
                <View style={styles.analyzeSection}>
                  <TouchableOpacity
                    style={[styles.analyzeButton, isLoading && styles.analyzeButtonDisabled]}
                    onPress={handleAnalyze}
                    disabled={isLoading}
                    accessibilityLabel={t('compatibility.compareWithAccessibility', { name: selectedPerson.name })}
                    accessibilityRole="button"
                  >
                    {isLoading ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <Ionicons name="sparkles" size={20} color={colors.white} />
                    )}
                    <Text style={styles.analyzeButtonText}>
                      {isLoading ? t('compatibility.analyzing') : t('compatibility.aiCompare')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </SpotlightTarget>
            )}
        </>

        {isLoading ? (
          <View
            style={[
              styles.analysisLoadingCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.analysisLoadingText}>
              {t('compatibility.analysisPreparing')}
            </Text>
          </View>
        ) : null}

        {showAdOffer && monetization.adsEnabled && (
          <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
            <AdOfferCard
              moduleKey="compatibility"
              actionKey="ai_compare"
              onComplete={() => {
                setShowAdOffer(false);
                // Ad completed successfully — user earned Guru, can now afford action
              }}
              onDismiss={() => {
                setShowAdOffer(false);
                // Dismiss does NOT proceed with the premium action
              }}
            />
          </View>
        )}

        {currentSynastry?.status === 'FAILED' && (
          <View style={styles.errorCard}>
            <ErrorStateCard
              message={t('compatibility.analysisFailed')}
              onRetry={handleRetry}
              accessibilityLabel={t('compatibility.retryAnalysisAccessibility')}
            />
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <GuruUnlockModal
        visible={showGuruModal}
        moduleKey="compatibility"
        actionKey="ai_compare"
        onUnlocked={() => {
          setShowGuruModal(false);
          void executeAnalyze();
        }}
        onDismiss={() => setShowGuruModal(false)}
        onShowAdOffer={monetization.adsEnabled ? () => {
          setShowGuruModal(false);
          setShowAdOffer(true);
        } : undefined}
        onShowPurchase={monetization.isActionPurchaseAllowed('ai_compare') ? () => {
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
