import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import OnboardingBackground from '../components/OnboardingBackground';
import { COLORS } from '../constants/colors';
import { SafeScreen } from '../components/ui';

const PLAN_FEATURES = [
  'Sınırsız Natal Haritası Yorumu',
  'Sınırsız Rüya Analizi ve Sembol Rehberi',
  'Haftalık SWOT Kozmik Raporu',
  'Aylık Rüya Kitabı (PDF)',
  'Kozmik Fırsat Uyarıları',
  'Planlanan Günler Modülü (Tüm Kategoriler)',
  'Öncelikli AI Yanıt Sırası',
];

const PLANS = [
  {
    id: 'monthly',
    title: 'Aylık',
    price: '₺149',
    period: '/ ay',
    badge: null,
    popular: false,
  },
  {
    id: 'yearly',
    title: 'Yıllık',
    price: '₺999',
    period: '/ yıl',
    badge: '%44 İndirim',
    popular: true,
  },
];

export default function PremiumScreen() {
  const handleSubscribe = (planId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: Integrate with in-app purchase (expo-in-app-purchases or RevenueCat)
    Alert.alert(
      'Yakında',
      'Ödeme entegrasyonu yakında aktif olacak. Şu an bu özellik geliştirme aşamasındadır.',
      [{ text: 'Tamam' }]
    );
  };

  const handleRestore = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Satın Alma Geri Yükle', 'Mevcut satın alımlarınız kontrol ediliyor...');
  };

  return (
    <SafeScreen>
      <View style={styles.container}>
        <OnboardingBackground />

        {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Geri dön"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Premium</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        <LinearGradient
          colors={[COLORS.primary700, COLORS.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Ionicons name="sparkles" size={36} color={COLORS.gold} />
          <Text style={styles.heroTitle}>Mystic AI Premium</Text>
          <Text style={styles.heroSub}>Kozmik potansiyelinizi tam açın</Text>
        </LinearGradient>

        {/* Features */}
        <Text style={styles.sectionTitle}>Dahil Olan Özellikler</Text>
        <View style={styles.featuresCard}>
          {PLAN_FEATURES.map((feat, i) => (
            <View key={i} style={[styles.featureRow, i > 0 && styles.featureRowBorder]}>
              <View style={styles.featureCheck}>
                <Ionicons name="checkmark" size={14} color={COLORS.white} />
              </View>
              <Text style={styles.featureText}>{feat}</Text>
            </View>
          ))}
        </View>

        {/* Plans */}
        <Text style={styles.sectionTitle}>Plan Seçin</Text>
        {PLANS.map((plan) => (
          <TouchableOpacity
            key={plan.id}
            style={[styles.planCard, plan.popular && styles.planCardPopular]}
            accessibilityLabel={`${plan.name} planını seç`}
            accessibilityRole="button"
            onPress={() => handleSubscribe(plan.id)}
            activeOpacity={0.8}
          >
            {plan.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>En Popüler</Text>
              </View>
            )}
            <View style={styles.planLeft}>
              <Text style={[styles.planTitle, plan.popular && styles.planTitlePopular]}>
                {plan.title}
              </Text>
              {plan.badge && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{plan.badge}</Text>
                </View>
              )}
            </View>
            <View style={styles.planRight}>
              <Text style={[styles.planPrice, plan.popular && styles.planPricePopular]}>
                {plan.price}
              </Text>
              <Text style={styles.planPeriod}>{plan.period}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestore}
          accessibilityLabel="Satın alımları geri yükle"
          accessibilityRole="button"
        >
          <Text style={styles.restoreBtnText}>Satın Alımları Geri Yükle</Text>
        </TouchableOpacity>

        <Text style={styles.legalText}>
          Abonelik otomatik olarak yenilenir. İstediğiniz zaman iptal edebilirsiniz.
          Apple App Store veya Google Play üzerinden yönetilebilir.
        </Text>
      </ScrollView>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  // Hero
  hero: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: COLORS.white, marginTop: 10, marginBottom: 6 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  // Features
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  featuresCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  featureRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  featureCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { fontSize: 13, color: COLORS.text, flex: 1 },
  // Plans
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 12,
    position: 'relative',
  },
  planCardPopular: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  popularBadge: {
    position: 'absolute',
    top: -10,
    left: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  popularBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.white },
  planLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  planTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  planTitlePopular: { color: COLORS.primary },
  discountBadge: {
    backgroundColor: COLORS.successLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  discountText: { fontSize: 11, fontWeight: '700', color: COLORS.success },
  planRight: { alignItems: 'flex-end' },
  planPrice: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  planPricePopular: { color: COLORS.primary },
  planPeriod: { fontSize: 12, color: COLORS.subtext },
  // Restore
  restoreBtn: { alignItems: 'center', paddingVertical: 16 },
  restoreBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  legalText: {
    fontSize: 11,
    color: COLORS.subtext,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 4,
  },
});
