'use client';

import { useState } from 'react';
import { LandingProductCard } from './LandingProductCard';
import { Button } from '@astryxdesign/core/Button';

interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
}

export function LandingHeroSection() {
  const [isLoading] = useState(false);

  const products: Product[] = [
    {
      id: 'lashes',
      name: 'Curated Luxury Eyelash Extensions',
      description:
        'Hand-crafted, feather-light extensions that give you the dramatic, runway-ready look.',
      imageUrl:
        'https://images.unsplash.com/photo-1611095973515-0e2b4e90ea2e?w=800&auto=format&fit=crop',
    },
    {
      id: 'nails',
      name: 'Premium Stick-On Nails',
      description:
        'Ultra-glossy, long-lasting nails that snap on in seconds for an instant wow factor.',
      imageUrl:
        'https://images.unsplash.com/photo-1589382926996-4cb5c9a2a6a2?w=800&auto=format&fit=crop',
    },
    {
      id: 'accessories',
      name: 'High-End Cosmetic Accessories',
      description:
        'Gold-trimmed brushes, elegant applicators, and sophisticated storage solutions.',
      imageUrl:
        'https://images.unsplash.com/photo-1600180758890-8a7f0b2c3e0a?w=800&auto=format&fit=crop',
    },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient with elegance */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-gold-50 to-white dark:from-black dark:via-gold-950/20 dark:to-black" />

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold-300/20 dark:bg-gold-600/10 rounded-full blur-3xl -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gold-200/10 dark:bg-gold-700/5 rounded-full blur-3xl -ml-48 -mb-48" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-32 sm:py-40">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full border border-gold-300 dark:border-gold-700 bg-gold-50 dark:bg-gold-950/40">
              <span className="w-2 h-2 rounded-full bg-gold-600 dark:bg-gold-400" />
              <span className="text-sm font-semibold tracking-wide text-gold-900 dark:text-gold-200">
                THE ART OF LUXURY BEAUTY
              </span>
            </div>

            {/* Main headline */}
            <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tighter mb-8 text-black dark:text-white">
              Elevate Your
              <br />
              <span className="bg-gradient-to-r from-gold-600 to-gold-500 dark:from-gold-400 dark:to-gold-300 bg-clip-text text-transparent">
                Beauty Ritual
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
              Curated eyelash extensions, premium stick-on nails, and high-end cosmetic accessories.
              Exceptional quality. Impeccable packaging. Mid-to-upper price positioning.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button variant="primary" label="Shop Now" className="px-8 py-4 text-lg" />
              <Button variant="secondary" label="Explore Collection" className="px-8 py-4 text-lg" />
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid Section */}
      <section className="bg-white dark:bg-black py-20 border-t border-gold-200 dark:border-gold-900/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-black dark:text-white mb-4">
              Our Curated Collection
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
              Hand-selected products that embody luxury, quality, and elegance
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">Loading products...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((product) => (
                <LandingProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative bg-black dark:bg-gold-950/20 text-white dark:text-white py-20 border-t border-gold-900/30">
        <div className="absolute inset-0 bg-gradient-to-r from-gold-600/5 via-transparent to-gold-600/5" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-gold-400 to-gold-300 bg-clip-text text-transparent mb-3">
                100
              </div>
              <p className="text-gray-300 text-lg font-medium">Curated SKUs (Phase 1)</p>
            </div>
            <div className="text-center border-l border-r border-gold-900/30">
              <div className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-gold-400 to-gold-300 bg-clip-text text-transparent mb-3">
                3000+
              </div>
              <p className="text-gray-300 text-lg font-medium">Total Catalog</p>
            </div>
            <div className="text-center">
              <div className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-gold-400 to-gold-300 bg-clip-text text-transparent mb-3">
                Top 5
              </div>
              <p className="text-gray-300 text-lg font-medium">Import Partner (Egypt)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-950 border-t border-gold-200 dark:border-gold-900/30 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600 dark:text-gray-400">
          <p>© {new Date().getFullYear()} Hex-Diva. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}
