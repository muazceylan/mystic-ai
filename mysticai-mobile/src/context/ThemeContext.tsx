import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/colors';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ActiveTheme = 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  background: string;
  bgGrad1: string;
  surface: string;
  surfaceAlt: string;
  surfaceMuted: string;
  border: string;
  primary: string;
  primary700: string;
  primaryLight: string;
  primarySoft: string;
  primarySoftBg: string;
  text: string;
  textSoft: string;
  subtext: string;
  body: string;
  muted: string;
  dim: string;
  gold: string;
  yellow: string;
  goldDark: string;
  goldLight: string;
  green: string;
  greenBg: string;
  orange: string;
  orangeBg: string;
  red: string;
  redBright: string;
  redDark: string;
  redBg: string;
  redLight: string;
  danger: string;
  error: string;
  success: string;
  successLight: string;
  successBg: string;
  warning: string;
  warningDark: string;
  warningBg: string;
  white: string;
  card: string;
  inputBg: string;
  shadow: string;
  accent: string;
  accentSoft: string;
  disabled: string;
  disabledText: string;
  violet: string;
  violetLight: string;
  violetBg: string;
  violetText: string;
  trine: string;
  luckBg: string;
  cautionBg: string;
  cautionText: string;
  cautionTextDark: string;
  neutralBg: string;
  amber: string;
  amberLight: string;
  pink: string;
  pinkBg: string;
  blue: string;
  blueBg: string;
  strengthGreen: string;
  appleBlack: string;
  googleRed: string;
  recordingStart: string;
  recordingEnd: string;
  primaryDark: string;
  overlayDark: string;
  tabBarBg: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
  switchTrack: string;
  switchThumbActive: string;
  statusBar: 'light' | 'dark';
  glowTop: string;
  glowBottom: string;
  surfaceGlass: string;
  surfaceGlassBorder: string;
  primaryTint: string;
  textSlate: string;
  textMuted: string;
  textDark: string;
  borderLight: string;
  borderMuted: string;
  moonBlue: string;
  harmonious: string;
  pulseBg: string;
  pulseBorder: string;
  pulseTitle: string;
  pulseSub: string;
  swotStrength: string;
  swotWeakness: string;
  swotOpportunity: string;
  swotThreat: string;
  dictBg: string;
  dictSurface: string;
  dictBorder: string;
  dictText: string;
  dictSub: string;
  spiritualEsma: string;
  spiritualEsmaLight: string;
  spiritualDua: string;
  spiritualDuaLight: string;
  spiritualMeditation: string;
  spiritualSurface: string;
  spiritualBorder: string;
  horoscopeSurface: string;
  horoscopeAccent: string;
  horoscopeGlow: string;
}

