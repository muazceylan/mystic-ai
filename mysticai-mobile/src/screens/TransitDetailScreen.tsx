/**
 * TransitDetailScreen — Bugünün Gökyüzü Etkileridetay sayfası
 */
import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeScreen, TabHeader } from '../components/ui';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { useHomeBrief, useSkyPulse } from '../hooks/useHomeQueries';
import { TYPOGRAPHY, SPACING, RADIUS } from '../constants/tokens';

const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const RETRO_KEYS: Record<string, string> = {
  Mercury: 'home.retroMercury',
  Venus: 'home.retroVenus',
  Mars: 'home.retroMars',
  Jupiter: 'home.retroJupiter',
  Saturn: 'home.retroSaturn',
  Uranus: 'home.retroUranus',
  Neptune: 'home.retroNeptune',
  Pluto: 'home.retroPluto',
};

const RETRO_TR: Record<string, string> = {
  Mercury: 'Merkür',
  Venus: 'Venüs',
  Mars: 'Mars',
  Jupiter: 'Jüpiter',
  Saturn: 'Satürn',
  Uranus: 'Uranüs',
  Neptune: 'Neptün',
  Pluto: 'Plüton',
};

function formatTodayTr(): string {
  const d = new Date();
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]}`;
}

export default function TransitDetailScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const onboardingMaritalStatus = useOnboardingStore((s) => s.maritalStatus);
  const S = makeStyles(colors, isDark);

  const homeBriefParams = useMemo(() => {
    if (!user) return null;
    return {
      name: user.name ?? (`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined),
      birthDate: user.birthDate ?? undefined,
      maritalStatus: user.maritalStatus ?? onboardingMaritalStatus ?? undefined,
    };
  }, [user, onboardingMaritalStatus]);

  const homeBriefQuery = useHomeBrief(homeBriefParams);
  const skyPulseQuery = useSkyPulse();

  const homeBrief = homeBriefQuery.data;
  const skyPulse = skyPulseQuery.data;

  const isLoading =
    (!homeBrief && homeBriefQuery.isLoading) || (!skyPulse && skyPulseQuery.isLoading);
  const isError = homeBriefQuery.isError && skyPulseQuery.isError;
  const isRefreshing = homeBriefQuery.isRefetching || skyPulseQuery.isRefetching;

  const headline =
    homeBrief?.transitHeadline || skyPulse?.dailyVibe || t('home.transitTitle');
  const summary =
    homeBrief?.transitSummary || homeBrief?.dailyEnergy || skyPulse?.dailyVibe || '';
  const actionMessage = homeBrief?.actionMessage ?? '';

  const transitPoints = useMemo(() => {
    const pool = [
      ...(homeBrief?.transitPoints ?? []),
    ].filter((line): line is string => !!line && line.trim().length > 0);
    return Array.from(new Set(pool.map((p) => p.trim())));
  }, [homeBrief]);

  const retrogradePlanets = skyPulse?.retrogradePlanets ?? [];
  const moonPhase = skyPulse?.moonPhase ?? '';
  const moonSign = skyPulse?.moonSignTurkish ?? skyPulse?.moonSign ?? '';

  const onRefresh = () => {
    void Promise.allSettled([homeBriefQuery.refetch(), skyPulseQuery.refetch()]);
  };

  const accent = isDark ? '#60A5FA' : '#2563EB';

  return (
    <SafeScreen>
      <TabHeader title={t('home.transitTitle')} subtitle={formatTodayTr()} />

      <ScrollView
        contentContainerStyle={S.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading ? (
          <View style={S.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={S.loadingText}>{t('home.skyPulseLoading')}</Text>
          </View>
        ) : isError ? (
          <View style={S.errorWrap}>
            <Ionicons name="cloud-offline-outline" size={40} color={colors.muted} />
            <Text style={S.errorText}>{t('home.skyPulseError')}</Text>
            <Pressable style={[S.retryBtn, { borderColor: accent }]} onPress={onRefresh}>
              <Text style={[S.retryBtnText, { color: accent }]}>{t('home.swotRetryBtn')}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Hero — Headline + Summary */}
            <Animated.View entering={FadeInDown.duration(400)} style={S.heroCard}>
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(37,99,235,0.12)', 'rgba(37,99,235,0.03)']
                    : ['rgba(37,99,235,0.07)', 'rgba(37,99,235,0.01)']
                }
                style={StyleSheet.absoluteFillObject}
              />
              <View style={S.heroIconWrap}>
                <Ionicons name="planet" size={22} color={accent} />
              </View>
              <Text style={S.heroHeadline}>{headline}</Text>
              {summary ? <Text style={S.heroSummary}>{summary}</Text> : null}
            </Animated.View>

            {/* Meta chips — Moon & Retro */}
            <Animated.View entering={FadeInDown.delay(80).duration(400)} style={S.metaRow}>
              {moonPhase ? (
                <View style={S.metaChip}>
                  <Ionicons name="moon-outline" size={14} color={isDark ? '#FBBF24' : '#D97706'} />
                  <View>
                    <Text style={S.metaChipLabel}>{t('chart.moon')}</Text>
                    <Text style={S.metaChipValue}>{moonPhase}</Text>
                  </View>
                </View>
              ) : null}
              {moonSign ? (
                <View style={S.metaChip}>
                  <Ionicons name="star-outline" size={14} color={isDark ? '#A78BFA' : '#7C3AED'} />
                  <View>
                    <Text style={S.metaChipLabel}>{t('chart.planetaryPositions')}</Text>
                    <Text style={S.metaChipValue}>☾ {moonSign}</Text>
                  </View>
                </View>
              ) : null}
              <View style={S.metaChip}>
                <Ionicons
                  name="repeat-outline"
                  size={14}
                  color={retrogradePlanets.length > 0 ? (isDark ? '#F87171' : '#DC2626') : (isDark ? '#4ADE80' : '#16A34A')}
                />
                <View>
                  <Text style={S.metaChipLabel}>Retro</Text>
                  <Text style={S.metaChipValue}>
                    {retrogradePlanets.length === 0
                      ? 'Sakin'
                      : `${retrogradePlanets.length} gezegen`}
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* Action message */}
            {actionMessage ? (
              <Animated.View entering={FadeInDown.delay(140).duration(400)} style={S.actionCard}>
                <View style={S.actionIconWrap}>
                  <Ionicons name="flash" size={16} color={isDark ? '#FBBF24' : '#D97706'} />
                </View>
                <View style={S.actionTextWrap}>
                  <Text style={S.actionLabel}>{t('home.transitActionItems')}</Text>
                  <Text style={S.actionText}>{actionMessage}</Text>
                </View>
              </Animated.View>
            ) : null}

            {/* Transit points */}
            {transitPoints.length > 0 ? (
              <Animated.View entering={FadeInDown.delay(200).duration(400)} style={S.card}>
                <Text style={S.cardSectionTitle}>{t('home.transitCautionItems')}</Text>
                <View style={S.pointsList}>
                  {transitPoints.map((point, idx) => (
                    <View key={`${idx}-${point.slice(0, 20)}`} style={S.pointRow}>
                      <View style={[S.pointDot, { backgroundColor: accent }]} />
                      <Text style={S.pointText}>{point}</Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            ) : null}

            {/* Retrograde planets detail */}
            {retrogradePlanets.length > 0 ? (
              <Animated.View entering={FadeInDown.delay(260).duration(400)} style={S.card}>
                <Text style={S.cardSectionTitle}>Retrolar</Text>
                <View style={S.retroList}>
                  {retrogradePlanets.map((planet) => {
                    const trKey = RETRO_KEYS[planet];
                    const trName = RETRO_TR[planet] ?? planet;
                    return (
                      <View key={planet} style={S.retroItem}>
                        <View style={S.retroHeader}>
                          <View style={[S.retroDot, { backgroundColor: isDark ? '#F87171' : '#DC2626' }]} />
                          <Text style={S.retroPlanetName}>{trName}</Text>
                          <View style={S.retroBadge}>
                            <Text style={S.retroBadgeText}>℞</Text>
                          </View>
                        </View>
                        {trKey ? (
                          <Text style={S.retroDesc}>{t(trKey)}</Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </Animated.View>
            ) : null}

            {/* Daily energy */}
            {homeBrief?.dailyEnergy && homeBrief.dailyEnergy !== summary ? (
              <Animated.View entering={FadeInDown.delay(320).duration(400)} style={S.card}>
                <Text style={S.cardSectionTitle}>{t('home.transitDailyEnergy')}</Text>
                <Text style={S.energyText}>{homeBrief.dailyEnergy}</Text>
              </Animated.View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeScreen>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  const accent = isDark ? '#60A5FA' : '#2563EB';

  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.md,
      gap: SPACING.sm,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    headerTitle: {
      ...TYPOGRAPHY.BodyLarge,
      color: C.text,
      letterSpacing: -0.3,
    },
    headerSub: {
      ...TYPOGRAPHY.CaptionXS,
      color: C.subtext,
    },

    scrollContent: {
      paddingHorizontal: SPACING.lgXl,
      paddingBottom: 100,
      gap: SPACING.md,
    },

    /* Loading & Error */
    loadingWrap: {
      alignItems: 'center',
      paddingVertical: 60,
      gap: SPACING.md,
    },
    loadingText: {
      ...TYPOGRAPHY.Caption,
      color: C.subtext,
    },
    errorWrap: {
      alignItems: 'center',
      paddingVertical: 48,
      gap: SPACING.md,
    },
    errorText: {
      ...TYPOGRAPHY.Body,
      color: C.subtext,
      textAlign: 'center',
      maxWidth: 280,
    },
    retryBtn: {
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.smMd,
      borderRadius: RADIUS.full,
      borderWidth: 1.5,
    },
    retryBtnText: {
      ...TYPOGRAPHY.SmallBold,
    },

    /* Hero card */
    heroCard: {
      padding: SPACING.xl,
      borderRadius: RADIUS.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(96,165,250,0.15)' : 'rgba(37,99,235,0.10)',
      gap: SPACING.smMd,
    },
    heroIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(96,165,250,0.14)' : 'rgba(37,99,235,0.08)',
    },
    heroHeadline: {
      ...TYPOGRAPHY.H3,
      color: C.text,
      lineHeight: 26,
    },
    heroSummary: {
      ...TYPOGRAPHY.Body,
      color: C.subtext,
      lineHeight: 22,
    },

    /* Meta chips */
    metaRow: {
      flexDirection: 'row',
      gap: SPACING.sm,
    },
    metaChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      padding: SPACING.smMd,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148,163,184,0.12)' : C.border,
      backgroundColor: isDark ? 'rgba(30,41,59,0.55)' : C.surface,
    },
    metaChipLabel: {
      ...TYPOGRAPHY.CaptionXS,
      color: C.muted,
    },
    metaChipValue: {
      ...TYPOGRAPHY.SmallBold,
      color: C.text,
    },

    /* Action card */
    actionCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING.smMd,
      padding: SPACING.lgXl,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(251,191,36,0.15)' : 'rgba(217,119,6,0.10)',
      backgroundColor: isDark ? 'rgba(251,191,36,0.06)' : 'rgba(251,191,36,0.04)',
    },
    actionIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(251,191,36,0.14)' : 'rgba(217,119,6,0.08)',
      marginTop: 2,
    },
    actionTextWrap: {
      flex: 1,
      gap: 4,
    },
    actionLabel: {
      ...TYPOGRAPHY.CaptionBold,
      color: isDark ? '#FBBF24' : '#D97706',
    },
    actionText: {
      ...TYPOGRAPHY.Body,
      color: C.text,
      lineHeight: 22,
    },

    /* Generic card */
    card: {
      padding: SPACING.lgXl,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148,163,184,0.12)' : C.border,
      backgroundColor: isDark ? 'rgba(30,41,59,0.55)' : C.surface,
      gap: SPACING.smMd,
    },
    cardSectionTitle: {
      ...TYPOGRAPHY.BodyBold,
      color: C.text,
      marginBottom: SPACING.xs,
    },

    /* Points */
    pointsList: {
      gap: SPACING.smMd,
    },
    pointRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING.smMd,
    },
    pointDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginTop: 7,
    },
    pointText: {
      ...TYPOGRAPHY.Body,
      color: C.text,
      flex: 1,
      lineHeight: 22,
    },

    /* Retrograde */
    retroList: {
      gap: SPACING.md,
    },
    retroItem: {
      gap: 6,
    },
    retroHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    retroDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    retroPlanetName: {
      ...TYPOGRAPHY.BodyBold,
      color: C.text,
    },
    retroBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: RADIUS.xs,
      backgroundColor: isDark ? 'rgba(248,113,113,0.14)' : 'rgba(220,38,38,0.08)',
    },
    retroBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: isDark ? '#F87171' : '#DC2626',
    },
    retroDesc: {
      ...TYPOGRAPHY.Caption,
      color: C.subtext,
      lineHeight: 18,
      paddingLeft: 8 + SPACING.sm, // align with name after dot
    },

    /* Daily energy */
    energyText: {
      ...TYPOGRAPHY.Body,
      color: C.text,
      lineHeight: 22,
    },
  });
}
