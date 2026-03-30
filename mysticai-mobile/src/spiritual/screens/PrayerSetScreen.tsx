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
    if (!category) return t('spiritual.prayerSet.shortTitle');
    switch (category) {
      case 'SABAH_AKSAM': return t('spiritual.prayerSet.shortTitleSabahAksam');
      case 'SUKUR': return t('spiritual.prayerSet.shortTitleSukur');
      case 'KORUNMA': return t('spiritual.prayerSet.shortTitleKorunma');
      case 'HUZUR': return t('spiritual.prayerSet.shortTitleHuzur');
      default: return t('spiritual.prayerSet.shortTitleCategory', { category });
    }
  }, [category, t]);

  if (shortMode) {
    if (shortPrayersQuery.isLoading) {
      return (
        <SafeScreen>
          <View style={s.center}>
            <Text style={{ color: colors.subtext }}>{t('spiritual.prayerSet.loadingShort')}</Text>
          </View>
        </SafeScreen>
      );
    }

    if (shortPrayersQuery.isError || !shortPrayersQuery.data) {
      return (
        <SafeScreen>
          <View style={s.center}>
            <Text style={{ color: colors.error }}>{t('spiritual.prayerSet.errorShort')}</Text>
          </View>
        </SafeScreen>
      );
    }

    if (shortPrayersQuery.data.length === 0) {
      return (
        <SafeScreen>
          <View style={s.center}>
            <Text style={{ color: colors.subtext }}>{t('spiritual.prayerSet.emptyShort')}</Text>
          </View>
        </SafeScreen>
      );
    }

    return (
      <SafeScreen scroll>
        <AppHeader title={shortTitle} subtitle={t('spiritual.prayerSet.shortSubtitle')} onBack={() => router.back()} rightActions={<HeaderRightIcons />} />
        {shortPrayersQuery.data.map((item, index) => (
          <ListRow
            key={item.id}
            icon="book-outline"
            iconColor={colors.spiritualDua}
            title={`${index + 1}. ${item.title}`}
            subtitle={item.category}
            meta={t('spiritual.prayerSet.metaRepeatSec', { count: item.recommendedRepeatCount, sec: item.estimatedReadSeconds })}
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
          <Text style={{ color: colors.subtext }}>{t('spiritual.prayerSet.loadingSet')}</Text>
        </View>
      </SafeScreen>
    );
  }

  if (prayers.isError || !prayers.data) {
    return (
      <SafeScreen>
        <View style={s.center}>
          <Text style={{ color: colors.error }}>{t('spiritual.prayerSet.errorSet')}</Text>
        </View>
      </SafeScreen>
    );
  }

  if (prayers.data.items.length === 0) {
    return (
      <SafeScreen>
        <View style={s.center}>
          <Text style={{ color: colors.subtext }}>{t('spiritual.prayerSet.emptySet')}</Text>
        </View>
      </SafeScreen>
    );
  }

  const date = prayers.data.date;
  const variant = prayers.data.variant;

  return (
    <SafeScreen scroll>
      <AppHeader
        title={t('spiritual.prayerSet.todayTitle')}
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
          meta={t('spiritual.prayerSet.metaRepeatXSec', { count: item.recommendedRepeatCount, sec: item.estimatedReadSeconds })}
          badge={
            item.isCompletedToday
              ? { label: '✓', variant: 'success' as const }
              : undefined
          }
          onPress={() => router.push('/spiritual/prayers/flow')}
        />
      ))}

      <Button
        title={t('spiritual.prayerSet.continueBtn')}
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
