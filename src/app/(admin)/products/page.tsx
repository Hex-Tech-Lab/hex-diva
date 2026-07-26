'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Table, proportional } from '@astryxdesign/core/Table';

interface Product {
  id: string;
  name: string;
  price: number;
  inventory: number;
  category: string;
  brand: string;
  in_stock: boolean;
  created_at: string;
  [key: string]: unknown;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <Button onClick={fetchProducts} variant="secondary" size="sm" label="Refresh" />
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
            <Table
              data={state.products}
              idKey="id"
              columns={[
                {
                  key: 'name',
                  header: 'Name',
                  width: proportional(2),
                  renderCell: (product) => <span className="max-w-xs truncate">{product.name}</span>,
                },
                {
                  key: 'category',
                  header: 'Category',
                  width: proportional(1),
                  renderCell: (product) => product.category || '-',
                },
                {
                  key: 'brand',
                  header: 'Brand',
                  width: proportional(1),
                  renderCell: (product) => product.brand || '-',
                },
                {
                  key: 'price',
                  header: 'Price',
                  width: proportional(1),
                  renderCell: (product) => (
                    <span className="font-semibold">${product.price.toFixed(2)}</span>
                  ),
                },
                { key: 'inventory', header: 'Inventory', width: proportional(1) },
                {
                  key: 'in_stock',
                  header: 'Status',
                  width: proportional(1),
                  renderCell: (product) =>
                    product.in_stock ? (
                      <Badge variant="success" label="In Stock" />
                    ) : (
                      <Badge variant="error" label="Out of Stock" />
                    ),
                },
                {
                  key: 'action',
                  header: 'Action',
                  width: proportional(1),
                  renderCell: (product) => (
                    <Link href={`/admin/products/${product.id}`}>
                      <Button variant="secondary" size="sm" label="Edit" />
                    </Link>
                  ),
                },
              ]}
              hasHover
              dividers="rows"
            />
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
                variant="secondary"
                size="sm"
                label="Previous"
                onClick={() =>
                  setState((prev) => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }))
                }
                isDisabled={state.currentPage === 1}
              />
              <span className="flex items-center gap-2 text-slate-400 text-sm">
                Page {state.currentPage} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                label="Next"
                onClick={() =>
                  setState((prev) => ({ ...prev, currentPage: Math.min(totalPages, prev.currentPage + 1) }))
                }
                isDisabled={state.currentPage === totalPages}
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
