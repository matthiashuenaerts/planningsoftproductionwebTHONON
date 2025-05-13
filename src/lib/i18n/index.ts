
import { en } from './en';
import { nl } from './nl';
import { fr } from './fr';

export type Language = 'en' | 'nl' | 'fr';

export type Translations = typeof en;

export function getTranslations(language: Language): Translations {
  switch (language) {
    case 'en':
      return en;
    case 'nl':
      return nl;
    case 'fr':
      return fr;
    default:
      return en;
  }
}

export const supportedLanguages: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'fr', label: 'Français' },
];

// Mapping of language codes to their display information
export const languages: Record<Language, { name: string; nativeName: string }> = {
  en: { name: 'English', nativeName: 'English' },
  nl: { name: 'Dutch', nativeName: 'Nederlands' },
  fr: { name: 'French', nativeName: 'Français' },
};
