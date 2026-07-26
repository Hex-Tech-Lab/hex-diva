'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Selector } from '@astryxdesign/core/Selector';
import { Table, proportional } from '@astryxdesign/core/Table';
import { OrderStatusBadge } from '@/components/admin/orders/OrderStatusBadge';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

interface Order {
  id: string;
  user_id: string;
  email: string;
  status: string;
  total: number;
  created_at: string;
  item_count: number;
  [key: string]: unknown;
}

interface OrdersPageState {
  orders: Order[];
  loading: boolean;
  error: string;
  currentPage: number;
  pageSize: number;
  totalCount: number;
  statusFilter: string;
}

export default function OrdersPage() {
  const [state, setState] = useState<OrdersPageState>({
    orders: [],
    loading: true,
    error: '',
    currentPage: 1,
    pageSize: 10,
    totalCount: 0,
    statusFilter: 'all',
  });

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentPage, state.statusFilter]);

  async function fetchOrders() {
    try {
      setState((prev) => ({ ...prev, loading: true, error: '' }));

      const statusParam = state.statusFilter !== 'all' ? `&status=${state.statusFilter}` : '';
      const offsetParam = `offset=${(state.currentPage - 1) * state.pageSize}`;

      const response = await fetch(
        `/api/admin/orders?${offsetParam}&limit=${state.pageSize}${statusParam}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setState((prev) => ({
          ...prev,
          orders: result.data.orders,
          totalCount: result.data.totalCount,
          loading: false,
        }));
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load orders';
      setState((prev) => ({ ...prev, error: message, loading: false }));
      console.error('Orders error:', err);
    }
  }

  const totalPages = Math.ceil(state.totalCount / state.pageSize);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Orders</h1>
          <p className="text-slate-400">Manage and track all customer orders</p>
        </div>
        <Button onClick={fetchOrders} variant="secondary" size="sm" label="Refresh" />
      </div>

      {/* Error message */}
      {state.error && (
        <Card className="p-4 border-red-900/30 bg-red-950/20">
          <p className="text-red-300">{state.error}</p>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4 border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
        <Selector
          label="Status"
          options={STATUS_OPTIONS.map((o) => o.value)}
          renderOption={(option) =>
            STATUS_OPTIONS.find((o) => o.value === option.value)?.label ?? option.value
          }
          value={state.statusFilter}
          onChange={(value) =>
            setState((prev) => ({ ...prev, statusFilter: value, currentPage: 1 }))
          }
        />
      </Card>

      {/* Orders table */}
      {state.loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
            <p className="text-slate-300">Loading orders...</p>
          </div>
        </div>
      ) : state.orders.length === 0 ? (
        <Card className="p-8 text-center border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
          <p className="text-slate-400">No orders found</p>
        </Card>
      ) : (
        <Card className="border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table
              data={state.orders}
              idKey="id"
              columns={[
                {
                  key: 'id',
                  header: 'Order ID',
                  width: proportional(1),
                  renderCell: (order) => (
                    <span className="font-mono text-xs">{order.id.slice(0, 8)}...</span>
                  ),
                },
                { key: 'email', header: 'Customer', width: proportional(1) },
                { key: 'item_count', header: 'Items', width: proportional(1) },
                {
                  key: 'total',
                  header: 'Total',
                  width: proportional(1),
                  renderCell: (order) => (
                    <span className="font-semibold">${order.total.toFixed(2)}</span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  width: proportional(1),
                  renderCell: (order) => <OrderStatusBadge status={order.status} />,
                },
                {
                  key: 'created_at',
                  header: 'Date',
                  width: proportional(1),
                  renderCell: (order) => new Date(order.created_at).toLocaleDateString(),
                },
                {
                  key: 'action',
                  header: 'Action',
                  width: proportional(1),
                  renderCell: (order) => (
                    <Link href={`/admin/orders/${order.id}`}>
                      <Button variant="secondary" size="sm" label="View" />
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
              orders
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
