'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

type Lang = 'en' | 'ar';
type Translations = typeof en;

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: (k) => k,
  dir: 'ltr',
});

const messages: Record<Lang, Record<string, unknown>> = { en, ar };

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const parts = path.split('.');
  let curr: unknown = obj;
  for (const p of parts) {
    if (curr && typeof curr === 'object') {
      curr = (curr as Record<string, unknown>)[p];
    } else {
      return path;
    }
  }
  return typeof curr === 'string' ? curr : path;
}

export const LANG_COOKIE = 'kemet-lang';

export function LanguageProvider({
  children,
  initialLang = 'en',
}: {
  children: React.ReactNode;
  initialLang?: Lang;
}) {
  // Server passes the cookie value so the first paint already has the right language/direction.
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    // Migrate users who only have the legacy localStorage preference
    const saved = localStorage.getItem('kemet-lang') as Lang | null;
    if ((saved === 'ar' || saved === 'en') && saved !== initialLang) setLang(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem('kemet-lang', l);
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
  }

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const t = (key: string) => getNestedValue(messages[lang] as Record<string, unknown>, key);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
