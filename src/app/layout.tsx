import type { Metadata } from 'next';
import Script from 'next/script';
import { Inter, Playfair_Display } from 'next/font/google';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import './globals.css';
import '@/styles/glamd-tokens.css';
import '@/styles/landing.css';
import { SentryProvider } from './sentry-provider';
import { Providers } from './providers';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-playfair',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'GlamD — Luxury Lashes & Nails',
  description:
    'Hand-tied lash extensions and premium stick-on nails, crafted for longevity and natural movement. Curated quality. Impeccable packaging.',
  openGraph: {
    title: 'GlamD — Luxury Lashes & Nails',
    description: 'Premium eyelash extensions and nail accessories for mid-to-upper segment customers',
    type: 'website',
  },
};

// Applies the persisted theme before first paint to avoid a flash of wrong theme.
const themeInit = `try{var t=localStorage.getItem('glamd-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body className={`${playfair.variable} ${inter.variable}`}>
        <Script id="glamd-theme-init" strategy="beforeInteractive">
          {themeInit}
        </Script>
        <SentryProvider>
          <Providers>{children}</Providers>
        </SentryProvider>
      </body>
    </html>
  );
}
