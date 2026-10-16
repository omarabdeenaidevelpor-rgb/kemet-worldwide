import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'KemetWorldwide — Logistics Management',
  description: 'Enterprise logistics management platform for KemetWorldwide',
  icons: { icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/icon-512.png', sizes: '512x512' }], apple: '/apple-touch-icon.png' },
  robots: { index: false, follow: false }, // internal system — keep out of search engines
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#062A4A' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = cookies().get('kemet-lang')?.value === 'ar' ? 'ar' : 'en';
  return (
    <html lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers lang={lang}>{children}</Providers>
      </body>
    </html>
  );
}
