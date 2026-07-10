import type { Metadata } from 'next';
import './globals.css';
import Navigation from '@/components/features/Navigation';
import Footer from '@/components/features/Footer';

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
      <body className="bg-white text-slate-900 flex flex-col min-h-screen">
        <Navigation />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
