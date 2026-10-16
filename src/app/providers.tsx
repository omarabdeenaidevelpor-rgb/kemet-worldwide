'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { LanguageProvider } from '@/components/shared/LanguageProvider';

export function Providers({ children, lang }: { children: React.ReactNode; lang: 'en' | 'ar' }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <LanguageProvider initialLang={lang}>
          {children}
          <Toaster />
        </LanguageProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
