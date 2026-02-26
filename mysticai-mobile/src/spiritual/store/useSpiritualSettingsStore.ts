import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as Notifications from 'expo-notifications';
import { zustandStorage } from '../../utils/storage';
import type { SpiritualSettings } from '../types';

interface SettingsState extends SpiritualSettings {
  pushToken: string | null;
  update: (patch: Partial<SpiritualSettings>) => void;
  reset: () => void;
  enablePushNotifications: () => Promise<void>;
}

const DEFAULT: SpiritualSettings = {
  hapticEnabled: true,
  soundEnabled: false,
  autoSaveEnabled: true,
  defaultFontScale: 1.0,
  keepScreenAwake: true,
  pushNotificationsEnabled: false,
};

export const useSpiritualSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT,
      pushToken: null,
      update: (patch) => set((s) => ({ ...s, ...patch })),
      reset: () => set({ ...DEFAULT, pushToken: null }),
      enablePushNotifications: async () => {
        if (Platform.OS === 'web') return;
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;
        try {
          const token = (await Notifications.getExpoPushTokenAsync()).data;
          set({ pushNotificationsEnabled: true, pushToken: token });
        } catch {
          // Expo push token not available (e.g. simulator) — still mark enabled
          set({ pushNotificationsEnabled: true });
        }
      },
    }),
    {
      name: 'spiritual-settings-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: ({ update: _u, reset: _r, enablePushNotifications: _e, ...rest }) => rest,
    },
  ),
);
