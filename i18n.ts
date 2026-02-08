import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import fr from './locales/fr.json';
import en from './locales/en.json';

const LANGUAGE_STORAGE_KEY = '@fri2plan_language';

// Get device language
const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'fr';

// Initialize i18n
const initI18n = async () => {
  // Try to get saved language preference
  let savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  
  // If no saved language, use device language (default to 'fr' if not supported)
  if (!savedLanguage) {
    savedLanguage = ['fr', 'en'].includes(deviceLanguage) ? deviceLanguage : 'fr';
  }

  i18n
    .use(initReactI18next)
    .init({
      compatibilityJSON: 'v3',
      resources: {
        fr: { translation: fr },
        en: { translation: en },
      },
      lng: savedLanguage,
      fallbackLng: 'fr',
      interpolation: {
        escapeValue: false,
      },
    });
};

// Change language and save preference
export const changeLanguage = async (language: string) => {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  await i18n.changeLanguage(language);
};

// Get current language
export const getCurrentLanguage = () => i18n.language;

// Initialize on app start
initI18n();

export default i18n;
