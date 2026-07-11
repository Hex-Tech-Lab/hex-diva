import type { Metadata } from 'next';
import './globals.css';
import { SentryProvider } from './sentry-provider';

export const metadata: Metadata = {
  title: 'Hex-Diva | Luxury Beauty E-Commerce',
  description: 'Premium cosmetics and beauty products with personalized recommendations',
  openGraph: {
    title: 'Hex-Diva',
    description: 'Premium cosmetics and beauty products',
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
