import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/colors';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ActiveTheme = 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  bgGrad1: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  primary: string;
  primaryLight: string;
  primarySoft: string;
  text: string;
  textSoft: string;
  subtext: string;
  dim: string;
  gold: string;
  goldLight: string;
  green: string;
  greenBg: string;
  orange: string;
  orangeBg: string;
  red: string;
  danger: string;
  white: string;
  card: string;
  inputBg: string;
  statusBar: 'light' | 'dark';
}

export const LIGHT: ThemeColors = {
  bg: COLORS.themeLightBg,
  bgGrad1: COLORS.themeLightBgGrad1,
  surface: COLORS.surface,
  surfaceAlt: COLORS.themeLightSurfaceAlt,
  border: COLORS.border,
  primary: COLORS.primary,
  primaryLight: COLORS.primaryLight,
  primarySoft: COLORS.themeLightPrimarySoft,
  text: COLORS.text,
  textSoft: COLORS.textSoft,
  subtext: COLORS.themeSubtext,
  dim: COLORS.dim,
  gold: COLORS.gold,
  goldLight: COLORS.themeLightGoldLight,
  green: COLORS.green,
  greenBg: COLORS.greenBg,
  orange: COLORS.themeOrange,
  orangeBg: COLORS.orangeBg,
  red: COLORS.red,
  danger: COLORS.themeDanger,
  white: COLORS.white,
  card: COLORS.surface,
  inputBg: COLORS.themeInputBg,
  statusBar: 'dark',
};

export const DARK: ThemeColors = {
  bg: COLORS.themeDarkBg,
  bgGrad1: COLORS.themeDarkBgGrad1,
  surface: COLORS.themeDarkSurface,
  surfaceAlt: COLORS.themeDarkSurfaceAlt,
  border: COLORS.themeDarkBorder,
  primary: COLORS.themeDarkPrimary,
  primaryLight: COLORS.themeDarkPrimaryLight,
  primarySoft: COLORS.themeDarkPrimarySoft,
  text: COLORS.themeDarkText,
  textSoft: COLORS.themeDarkTextSoft,
  subtext: COLORS.themeDarkSubtext,
  dim: COLORS.themeDarkDim,
  gold: COLORS.themeDarkGold,
  goldLight: COLORS.themeDarkGoldLight,
  green: COLORS.themeDarkGreen,
  greenBg: COLORS.themeDarkGreenBg,
  orange: COLORS.themeDarkOrange,
  orangeBg: COLORS.themeDarkOrangeBg,
  red: COLORS.themeDarkRed,
  danger: COLORS.themeDarkDanger,
  white: COLORS.themeDarkWhite,
  card: COLORS.themeDarkCard,
  inputBg: COLORS.themeDarkInputBg,
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
