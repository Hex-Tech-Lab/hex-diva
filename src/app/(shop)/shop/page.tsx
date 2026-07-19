'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ShoppingBag } from 'lucide-react';

// Shopify Admin API-aligned Product interface
// Reference: https://shopify.dev/docs/api/admin-graphql/2026-01
interface Product {
  id: string;
  handle: string;
  title: string;
  description: string;
  vendor: string;
  category: string;
  tags: string[];
  sku: string;
  barcode: string;
  price: number;
  currency_code: string;
  compare_at_price?: number;
  featured_image_url: string;
  images: string[];
  rating: number;
  total_inventory: number;
  available_for_sale: boolean;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  created_at: string;
  updated_at: string;
}

interface FiltersState {
  search: string;
  category: string;
  minPrice: number | null;
  maxPrice: number | null;
  sort: 'popularity' | 'price-low' | 'price-high' | 'newest';
}

const CATEGORIES = ['All', 'eyelashes', 'nails', 'accessories'];

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<FiltersState>({
    search: '',
    category: 'All',
    minPrice: null,
    maxPrice: null,
    sort: 'popularity',
  });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(true);

  // Fetch products from Shopify-aligned API
  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('/api/products?limit=100&status=ACTIVE');
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          setProducts(data.data);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  // Apply filters using Shopify field names
  useEffect(() => {
    let result = products;

    if (filters.category !== 'All') {
      result = result.filter(p => p.category === filters.category);
    }

    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(
        p =>
          p.title.toLowerCase().includes(query) ||
          (p.description?.toLowerCase().includes(query) ?? false) ||
          (p.vendor?.toLowerCase().includes(query) ?? false)
      );
    }

    if (filters.minPrice !== null) {
      result = result.filter(p => p.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== null) {
      result = result.filter(p => p.price <= filters.maxPrice!);
    }

    result = result.filter(p => p.available_for_sale && p.total_inventory > 0);

    switch (filters.sort) {
      case 'price-low':
        result = [...result].sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result = [...result].sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        result = [...result].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case 'popularity':
      default:
        result = [...result].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
    }

    setFilteredProducts(result);
  }, [products, filters]);

  const handleFilterChange = (key: keyof FiltersState, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      category: 'All',
      minPrice: null,
      maxPrice: null,
      sort: 'popularity',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ShoppingBag className="w-12 h-12 mx-auto mb-4 animate-pulse" />
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <div className="w-64 flex-shrink-0">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden w-full mb-4 flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border"
            >
              Filters <ChevronDown className={`w-4 h-4 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {showFilters && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Search</label>
                  <Input
                    type="text"
                    placeholder="Search by title, vendor..."
                    value={filters.search}
                    onChange={e => handleFilterChange('search', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Category</label>
                  <div className="space-y-2">
                    {CATEGORIES.map(cat => (
                      <label key={cat} className="flex items-center">
                        <input
                          type="radio"
                          name="category"
                          value={cat}
                          checked={filters.category === cat}
                          onChange={e => handleFilterChange('category', e.target.value)}
                          className="mr-2"
                        />
                        <span>{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Price Range (EGP)</label>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      placeholder="Min price"
                      value={filters.minPrice ?? ''}
                      onChange={e =>
                        handleFilterChange('minPrice', e.target.value ? parseFloat(e.target.value) : null)
                      }
                    />
                    <Input
                      type="number"
                      placeholder="Max price"
                      value={filters.maxPrice ?? ''}
                      onChange={e =>
                        handleFilterChange('maxPrice', e.target.value ? parseFloat(e.target.value) : null)
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Sort By</label>
                  <select
                    value={filters.sort}
                    onChange={e =>
                      handleFilterChange('sort', e.target.value as FiltersState['sort'])
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="popularity">Popularity</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="newest">Newest</option>
                  </select>
                </div>

                <Button variant="outline" className="w-full" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Our Collection</h1>
              <p className="text-gray-600 dark:text-gray-400">
                {filteredProducts.length} products available
              </p>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400">
                  No products found matching your filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map(product => (
                  <Link key={product.id} href={`/shop/${product.handle}`} className="group">
                    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                      <div className="relative w-full h-48 bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        {product.featured_image_url && (
                          <Image
                            src={product.featured_image_url}
                            alt={product.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                          />
                        )}
                        {!product.available_for_sale && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white font-semibold">Out of Stock</span>
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        {product.vendor && (
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                            {product.vendor}
                          </p>
                        )}

                        <h3 className="font-semibold text-lg line-clamp-2 mb-2">
                          {product.title}
                        </h3>

                        {product.rating > 0 && (
                          <div className="flex items-center mb-3">
                            <div className="flex text-yellow-400">
                              {[...Array(5)].map((_, i) => (
                                <span key={i}>
                                  {i < Math.round(product.rating) ? '★' : '☆'}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-baseline gap-2 mb-4">
                          <span className="text-2xl font-bold text-gray-900 dark:text-white">
                            {product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-sm text-gray-500">
                            {product.currency_code || 'EGP'}
                          </span>
                          {product.compare_at_price && (
                            <span className="text-sm text-gray-400 line-through ml-auto">
                              {product.compare_at_price.toLocaleString()}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-500 mb-4">
                          {product.available_for_sale && product.total_inventory > 0
                            ? `✓ In Stock (${product.total_inventory} available)`
                            : 'Out of Stock'}
                        </p>

                        <Button
                          className="w-full"
                          disabled={!product.available_for_sale || product.total_inventory === 0}
                        >
                          {product.available_for_sale ? 'Add to Cart' : 'Out of Stock'}
                        </Button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
