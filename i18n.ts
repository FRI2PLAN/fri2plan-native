import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './lib/trpc';

import fr from './locales/fr.json';
import en from './locales/en.json';
import de from './locales/de.json';
import es from './locales/es.json';
import it from './locales/it.json';

const LANGUAGE_STORAGE_KEY = '@fri2plan_language';
const SUPPORTED_LANGUAGES = ['fr', 'en', 'de', 'es', 'it'] as const;

type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const isSupportedLanguage = (language: string): language is SupportedLanguage =>
  SUPPORTED_LANGUAGES.includes(language as SupportedLanguage);

export const syncLanguagePreference = async (language: string) => {
  if (!isSupportedLanguage(language)) return;

  const token = await AsyncStorage.getItem('authToken');
  if (!token) return;

  try {
    const response = await fetch(`${API_URL}/settings.update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ json: { language } }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    // La préférence locale reste prioritaire hors ligne et sera resynchronisée à la prochaine connexion.
    console.warn('[i18n] Impossible de synchroniser la langue avec le serveur:', error);
  }
};

// Get device language
const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'fr';

// Initialize i18n
const initI18n = async () => {
  // Try to get saved language preference
  let savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  
  // If no saved language, use device language (default to 'fr' if not supported)
  if (!savedLanguage) {
    savedLanguage = isSupportedLanguage(deviceLanguage) ? deviceLanguage : 'fr';
  }

  i18n
    .use(initReactI18next)
    .init({
      compatibilityJSON: 'v3',
      resources: {
        fr: { translation: fr },
        en: { translation: en },
        de: { translation: de },
        es: { translation: es },
        it: { translation: it },
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
  if (!isSupportedLanguage(language)) return;
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  await i18n.changeLanguage(language);
  await syncLanguagePreference(language);
};

// Get current language
export const getCurrentLanguage = () => i18n.language;

// Promesse partagée : l’application peut attendre la préférence sauvegardée
// avant de rendre l’écran de connexion et éviter un flash dans la langue du téléphone.
export const i18nReady = initI18n();

export default i18n;
