'use client';

import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@astryxdesign/core/Button';
import { LandingProductCard } from '@/components/LandingProductCard';

const products = [
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

export default function DesignShowcase() {
  return (
    <main className="bg-white dark:bg-black">
      <ThemeToggle />

      {/* Version 1: Hex-Diva Gold Scheme (Current) */}
      <section className="relative py-20 bg-gradient-to-b from-white via-gold-50 to-white dark:from-black dark:via-gold-950/20 dark:to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-2 rounded-full bg-gold-100 dark:bg-gold-900/30 border border-gold-300 dark:border-gold-700 mb-4">
              Version 1: Hex-Diva Gold Scheme
            </span>
            <h2 className="text-4xl font-bold text-black dark:text-white mb-2">
              Current Production Design
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Gold accents, luxury positioning, premium feel
            </p>
          </div>

          {/* Hero Preview */}
          <div className="mb-16 rounded-xl overflow-hidden border border-gold-200 dark:border-gold-800 bg-white dark:bg-slate-950">
            <div className="relative overflow-hidden bg-gradient-to-br from-white via-gold-50 to-white dark:from-black dark:via-gold-950/20 dark:to-black py-20">
              <div className="absolute top-0 right-0 w-96 h-96 bg-gold-300/20 dark:bg-gold-600/10 rounded-full blur-3xl -mr-48 -mt-48" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-gold-200/10 dark:bg-gold-700/5 rounded-full blur-3xl -ml-48 -mb-48" />

              <div className="relative max-w-4xl mx-auto px-4 text-center">
                <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full border border-gold-300 dark:border-gold-700 bg-gold-50 dark:bg-gold-950/40">
                  <span className="w-2 h-2 rounded-full bg-gold-600 dark:bg-gold-400" />
                  <span className="text-sm font-semibold text-gold-900 dark:text-gold-200">
                    THE ART OF LUXURY BEAUTY
                  </span>
                </div>

                <h1 className="text-5xl sm:text-6xl font-bold mb-6 text-black dark:text-white">
                  Elevate Your
                  <br />
                  <span className="bg-gradient-to-r from-gold-600 to-gold-500 dark:from-gold-400 dark:to-gold-300 bg-clip-text text-transparent">
                    Beauty Ritual
                  </span>
                </h1>

                <p className="text-lg text-gray-700 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                  Curated eyelash extensions, premium stick-on nails, and high-end cosmetic accessories.
                  Exceptional quality. Impeccable packaging.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button variant="primary" label="Shop Now" className="px-8 py-3" />
                  <Button variant="secondary" label="Explore Collection" className="px-8 py-3" />
                </div>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {products.map((product) => (
              <LandingProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Version 2: Luxury Eyelash Design (Alternative) */}
      <section className="relative py-20 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 mb-4">
              Version 2: Luxury Eyelash Design (Alternative)
            </span>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Modern Luxury Alternative
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Minimalist approach with premium product focus
            </p>
          </div>

          {/* Alt Hero Preview */}
          <div className="mb-16 rounded-xl overflow-hidden border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950">
            <div className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800 text-white py-20">
              <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -mr-48 -mt-48" />

              <div className="relative max-w-4xl mx-auto px-4 text-center">
                <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full border border-cyan-400/30 bg-cyan-400/10">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="text-sm font-semibold text-cyan-300">
                    CURATED LUXURY COLLECTION
                  </span>
                </div>

                <h1 className="text-5xl sm:text-6xl font-bold mb-6 text-white">
                  The Art of
                  <br />
                  <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    Luxury Beauty
                  </span>
                </h1>

                <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
                  Curated eyelash extensions, premium stick‑on nails, and exquisite accessories — all
                  presented with impeccable packaging.
                </p>

                <Button label="Explore the Collection" variant="primary" className="px-8 py-3" />
              </div>
            </div>
          </div>

          {/* Alt Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {products.map((product) => (
              <div
                key={product.id}
                className="rounded-lg overflow-hidden border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:shadow-xl transition-all duration-300"
              >
                <div className="h-64 bg-gray-200 dark:bg-slate-800 overflow-hidden">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {product.description}
                  </p>
                  <button className="w-full py-2 px-4 rounded-md bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-medium transition-colors">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Design Decision Card */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800 p-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Design Recommendation
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            <strong>Version 1 (Hex-Diva Gold)</strong> is currently deployed. It maintains brand consistency
            with gold accents and luxury positioning that aligns with the existing Hex-Diva ecosystem.
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            <strong>Version 2 (Luxury Eyelash)</strong> is a modern alternative with a darker, more contemporary aesthetic.
            Use this if you want to pivot to a minimalist, tech-forward look.
          </p>
          <div className="flex gap-4">
            <Button variant="primary" label="Use Version 1 (Recommended)" />
            <Button variant="secondary" label="Switch to Version 2" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-black py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600 dark:text-gray-400">
          <p>© {new Date().getFullYear()} Hex-Diva. Design Showcase.</p>
        </div>
      </footer>
    </main>
  );
}
