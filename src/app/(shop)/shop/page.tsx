'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, Search, ShoppingBag } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  image: string;
  rating: number;
  inStock: boolean;
  handle: string;
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

  // Fetch products
  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('/api/products?limit=100&tier=b2c');
        const data = await response.json();
        setProducts(data.data || []);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  // Apply filters
  useEffect(() => {
    let result = products;

    // Category filter
    if (filters.category !== 'All') {
      result = result.filter(p => p.category === filters.category);
    }

    // Search filter
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.brand.toLowerCase().includes(query)
      );
    }

    // Price filter
    if (filters.minPrice !== null) {
      result = result.filter(p => p.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== null) {
      result = result.filter(p => p.price <= filters.maxPrice!);
    }

    // Sorting
    switch (filters.sort) {
      case 'price-low':
        result = [...result].sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result = [...result].sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        result = [...result].reverse();
        break;
      case 'popularity':
      default:
        result = [...result].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    setFilteredProducts(result);
  }, [products, filters]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-off-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold text-charcoal-900 font-serif">
            Shop Our Collection
          </h1>
          <p className="text-gray-600 mt-2">
            Discover {products.length} premium beauty products
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center justify-between w-full px-4 py-3 mb-4 bg-off-white border border-gray-200 rounded-lg"
            >
              <span className="font-semibold text-charcoal-900">Filters</span>
              <ChevronDown
                size={20}
                className={`transform transition ${showFilters ? 'rotate-180' : ''}`}
              />
            </button>

            {showFilters && (
              <div className="space-y-6">
                {/* Search */}
                <div>
                  <label className="block text-sm font-semibold text-charcoal-900 mb-2">
                    Search
                  </label>
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-3 top-3 text-gray-400"
                    />
                    <Input
                      type="text"
                      placeholder="Search products..."
                      value={filters.search}
                      onChange={(e) =>
                        setFilters({ ...filters, search: e.target.value })
                      }
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold text-charcoal-900 mb-3">
                    Category
                  </label>
                  <div className="space-y-2">
                    {CATEGORIES.map((cat) => (
                      <label
                        key={cat}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="category"
                          value={cat}
                          checked={filters.category === cat}
                          onChange={(e) =>
                            setFilters({ ...filters, category: e.target.value })
                          }
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-gray-700 capitalize">
                          {cat}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-semibold text-charcoal-900 mb-3">
                    Price Range
                  </label>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-600">Min: EGP {filters.minPrice || '0'}</label>
                      <input
                        type="range"
                        min="0"
                        max="500"
                        value={filters.minPrice || 0}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            minPrice: e.target.value ? parseInt(e.target.value) : null,
                          })
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Max: EGP {filters.maxPrice || '500'}</label>
                      <input
                        type="range"
                        min="0"
                        max="500"
                        value={filters.maxPrice || 500}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            maxPrice: e.target.value ? parseInt(e.target.value) : null,
                          })
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <label className="block text-sm font-semibold text-charcoal-900 mb-2">
                    Sort By
                  </label>
                  <select
                    value={filters.sort}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        sort: e.target.value as FiltersState['sort'],
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="popularity">Most Popular</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="newest">Newest</option>
                  </select>
                </div>

                {/* Clear Filters */}
                <Button
                  onClick={() =>
                    setFilters({
                      search: '',
                      category: 'All',
                      minPrice: null,
                      maxPrice: null,
                      sort: 'popularity',
                    })
                  }
                  variant="outline"
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-gray-600">Loading products...</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              <>
                <div className="mb-6 text-sm text-gray-600">
                  Showing {filteredProducts.length} of {products.length} products
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map((product) => (
                    <Link
                      key={product.id}
                      href={`/shop/${product.handle}`}
                      className="group"
                    >
                      <div className="bg-off-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                        {/* Image */}
                        <div className="relative h-64 bg-gray-200 overflow-hidden">
                          {product.image ? (
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-300">
                              <ShoppingBag size={32} className="text-gray-500" />
                            </div>
                          )}
                          {!product.inStock && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-white font-semibold">Out of Stock</span>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-4">
                          <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                            {product.brand}
                          </p>
                          <h3 className="text-sm font-semibold text-charcoal-900 mb-2 line-clamp-2 group-hover:text-rose-gold transition-colors">
                            {product.name}
                          </h3>

                          {/* Rating */}
                          {product.rating > 0 && (
                            <div className="flex items-center gap-2 mb-3">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <span
                                    key={i}
                                    className={`text-xs ${
                                      i < Math.round(product.rating)
                                        ? 'text-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                              <span className="text-xs text-gray-600">
                                ({product.rating.toFixed(1)})
                              </span>
                            </div>
                          )}

                          {/* Price */}
                          <div className="flex items-baseline gap-2 mb-4">
                            <span className="text-lg font-bold text-charcoal-900">
                              EGP {product.price.toFixed(0)}
                            </span>
                          </div>

                          {/* Add to Cart Button */}
                          <Button
                            disabled={!product.inStock}
                            className="w-full bg-rose-gold hover:bg-opacity-90"
                            size="sm"
                          >
                            {product.inStock ? 'Add to Cart' : 'Out of Stock'}
                          </Button>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <ShoppingBag size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-charcoal-900 mb-2">
                  No products found
                </h3>
                <p className="text-gray-600">
                  Try adjusting your filters to find what you're looking for
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
