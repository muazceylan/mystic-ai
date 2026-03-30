import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { HeaderRightIcons } from '../../../components/ui';
import { useContentStore } from '../../../spiritual/store/useContentStore';
import { useTranslation } from 'react-i18next';

export default function SpiritualLayout() {
  const loadFromCms = useContentStore((s) => s.loadFromCms);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    // Reload from CMS on every entry to the spiritual section
    // so admin edits are immediately visible. Falls back to local JSON on error.
    loadFromCms(i18n.language ?? 'tr');
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => <HeaderRightIcons />,
      }}
    >
      <Stack.Screen name="index" options={{ title: t('spiritualLayout.screenPractices'), headerShown: false }} />
      <Stack.Screen name="prayers/index" options={{ title: t('spiritualLayout.screenTodaysPrayer'), headerShown: false }} />
      <Stack.Screen name="prayers/flow" options={{ title: t('spiritualLayout.screenPrayerFlow'), headerShown: false }} />
      <Stack.Screen name="asma/index" options={{ title: t('spiritualLayout.screenEsmaList'), headerShown: false }} />
      <Stack.Screen name="asma/[id]" options={{ title: t('spiritualLayout.screenEsmaDetail'), headerShown: false }} />
      <Stack.Screen name="dua/index" options={{ title: t('spiritualLayout.screenDuaList'), headerShown: false }} />
      <Stack.Screen name="dua/[id]" options={{ title: t('spiritualLayout.screenDuaDetail'), headerShown: false }} />
      <Stack.Screen name="sure/index" options={{ title: t('spiritualLayout.screenSureList'), headerShown: false }} />
      <Stack.Screen name="counter" options={{ title: t('spiritualLayout.screenCounter'), headerShown: false }} />
      <Stack.Screen name="meditation/index" options={{ title: t('spiritualLayout.screenMeditationList'), headerShown: false }} />
      <Stack.Screen name="meditation/session" options={{ title: t('spiritualLayout.screenMeditationSession') }} />
      <Stack.Screen name="journal/index" options={{ title: t('spiritualLayout.screenJournal'), headerShown: false }} />
      <Stack.Screen name="journal/stats" options={{ title: t('spiritualLayout.screenStats'), headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: t('spiritualLayout.screenSettings') }} />
      <Stack.Screen name="recommendations" options={{ title: t('spiritualLayout.screenRecommendations'), headerShown: false }} />
      <Stack.Screen name="custom-sets/index" options={{ title: t('spiritualLayout.screenCustomSets'), headerShown: false }} />
      <Stack.Screen name="custom-sets/[id]" options={{ title: t('spiritualLayout.screenCustomSetDetail'), headerShown: false }} />
      <Stack.Screen name="breathing/index" options={{ title: t('spiritualLayout.screenBreathingList'), headerShown: false }} />
      <Stack.Screen name="breathing/session" options={{ title: t('spiritualLayout.screenBreathingSession'), headerShown: false }} />
      <Stack.Screen name="routine-picker" options={{ title: t('spiritualLayout.screenRoutinePicker'), headerShown: false }} />
    </Stack>
  );
}
