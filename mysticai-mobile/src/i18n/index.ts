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

export async function initI18n() {
  // Read persisted language preference
  let lng = 'tr'; // default
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'en' || stored === 'tr') lng = stored;
  } catch { /* use default */ }

  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng,
      fallbackLng: 'tr',
      interpolation: { escapeValue: false },
      compatibilityJSON: 'v3',
    });
}

export { i18n };
export default i18n;
