'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@astryxdesign/core/Button';
import { ChevronLeft, ShoppingBag, Heart, Share2 } from 'lucide-react';

interface Product {
  id: string;
  handle: string;
  title: string;
  description: string;
  sku: string;
  barcode: string;
  category: string;
  tags: string[];
  vendor: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  price: number;
  currency_code: string;
  compare_at_price?: number;
  b2b_bronze_price?: number;
  b2b_silver_price?: number;
  b2b_gold_price?: number;
  featured_image_url: string;
  images: string[];
  total_inventory: number;
  available_for_sale: boolean;
  rating: number;
  review_count: number;
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartMessage, setCartMessage] = useState('');

  // Fetch product
  useEffect(() => {
    async function fetchProduct() {
      try {
        const response = await fetch(`/api/products/${handle}`);
        if (!response.ok) {
          throw new Error('Product not found');
        }
        const data = await response.json();
        setProduct(data);
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [handle]);

  const handleAddToCart = async () => {
    if (!product) return;

    setAddingToCart(true);
    setCartMessage('');

    try {
      // First, ensure we have a cart session
      const cartResponse = await fetch('/api/cart', { method: 'POST' });
      const cartData = await cartResponse.json();

      // Then add item
      const addResponse = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          quantity,
          session_id: cartData.session_id,
        }),
      });

      if (addResponse.ok) {
        setCartMessage(`${quantity} item(s) added to cart!`);
        setQuantity(1);
        setTimeout(() => setCartMessage(''), 3000);
      } else {
        const error = await addResponse.json();
        setCartMessage(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      setCartMessage('Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading product...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-rose-gold hover:text-opacity-80 mb-8"
          >
            <ChevronLeft size={20} />
            Go Back
          </button>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-charcoal-900">Product not found</h1>
            <p className="text-gray-600 mt-2">The product you're looking for doesn't exist.</p>
            <Link href="/shop">
              <Button label="Back to Shop" variant="primary" className="mt-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-rose-gold hover:text-opacity-80 mb-4"
          >
            <ChevronLeft size={20} />
            Back to Shop
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <div>
            <div className="relative bg-off-white rounded-lg overflow-hidden aspect-square">
              {product.featured_image_url ? (
                <Image
                  src={product.featured_image_url}
                  alt={product.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-300">
                  <ShoppingBag size={64} className="text-gray-500" />
                </div>
              )}

              {!product.available_for_sale && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">Out of Stock</span>
                </div>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div>
            {/* Breadcrumb */}
            <div className="text-sm text-gray-600 mb-4">
              <span className="capitalize">{product.category}</span>
            </div>

            {/* Title & Vendor */}
            <h1 className="text-4xl font-bold text-charcoal-900 font-serif mb-2">
              {product.title}
            </h1>
            <p className="text-lg text-gray-600 mb-6">{product.vendor}</p>

            {/* Rating */}
            {product.rating > 0 && (
              <div className="flex items-center gap-3 mb-6">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className={`text-lg ${
                        i < Math.round(product.rating)
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-gray-600">
                  {product.rating.toFixed(1)} ({product.review_count} reviews)
                </span>
              </div>
            )}

            {/* Pricing */}
            <div className="mb-8 p-6 bg-off-white rounded-lg border border-gray-200">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Current Price</p>
                <p className="text-4xl font-bold text-charcoal-900">
                  {product.currency_code} {product.price.toFixed(2)}
                </p>
              </div>

              {/* B2B Tiers Info */}
              {(product.b2b_bronze_price || product.b2b_silver_price || product.b2b_gold_price) && (
                <div className="border-t border-gray-300 pt-4">
                  <p className="text-xs uppercase tracking-wider text-gray-600 mb-3">
                    B2B Bulk Pricing
                  </p>
                  <div className="space-y-2 text-sm">
                    {product.b2b_bronze_price && (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Bronze Tier:</span>
                        <span className="font-semibold">{product.currency_code} {product.b2b_bronze_price.toFixed(2)}</span>
                      </div>
                    )}
                    {product.b2b_silver_price && (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Silver Tier:</span>
                        <span className="font-semibold">{product.currency_code} {product.b2b_silver_price.toFixed(2)}</span>
                      </div>
                    )}
                    {product.b2b_gold_price && (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Gold Tier:</span>
                        <span className="font-semibold">{product.currency_code} {product.b2b_gold_price.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Stock Status */}
            <div className="mb-6">
              {product.available_for_sale && product.total_inventory > 0 ? (
                <p className="text-sm text-emerald-600 font-semibold">
                  ✓ In Stock ({product.total_inventory} available)
                </p>
              ) : (
                <p className="text-sm text-red-600 font-semibold">Out of Stock</p>
              )}
            </div>

            {/* Quantity & Add to Cart */}
            {product.available_for_sale && (
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-4">
                  <label htmlFor="quantity-input" className="text-sm font-semibold text-charcoal-900">
                    Quantity
                  </label>
                  <div className="flex items-center gap-2 border border-gray-300 rounded-md">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-2 hover:bg-gray-100"
                    >
                      −
                    </button>
                    <span id="quantity-input" className="px-4 py-2 font-medium">{quantity}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity(Math.min(product.total_inventory, quantity + 1))
                      }
                      className="px-3 py-2 hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>
                </div>

                <Button
                  label={addingToCart ? 'Adding...' : 'Add to Cart'}
                  variant="primary"
                  onClick={handleAddToCart}
                  isDisabled={addingToCart}
                  isLoading={addingToCart}
                  className="w-full"
                />

                {cartMessage && (
                  <div
                    className={`text-center py-2 rounded-md ${
                      cartMessage.includes('Error')
                        ? 'bg-red-50 text-red-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {cartMessage}
                  </div>
                )}
              </div>
            )}

            {/* Share & Wishlist */}
            <div className="flex gap-3 pb-8 border-b border-gray-200">
              <Button variant="secondary" label="Save" icon={<Heart size={20} />} className="flex-1" />
              <Button variant="secondary" label="Share" icon={<Share2 size={20} />} className="flex-1" />
            </div>

            {/* Description */}
            <div className="mt-8">
              <h3 className="text-lg font-bold text-charcoal-900 mb-3">
                Product Details
              </h3>
              <p className="text-gray-700 leading-relaxed mb-6">
                {product.description}
              </p>

              {/* SKU & Category */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">SKU:</span>
                  <span className="font-mono text-gray-900">{product.sku}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span className="capitalize text-gray-900">{product.category}</span>
                </div>
              </div>

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm font-semibold text-gray-600 mb-3">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-off-white border border-gray-300 rounded-full text-xs text-gray-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
