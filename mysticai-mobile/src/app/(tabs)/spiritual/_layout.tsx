import React from 'react';
import { Stack } from 'expo-router';
import { HeaderRightIcons } from '../../../components/ui';

export default function SpiritualLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => <HeaderRightIcons />,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Ruhsal Pratikler', headerShown: false }} />
      <Stack.Screen name="prayers/index" options={{ title: 'Bugunun Duasi', headerShown: false }} />
      <Stack.Screen name="prayers/flow" options={{ title: 'Dua Akisi', headerShown: false }} />
      <Stack.Screen name="asma/index" options={{ title: 'Esmaül Hüsna', headerShown: false }} />
      <Stack.Screen name="asma/[id]" options={{ title: 'Esma Detay', headerShown: false }} />
      <Stack.Screen name="dua/index" options={{ title: 'Dualar', headerShown: false }} />
      <Stack.Screen name="dua/[id]" options={{ title: 'Dua Detay', headerShown: false }} />
      <Stack.Screen name="sure/index" options={{ title: 'Sureler', headerShown: false }} />
      <Stack.Screen name="counter" options={{ title: 'Zikirmatik', headerShown: false }} />
      <Stack.Screen name="meditation/index" options={{ title: 'Bugunun Nefesi', headerShown: false }} />
      <Stack.Screen name="meditation/session" options={{ title: 'Nefes Seansi' }} />
      <Stack.Screen name="journal/index" options={{ title: 'Zikir Günlüğüm', headerShown: false }} />
      <Stack.Screen name="journal/stats" options={{ title: 'İstatistikler', headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: 'Ruhsal Ayarlar' }} />
      <Stack.Screen name="recommendations" options={{ title: 'Öneriler', headerShown: false }} />
      <Stack.Screen name="custom-sets/index" options={{ title: 'Ruhsal Çantam', headerShown: false }} />
      <Stack.Screen name="custom-sets/[id]" options={{ title: 'Set Detay', headerShown: false }} />
      <Stack.Screen name="breathing/index" options={{ title: 'Nefes Teknikleri', headerShown: false }} />
      <Stack.Screen name="breathing/session" options={{ title: 'Nefes Seansı', headerShown: false }} />
      <Stack.Screen name="routine-picker" options={{ title: 'Rutin Belirle', headerShown: false }} />
    </Stack>
  );
}
