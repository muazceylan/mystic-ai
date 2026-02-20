import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ActiveTheme = 'light' | 'dark';

export interface ThemeColors {
  // Backgrounds
  bg: string;
  bgGrad1: string;
  surface: string;
  surfaceAlt: string;
  // Borders
  border: string;
  // Brand
  primary: string;
  primaryLight: string;
  primarySoft: string;
  // Text
  text: string;
  textSoft: string;
  subtext: string;
  dim: string;
  // Semantic
  gold: string;
  goldLight: string;
  green: string;
  greenBg: string;
  orange: string;
  orangeBg: string;
  red: string;
  danger: string;
  // Misc
  white: string;
  card: string;
  inputBg: string;
  // Status bar style
  statusBar: 'light' | 'dark';
}

export const LIGHT: ThemeColors = {
  bg: '#F8FAFC',
  bgGrad1: '#EDE9F5',
  surface: '#FFFFFF',
  surfaceAlt: '#F3EFF9',
  border: '#E6E1EA',
  primary: '#9D4EDD',
  primaryLight: '#C784F7',
  primarySoft: '#F1E8FD',
  text: '#1E1E1E',
  textSoft: '#4A4A5A',
  subtext: '#7A7A7A',
  dim: 'rgba(0,0,0,0.3)',
  gold: '#D4AF37',
  goldLight: '#F0CC55',
  green: '#3FA46A',
  greenBg: 'rgba(63,164,106,0.12)',
  orange: '#C86400',
  orangeBg: 'rgba(200,100,0,0.12)',
  red: '#C04A4A',
  danger: '#E05454',
  white: '#FFFFFF',
  card: '#FFFFFF',
  inputBg: '#F3EFF9',
  statusBar: 'dark',
};

export const DARK: ThemeColors = {
  bg: '#020617',        // Obsidian
  bgGrad1: '#0F172A',   // Deep Navy
  surface: '#1E293B',
  surfaceAlt: '#0F1F35',
  border: '#334155',
  primary: '#A855F7',   // Brighter violet for dark backgrounds
  primaryLight: '#D8B4FE',
  primarySoft: '#1E1040',
  text: '#F1F5F9',
  textSoft: '#CBD5E1',
  subtext: '#94A3B8',
  dim: 'rgba(255,255,255,0.4)',
  gold: '#F59E0B',
  goldLight: '#FCD34D',
  green: '#34D399',
  greenBg: 'rgba(52,211,153,0.15)',
  orange: '#FB923C',
  orangeBg: 'rgba(251,146,60,0.15)',
  red: '#F87171',
  danger: '#FC4A4A',
  white: '#F1F5F9',
  card: '#1E293B',
  inputBg: '#0F1F35',
  statusBar: 'light',
};

const STORAGE_KEY = 'mysticai_theme_pref';

interface ThemeContextValue {
  mode: ThemeMode;
  activeTheme: ActiveTheme;
  colors: ThemeColors;
  isDark: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  activeTheme: 'light',
  colors: LIGHT,
  isDark: false,
  setMode: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') setModeState(v);
    });
  }, []);

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    await AsyncStorage.setItem(STORAGE_KEY, newMode);
  };

  const activeTheme: ActiveTheme =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const colors = activeTheme === 'dark' ? DARK : LIGHT;
  const isDark = activeTheme === 'dark';

  return (
    <ThemeContext.Provider value={{ mode, activeTheme, colors, isDark, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
