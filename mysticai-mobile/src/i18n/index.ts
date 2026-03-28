import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import tr from './tr.json';
import en from './en.json';

export const LANGUAGE_STORAGE_KEY = 'mysticai_language_pref';

const resources = {
  tr: { translation: tr },
  en: { translation: en },
};

function resolveDeviceLanguage(): 'tr' | 'en' {
  try {
    // Dynamic require so a missing native module doesn't crash at import time
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getLocales } = require('expo-localization') as { getLocales: () => { languageTag: string }[] };
    const tag = getLocales()[0]?.languageTag ?? '';
    return tag.toLowerCase().startsWith('tr') ? 'tr' : 'en';
  } catch {
    // Fallback: read device locale via Intl if available
    try {
      const tag = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
      return tag.toLowerCase().startsWith('tr') ? 'tr' : 'en';
    } catch {
      return 'en';
    }
  }
}

export async function initI18n() {
  let lng: 'tr' | 'en';
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'en' || stored === 'tr') {
      lng = stored;
    } else {
      // First launch — no stored preference: follow device locale
      lng = resolveDeviceLanguage();
    }
  } catch {
    lng = resolveDeviceLanguage();
  }

  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      compatibilityJSON: 'v3',
    });
}

export { i18n };
export default i18n;
