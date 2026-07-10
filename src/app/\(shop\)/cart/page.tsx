'use client';

import Link from 'next/link';
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight } from 'lucide-react';

export default function CartPage() {
  const items = [
    { id: '1', name: 'Luxury Eyelashes', price: 24.99, quantity: 2 },
  ];

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = subtotal * 1.1 + (subtotal > 50 ? 0 : 9.99);

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-off-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold">Shopping Cart</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-6">
            {items.length > 0 ? (
              items.map((item) => (
                <div key={item.id} className="border rounded-lg p-6 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-gray-600">${item.price}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <button className="px-2 py-1 border rounded">−</button>
                      <span>{item.quantity}</span>
                      <button className="px-2 py-1 border rounded">+</button>
                    </div>
                    <button className="text-red-600">
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <ShoppingCart className="mx-auto mb-4 text-gray-400" size={64} />
                <p className="text-gray-600 mb-4">Your cart is empty</p>
                <Link href="/products" className="text-blue-600 hover:underline">
                  Continue Shopping
                </Link>
              </div>
            )}
          </div>

          <div className="bg-off-white rounded-lg p-6 h-fit sticky top-24">
            <h2 className="text-2xl font-bold mb-6">Summary</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>${(subtotal * 0.1).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{subtotal > 50 ? 'FREE' : '$9.99'}</span>
              </div>
            </div>
            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between">
                <span className="font-bold">Total</span>
                <span className="text-2xl font-bold text-brand-600">${total.toFixed(2)}</span>
              </div>
            </div>
            <Link href="/checkout" className="w-full block text-center px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700">
              Checkout
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
