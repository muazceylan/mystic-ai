import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { useNatalChartStore } from '../../store/useNatalChartStore';
import {
  NatalChartResponse,
  PlanetPosition,
  PlanetaryAspect,
  fetchLatestNatalChart,
  calculateNatalChart,
} from '../../services/astrology.service';
import { getZodiacInfo } from '../../constants/zodiac';
import PlanetBottomSheet from '../../components/Astrology/PlanetBottomSheet';
import CosmicHotspotCard from '../../components/Astrology/CosmicHotspotCard';
import AspectBottomSheet from '../../components/Astrology/AspectBottomSheet';
import StaggeredAiText from '../../components/Astrology/StaggeredAiText';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { SafeScreen } from '../../components/ui';

// ─── Planet Symbols (Unicode astro glyphs) ──────────────────────────────
const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
};


const ZODIAC_SYMBOLS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];

type ScreenState = 'loading' | 'calculating' | 'error' | 'ready';

function getAspectInfo(C: ReturnType<typeof useTheme>['colors'], t: (k: string) => string) {
  return {
    CONJUNCTION: { symbol: '☌', label: t('natalChart.conjunction'), color: C.violet },
    OPPOSITION: { symbol: '☍', label: t('natalChart.opposition'), color: C.redBright },
    TRINE: { symbol: '△', label: t('natalChart.trine'), color: C.trine },
    SQUARE: { symbol: '□', label: t('natalChart.square'), color: C.amber },
  } as Record<string, { symbol: string; label: string; color: string }>;
}

