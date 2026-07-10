'use client';

import Link from 'next/link';
import { ArrowRight, Star } from 'lucide-react';

export default function Home() {
  return (
    <>
      {/* Hero Section with Video Concept */}
      <section className="relative w-full h-screen min-h-96 overflow-hidden bg-black">
        {/* Video Background Placeholder */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-brand-900 to-black opacity-60" />

        {/* Hero Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-off-white mb-6 leading-tight">
              Luxury Beauty Redefined
            </h1>
            <p className="text-xl sm:text-2xl text-gray-300 mb-8 leading-relaxed">
              Curated cosmetics and beauty products from around the world. Experience the luxury you deserve.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/products"
                className="inline-flex items-center justify-center px-8 py-4 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-semibold text-lg"
              >
                Shop Now
                <ArrowRight className="ml-2" size={20} />
              </Link>
              <Link
                href="#featured"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white hover:text-black transition-colors font-semibold text-lg"
              >
                Explore Collections
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-off-white py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-100 rounded-lg mb-4">
                <Star className="text-brand-600" size={32} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Premium Quality</h3>
              <p className="text-gray-600">
                Handpicked products from the world's finest beauty brands
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-lg mb-4">
                <span className="text-2xl">🚚</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Fast Shipping</h3>
              <p className="text-gray-600">
                Free shipping on orders over $50. Delivery in 3-5 business days
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-sapphire-100 rounded-lg mb-4">
                <span className="text-2xl">💎</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Luxury Experience</h3>
              <p className="text-gray-600">
                Premium packaging and white-glove customer service
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section id="featured" className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-charcoal-900">
              Featured Collections
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover our curated selection of premium beauty products
            </p>
          </div>

          {/* Product Grid Placeholder */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-off-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="aspect-square bg-gray-200 animate-pulse" />
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/products"
              className="inline-flex items-center px-8 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-semibold"
            >
              View All Products
              <ArrowRight className="ml-2" size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-brand-900 text-white py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            Join Our Community
          </h2>
          <p className="text-xl text-brand-100 mb-8">
            Subscribe to our newsletter for exclusive offers, beauty tips, and new product launches
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <button className="px-6 py-3 bg-off-white text-brand-900 rounded-lg hover:bg-gray-100 transition-colors font-semibold">
              Subscribe
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