export const LIGHT: ThemeColors = {
  bg: COLORS.themeLightBg,
  background: COLORS.themeLightBg,
  bgGrad1: COLORS.themeLightBgGrad1,
  surface: COLORS.surface,
  surfaceAlt: COLORS.themeLightSurfaceAlt,
  surfaceMuted: COLORS.surfaceMuted,
  border: COLORS.border,
  primary: COLORS.primary,
  primary700: COLORS.primary700,
  primaryLight: COLORS.primaryLight,
  primarySoft: COLORS.themeLightPrimarySoft,
  primarySoftBg: COLORS.primarySoftBg,
  text: COLORS.text,
  textSoft: COLORS.textSoft,
  subtext: COLORS.themeSubtext,
  body: COLORS.body,
  muted: COLORS.muted,
  dim: COLORS.dim,
  gold: COLORS.gold,
  yellow: COLORS.yellow,
  goldDark: COLORS.goldDark,
  goldLight: COLORS.themeLightGoldLight,
  green: COLORS.green,
  greenBg: COLORS.greenBg,
  orange: COLORS.themeOrange,
  orangeBg: COLORS.orangeBg,
  red: COLORS.red,
  redBright: COLORS.redBright,
  redDark: COLORS.redDark,
  redBg: COLORS.redBg,
  redLight: COLORS.redLight,
  danger: COLORS.themeDanger,
  error: COLORS.error,
  success: COLORS.success,
  successLight: COLORS.successLight,
  successBg: COLORS.successBg,
  warning: COLORS.warning,
  warningDark: COLORS.warningDark,
  warningBg: COLORS.warningBg,
  white: COLORS.white,
  card: COLORS.surface,
  inputBg: COLORS.themeInputBg,
  shadow: COLORS.shadow,
  accent: COLORS.accent,
  accentSoft: COLORS.accentSoft,
  disabled: COLORS.disabled,
  disabledText: COLORS.disabledText,
  violet: COLORS.violet,
  violetLight: COLORS.violetLight,
  violetBg: COLORS.violetBg,
  violetText: COLORS.violetText,
  trine: COLORS.trine,
  luckBg: COLORS.luckBg,
  cautionBg: COLORS.cautionBg,
  cautionText: COLORS.cautionText,
  cautionTextDark: COLORS.cautionTextDark,
  neutralBg: COLORS.neutralBg,
  amber: COLORS.amber,
  amberLight: COLORS.amberLight,
  pink: COLORS.pink,
  pinkBg: COLORS.pinkBg,
  blue: COLORS.blue,
  blueBg: COLORS.blueBg,
  strengthGreen: COLORS.strengthGreen,
  appleBlack: COLORS.appleBlack,
  googleRed: COLORS.googleRed,
  recordingStart: COLORS.recordingStart,
  recordingEnd: COLORS.recordingEnd,
  primaryDark: COLORS.primaryDark,
  overlayDark: COLORS.overlayDark,
  tabBarBg: COLORS.themeLightTabBarBg,
  tabBarBorder: COLORS.themeLightTabBarBorder,
  tabBarActive: COLORS.themeLightTabBarActive,
  tabBarInactive: COLORS.themeLightTabBarInactive,
  switchTrack: COLORS.switchTrack,
  switchThumbActive: COLORS.switchThumbActive,
  statusBar: 'dark',
  glowTop: COLORS.glowTop,
  glowBottom: COLORS.glowBottom,
  surfaceGlass: COLORS.themeLightSurfaceGlass,
  surfaceGlassBorder: COLORS.themeLightSurfaceGlassBorder,
  primaryTint: COLORS.themeLightPrimaryTint,
  textSlate: COLORS.textSlate,
  textMuted: COLORS.textMuted,
  textDark: COLORS.textDark,
  borderLight: COLORS.borderLight,
  borderMuted: COLORS.borderMuted,
  moonBlue: COLORS.moonBlue,
  harmonious: COLORS.harmonious,
  pulseBg: COLORS.pulseBg,
  pulseBorder: COLORS.pulseBorder,
  pulseTitle: COLORS.pulseTitle,
  pulseSub: COLORS.pulseSub,
  swotStrength: COLORS.swotStrength,
  swotWeakness: COLORS.swotWeakness,
  swotOpportunity: COLORS.swotOpportunity,
  swotThreat: COLORS.swotThreat,
  dictBg: COLORS.themeLightDictBg,
  dictSurface: COLORS.themeLightDictSurface,
  dictBorder: COLORS.themeLightDictBorder,
  dictText: COLORS.themeLightDictText,
  dictSub: COLORS.themeLightDictSub,
  spiritualEsma: '#B45309',
  spiritualEsmaLight: '#FEF3C7',
  spiritualDua: '#4F46E5',
  spiritualDuaLight: '#C7D2FE',
  spiritualMeditation: '#7C3AED',
  spiritualSurface: '#F8FAFC',
  spiritualBorder: '#E2E8F0',
  horoscopeSurface: '#F5F0FA',
  horoscopeAccent: '#9D4EDD',
  horoscopeGlow: 'rgba(157,78,221,0.15)',
};

