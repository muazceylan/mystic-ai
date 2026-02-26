import { View, Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSpiritualDaily } from '../hooks/useSpiritualDaily';
import { usePrayerFlowStore } from '../store/usePrayerFlowStore';
import { spiritualApi } from '../api/spiritual.api';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { Screen, AppHeader, ListRow, Button } from '../../components/ui';
import { TYPOGRAPHY, SPACING, ACCESSIBILITY } from '../../constants/tokens';

export default function PrayerSetScreen() {
  const params = useLocalSearchParams<{ short?: string; category?: string }>();
  const shortMode = params.short === '1';
  const category = typeof params.category === 'string' ? params.category : undefined;
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
        <Screen>
          <View style={s.center}>
            <Text style={{ color: colors.subtext }}>Kısa dualar yükleniyor...</Text>
          </View>
        </Screen>
      );
    }

    if (shortPrayersQuery.isError || !shortPrayersQuery.data) {
      return (
        <Screen>
          <View style={s.center}>
            <Text style={{ color: colors.error }}>Kısa dualar yüklenemedi.</Text>
          </View>
        </Screen>
      );
    }

    if (shortPrayersQuery.data.length === 0) {
      return (
        <Screen>
          <View style={s.center}>
            <Text style={{ color: colors.subtext }}>Bu kategori için kısa dua bulunamadı.</Text>
          </View>
        </Screen>
      );
    }

    return (
      <Screen scroll>
        <AppHeader title={shortTitle} subtitle="10-30 sn hızlı erişim" onBack={() => router.back()} />
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
      </Screen>
    );
  }

  if (prayers.isLoading) {
    return (
      <Screen>
        <View style={s.center}>
          <Text style={{ color: colors.subtext }}>Bugünün dua seti yükleniyor...</Text>
        </View>
      </Screen>
    );
  }

  if (prayers.isError || !prayers.data) {
    return (
      <Screen>
        <View style={s.center}>
          <Text style={{ color: colors.error }}>Dua seti yüklenemedi.</Text>
        </View>
      </Screen>
    );
  }

  if (prayers.data.items.length === 0) {
    return (
      <Screen>
        <View style={s.center}>
          <Text style={{ color: colors.subtext }}>Bugün için dua seti bulunamadı.</Text>
        </View>
      </Screen>
    );
  }

  const date = prayers.data.date;
  const variant = prayers.data.variant;

  return (
    <Screen scroll>
      <AppHeader
        title="Bugünün Dua Seti"
        subtitle={`${date} · ${variant}`}
        onBack={() => router.back()}
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
        accessibilityLabel="Dua akışına devam et"
      />
    </Screen>
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
