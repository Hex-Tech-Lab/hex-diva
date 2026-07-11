import type { Metadata } from 'next';
import './globals.css';
import { SentryProvider } from './sentry-provider';

export const metadata: Metadata = {
  title: 'Hex-Diva | Luxury Eyelash & Nail Extensions Boutique',
  description: 'Premium eyelash extensions, stick-on nails, and luxury cosmetic accessories. Curated quality. Impeccable packaging.',
  openGraph: {
    title: 'Hex-Diva | Premium Beauty Accessories Boutique',
    description: 'Luxury eyelash extensions and nail accessories for mid-to-upper segment customers',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900">
        <SentryProvider>{children}</SentryProvider>
      </body>
    </html>
  );
}
