import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSpiritualDaily } from '../hooks/useSpiritualDaily';
import { usePrayerFlowStore } from '../store/usePrayerFlowStore';
import { spiritualApi } from '../api/spiritual.api';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { SafeScreen, AppHeader, HeaderRightIcons, ListRow, Button } from '../../components/ui';
import { TYPOGRAPHY, SPACING, ACCESSIBILITY } from '../../constants/tokens';

export default function PrayerSetScreen() {
  const params = useLocalSearchParams<{ short?: string; category?: string }>();
  const shortMode = params.short === '1';
  const category = typeof params.category === 'string' ? params.category : undefined;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = createStyles(colors);

  const { prayers } = useSpiritualDaily();
  const startSet = usePrayerFlowStore((st) => st.startSet);

  const shortPrayersQuery = useQuery({
    queryKey: ['spiritual', 'short-prayers', category ?? 'ALL'],
    queryFn: () => spiritualApi.getShortPrayers({ category, limit: 8 }),
    enabled: shortMode,
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (!shortMode && prayers.data) {
      startSet({ setId: prayers.data.setId ?? null, date: prayers.data.date });
    }
  }, [prayers.data, startSet, shortMode]);

  const shortTitle = useMemo(() => {
    if (!category) return 'Kısa Dualar';
    switch (category) {
      case 'SABAH_AKSAM': return 'Kısa Dualar · Sabah/Akşam';
      case 'SUKUR': return 'Kısa Dualar · Şükür';
      case 'KORUNMA': return 'Kısa Dualar · Korunma';
      case 'HUZUR': return 'Kısa Dualar · Huzur';
      default: return `Kısa Dualar · ${category}`;
    }
  }, [category]);

  if (shortMode) {
    if (shortPrayersQuery.isLoading) {
      return (
        <SafeScreen>
          <View style={s.center}>
            <Text style={{ color: colors.subtext }}>Kısa dualar yükleniyor...</Text>
          </View>
        </SafeScreen>
      );
    }

    if (shortPrayersQuery.isError || !shortPrayersQuery.data) {
      return (
        <SafeScreen>
          <View style={s.center}>
            <Text style={{ color: colors.error }}>Kısa dualar yüklenemedi.</Text>
          </View>
        </SafeScreen>
      );
    }

    if (shortPrayersQuery.data.length === 0) {
      return (
        <SafeScreen>
          <View style={s.center}>
            <Text style={{ color: colors.subtext }}>Bu kategori için kısa dua bulunamadı.</Text>
          </View>
        </SafeScreen>
      );
    }

    return (
      <SafeScreen scroll>
        <AppHeader title={shortTitle} subtitle="10-30 sn hızlı erişim" onBack={() => router.back()} rightActions={<HeaderRightIcons />} />
        {shortPrayersQuery.data.map((item, index) => (
          <ListRow
            key={item.id}
            icon="book-outline"
            iconColor={colors.spiritualDua}
            title={`${index + 1}. ${item.title}`}
            subtitle={item.category}
            meta={`${item.recommendedRepeatCount} tekrar · ~${item.estimatedReadSeconds} sn`}
            onPress={() => router.push('/spiritual/prayers')}
          />
        ))}
      </SafeScreen>
    );
  }

  if (prayers.isLoading) {
    return (
      <SafeScreen>
        <View style={s.center}>
          <Text style={{ color: colors.subtext }}>Bugünün dua seti yükleniyor...</Text>
        </View>
      </SafeScreen>
    );
  }

  if (prayers.isError || !prayers.data) {
    return (
      <SafeScreen>
        <View style={s.center}>
          <Text style={{ color: colors.error }}>Dua seti yüklenemedi.</Text>
        </View>
      </SafeScreen>
    );
  }

  if (prayers.data.items.length === 0) {
    return (
      <SafeScreen>
        <View style={s.center}>
          <Text style={{ color: colors.subtext }}>Bugün için dua seti bulunamadı.</Text>
        </View>
      </SafeScreen>
    );
  }

  const date = prayers.data.date;
  const variant = prayers.data.variant;

  return (
    <SafeScreen scroll>
      <AppHeader
        title="Bugünün Dua Seti"
        subtitle={`${date} · ${variant}`}
        onBack={() => router.back()}
        rightActions={<HeaderRightIcons />}
      />

      {prayers.data.items.map((item) => (
        <ListRow
          key={item.prayerId}
          icon="book-outline"
          iconColor={colors.spiritualDua}
          title={`${item.order}. ${item.title}`}
          subtitle={item.category}
          meta={`${item.recommendedRepeatCount}x · ~${item.estimatedReadSeconds} sn`}
          badge={
            item.isCompletedToday
              ? { label: '✓', variant: 'success' as const }
              : undefined
          }
          onPress={() => router.push('/spiritual/prayers/flow')}
        />
      ))}

      <Button
        title="Devam Et"
        size="lg"
        onPress={() => router.push('/spiritual/prayers/flow')}
        accessibilityLabel={t('spiritual.prayerFlow.continueA11y')}
      />
    </SafeScreen>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.lg,
    },
  });
}
