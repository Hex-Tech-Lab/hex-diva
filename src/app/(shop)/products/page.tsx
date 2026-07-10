'use client';

import { useState, useMemo } from 'react';
import { mockProducts } from '@/lib/mock-data';
import { ProductGrid } from '@/components/features/ProductGrid';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ChevronDown, Search } from 'lucide-react';

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState([0, 200]);
  const [sortBy, setSortBy] = useState('featured');
  const [showFilters, setShowFilters] = useState(false);
  const [cartNotification, setCartNotification] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    let products = [...mockProducts];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
      );
    }
    if (selectedCategory) {
      products = products.filter(p => p.category === selectedCategory);
    }
    products = products.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
    
    switch (sortBy) {
      case 'price-low': products.sort((a, b) => a.price - b.price); break;
      case 'price-high': products.sort((a, b) => b.price - a.price); break;
      case 'rating': products.sort((a, b) => b.rating - a.rating); break;
    }
    return products;
  }, [searchQuery, selectedCategory, priceRange, sortBy]);

  const handleAddToCart = (product: typeof mockProducts[0]) => {
    setCartNotification(`${product.name} added to cart!`);
    setTimeout(() => setCartNotification(null), 2000);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setPriceRange([0, 200]);
    setSortBy('featured');
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-off-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold text-charcoal-900 font-serif mb-2">Shop Products</h1>
          <p className="text-gray-600">Discover our curated collection of luxury beauty products</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-base"
            />
          </div>
        </div>

        <div className="flex gap-8">
          <aside className={`${showFilters ? 'block' : 'hidden'} w-full sm:block sm:w-64`}>
            <div className="sticky top-20 space-y-6">
              <div>
                <h3 className="font-bold text-charcoal-900 mb-4">Category</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="category" checked={selectedCategory === null} onChange={() => setSelectedCategory(null)} />
                    <span className="text-gray-700">All</span>
                  </label>
                  {Array.from(new Set(mockProducts.map(p => p.category))).map(cat => (
                    <label key={cat} className="flex items-center gap-2">
                      <input type="radio" name="category" checked={selectedCategory === cat} onChange={() => setSelectedCategory(cat)} />
                      <span className="text-gray-700">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-charcoal-900 mb-4">Price Range</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600">Min: ${priceRange[0]}</label>
                    <input type="range" min="0" max="200" value={priceRange[0]} onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])} className="w-full" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Max: ${priceRange[1]}</label>
                    <input type="range" min="0" max="200" value={priceRange[1]} onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])} className="w-full" />
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              <p className="text-gray-600">Showing {filteredProducts.length} products</p>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-md">
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>

            {filteredProducts.length > 0 ? (
              <ProductGrid products={filteredProducts} columns={3} onAddToCart={handleAddToCart} />
            ) : (
              <div className="text-center py-16">
                <h3 className="text-2xl font-bold text-charcoal-900">No products found</h3>
                <Button variant="accent" onClick={handleClearFilters} className="mt-4">Clear Filters</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {cartNotification && (
        <div className="fixed bottom-4 right-4 bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg">
          {cartNotification}
        </div>
      )}
    </div>
  );
}
