'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Product {
  id: string;
  name: string;
  price: number;
  inventory: number;
  category: string;
  brand: string;
  in_stock: boolean;
  created_at: string;
}

interface ProductsState {
  products: Product[];
  loading: boolean;
  error: string;
  currentPage: number;
  pageSize: number;
  totalCount: number;
}

export default function ProductsPage() {
  const [state, setState] = useState<ProductsState>({
    products: [],
    loading: true,
    error: '',
    currentPage: 1,
    pageSize: 20,
    totalCount: 0,
  });

  useEffect(() => {
    fetchProducts();
  }, [state.currentPage]);

  async function fetchProducts() {
    try {
      setState((prev) => ({ ...prev, loading: true, error: '' }));

      const offsetParam = `offset=${(state.currentPage - 1) * state.pageSize}`;
      const response = await fetch(
        `/api/admin/products?${offsetParam}&limit=${state.pageSize}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setState((prev) => ({
          ...prev,
          products: result.data.products,
          totalCount: result.data.totalCount,
          loading: false,
        }));
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load products';
      setState((prev) => ({ ...prev, error: message, loading: false }));
      console.error('Products error:', err);
    }
  }

  const totalPages = Math.ceil(state.totalCount / state.pageSize);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Products</h1>
          <p className="text-slate-400">Manage product inventory and pricing ({state.totalCount} total)</p>
        </div>
        <Button onClick={fetchProducts} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {/* Error message */}
      {state.error && (
        <Card className="p-4 border-red-900/30 bg-red-950/20">
          <p className="text-red-300">{state.error}</p>
        </Card>
      )}

      {/* Products table */}
      {state.loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
            <p className="text-slate-300">Loading products...</p>
          </div>
        </div>
      ) : state.products.length === 0 ? (
        <Card className="p-8 text-center border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
          <p className="text-slate-400">No products found</p>
        </Card>
      ) : (
        <Card className="border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-900/30">
                  <th className="text-left py-4 px-6 text-slate-400 font-medium">Name</th>
                  <th className="text-left py-4 px-6 text-slate-400 font-medium">Category</th>
                  <th className="text-left py-4 px-6 text-slate-400 font-medium">Brand</th>
                  <th className="text-right py-4 px-6 text-slate-400 font-medium">Price</th>
                  <th className="text-right py-4 px-6 text-slate-400 font-medium">Inventory</th>
                  <th className="text-center py-4 px-6 text-slate-400 font-medium">Status</th>
                  <th className="text-center py-4 px-6 text-slate-400 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {state.products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"
                  >
                    <td className="py-4 px-6 text-slate-300 max-w-xs truncate">{product.name}</td>
                    <td className="py-4 px-6 text-slate-400">{product.category || '-'}</td>
                    <td className="py-4 px-6 text-slate-400">{product.brand || '-'}</td>
                    <td className="py-4 px-6 text-right text-white font-semibold">
                      ${product.price.toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-right text-slate-300">
                      {product.inventory}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded text-xs font-semibold ${
                          product.in_stock
                            ? 'bg-green-900/30 text-green-400'
                            : 'bg-red-900/30 text-red-400'
                        }`}
                      >
                        {product.in_stock ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Link href={`/admin/products/${product.id}`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-6 border-t border-slate-700/50">
            <p className="text-sm text-slate-400">
              Showing {(state.currentPage - 1) * state.pageSize + 1} to{' '}
              {Math.min(state.currentPage * state.pageSize, state.totalCount)} of {state.totalCount}{' '}
              products
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setState((prev) => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }))
                }
                disabled={state.currentPage === 1}
              >
                Previous
              </Button>
              <span className="flex items-center gap-2 text-slate-400 text-sm">
                Page {state.currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setState((prev) => ({ ...prev, currentPage: Math.min(totalPages, prev.currentPage + 1) }))
                }
                disabled={state.currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
