import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import OnboardingBackground from '../../components/OnboardingBackground';
import ServiceStatus from '../../components/ServiceStatus';
import { useAuthStore } from '../../store/useAuthStore';
import { useNatalChartStore } from '../../store/useNatalChartStore';
import { getZodiacInfo } from '../../constants/zodiac';
import { DailySecret, fetchDailySecret } from '../../services/oracle.service';

const COLORS = {
  background: '#F9F7FB',
  text: '#1E1E1E',
  subtext: '#7A7A7A',
  border: '#E6E1EA',
  primary: '#9D4EDD',
  primarySoft: '#F1E8FD',
  accent: '#2E4A9C',
  accentSoft: '#E6EDFF',
  green: '#3FA46A',
  red: '#C04A4A',
};

const SERVICE_SLIDES = [
  { id: 'tarot', title: 'Tarot Fali', emoji: '🃏' },
  { id: 'dream', title: 'Ruya Analizi', emoji: '🌙' },
  { id: 'numerology', title: 'Numeroloji', emoji: '🔢' },
  { id: 'weekly', title: 'Haftanin Analizi', emoji: '📅' },
  { id: 'natal', title: 'Dogum Haritasi', emoji: '⭐' },
  { id: 'name', title: 'Isim Analizi', emoji: '🧿' },
];

const FALLBACK_QUOTES = [
  'Yildizlar seninle konusmak icin dogru zamani bekliyor...',
  'Evrenin sana bir mesaji var, sabret ve dinle.',
  'Icindeki isik, disaridaki karanliktan her zaman gucludur.',
  'Bugun yeni bir baslangic icin mukemmel bir gun.',
  'Kalbinin sesini dinle, o her zaman dogru yolu bilir.',
];

