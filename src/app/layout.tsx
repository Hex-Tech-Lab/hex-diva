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
  metadataBase: new URL('https://hex-diva.vercel.app'),
  title: 'GlamD — Luxury Lashes & Nails',
  description:
    'Experience sensory intelligence and architectural refinement. Hand-tied lash extensions and premium stick-on nails, crafted for longevity, symmetry, and natural movement.',
  openGraph: {
    title: 'GlamD — Luxury Lashes & Nails',
    description:
      'Experience sensory intelligence and architectural refinement. Hand-tied lash extensions and premium stick-on nails, crafted for longevity, symmetry, and natural movement.',
    type: 'website',
    images: [
      {
        url: '/landing/hero-lash-application.webp',
        width: 1200,
        height: 630,
        alt: 'GlamD — Luxury Lashes & Nails',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GlamD — Luxury Lashes & Nails',
    description:
      'Experience sensory intelligence and architectural refinement. Hand-tied lash extensions and premium stick-on nails, crafted for longevity, symmetry, and natural movement.',
    images: ['/landing/hero-lash-application.webp'],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
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
