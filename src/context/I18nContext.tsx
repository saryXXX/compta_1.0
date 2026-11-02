/**
 * I18n Context: Bilingual French & English Manager.
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { fr } from '../i18n/fr.js';
import { en } from '../i18n/en.js';

export type Language = 'fr' | 'en';
export type TranslationKey = keyof typeof fr;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>({
  language: 'fr',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key: TranslationKey) => fr[key] || String(key),
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_lang');
    if (saved === 'fr' || saved === 'en') return saved;
    return 'fr';
  });

  useEffect(() => {
    localStorage.setItem('app_lang', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'fr' ? 'en' : 'fr'));
  };

  const t = (key: TranslationKey): string => {
    const dict = language === 'fr' ? fr : en;
    return dict[key] || fr[key] || String(key);
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);