export const DARK: ThemeColors = {
  bg: COLORS.themeDarkBg,
  background: COLORS.themeDarkBg,
  bgGrad1: COLORS.themeDarkBgGrad1,
  surface: COLORS.themeDarkSurface,
  surfaceAlt: COLORS.themeDarkSurfaceAlt,
  surfaceMuted: COLORS.themeDarkSurfaceMuted,
  border: COLORS.themeDarkBorder,
  primary: COLORS.themeDarkPrimary,
  primary700: COLORS.themeDarkPrimary700,
  primaryLight: COLORS.themeDarkPrimaryLight,
  primarySoft: COLORS.themeDarkPrimarySoft,
  primarySoftBg: COLORS.themeDarkPrimarySoftBg,
  text: COLORS.themeDarkText,
  textSoft: COLORS.themeDarkTextSoft,
  subtext: COLORS.themeDarkSubtext,
  body: COLORS.themeDarkBody,
  muted: COLORS.themeDarkMuted,
  dim: COLORS.themeDarkDim,
  gold: COLORS.themeDarkGold,
  yellow: COLORS.themeDarkGoldLight,
  goldDark: COLORS.themeDarkGold,
  goldLight: COLORS.themeDarkGoldLight,
  green: COLORS.themeDarkGreen,
  greenBg: COLORS.themeDarkGreenBg,
  orange: COLORS.themeDarkOrange,
  orangeBg: COLORS.themeDarkOrangeBg,
  red: COLORS.themeDarkRed,
  redBright: COLORS.themeDarkRed,
  redDark: COLORS.themeDarkRed,
  redBg: COLORS.themeDarkRedLight,
  redLight: COLORS.themeDarkRedLight,
  danger: COLORS.themeDarkDanger,
  error: COLORS.themeDarkDanger,
  success: COLORS.themeDarkGreen,
  successLight: COLORS.themeDarkGreenBg,
  successBg: COLORS.themeDarkSuccessBg,
  warning: COLORS.themeDarkOrange,
  warningDark: COLORS.themeDarkOrange,
  warningBg: COLORS.themeDarkWarningBg,
  white: COLORS.themeDarkWhite,
  card: COLORS.themeDarkCard,
  inputBg: COLORS.themeDarkInputBg,
  shadow: COLORS.themeDarkBg,
  accent: COLORS.themeDarkAccent,
  accentSoft: COLORS.themeDarkVioletBg,
  disabled: COLORS.themeDarkDisabled,
  disabledText: COLORS.themeDarkDisabledText,
  violet: COLORS.themeDarkViolet,
  violetLight: COLORS.themeDarkPrimaryLight,
  violetBg: COLORS.themeDarkVioletBg,
  violetText: COLORS.themeDarkVioletText,
  trine: COLORS.themeDarkGreen,
  luckBg: COLORS.themeDarkLuckBg,
  cautionBg: COLORS.themeDarkCautionBg,
  cautionText: COLORS.themeDarkCautionText,
  cautionTextDark: COLORS.themeDarkCautionTextDark,
  neutralBg: COLORS.themeDarkNeutralBg,
  amber: COLORS.themeDarkGold,
  amberLight: COLORS.themeDarkOrangeBg,
  pink: COLORS.themeDarkPrimaryLight,
  pinkBg: COLORS.themeDarkVioletBg,
  blue: COLORS.themeDarkAccent,
  blueBg: COLORS.themeDarkVioletBg,
  strengthGreen: COLORS.themeDarkGreen,
  appleBlack: COLORS.themeDarkBg,
  googleRed: COLORS.googleRed,
  recordingStart: COLORS.themeDarkDanger,
  recordingEnd: COLORS.themeDarkRed,
  primaryDark: COLORS.themeDarkPrimary,
  overlayDark: COLORS.themeDarkBg,
  tabBarBg: COLORS.themeDarkTabBarBg,
  tabBarBorder: COLORS.themeDarkTabBarBorder,
  tabBarActive: COLORS.themeDarkTabBarActive,
  tabBarInactive: COLORS.themeDarkTabBarInactive,
  switchTrack: COLORS.themeDarkSwitchTrack,
  switchThumbActive: COLORS.themeDarkSwitchThumbActive,
  statusBar: 'light',
  glowTop: COLORS.themeDarkGlowTop,
  glowBottom: COLORS.themeDarkGlowBottom,
  surfaceGlass: COLORS.themeDarkSurfaceGlass,
  surfaceGlassBorder: COLORS.themeDarkSurfaceGlassBorder,
  primaryTint: COLORS.themeDarkPrimaryTint,
  textSlate: COLORS.themeDarkTextSlate,
  textMuted: COLORS.themeDarkTextMuted,
  textDark: COLORS.themeDarkTextSlate,
  borderLight: COLORS.themeDarkBorderLight,
  borderMuted: COLORS.themeDarkBorderMuted,
  moonBlue: COLORS.themeDarkMoonBlue,
  harmonious: COLORS.themeDarkHarmonious,
  pulseBg: COLORS.themeDarkPulseBg,
  pulseBorder: COLORS.themeDarkPulseBorder,
  pulseTitle: COLORS.themeDarkPulseTitle,
  pulseSub: COLORS.themeDarkPulseSub,
  swotStrength: COLORS.swotStrength,
  swotWeakness: COLORS.swotWeakness,
  swotOpportunity: COLORS.swotOpportunity,
  swotThreat: COLORS.swotThreat,
  dictBg: COLORS.themeDarkDictBg,
  dictSurface: COLORS.themeDarkDictSurface,
  dictBorder: COLORS.themeDarkDictBorder,
  dictText: COLORS.themeDarkDictText,
  dictSub: COLORS.themeDarkDictSub,
  spiritualEsma: '#FBBF24',
  spiritualEsmaLight: '#78350F',
  spiritualDua: '#818CF8',
  spiritualDuaLight: '#312E81',
  spiritualMeditation: '#A855F7',
  spiritualSurface: '#0F172A',
  spiritualBorder: '#1E293B',
  horoscopeSurface: '#1E1040',
  horoscopeAccent: '#A855F7',
  horoscopeGlow: 'rgba(168,85,247,0.25)',
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
  mode: 'light',
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