export default function NatalChartTab() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const ASPECT_INFO = useMemo(() => getAspectInfo(colors, t), [colors, t]);
  const planetNames: Record<string, string> = useMemo(() => ({
    Sun: t('natalChart.sun'),
    Moon: t('natalChart.moon'),
    Mercury: t('natalChart.mercury'),
    Venus: t('natalChart.venus'),
    Mars: t('natalChart.mars'),
    Jupiter: t('natalChart.jupiter'),
    Saturn: t('natalChart.saturn'),
    Uranus: t('natalChart.uranus'),
    Neptune: t('natalChart.neptune'),
    Pluto: t('natalChart.pluto'),
    Chiron: t('natalChart.chiron'),
    NorthNode: t('natalChart.northNode'),
  }), [t]);
  const user = useAuthStore((s) => s.user);
  const {
    chart: cachedChart,
    setChart: setCachedChart,
    setLoading: setCacheLoading,
    setError: setCacheError,
    isStale,
  } = useNatalChartStore();

  const [state, setState] = useState<ScreenState>(cachedChart ? 'ready' : 'loading');
  const [chart, setChart] = useState<NatalChartResponse | null>(cachedChart);
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetPosition | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedAspect, setSelectedAspect] = useState<PlanetaryAspect | null>(null);
  const [aspectSheetVisible, setAspectSheetVisible] = useState(false);

  // ─── AI Interpretation Polling ─────────────────────────────────────
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);
  const [pollExhausted, setPollExhausted] = useState(false);
  const MAX_POLL_ATTEMPTS = 12;
  const POLL_INTERVAL_MS = 3000;

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
    pollCountRef.current = 0;
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    setPollExhausted(false);

    const poll = async () => {
      if (!user?.id || pollCountRef.current >= MAX_POLL_ATTEMPTS) {
        stopPolling();
        setPollExhausted(true);
        return;
      }

      pollCountRef.current += 1;

      try {
        const response = await fetchLatestNatalChart(user.id);
        const updated = response.data;
        if (
          updated.interpretationStatus === 'COMPLETED' ||
          updated.interpretationStatus === 'FAILED'
        ) {
          setChart(updated);
          setCachedChart(updated);
          stopPolling();
          return;
        }
      } catch {
        // ignore poll errors
      }

      pollRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    };

    pollRef.current = setTimeout(poll, POLL_INTERVAL_MS);
  }, [user, stopPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // ─── Skeleton Pulse ────────────────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  const pulseAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    pulseAnimRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    pulseAnimRef.current.start();
    return () => { pulseAnimRef.current?.stop(); };
  }, []);

  // ─── Calculating Animation ─────────────────────────────────────────
  const calcAnim = useRef(new Animated.Value(0)).current;
  const calcAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const startCalcAnimation = () => {
    calcAnimRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(calcAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(calcAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    );
    calcAnimRef.current.start();
  };

  const stopCalcAnimation = () => {
    calcAnimRef.current?.stop();
    calcAnim.setValue(0);
  };

  // ─── Data Loading ──────────────────────────────────────────────────
  const buildRequest = useCallback(() => {
    if (!user?.id || !user?.birthDate) return null;
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined;
    const birthLocation = [user.birthCity, user.birthCountry].filter(Boolean).join(', ');
    if (!birthLocation) return null;

    return {
      userId: user.id,
      name,
      birthDate: user.birthDate,
      birthTime: user.birthTimeUnknown ? undefined : (user.birthTime ?? undefined),
      birthLocation,
    };
  }, [user]);

  const loadChart = useCallback(async (forceRefresh = false) => {
    if (!user?.id) {
      setErrorMessage('Kullanici bilgisi bulunamadi. Lutfen tekrar giris yapin.');
      setState('error');
      return;
    }

    if (!forceRefresh && cachedChart && !isStale()) {
      setChart(cachedChart);
      setState('ready');
      return;
    }

    try {
      setState('loading');
      setCacheLoading(true);
      const response = await fetchLatestNatalChart(user.id);
      setChart(response.data);
      setCachedChart(response.data);
      setState('ready');
    } catch {
      const request = buildRequest();
      if (!request) {
        setErrorMessage('Dogum bilgileriniz eksik. Lutfen profilinizi guncelleyin.');
        setState('error');
        setCacheError(t('natalChart.missingBirthData'));
        return;
      }

      try {
        setState('calculating');
        startCalcAnimation();
        const response = await calculateNatalChart(request);
        stopCalcAnimation();
        setChart(response.data);
        setCachedChart(response.data);
        setState('ready');
      } catch {
        stopCalcAnimation();
        setErrorMessage('Dogum haritasi hesaplanamadi. Lutfen tekrar deneyin.');
        setState('error');
        setCacheError(t('natalChart.calcError'));
      }
    } finally {
      setCacheLoading(false);
    }
  }, [user, cachedChart, isStale, buildRequest]);

  const onRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    setPollExhausted(false);
    try {
      const response = await fetchLatestNatalChart(user.id);
      setChart(response.data);
      setCachedChart(response.data);
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadChart();
  }, [loadChart]);

  useEffect(() => {
    if (
      state === 'ready' &&
      chart &&
      chart.interpretationStatus !== 'COMPLETED' &&
      chart.interpretationStatus !== 'FAILED'
    ) {
      startPolling();
    } else {
      stopPolling();
    }
  }, [state, chart?.interpretationStatus]);

  const openPlanetSheet = (planet: PlanetPosition) => {
    setSelectedPlanet(planet);
    setSheetVisible(true);
  };

  const closePlanetSheet = () => {
    setSheetVisible(false);
    setTimeout(() => setSelectedPlanet(null), 300);
  };

  const openAspectSheet = (asp: PlanetaryAspect) => {
    setSelectedAspect(asp);
    setAspectSheetVisible(true);
  };

  const closeAspectSheet = () => {
    setAspectSheetVisible(false);
    setTimeout(() => setSelectedAspect(null), 300);
  };

  const hotspotAspects = useMemo(
    () => [...(chart?.aspects ?? [])].sort((a, b) => a.orb - b.orb).slice(0, 2),
    [chart?.aspects],
  );

  // ═══════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════════
  if (state === 'loading') {
    return (
      <SafeScreen edges={['top', 'left', 'right']} style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.violet} />
          <Animated.View style={[styles.skelLine, { width: 180, opacity: pulseAnim }]} />
          <Animated.View style={[styles.skelLine, { width: 120, opacity: pulseAnim }]} />
          <Text style={styles.loadingText}>Haritaniz yukleniyor...</Text>
        </View>
      </SafeScreen>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // CALCULATING STATE
  // ═══════════════════════════════════════════════════════════════════
  if (state === 'calculating') {
    return (
      <SafeScreen edges={['top', 'left', 'right']} style={styles.container}>
        <View style={styles.center}>
          <Animated.Text
            style={[
              styles.calcSymbol,
              {
                opacity: calcAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.4, 1, 0.4],
                }),
                transform: [
                  {
                    scale: calcAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.8, 1.2, 0.8],
                    }),
                  },
                ],
              },
            ]}
          >
            {ZODIAC_SYMBOLS[Math.floor(Date.now() / 500) % 12]}
          </Animated.Text>
          <Text style={styles.calcTitle}>Yildizlar Hesaplaniyor...</Text>
          <Text style={styles.calcSub}>Bu islem birkac saniye surebilir</Text>
        </View>
      </SafeScreen>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ERROR STATE
  // ═══════════════════════════════════════════════════════════════════
  if (state === 'error') {
    return (
      <SafeScreen edges={['top', 'left', 'right']} style={styles.container}>
        <View style={styles.center}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle-outline" size={32} color={colors.redBright} />
          </View>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => loadChart(true)}
            accessibilityLabel={t('natalChart.retry')}
            accessibilityRole="button"
          >
            <Ionicons name="refresh" size={16} color={colors.white} />
            <Text style={styles.retryBtnText}>Tekrar Dene</Text>
          </Pressable>
        </View>
      </SafeScreen>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // READY STATE — Modern Light UI
  // ═══════════════════════════════════════════════════════════════════
  const sunInfo = getZodiacInfo(chart?.sunSign);
  const moonInfo = getZodiacInfo(chart?.moonSign);
  const risingInfo = getZodiacInfo(chart?.risingSign);
  const userName = chart?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '';

  return (
    <SafeScreen edges={['top', 'left', 'right']} style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.violet}
            colors={[colors.violet]}
          />
        }
      >
        {/* ── Header Card ───────────────────────────────────────── */}
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>{t('natalChart.chartTitle')}</Text>
          {userName ? <Text style={styles.headerName}>{userName}</Text> : null}
          <Text style={styles.headerSub}>
            {chart?.birthDate} | {chart?.birthTime ?? t('birthInfo.timeUnknown')} | {chart?.birthLocation}
          </Text>
        </View>

        {/* ── Big Three (Trinity) ────────────────────────────────── */}
        <View style={styles.trinityRow}>
          {[
            { icon: '☉', label: t('natalChart.sun'), info: sunInfo },
            { icon: '☽', label: t('natalChart.moon'), info: moonInfo },
            { icon: '↑', label: t('natalChart.rising'), info: risingInfo },
          ].map((item) => (
            <View key={item.label} style={styles.trinityBubble}>
              <Text style={styles.trinityIcon}>{item.icon}</Text>
              <Text style={styles.trinitySign}>{item.info.symbol} {item.info.name}</Text>
              <Text style={styles.trinityLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Kozmik Odak Noktalari (Cosmic Hotspots) ────────────── */}
        {hotspotAspects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('natalChart.cosmicHotspots')}</Text>
            <View style={styles.hotspotRow}>
              {hotspotAspects.map((asp, i) => (
                <Pressable
                  key={`hotspot-${i}`}
                  style={{ flex: 1 }}
                  onPress={() => openAspectSheet(asp)}
                  accessibilityLabel={t('natalChart.cosmicHotspotLabel', {
                    p1: planetNames[asp.planet1] ?? asp.planet1,
                    type: asp.type,
                    p2: planetNames[asp.planet2] ?? asp.planet2,
                  })}
                  accessibilityRole="button"
                >
                  <CosmicHotspotCard aspect={asp} index={i} />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* ── Planetary Positions ─────────────────────────────────── */}
        {chart?.planets?.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('natalChart.planetaryPositions')}</Text>
            {chart.planets.map((planet, i) => {
              const trName = planetNames[planet.planet] ?? planet.planet;
              const signInfo = getZodiacInfo(planet.sign);
              const sym = PLANET_SYMBOLS[planet.planet] ?? '⭐';

              return (
                <Pressable
                  key={`${planet.planet}-${i}`}
                  style={styles.planetRow}
                  onPress={() => openPlanetSheet(planet)}
                  accessibilityLabel={t('natalChart.openPlanetDetails', { name: trName })}
                  accessibilityRole="button"
                >
                  <View style={styles.planetIconWrap}>
                    <Text style={styles.planetIcon}>{sym}</Text>
                  </View>
                  <View style={styles.planetInfo}>
                    <Text style={styles.planetName}>{trName}</Text>
                    <Text style={styles.planetSign}>
                      {signInfo.symbol} {signInfo.name} {Math.floor(planet.degree)}°{planet.minutes}'
                    </Text>
                  </View>
                  <View style={styles.planetMeta}>
                    <View style={styles.houseBadge}>
                      <Text style={styles.houseBadgeText}>{planet.house}</Text>
                    </View>
                    {planet.retrograde && (
                      <View style={styles.retroBadge}>
                        <Text style={styles.retroText}>Rx</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* ── Planetary Aspects (Acilar) ──────────────────────────── */}
        {chart?.aspects?.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('natalChart.planetaryAspects')}</Text>
            <View style={styles.aspectsGrid}>
              {chart.aspects.map((asp, i) => {
                const info = ASPECT_INFO[asp.type] ?? ASPECT_INFO.CONJUNCTION;
                const p1Sym = PLANET_SYMBOLS[asp.planet1] ?? '?';
                const p2Sym = PLANET_SYMBOLS[asp.planet2] ?? '?';
                return (
                  <Pressable
                    key={`asp-${i}`}
                    onPress={() => openAspectSheet(asp)}
                    accessibilityLabel={t('natalChart.aspectDetailsLabel', { label: info.label })}
                    accessibilityRole="button"
                  >
                    <View style={styles.aspectTag}>
                      <Text style={styles.aspectPlanets}>
                        {p1Sym} {info.symbol} {p2Sym}
                      </Text>
                      <Text style={[styles.aspectLabel, { color: info.color }]}>{info.label}</Text>
                      <Text style={styles.aspectOrb}>{asp.angle.toFixed(1)}°</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* ── House Grid ──────────────────────────────────────────── */}
        {chart?.houses?.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('natalChart.housePositions')}</Text>
            <View style={styles.houseGrid}>
              {chart.houses.map((h) => {
                const info = getZodiacInfo(h.sign);
                return (
                  <View key={h.houseNumber} style={styles.houseCell}>
                    <View style={styles.houseNumCircle}>
                      <Text style={styles.houseNumText}>{h.houseNumber}</Text>
                    </View>
                    <Text style={styles.houseSign}>
                      {info.symbol} {info.name}
                    </Text>
                    <Text style={styles.houseDeg}>{Math.floor(h.degree)}°</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* ── AI Interpretation ───────────────────────────────────── */}
        {chart && (
          <View style={styles.aiCard}>
            <View style={styles.aiHeader}>
              <Ionicons name="sparkles-outline" size={18} color={colors.violet} />
              <Text style={styles.sectionTitle}>AI Yorumu</Text>
            </View>
            {chart.interpretationStatus === 'COMPLETED' && chart.aiInterpretation ? (
              <StaggeredAiText key={chart.aiInterpretation} text={chart.aiInterpretation} style={styles.aiText} />
            ) : chart.interpretationStatus === 'FAILED' ? (
              <View style={styles.aiStatus}>
                <Ionicons name="alert-circle" size={22} color={colors.redBright} />
                <Text style={styles.aiStatusText}>Yorum olusturulamadi.</Text>
                <Pressable
                  style={styles.retrySmall}
                  onPress={onRefresh}
                  accessibilityLabel={t('natalChart.retry')}
                  accessibilityRole="button"
                >
                  <Ionicons name="refresh" size={13} color={colors.violet} />
                  <Text style={styles.retrySmallText}>{t('natalChart.retry')}</Text>
                </Pressable>
              </View>
            ) : pollExhausted ? (
              <View style={styles.aiStatus}>
                <Ionicons name="time-outline" size={22} color={colors.muted} />
                <Text style={styles.aiStatusText}>Yorum henuz hazir degil.</Text>
                <Pressable
                  style={styles.retrySmall}
                  onPress={() => { setPollExhausted(false); startPolling(); }}
                  accessibilityLabel={t('natalChart.checkAgain')}
                  accessibilityRole="button"
                >
                  <Ionicons name="refresh" size={13} color={colors.violet} />
                  <Text style={styles.retrySmallText}>{t('natalChart.checkAgain')}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.aiStatus}>
                <ActivityIndicator size="small" color={colors.violet} />
                <Animated.View style={[styles.skelLine, { width: '100%', opacity: pulseAnim }]} />
                <Animated.View style={[styles.skelLine, { width: '90%', opacity: pulseAnim }]} />
                <Animated.View style={[styles.skelLine, { width: '70%', opacity: pulseAnim }]} />
                <Text style={styles.aiStatusText}>Yapay zeka yorumunuz hazirlaniyor...</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Refresh Button ──────────────────────────────────────── */}
        <Pressable
          style={styles.refreshBtn}
          onPress={() => loadChart(true)}
          accessibilityLabel={t('natalChart.refreshChart')}
          accessibilityRole="button"
        >
          <Ionicons name="refresh" size={16} color={colors.violet} />
          <Text style={styles.refreshBtnText}>Haritami Yenile</Text>
        </Pressable>
      </ScrollView>

      {/* Planet Bottom Sheet */}
      <PlanetBottomSheet
        visible={sheetVisible}
        planet={selectedPlanet}
        onClose={closePlanetSheet}
      />

      {/* Aspect Bottom Sheet */}
      <AspectBottomSheet
        visible={aspectSheetVisible}
        aspect={selectedAspect}
        onClose={closeAspectSheet}
      />
    </SafeScreen>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// STYLES — Modern Light Theme
// ═══════════════════════════════════════════════════════════════════════
function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: (Platform.OS === 'ios' ? 88 : 68) + 32,
    gap: 20,
  },

  // Center states (loading / calculating / error)
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  skelLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: C.violetBg,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.muted,
    marginTop: 4,
  },
  calcSymbol: {
    fontSize: 48,
    marginBottom: 8,
    color: C.violet,
  },
  calcTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  calcSub: {
    fontSize: 13,
    color: C.muted,
  },
  errorIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.redLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: C.body,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.violet,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginTop: 8,
  },
  retryBtnText: {
    color: C.white,
    fontWeight: '600',
    fontSize: 14,
  },

  // ── Header Card ──────────────────────────────────────────────────
  headerCard: {
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 4,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
  },
  headerName: {
    fontSize: 15,
    fontWeight: '600',
    color: C.violet,
    marginTop: 2,
  },
  headerSub: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },

  // ── Big Three Trinity ─────────────────────────────────────────────
  trinityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  trinityBubble: {
    flex: 1,
    backgroundColor: C.violetBg,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  trinityIcon: {
    fontSize: 22,
    color: C.violetText,
  },
  trinitySign: {
    fontSize: 13,
    fontWeight: '700',
    color: C.violetText,
    textAlign: 'center',
  },
  trinityLabel: {
    fontSize: 11,
    color: C.muted,
    fontWeight: '500',
  },

  // ── Sections ──────────────────────────────────────────────────────
  section: {
    gap: 12,
  },
  hotspotRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },

  // ── Planet Rows ───────────────────────────────────────────────────
  planetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 14,
    gap: 12,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  planetIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.violetBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planetIcon: {
    fontSize: 20,
    color: C.violet,
  },
  planetInfo: {
    flex: 1,
    gap: 2,
  },
  planetName: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
  planetSign: {
    fontSize: 12,
    color: C.muted,
  },
  planetMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  houseBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.violetBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  houseBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.violet,
  },
  retroBadge: {
    backgroundColor: C.amberLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  retroText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.amber,
  },

  // ── Aspects ───────────────────────────────────────────────────────
  aspectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  aspectTag: {
    backgroundColor: C.card,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 2,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    minWidth: 82,
  },
  aspectPlanets: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    letterSpacing: 1,
  },
  aspectLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  aspectOrb: {
    fontSize: 9,
    color: C.muted,
  },

  // ── House Grid ────────────────────────────────────────────────────
  houseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  houseCell: {
    width: '31%' as any,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  houseNumCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.violetBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  houseNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.violet,
  },
  houseSign: {
    fontSize: 12,
    fontWeight: '600',
    color: C.text,
    textAlign: 'center',
  },
  houseDeg: {
    fontSize: 10,
    color: C.muted,
  },

  // ── AI Card ───────────────────────────────────────────────────────
  aiCard: {
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiText: {
    fontSize: 14,
    color: C.body,
    lineHeight: 22,
  },
  aiStatus: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  aiStatusText: {
    fontSize: 13,
    color: C.muted,
    textAlign: 'center',
    marginTop: 4,
  },
  retrySmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: C.violetBg,
    marginTop: 4,
  },
  retrySmallText: {
    fontSize: 12,
    color: C.violet,
    fontWeight: '600',
  },

  // ── Refresh Button ────────────────────────────────────────────────
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: C.violet,
    backgroundColor: 'transparent',
  },
  refreshBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.violet,
  },
});
}
