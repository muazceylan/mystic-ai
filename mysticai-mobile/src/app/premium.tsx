import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../utils/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../components/OnboardingBackground';
import { useTheme } from '../context/ThemeContext';
import { SafeScreen } from '../components/ui';

const FEATURE_KEYS = ['feature1', 'feature2', 'feature3', 'feature4', 'feature5', 'feature6', 'feature7'] as const;

const PLANS = [
  { id: 'monthly', price: '₺149', periodKey: 'periodMonth', badge: null, popular: false },
  { id: 'yearly', price: '₺999', periodKey: 'periodYear', badgeKey: 'discountBadge', popular: true },
] as const;

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
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
      backgroundColor: C.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: C.border,
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
    hero: {
      borderRadius: 20,
      padding: 28,
      alignItems: 'center',
      marginBottom: 24,
    },
    heroTitle: { fontSize: 22, fontWeight: '800', color: C.white, marginTop: 10, marginBottom: 6 },
    heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 12 },
    featuresCard: {
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
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
    featureRowBorder: { borderTopWidth: 1, borderTopColor: C.border },
    featureCheck: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: C.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureText: { fontSize: 13, color: C.text, flex: 1 },
    planCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: C.border,
      padding: 18,
      marginBottom: 12,
      position: 'relative',
    },
    planCardPopular: { borderColor: C.primary, backgroundColor: C.primarySoft },
    popularBadge: {
      position: 'absolute',
      top: -10,
      left: 16,
      backgroundColor: C.primary,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    popularBadgeText: { fontSize: 11, fontWeight: '700', color: C.white },
    planLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    planTitle: { fontSize: 15, fontWeight: '700', color: C.text },
    planTitlePopular: { color: C.primary },
    discountBadge: {
      backgroundColor: C.successLight,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    discountText: { fontSize: 11, fontWeight: '700', color: C.success },
    planRight: { alignItems: 'flex-end' },
    planPrice: { fontSize: 20, fontWeight: '800', color: C.text },
    planPricePopular: { color: C.primary },
    planPeriod: { fontSize: 12, color: C.subtext },
    restoreBtn: { alignItems: 'center', paddingVertical: 16 },
    restoreBtnText: { fontSize: 13, color: C.primary, fontWeight: '600' },
    legalText: {
      fontSize: 11,
      color: C.subtext,
      textAlign: 'center',
      lineHeight: 17,
      marginTop: 4,
    },
  });
}

export default function PremiumScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const handleSubscribe = (planId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: Integrate with in-app purchase (expo-in-app-purchases or RevenueCat)
    Alert.alert(
      t('premium.comingSoon'),
      t('premium.comingSoonMessage'),
      [{ text: t('common.ok') }]
    );
  };

  const handleRestore = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(t('premium.restoreTitle'), t('premium.restoreMessage'));
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
          accessibilityLabel={t('premium.accessibilityBack')}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('premium.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        <LinearGradient
          colors={[colors.primary700, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Ionicons name="sparkles" size={36} color={colors.gold} />
          <Text style={styles.heroTitle}>{t('premium.heroTitle')}</Text>
          <Text style={styles.heroSub}>{t('premium.heroSub')}</Text>
        </LinearGradient>

        {/* Features */}
        <Text style={styles.sectionTitle}>{t('premium.featuresTitle')}</Text>
        <View style={styles.featuresCard}>
          {FEATURE_KEYS.map((key, i) => (
            <View key={key} style={[styles.featureRow, i > 0 && styles.featureRowBorder]}>
              <View style={styles.featureCheck}>
                <Ionicons name="checkmark" size={14} color={colors.white} />
              </View>
              <Text style={styles.featureText}>{t(`premium.${key}`)}</Text>
            </View>
          ))}
        </View>

        {/* Plans */}
        <Text style={styles.sectionTitle}>{t('premium.selectPlan')}</Text>
        {PLANS.map((plan) => (
          <TouchableOpacity
            key={plan.id}
            style={[styles.planCard, plan.popular && styles.planCardPopular]}
            accessibilityLabel={`${t(`premium.${plan.id}`)} planını seç`}
            accessibilityRole="button"
            onPress={() => handleSubscribe(plan.id)}
            activeOpacity={0.8}
          >
            {plan.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>{t('premium.mostPopular')}</Text>
              </View>
            )}
            <View style={styles.planLeft}>
              <Text style={[styles.planTitle, plan.popular && styles.planTitlePopular]}>
                {t(`premium.${plan.id}`)}
              </Text>
              {plan.badgeKey && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{t(`premium.${plan.badgeKey}`)}</Text>
                </View>
              )}
            </View>
            <View style={styles.planRight}>
              <Text style={[styles.planPrice, plan.popular && styles.planPricePopular]}>
                {plan.price}
              </Text>
              <Text style={styles.planPeriod}>{t(`premium.${plan.periodKey}`)}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestore}
          accessibilityLabel={t('premium.accessibilityRestore')}
          accessibilityRole="button"
        >
          <Text style={styles.restoreBtnText}>{t('premium.restorePurchases')}</Text>
        </TouchableOpacity>

        <Text style={styles.legalText}>
          {t('premium.legalText')}
        </Text>
      </ScrollView>
      </View>
    </SafeScreen>
  );
}

