import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ru from './locales/ru.json';

export const SUPPORTED_LANGUAGES = ['en', 'ru'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';
const initialLanguage: SupportedLanguage = SUPPORTED_LANGUAGES.includes(
  deviceLanguage as SupportedLanguage
)
  ? (deviceLanguage as SupportedLanguage)
  : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

/** Maps the active i18next language to a locale tag for Intl/toLocale* calls. */
export function getLocaleTag(): string {
  return i18n.language === 'ru' ? 'ru-RU' : 'en-US';
}

export default i18n;
