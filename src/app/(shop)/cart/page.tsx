'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { mockProducts } from '@/lib/mock-data';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

interface CartItem {
  productId: string;
  quantity: number;
  variantId?: string;
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([
    { productId: '1', quantity: 1 },
    { productId: '2', quantity: 2 },
  ]);

  const cartProducts = cartItems
    .map(item => ({
      product: mockProducts.find(p => p.id === item.productId),
      quantity: item.quantity,
    }))
    .filter(item => item.product !== undefined);

  const subtotal = cartProducts.reduce((sum, item) => sum + (item.product!.price * item.quantity), 0);
  const shipping = subtotal > 50 ? 0 : 10;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const handleRemoveItem = (productId: string) => {
    setCartItems(cartItems.filter(item => item.productId !== productId));
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId);
    } else {
      setCartItems(
        cartItems.map(item =>
          item.productId === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-off-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold text-charcoal-900 font-serif">Shopping Cart</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {cartProducts.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="space-y-4">
                {cartProducts.map(({ product, quantity }) => (
                  <div
                    key={product!.id}
                    className="flex gap-4 bg-off-white p-4 rounded-lg border border-gray-200"
                  >
                    {/* Product Image */}
                    <div className="relative w-24 h-24 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
                      <Image
                        src={product!.image}
                        alt={product!.name}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Product Info */}
                    <div className="flex-1">
                      <Link
                        href={`/products/${product!.id}`}
                        className="text-lg font-semibold text-charcoal-900 hover:text-rose-gold transition-colors"
                      >
                        {product!.name}
                      </Link>
                      <p className="text-gray-600 text-sm mt-1">${product!.price.toFixed(2)}</p>

                      {/* Quantity Selector */}
                      <div className="flex items-center gap-2 mt-3 bg-white border border-gray-300 rounded-md w-fit">
                        <button
                          onClick={() => handleUpdateQuantity(product!.id, quantity - 1)}
                          className="px-3 py-1 hover:bg-gray-100 transition-colors"
                        >
                          -
                        </button>
                        <span className="px-4 py-1 font-medium">{quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(product!.id, quantity + 1)}
                          className="px-3 py-1 hover:bg-gray-100 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Price & Remove */}
                    <div className="text-right">
                      <p className="text-lg font-bold text-charcoal-900">
                        ${(product!.price * quantity).toFixed(2)}
                      </p>
                      <button
                        onClick={() => handleRemoveItem(product!.id)}
                        className="mt-3 text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-md transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Continue Shopping */}
              <div className="mt-8">
                <Link href="/products">
                  <Button variant="outline" className="w-full">
                    Continue Shopping
                  </Button>
                </Link>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-off-white p-6 rounded-lg border border-gray-200 sticky top-20">
                <h2 className="text-xl font-bold text-charcoal-900 mb-6">Order Summary</h2>

                <div className="space-y-4 mb-6 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Subtotal</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Shipping</span>
                    <span className="font-medium">
                      {shipping === 0 ? (
                        <span className="text-emerald-600 font-semibold">FREE</span>
                      ) : (
                        `$${shipping.toFixed(2)}`
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Tax</span>
                    <span className="font-medium">${tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-4 flex justify-between">
                    <span className="font-bold text-charcoal-900">Total</span>
                    <span className="text-xl font-bold text-charcoal-900">${total.toFixed(2)}</span>
                  </div>
                </div>

                {subtotal < 50 && (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-md mb-6 text-xs">
                    <p className="text-blue-900">
                      Add ${(50 - subtotal).toFixed(2)} more for free shipping!
                    </p>
                  </div>
                )}

                <Link href="/checkout">
                  <Button size="lg" className="w-full bg-rose-gold hover:bg-opacity-90 gap-2">
                    Proceed to Checkout
                    <ArrowRight size={18} />
                  </Button>
                </Link>

                <p className="text-xs text-gray-600 text-center mt-4">
                  Free returns on all orders
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="flex justify-center mb-6">
              <ShoppingBag size={64} className="text-gray-400" />
            </div>
            <h2 className="text-3xl font-bold text-charcoal-900 mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-8">Start shopping to add items to your cart</p>
            <Link href="/products">
              <Button size="lg" variant="accent">
                Continue Shopping
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
