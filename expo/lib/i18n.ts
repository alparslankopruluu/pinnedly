import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import tr from '@/locales/tr.json';
import ar from '@/locales/ar.json';
import ru from '@/locales/ru.json';
import de from '@/locales/de.json';
import pt from '@/locales/pt.json';
import es from '@/locales/es.json';
import it from '@/locales/it.json';
import ja from '@/locales/ja.json';
import zh from '@/locales/zh.json';

export const SUPPORTED_LANGUAGES = [
  'en',
  'tr',
  'ar',
  'ru',
  'de',
  'pt',
  'es',
  'it',
  'ja',
  'zh',
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const RTL_LANGUAGES: SupportedLanguage[] = ['ar'];
const LANGUAGE_STORAGE_KEY = 'pinnedly_app_language';

const resources = {
  en: { translation: en },
  tr: { translation: tr },
  ar: { translation: ar },
  ru: { translation: ru },
  de: { translation: de },
  pt: { translation: pt },
  es: { translation: es },
  it: { translation: it },
  ja: { translation: ja },
  zh: { translation: zh },
};

function normalizeLanguageTag(tag: string): SupportedLanguage {
  const base = tag.split('-')[0].toLowerCase();
  if (SUPPORTED_LANGUAGES.includes(base as SupportedLanguage)) {
    return base as SupportedLanguage;
  }
  return 'en';
}

export function getDeviceLanguage(): SupportedLanguage {
  const locale = Localization.getLocales()[0];
  if (locale?.languageCode) {
    return normalizeLanguageTag(locale.languageCode);
  }
  return 'en';
}

function applyRtl(language: SupportedLanguage): void {
  const shouldUseRtl = RTL_LANGUAGES.includes(language);
  if (I18nManager.isRTL !== shouldUseRtl) {
    I18nManager.allowRTL(shouldUseRtl);
    I18nManager.forceRTL(shouldUseRtl);
  }
}

const deviceLanguage = getDeviceLanguage();
applyRtl(deviceLanguage);

i18n.use(initReactI18next).init({
  resources,
  lng: deviceLanguage,
  fallbackLng: 'en',
  compatibilityJSON: 'v4',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options);
}

export async function loadSavedLanguage(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (!saved) return;
    const language = normalizeLanguageTag(saved);
    applyRtl(language);
    await i18n.changeLanguage(language);
  } catch (error) {
    console.error('Failed to load saved language:', error);
  }
}

export async function changeAppLanguage(language: SupportedLanguage): Promise<void> {
  applyRtl(language);
  await i18n.changeLanguage(language);
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}

export function getCurrentLanguage(): SupportedLanguage {
  return normalizeLanguageTag(i18n.language || 'en');
}

export default i18n;