const WEEKLY_TABS = [
  { id: 'msastro', title: "Mysticten", subtitle: '(Sana ozel)' },
  { id: 'mine', title: "Uzmanımızdan" },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_WIDTH = SCREEN_WIDTH - 48;

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const chart = useNatalChartStore((s) => s.chart);
  const router = useRouter();
  const sliderRef = useRef<FlatList<(typeof SERVICE_SLIDES)[0]>>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeWeeklyTab, setActiveWeeklyTab] = useState('msastro');

  // Daily Secret state
  const [dailySecret, setDailySecret] = useState<DailySecret | null>(null);
  const [secretLoading, setSecretLoading] = useState(true);
  const [secretError, setSecretError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fade-in animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadDailySecret = useCallback(async () => {
    try {
      setSecretError(false);
      const response = await fetchDailySecret({
        name: user?.name ?? (`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || undefined),
        birthDate: user?.birthDate ?? undefined,
      });
      setDailySecret(response.data);
      // Trigger fade-in
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    } catch {
      setSecretError(true);
    } finally {
      setSecretLoading(false);
    }
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setSecretLoading(true);
    await loadDailySecret();
    setRefreshing(false);
  }, [loadDailySecret]);

  useEffect(() => {
    loadDailySecret();
  }, [loadDailySecret]);

  // Auto-slide
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => {
        const next = (prev + 1) % SERVICE_SLIDES.length;
        sliderRef.current?.scrollToOffset({
          offset: next * SLIDE_WIDTH,
          animated: true,
        });
        return next;
      });
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  const handleSliderScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SLIDE_WIDTH);
    setActiveSlide(index);
  };

  const today = new Date();
  const dateLabel = today.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  const name = user?.firstName || 'Misafir';
  const fallbackQuote = FALLBACK_QUOTES[today.getDate() % FALLBACK_QUOTES.length];

  // Extract insight for the message block
  const secretText = dailySecret?.secret || null;

  return (
    <View style={styles.container}>
      <OnboardingBackground />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.profileBlock}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={16} color={COLORS.subtext} />
            </View>
            <View>
              <Text style={styles.profileTitle}>Profilim</Text>
              <Text style={styles.profileSubtitle}>LV. 2 (%15)</Text>
            </View>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="sparkles" size={18} color={COLORS.subtext} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="share-social" size={18} color={COLORS.subtext} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="notifications" size={18} color={COLORS.subtext} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="chatbubble" size={18} color={COLORS.subtext} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Service Status */}
        <ServiceStatus />

        {/* Service Slider */}
        <FlatList
          ref={sliderRef}
          data={SERVICE_SLIDES}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={SLIDE_WIDTH}
          decelerationRate="fast"
          onMomentumScrollEnd={handleSliderScrollEnd}
          contentContainerStyle={styles.sliderContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={item.id === 'natal' ? 0.7 : 1}
              onPress={() => {
                if (item.id === 'natal') router.push('/(tabs)/natal-chart');
              }}
              style={styles.sliderCard}
            >
              <Text style={styles.sliderEmoji}>{item.emoji}</Text>
              <Text style={styles.sliderText}>{item.title}</Text>
            </TouchableOpacity>
          )}
        />

        <View style={styles.sliderDots}>
          {SERVICE_SLIDES.map((item, index) => (
            <View
              key={item.id}
              style={[styles.dot, index === activeSlide && styles.dotActive]}
            />
          ))}
        </View>

        {/* Daily Wisdom Card */}
        <View style={styles.wisdomCard}>
          <View style={styles.wisdomHeader}>
            <Ionicons name="eye" size={16} color={COLORS.primary} />
            <Text style={styles.wisdomTitle}>Gunun Sirri</Text>
          </View>

          {secretLoading ? (
            <View style={styles.wisdomLoading}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.wisdomLoadingText}>Yildizlar okunuyor...</Text>
            </View>
          ) : (
            <Animated.View style={{ opacity: fadeAnim }}>
              <Text style={styles.wisdomIntro}>
                Iyi gunler {name}, {dateLabel} gunu icin,
              </Text>
              <Text style={styles.wisdomText}>
                {secretError ? fallbackQuote : secretText || fallbackQuote}
              </Text>

              {dailySecret?.astrologyInsight && (
                <View style={styles.insightRow}>
                  <Ionicons name="planet" size={13} color={COLORS.primary} />
                  <Text style={styles.insightText} numberOfLines={2}>
                    {dailySecret.astrologyInsight}
                  </Text>
                </View>
              )}
              {chart?.risingSign && (
                <View style={styles.insightRow}>
                  <Ionicons name="planet" size={13} color={COLORS.accent} />
                  <Text style={styles.insightText} numberOfLines={2}>
                    {getZodiacInfo(chart.risingSign).symbol} {getZodiacInfo(chart.risingSign).name} Yukseleni olarak bugun kozmik enerjilere acik ol.
                  </Text>
                </View>
              )}
              {dailySecret?.numerologyInsight && (
                <View style={styles.insightRow}>
                  <Ionicons name="calculator" size={13} color={COLORS.primary} />
                  <Text style={styles.insightText} numberOfLines={2}>
                    {dailySecret.numerologyInsight}
                  </Text>
                </View>
              )}

              {secretError && (
                <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
                  <Ionicons name="refresh" size={14} color={COLORS.primary} />
                  <Text style={styles.retryText}>Tekrar dene</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          )}
        </View>

        {/* Note block */}
        <View style={styles.noteBlock}>
          <View style={styles.dottedLine} />
          <Ionicons name="arrow-down" size={18} color={COLORS.subtext} />
          <TouchableOpacity style={styles.noteButton}>
            <Text style={styles.noteButtonText}>Gelecege not birak</Text>
          </TouchableOpacity>
        </View>

        {/* Weekly comment */}
        <Text style={styles.weeklyHeading}>Haftalik mistik yorum</Text>
        <Text style={styles.weeklySubheading}>
          {today.getDate()}-{today.getDate() + 6}{' '}
          {today.toLocaleDateString('tr-TR', { month: 'long' })} haftasi yorumunuz
        </Text>

        <View style={styles.weeklyCard}>
          <View style={styles.weeklyTabs}>
            {WEEKLY_TABS.map((tab) => {
              const selected = activeWeeklyTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.weeklyTab, selected && styles.weeklyTabSelected]}
                  onPress={() => setActiveWeeklyTab(tab.id)}
                >
                  <Text style={[styles.weeklyTabText, selected && styles.weeklyTabTextSelected]}>
                    {tab.title}
                  </Text>
                  {tab.subtitle && (
                    <Text style={styles.weeklyTabSubtitle}>{tab.subtitle}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.weeklySigns}>
            <View style={styles.signItem}>
              <Ionicons name="sparkles" size={14} color={COLORS.subtext} />
              <Text style={styles.signText}>
                {chart ? getZodiacInfo(chart.sunSign).name : (user?.zodiacSign || 'Burcu yok')}
              </Text>
            </View>
            <View style={styles.signItem}>
              <Ionicons name="arrow-up" size={14} color={COLORS.subtext} />
              <Text style={styles.signText}>
                {chart ? getZodiacInfo(chart.risingSign).name : 'Yukselen'}
              </Text>
            </View>
            <View style={styles.signItem}>
              <Ionicons name="moon" size={14} color={COLORS.subtext} />
              <Text style={styles.signText}>
                {chart ? getZodiacInfo(chart.moonSign).name : 'Ay'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 22,
    paddingBottom: 32,
  },
  headerRow: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  profileBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFEAF7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  profileSubtitle: {
    fontSize: 12,
    color: COLORS.subtext,
    marginTop: 2,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1EEF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderContainer: {
    paddingHorizontal: 24,
    marginTop: 10,
  },
  sliderCard: {
    width: SLIDE_WIDTH,
    height: 38,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sliderEmoji: {
    fontSize: 16,
  },
  sliderText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sliderDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D8D1E2',
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 14,
  },

  // Daily Wisdom Card
  wisdomCard: {
    marginTop: 18,
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  wisdomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  wisdomTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  wisdomLoading: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  wisdomLoadingText: {
    fontSize: 12,
    color: COLORS.subtext,
    fontStyle: 'italic',
  },
  wisdomIntro: {
    fontSize: 12,
    color: COLORS.subtext,
    marginBottom: 8,
  },
  wisdomText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 22,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  insightText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.subtext,
    lineHeight: 17,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 4,
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
  },
  retryText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Note block
  noteBlock: {
    marginTop: 16,
    alignItems: 'center',
    gap: 10,
  },
  dottedLine: {
    height: 22,
    borderLeftWidth: 1,
    borderStyle: 'dotted',
    borderColor: COLORS.border,
  },
  noteButton: {
    backgroundColor: '#EFEAF7',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  noteButtonText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },

  // Weekly
  weeklyHeading: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 14,
    color: COLORS.subtext,
    fontWeight: '600',
  },
  weeklySubheading: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 13,
    color: COLORS.subtext,
  },
  weeklyCard: {
    marginTop: 12,
    marginHorizontal: 20,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 16,
    padding: 12,
  },
  weeklyTabs: {
    flexDirection: 'row',
    gap: 10,
  },
  weeklyTab: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  weeklyTabSelected: {
    backgroundColor: '#DCD5F5',
    borderColor: '#DCD5F5',
  },
  weeklyTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  weeklyTabTextSelected: {
    color: COLORS.primary,
  },
  weeklyTabSubtitle: {
    marginTop: 2,
    fontSize: 10,
    color: COLORS.subtext,
  },
  weeklySigns: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#D6CFE3',
  },
  signItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  signText: {
    fontSize: 12,
    color: COLORS.subtext,
  },
});
