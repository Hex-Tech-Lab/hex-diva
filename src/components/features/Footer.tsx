'use client';

import Link from 'next/link';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-charcoal-900 text-off-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-2xl font-bold text-brand-400 mb-4">Hex-Diva</h3>
            <p className="text-gray-400 text-sm">Luxury cosmetics and beauty products.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Shop</h4>
            <ul className="space-y-2">
              <li><Link href="/products" className="text-gray-400 hover:text-white text-sm">All Products</Link></li>
              <li><Link href="/products" className="text-gray-400 hover:text-white text-sm">Eyelashes</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              <li><Link href="/contact" className="text-gray-400 hover:text-white text-sm">Contact</Link></li>
              <li><Link href="/faq" className="text-gray-400 hover:text-white text-sm">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="text-gray-400 hover:text-white text-sm">Privacy</Link></li>
              <li><Link href="/terms" className="text-gray-400 hover:text-white text-sm">Terms</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 pt-8">
          <p className="text-gray-400 text-sm text-center">&copy; {year} Hex-Diva. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
