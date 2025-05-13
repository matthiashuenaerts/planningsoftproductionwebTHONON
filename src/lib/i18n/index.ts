
import { translations as enTranslations } from './en';
import { translations as nlTranslations } from './nl';
import { translations as frTranslations } from './fr';

export type TranslationKey = keyof typeof enTranslations;

export const languages = {
  en: {
    name: 'English',
    translations: enTranslations
  },
  nl: {
    name: 'Nederlands',
    translations: nlTranslations
  },
  fr: {
    name: 'Français',
    translations: frTranslations
  }
};

export type Language = keyof typeof languages;
export type Translations = typeof enTranslations;

export function getTranslations(lang: Language): Translations {
  return languages[lang].translations;
}
