'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
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

const SORT_OPTIONS = [
  { value: 'popularity', label: 'Popularity' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
];

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
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch products from Shopify-aligned API
  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('/api/products?limit=100&status=ACTIVE');
        const data = await response.json();

        // fetch() doesn't throw on 4xx/5xx -- a failed request still
        // parses as JSON (e.g. { error, details } from the API's own
        // error responses) and was previously silently treated as "zero
        // products," which is indistinguishable from a real empty catalog
        // or an over-narrow filter. Surface the real failure instead.
        if (!response.ok) {
          throw new Error(data?.error || `Request failed (${response.status})`);
        }

        if (data.data && Array.isArray(data.data)) {
          setProducts(data.data);
          setFetchError(null);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        setFetchError(error instanceof Error ? error.message : 'Failed to load products');
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--cream)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <ShoppingBag
            className="w-12 h-12 mx-auto mb-4 animate-pulse"
            style={{ color: 'var(--gold)' }}
          />
          <p style={{ color: 'var(--charcoal)' }}>Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: 'var(--spacing-8) var(--spacing-4)',
        }}
      >
        <div style={{ display: 'flex', gap: 'var(--spacing-8)' }}>
          {/* Filters Sidebar */}
          <div style={{ width: '256px', flexShrink: 0 }}>
            <Button
              label="Filters"
              variant="secondary"
              className="md:hidden"
              icon={<ChevronDown className={`w-4 h-4 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />}
              onClick={() => setShowFilters(!showFilters)}
              style={{ width: '100%', marginBottom: 'var(--spacing-4)' }}
            />

            {showFilters && (
              <Card variant="default" padding={4}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
                  <TextInput
                    label="Search"
                    placeholder="Search by title, vendor..."
                    value={filters.search}
                    onChange={value => handleFilterChange('search', value)}
                  />

                  <div>
                    <RadioList
                      label="Category"
                      value={filters.category}
                      onChange={value => handleFilterChange('category', value)}
                    >
                      {CATEGORIES.map(cat => (
                        <RadioListItem key={cat} value={cat} label={cat} />
                      ))}
                    </RadioList>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        marginBottom: 'var(--spacing-2)',
                        color: 'var(--charcoal)',
                      }}
                    >
                      Price Range (EGP)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                      <TextInput
                        label="Min price"
                        isLabelHidden
                        type="text"
                        placeholder="Min price"
                        value={filters.minPrice != null ? String(filters.minPrice) : ''}
                        onChange={value =>
                          handleFilterChange('minPrice', value ? parseFloat(value) : null)
                        }
                      />
                      <TextInput
                        label="Max price"
                        isLabelHidden
                        type="text"
                        placeholder="Max price"
                        value={filters.maxPrice != null ? String(filters.maxPrice) : ''}
                        onChange={value =>
                          handleFilterChange('maxPrice', value ? parseFloat(value) : null)
                        }
                      />
                    </div>
                  </div>

                  <Selector
                    label="Sort By"
                    options={SORT_OPTIONS.map(o => o.value)}
                    renderOption={option => SORT_OPTIONS.find(o => o.value === option.value)?.label ?? option.value}
                    value={filters.sort}
                    onChange={value => handleFilterChange('sort', value as FiltersState['sort'])}
                  />

                  <Button
                    label="Clear Filters"
                    variant="secondary"
                    onClick={handleClearFilters}
                    style={{ width: '100%' }}
                  />
                </div>
              </Card>
            )}
          </div>

          {/* Products Grid */}
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 'var(--spacing-6)' }}>
              <h1
                style={{
                  fontFamily: 'var(--font-family-heading)',
                  fontSize: '1.875rem',
                  fontWeight: 700,
                  marginBottom: 'var(--spacing-2)',
                  color: 'var(--charcoal)',
                }}
              >
                Our Collection
              </h1>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                {filteredProducts.length} products available
              </p>
            </div>

            {fetchError ? (
              <div style={{ textAlign: 'center', padding: 'var(--spacing-12) 0' }}>
                <ShoppingBag className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-error)' }} />
                <p style={{ color: 'var(--color-error)', fontWeight: 500 }}>Couldn't load products</p>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: 'var(--spacing-1)' }}>
                  {fetchError}
                </p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--spacing-12) 0' }}>
                <ShoppingBag className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-secondary)' }} />
                <p style={{ color: 'var(--color-text-secondary)' }}>No products found matching your filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map(product => (
                  <Link key={product.id} href={`/shop/${product.handle}`} className="group">
                    <Card variant="default" padding={0}>
                      <div
                        className="relative w-full h-48 overflow-hidden"
                        style={{ background: 'var(--color-background-muted)' }}
                      >
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

                      <div style={{ padding: 'var(--spacing-4)' }}>
                        {product.vendor && (
                          <p
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--color-text-secondary)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              marginBottom: 'var(--spacing-1)',
                            }}
                          >
                            {product.vendor}
                          </p>
                        )}

                        <h3
                          className="line-clamp-2"
                          style={{
                            fontFamily: 'var(--font-family-heading)',
                            fontWeight: 600,
                            fontSize: '1.125rem',
                            marginBottom: 'var(--spacing-2)',
                            color: 'var(--charcoal)',
                          }}
                        >
                          {product.title}
                        </h3>

                        {product.rating > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-3)' }}>
                            <div style={{ display: 'flex', color: 'var(--gold)' }}>
                              {[...Array(5)].map((_, i) => (
                                <span key={i}>{i < Math.round(product.rating) ? '★' : '☆'}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: 'var(--spacing-2)',
                            marginBottom: 'var(--spacing-4)',
                          }}
                        >
                          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--charcoal)' }}>
                            {product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                            {product.currency_code || 'EGP'}
                          </span>
                          {product.compare_at_price && (
                            <span
                              style={{
                                fontSize: '0.875rem',
                                color: 'var(--color-text-secondary)',
                                textDecoration: 'line-through',
                                marginLeft: 'auto',
                              }}
                            >
                              {product.compare_at_price.toLocaleString()}
                            </span>
                          )}
                        </div>

                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-4)' }}>
                          {product.available_for_sale && product.total_inventory > 0
                            ? `✓ In Stock (${product.total_inventory} available)`
                            : 'Out of Stock'}
                        </p>

                        <Button
                          label={product.available_for_sale ? 'Add to Cart' : 'Out of Stock'}
                          variant="primary"
                          isDisabled={!product.available_for_sale || product.total_inventory === 0}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </Card>
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
