'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { mockProducts } from '@/lib/mock-data';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

interface CartItem { productId: string; quantity: number; }

export default function CartPage() {
  const [cartItems] = React.useState<CartItem[]>([
    { productId: '1', quantity: 1 },
    { productId: '2', quantity: 2 },
  ]);

  const cartProducts = cartItems.map(item => ({
    product: mockProducts.find(p => p.id === item.productId),
    quantity: item.quantity,
  })).filter(item => item.product);

  const subtotal = cartProducts.reduce((sum, item) => sum + (item.product!.price * item.quantity), 0);
  const shipping = subtotal > 50 ? 0 : 10;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  if (cartProducts.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag size={64} className="mx-auto text-gray-400 mb-6" />
          <h1 className="text-3xl font-bold text-charcoal-900 mb-4">Your cart is empty</h1>
          <Link href="/products">
            <Button variant="accent">Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-off-white border-b"><div className="max-w-7xl mx-auto px-4 py-8"><h1 className="text-4xl font-bold text-charcoal-900 font-serif">Shopping Cart</h1></div></div>
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {cartProducts.map(({ product, quantity }) => (
              <div key={product!.id} className="flex gap-4 bg-off-white p-4 rounded-lg border mb-4">
                <Image src={product!.image} alt={product!.name} width={96} height={96} className="rounded object-cover" />
                <div className="flex-1">
                  <p className="font-semibold text-charcoal-900">{product!.name}</p>
                  <p className="text-gray-600">${product!.price.toFixed(2)}</p>
                  <div className="flex gap-2 mt-2 bg-white border rounded w-fit">
                    <button className="px-3 py-1">-</button>
                    <span className="px-4 py-1 font-medium">{quantity}</span>
                    <button className="px-3 py-1">+</button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">${(product!.price * quantity).toFixed(2)}</p>
                  <button className="text-red-600 mt-3"><Trash2 size={20} /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-off-white p-6 rounded border h-fit">
            <h2 className="text-xl font-bold mb-6">Order Summary</h2>
            <div className="space-y-4 mb-6 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{shipping === 0 ? <span className="text-emerald-600 font-bold">FREE</span> : `$${shipping}`}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>${tax.toFixed(2)}</span></div>
              <div className="border-t pt-4 flex justify-between font-bold"><span>Total</span><span>${total.toFixed(2)}</span></div>
            </div>
            <Link href="/checkout">
              <Button size="lg" className="w-full bg-rose-gold gap-2">Checkout <ArrowRight size={18} /></Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
