'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading cart...</p>
      </div>
    );
  }

  const items = cart?.items || [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background-surface)' }}>
      {/* Header */}
      <div style={{ background: 'var(--cream)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: 'var(--spacing-8) var(--spacing-6)' }}>
          <h1
            style={{
              fontFamily: 'var(--font-family-heading)',
              fontSize: '2.25rem',
              fontWeight: 700,
              color: 'var(--charcoal)',
            }}
          >
            Shopping Cart
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: 'var(--spacing-12) var(--spacing-6)' }}>
        {items.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                {items.map(item => {
                  const product = products[item.product_id];
                  return (
                    <Card key={item.product_id} variant="default" padding={4}>
                      <div style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
                        {/* Product Image */}
                        <div
                          className="relative w-24 h-24 flex-shrink-0 rounded-md overflow-hidden"
                          style={{ background: 'var(--color-background-muted)' }}
                        >
                          {product?.featured_image_url ? (
                            <Image
                              src={product.featured_image_url}
                              alt={product.title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag size={24} style={{ color: 'var(--color-text-secondary)' }} />
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div style={{ flex: 1 }}>
                          <Link
                            href="/shop"
                            style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--charcoal)' }}
                          >
                            {product?.title || item.product_id}
                          </Link>
                          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: 'var(--spacing-1)' }}>
                            EGP {item.price_at_purchase.toFixed(2)}
                          </p>

                          {/* Quantity Selector */}
                          <div
                            className="flex items-center gap-2 mt-3 w-fit rounded-md"
                            style={{ border: '1px solid var(--color-border)', background: 'var(--color-background-surface)' }}
                          >
                            <button
                              onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1)}
                              className="px-3 py-1 transition-colors"
                              style={{ color: 'var(--charcoal)' }}
                            >
                              -
                            </button>
                            <span className="px-4 py-1 font-medium" style={{ color: 'var(--charcoal)' }}>
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}
                              className="px-3 py-1 transition-colors"
                              style={{ color: 'var(--charcoal)' }}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Price & Remove */}
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--charcoal)' }}>
                            EGP {(item.price_at_purchase * item.quantity).toFixed(2)}
                          </p>
                          <Button
                            label="Remove item"
                            variant="ghost"
                            size="sm"
                            isIconOnly
                            icon={<Trash2 size={20} />}
                            onClick={() => handleRemoveItem(item.product_id)}
                            style={{ marginTop: 'var(--spacing-3)', color: 'var(--color-error)' }}
                          />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Continue Shopping */}
              <div style={{ marginTop: 'var(--spacing-8)' }}>
                <Link href="/shop">
                  <Button label="Continue Shopping" variant="secondary" style={{ width: '100%' }} />
                </Link>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card variant="default" padding={6} className="sticky top-20">
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--charcoal)', marginBottom: 'var(--spacing-6)' }}>
                  Order Summary
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-6)', fontSize: '0.875rem' }}>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--color-text-secondary)' }}>Subtotal</span>
                    <span className="font-medium" style={{ color: 'var(--charcoal)' }}>
                      EGP {(cart?.subtotal ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--color-text-secondary)' }}>Shipping</span>
                    <span className="font-medium">
                      {(cart?.shipping ?? 0) === 0 ? (
                        <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>FREE</span>
                      ) : (
                        <span style={{ color: 'var(--charcoal)' }}>{`EGP ${(cart?.shipping ?? 0).toFixed(2)}`}</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--color-text-secondary)' }}>Tax</span>
                    <span className="font-medium" style={{ color: 'var(--charcoal)' }}>
                      EGP {(cart?.tax ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div
                    className="flex justify-between"
                    style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-4)' }}
                  >
                    <span style={{ fontWeight: 700, color: 'var(--charcoal)' }}>Total</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--charcoal)' }}>
                      EGP {(cart?.total ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <Link href="/checkout">
                  <Button
                    label="Proceed to Checkout"
                    variant="primary"
                    endContent={<ArrowRight size={18} />}
                    style={{ width: '100%' }}
                  />
                </Link>

                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: 'var(--spacing-4)' }}>
                  Free returns on all orders
                </p>
              </Card>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 'var(--spacing-12) 0' }}>
            <div className="flex justify-center mb-6">
              <ShoppingBag size={64} style={{ color: 'var(--color-text-secondary)' }} />
            </div>
            <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--charcoal)', marginBottom: 'var(--spacing-4)' }}>
              Your cart is empty
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-8)' }}>
              Start shopping to add items to your cart
            </p>
            <Link href="/shop">
              <Button label="Continue Shopping" variant="primary" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
