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
import { getZodiacInfo, PLANET_TURKISH } from '../../constants/zodiac';
import PlanetBottomSheet from '../../components/Astrology/PlanetBottomSheet';
import CosmicHotspotCard from '../../components/Astrology/CosmicHotspotCard';
import AspectBottomSheet from '../../components/Astrology/AspectBottomSheet';
import StaggeredAiText from '../../components/Astrology/StaggeredAiText';
import { COLORS } from '../../constants/colors';
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

const ASPECT_INFO: Record<string, { symbol: string; label: string; color: string }> = {
  CONJUNCTION: { symbol: '☌', label: 'Kavuşum', color: COLORS.violet },
  OPPOSITION: { symbol: '☍', label: 'Karşıt', color: COLORS.redBright },
  TRINE: { symbol: '△', label: 'Üçgen', color: COLORS.trine },
  SQUARE: { symbol: '□', label: 'Kare', color: COLORS.amber },
};

const ZODIAC_SYMBOLS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];

type ScreenState = 'loading' | 'calculating' | 'error' | 'ready';

export default function NatalChartTab() {
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
        setCacheError('Dogum bilgileri eksik');
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
        setCacheError('Hesaplama hatasi');
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
      <SafeScreen edges={['top', 'left', 'right']} style={s.container}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={COLORS.violet} />
          <Animated.View style={[s.skelLine, { width: 180, opacity: pulseAnim }]} />
          <Animated.View style={[s.skelLine, { width: 120, opacity: pulseAnim }]} />
          <Text style={s.loadingText}>Haritaniz yukleniyor...</Text>
        </View>
      </SafeScreen>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // CALCULATING STATE
  // ═══════════════════════════════════════════════════════════════════
  if (state === 'calculating') {
    return (
      <SafeScreen edges={['top', 'left', 'right']} style={s.container}>
        <View style={s.center}>
          <Animated.Text
            style={[
              s.calcSymbol,
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
          <Text style={s.calcTitle}>Yildizlar Hesaplaniyor...</Text>
          <Text style={s.calcSub}>Bu islem birkac saniye surebilir</Text>
        </View>
      </SafeScreen>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ERROR STATE
  // ═══════════════════════════════════════════════════════════════════
  if (state === 'error') {
    return (
      <SafeScreen edges={['top', 'left', 'right']} style={s.container}>
        <View style={s.center}>
          <View style={s.errorIcon}>
            <Ionicons name="alert-circle-outline" size={32} color={COLORS.redBright} />
          </View>
          <Text style={s.errorText}>{errorMessage}</Text>
          <Pressable
            style={s.retryBtn}
            onPress={() => loadChart(true)}
            accessibilityLabel="Tekrar dene"
            accessibilityRole="button"
          >
            <Ionicons name="refresh" size={16} color={COLORS.white} />
            <Text style={s.retryBtnText}>Tekrar Dene</Text>
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
    <SafeScreen edges={['top', 'left', 'right']} style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.violet}
            colors={[COLORS.violet]}
          />
        }
      >
        {/* ── Header Card ───────────────────────────────────────── */}
        <View style={s.headerCard}>
          <Text style={s.headerTitle}>Kozmik Haritam</Text>
          {userName ? <Text style={s.headerName}>{userName}</Text> : null}
          <Text style={s.headerSub}>
            {chart?.birthDate} | {chart?.birthTime ?? 'Saat bilinmiyor'} | {chart?.birthLocation}
          </Text>
        </View>

        {/* ── Big Three (Trinity) ────────────────────────────────── */}
        <View style={s.trinityRow}>
          {[
            { icon: '☉', label: 'Guneş', info: sunInfo },
            { icon: '☽', label: 'Ay', info: moonInfo },
            { icon: '↑', label: 'Yukselen', info: risingInfo },
          ].map((item) => (
            <View key={item.label} style={s.trinityBubble}>
              <Text style={s.trinityIcon}>{item.icon}</Text>
              <Text style={s.trinitySign}>{item.info.symbol} {item.info.name}</Text>
              <Text style={s.trinityLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Kozmik Odak Noktalari (Cosmic Hotspots) ────────────── */}
        {hotspotAspects.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Kozmik Odak Noktalari</Text>
            <View style={s.hotspotRow}>
              {hotspotAspects.map((asp, i) => (
                <Pressable
                  key={`hotspot-${i}`}
                  style={{ flex: 1 }}
                  onPress={() => openAspectSheet(asp)}
                  accessibilityLabel={`Kozmik odak noktası: ${asp.planet1} ${asp.type} ${asp.planet2}`}
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
          <View style={s.section}>
            <Text style={s.sectionTitle}>Gezegen Konumlari</Text>
            {chart.planets.map((planet, i) => {
              const trName = PLANET_TURKISH[planet.planet] ?? planet.planet;
              const signInfo = getZodiacInfo(planet.sign);
              const sym = PLANET_SYMBOLS[planet.planet] ?? '⭐';

              return (
                <Pressable
                  key={`${planet.planet}-${i}`}
                  style={s.planetRow}
                  onPress={() => openPlanetSheet(planet)}
                  accessibilityLabel={`${trName} detaylarını aç`}
                  accessibilityRole="button"
                >
                  <View style={s.planetIconWrap}>
                    <Text style={s.planetIcon}>{sym}</Text>
                  </View>
                  <View style={s.planetInfo}>
                    <Text style={s.planetName}>{trName}</Text>
                    <Text style={s.planetSign}>
                      {signInfo.symbol} {signInfo.name} {Math.floor(planet.degree)}°{planet.minutes}'
                    </Text>
                  </View>
                  <View style={s.planetMeta}>
                    <View style={s.houseBadge}>
                      <Text style={s.houseBadgeText}>{planet.house}</Text>
                    </View>
                    {planet.retrograde && (
                      <View style={s.retroBadge}>
                        <Text style={s.retroText}>Rx</Text>
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
          <View style={s.section}>
            <Text style={s.sectionTitle}>Gezegensel Acilar</Text>
            <View style={s.aspectsGrid}>
              {chart.aspects.map((asp, i) => {
                const info = ASPECT_INFO[asp.type] ?? ASPECT_INFO.CONJUNCTION;
                const p1Sym = PLANET_SYMBOLS[asp.planet1] ?? '?';
                const p2Sym = PLANET_SYMBOLS[asp.planet2] ?? '?';
                return (
                  <Pressable
                    key={`asp-${i}`}
                    onPress={() => openAspectSheet(asp)}
                    accessibilityLabel={`${info.label} açısı detayları`}
                    accessibilityRole="button"
                  >
                    <View style={s.aspectTag}>
                      <Text style={s.aspectPlanets}>
                        {p1Sym} {info.symbol} {p2Sym}
                      </Text>
                      <Text style={[s.aspectLabel, { color: info.color }]}>{info.label}</Text>
                      <Text style={s.aspectOrb}>{asp.angle.toFixed(1)}°</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* ── House Grid ──────────────────────────────────────────── */}
        {chart?.houses?.length ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Ev Konumlari</Text>
            <View style={s.houseGrid}>
              {chart.houses.map((h) => {
                const info = getZodiacInfo(h.sign);
                return (
                  <View key={h.houseNumber} style={s.houseCell}>
                    <View style={s.houseNumCircle}>
                      <Text style={s.houseNumText}>{h.houseNumber}</Text>
                    </View>
                    <Text style={s.houseSign}>
                      {info.symbol} {info.name}
                    </Text>
                    <Text style={s.houseDeg}>{Math.floor(h.degree)}°</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* ── AI Interpretation ───────────────────────────────────── */}
        {chart && (
          <View style={s.aiCard}>
            <View style={s.aiHeader}>
              <Ionicons name="sparkles-outline" size={18} color={COLORS.violet} />
              <Text style={s.sectionTitle}>AI Yorumu</Text>
            </View>
            {chart.interpretationStatus === 'COMPLETED' && chart.aiInterpretation ? (
              <StaggeredAiText key={chart.aiInterpretation} text={chart.aiInterpretation} style={s.aiText} />
            ) : chart.interpretationStatus === 'FAILED' ? (
              <View style={s.aiStatus}>
                <Ionicons name="alert-circle" size={22} color={COLORS.redBright} />
                <Text style={s.aiStatusText}>Yorum olusturulamadi.</Text>
                <Pressable
                  style={s.retrySmall}
                  onPress={onRefresh}
                  accessibilityLabel="Tekrar dene"
                  accessibilityRole="button"
                >
                  <Ionicons name="refresh" size={13} color={COLORS.violet} />
                  <Text style={s.retrySmallText}>Tekrar dene</Text>
                </Pressable>
              </View>
            ) : pollExhausted ? (
              <View style={s.aiStatus}>
                <Ionicons name="time-outline" size={22} color={COLORS.muted} />
                <Text style={s.aiStatusText}>Yorum henuz hazir degil.</Text>
                <Pressable
                  style={s.retrySmall}
                  onPress={() => { setPollExhausted(false); startPolling(); }}
                  accessibilityLabel="Tekrar kontrol et"
                  accessibilityRole="button"
                >
                  <Ionicons name="refresh" size={13} color={COLORS.violet} />
                  <Text style={s.retrySmallText}>Tekrar kontrol et</Text>
                </Pressable>
              </View>
            ) : (
              <View style={s.aiStatus}>
                <ActivityIndicator size="small" color={COLORS.violet} />
                <Animated.View style={[s.skelLine, { width: '100%', opacity: pulseAnim }]} />
                <Animated.View style={[s.skelLine, { width: '90%', opacity: pulseAnim }]} />
                <Animated.View style={[s.skelLine, { width: '70%', opacity: pulseAnim }]} />
                <Text style={s.aiStatusText}>Yapay zeka yorumunuz hazirlaniyor...</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Refresh Button ──────────────────────────────────────── */}
        <Pressable
          style={s.refreshBtn}
          onPress={() => loadChart(true)}
          accessibilityLabel="Haritamı yenile"
          accessibilityRole="button"
        >
          <Ionicons name="refresh" size={16} color={COLORS.violet} />
          <Text style={s.refreshBtnText}>Haritami Yenile</Text>
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
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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
    backgroundColor: COLORS.violetBg,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.muted,
    marginTop: 4,
  },
  calcSymbol: {
    fontSize: 48,
    marginBottom: 8,
    color: COLORS.violet,
  },
  calcTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  calcSub: {
    fontSize: 13,
    color: COLORS.muted,
  },
  errorIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.redLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.body,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.violet,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginTop: 8,
  },
  retryBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },

  // ── Header Card ──────────────────────────────────────────────────
  headerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 4,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.violet,
    marginTop: 2,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },

  // ── Big Three Trinity ─────────────────────────────────────────────
  trinityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  trinityBubble: {
    flex: 1,
    backgroundColor: COLORS.violetBg,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  trinityIcon: {
    fontSize: 22,
    color: COLORS.violetText,
  },
  trinitySign: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.violetText,
    textAlign: 'center',
  },
  trinityLabel: {
    fontSize: 11,
    color: COLORS.muted,
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
    color: COLORS.text,
  },

  // ── Planet Rows ───────────────────────────────────────────────────
  planetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 14,
    gap: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  planetIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.violetBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planetIcon: {
    fontSize: 20,
    color: COLORS.violet,
  },
  planetInfo: {
    flex: 1,
    gap: 2,
  },
  planetName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  planetSign: {
    fontSize: 12,
    color: COLORS.muted,
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
    backgroundColor: COLORS.violetBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  houseBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.violet,
  },
  retroBadge: {
    backgroundColor: COLORS.amberLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  retroText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.amber,
  },

  // ── Aspects ───────────────────────────────────────────────────────
  aspectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  aspectTag: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 4,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    minWidth: 90,
  },
  aspectPlanets: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    letterSpacing: 2,
  },
  aspectLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  aspectOrb: {
    fontSize: 10,
    color: COLORS.muted,
  },

  // ── House Grid ────────────────────────────────────────────────────
  houseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  houseCell: {
    width: '31%' as any,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  houseNumCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.violetBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  houseNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.violet,
  },
  houseSign: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  houseDeg: {
    fontSize: 10,
    color: COLORS.muted,
  },

  // ── AI Card ───────────────────────────────────────────────────────
  aiCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiText: {
    fontSize: 14,
    color: COLORS.body,
    lineHeight: 22,
  },
  aiStatus: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  aiStatusText: {
    fontSize: 13,
    color: COLORS.muted,
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
    backgroundColor: COLORS.violetBg,
    marginTop: 4,
  },
  retrySmallText: {
    fontSize: 12,
    color: COLORS.violet,
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
    borderColor: COLORS.violet,
    backgroundColor: 'transparent',
  },
  refreshBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.violet,
  },
});
