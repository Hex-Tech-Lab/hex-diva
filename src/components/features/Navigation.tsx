'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, ShoppingCart, User } from 'lucide-react';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center">
            <h1 className="text-2xl font-bold text-brand-600">Hex-Diva</h1>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/products" className="text-gray-700 hover:text-brand-600 transition-colors">
              Shop
            </Link>
            <Link href="/about" className="text-gray-700 hover:text-brand-600 transition-colors">
              About
            </Link>
            <Link href="/contact" className="text-gray-700 hover:text-brand-600 transition-colors">
              Contact
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/cart" className="relative p-2 text-gray-700 hover:text-brand-600">
              <ShoppingCart size={24} />
              <span className="absolute top-1 right-1 bg-brand-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                0
              </span>
            </Link>
            <Link href="/auth/login" className="p-2 text-gray-700 hover:text-brand-600">
              <User size={24} />
            </Link>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-brand-600"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden pb-4 border-t border-gray-200">
            <div className="flex flex-col gap-2 pt-4">
              <Link href="/products" className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Shop
              </Link>
              <Link href="/about" className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                About
              </Link>
              <Link href="/contact" className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                Contact
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
