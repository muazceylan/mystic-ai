import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../components/OnboardingBackground';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { SafeScreen } from '../components/ui';
import { ErrorStateCard } from '../components/ui';
import { fetchNumerology, NumerologyResponse } from '../services/numerology.service';

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
    scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
    hero: {
      alignItems: 'center',
      marginBottom: 24,
      paddingVertical: 20,
    },
    heroEmoji: { fontSize: 48, marginBottom: 8 },
    heroTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 4 },
    heroSub: { fontSize: 13, color: C.subtext },
    card: {
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      padding: 18,
      marginBottom: 16,
    },
    cardTitle: { fontSize: 14, fontWeight: '700', color: C.subtext, marginBottom: 12 },
    numberRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 16,
    },
    numberBadge: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: C.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: C.primary,
    },
    numberText: { fontSize: 24, fontWeight: '800', color: C.primary },
    numberLabel: { fontSize: 10, color: C.subtext, marginTop: 4, textAlign: 'center' as const },
    summaryText: { fontSize: 14, color: C.text, lineHeight: 22 },
    loadingCenter: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
  });
}

export default function NumerologyScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const styles = makeStyles(colors);

  const [data, setData] = useState<NumerologyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fullName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`.trim()
    : user?.name || user?.firstName || t('common.guest');
  const birthDate = user?.birthDate ?? '';

  const load = useCallback(async () => {
    if (!fullName || fullName === t('common.guest') || !birthDate) {
      setError(t('numerology.missingData'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchNumerology({
        name: fullName,
        birthDate: birthDate.split('T')[0] || birthDate,
      });
      setData(res);
    } catch {
      setError(t('numerology.loadError'));
    } finally {
      setLoading(false);
    }
  }, [fullName, birthDate, t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeScreen>
      <View style={styles.container}>
        <OnboardingBackground />
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
            style={styles.backBtn}
            accessibilityLabel={t('common.back')}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('home.numerology')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.hero}>
            <Text style={styles.heroEmoji}>🔢</Text>
            <Text style={styles.heroTitle}>{t('numerology.title')}</Text>
            <Text style={styles.heroSub}>{t('numerology.subtitle')}</Text>
          </View>

          {loading ? (
            <View style={styles.loadingCenter}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ marginTop: 12, fontSize: 13, color: colors.subtext }}>
                {t('numerology.loading')}
              </Text>
            </View>
          ) : error ? (
            <ErrorStateCard
              message={error}
              onRetry={load}
              accessibilityLabel={t('common.retry')}
            />
          ) : data ? (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('numerology.yourNumbers')}</Text>
                <View style={styles.numberRow}>
                  <View style={{ alignItems: 'center' }}>
                    <View style={styles.numberBadge}>
                      <Text style={styles.numberText}>{data.lifePathNumber}</Text>
                    </View>
                    <Text style={styles.numberLabel}>{t('numerology.lifePath')}</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <View style={styles.numberBadge}>
                      <Text style={styles.numberText}>{data.destinyNumber}</Text>
                    </View>
                    <Text style={styles.numberLabel}>{t('numerology.destiny')}</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <View style={styles.numberBadge}>
                      <Text style={styles.numberText}>{data.soulUrgeNumber}</Text>
                    </View>
                    <Text style={styles.numberLabel}>{t('numerology.soulUrge')}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('numerology.interpretation')}</Text>
                <Text style={styles.summaryText}>
                  {data.summary.split('\n').map((line, i) => (
                    <Text key={i}>
                      {line}
                      {i < data.summary.split('\n').length - 1 ? '\n\n' : ''}
                    </Text>
                  ))}
                </Text>
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeScreen>
  );
}
