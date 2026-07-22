'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

interface CartItem {
  product_id: string;
  quantity: number;
  price_at_purchase: number;
  added_at: string;
}

interface Product {
  id: string;
  handle: string;
  title: string;
  featured_image_url: string;
}

interface Cart {
  id: string | null;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCart() {
      try {
        const cartResponse = await fetch('/api/cart');
        const cartData: Cart = await cartResponse.json();
        setCart(cartData);

        const productIds = (cartData.items || []).map(item => item.product_id);
        if (productIds.length > 0) {
          const productEntries = await Promise.all(
            productIds.map(async id => {
              const res = await fetch(`/api/products/by-id/${id}`);
              if (!res.ok) return null;
              const data = await res.json();
              return [id, data] as [string, Product];
            })
          );
          const productMap: Record<string, Product> = {};
          for (const entry of productEntries) {
            if (entry) productMap[entry[0]] = entry[1];
          }
          setProducts(productMap);
        }
      } catch (error) {
        console.error('Error fetching cart:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCart();
  }, []);

  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    const response = await fetch(`/api/cart/items/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    });
    if (response.ok) {
      const updatedCart = await response.json();
      setCart(updatedCart);
    }
  };

  const handleRemoveItem = async (productId: string) => {
    const response = await fetch(`/api/cart/items/${productId}`, {
      method: 'DELETE',
    });
    if (response.ok) {
      const updatedCart = await response.json();
      setCart(updatedCart);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading cart...</p>
      </div>
    );
  }

  const items = cart?.items || [];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-off-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold text-charcoal-900 font-serif">Shopping Cart</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {items.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="space-y-4">
                {items.map(item => {
                  const product = products[item.product_id];
                  return (
                    <div
                      key={item.product_id}
                      className="flex gap-4 bg-off-white p-4 rounded-lg border border-gray-200"
                    >
                      {/* Product Image */}
                      <div className="relative w-24 h-24 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
                        {product?.featured_image_url ? (
                          <Image
                            src={product.featured_image_url}
                            alt={product.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200">
                            <ShoppingBag size={24} className="text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1">
                        <Link
                          href="/shop"
                          className="text-lg font-semibold text-charcoal-900 hover:text-rose-gold transition-colors"
                        >
                          {product?.title || item.product_id}
                        </Link>
                        <p className="text-gray-600 text-sm mt-1">EGP {item.price_at_purchase.toFixed(2)}</p>

                        {/* Quantity Selector */}
                        <div className="flex items-center gap-2 mt-3 bg-white border border-gray-300 rounded-md w-fit">
                          <button
                            onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1)}
                            className="px-3 py-1 hover:bg-gray-100 transition-colors"
                          >
                            -
                          </button>
                          <span className="px-4 py-1 font-medium">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}
                            className="px-3 py-1 hover:bg-gray-100 transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Price & Remove */}
                      <div className="text-right">
                        <p className="text-lg font-bold text-charcoal-900">
                          EGP {(item.price_at_purchase * item.quantity).toFixed(2)}
                        </p>
                        <button
                          onClick={() => handleRemoveItem(item.product_id)}
                          className="mt-3 text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-md transition-colors"
                          aria-label="Remove item"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Continue Shopping */}
              <div className="mt-8">
                <Link href="/shop">
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
                    <span className="font-medium">EGP {(cart?.subtotal ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Shipping</span>
                    <span className="font-medium">
                      {(cart?.shipping ?? 0) === 0 ? (
                        <span className="text-emerald-600 font-semibold">FREE</span>
                      ) : (
                        `EGP ${(cart?.shipping ?? 0).toFixed(2)}`
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Tax</span>
                    <span className="font-medium">EGP {(cart?.tax ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-4 flex justify-between">
                    <span className="font-bold text-charcoal-900">Total</span>
                    <span className="text-xl font-bold text-charcoal-900">EGP {(cart?.total ?? 0).toFixed(2)}</span>
                  </div>
                </div>

                <Link href="/checkout">
                  <Button size="md" className="w-full bg-rose-gold hover:bg-opacity-90 gap-2">
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
            <Link href="/shop">
              <Button size="md" variant="primary">
                Continue Shopping
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
