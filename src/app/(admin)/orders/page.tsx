'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from '@/components/admin/orders/OrderStatusBadge';

interface Order {
  id: string;
  user_id: string;
  email: string;
  status: string;
  total: number;
  created_at: string;
  item_count: number;
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
        <Button onClick={fetchOrders} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {/* Error message */}
      {state.error && (
        <Card className="p-4 border-red-900/30 bg-red-950/20">
          <p className="text-red-300">{state.error}</p>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4 border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
        <div className="flex items-center gap-4">
          <label className="text-sm text-slate-400">Status:</label>
          <select
            value={state.statusFilter}
            onChange={(e) =>
              setState((prev) => ({ ...prev, statusFilter: e.target.value, currentPage: 1 }))
            }
            className="bg-slate-700/50 border border-slate-600 text-white rounded px-3 py-2 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-900/30">
                  <th className="text-left py-4 px-6 text-slate-400 font-medium">Order ID</th>
                  <th className="text-left py-4 px-6 text-slate-400 font-medium">Customer</th>
                  <th className="text-left py-4 px-6 text-slate-400 font-medium">Items</th>
                  <th className="text-right py-4 px-6 text-slate-400 font-medium">Total</th>
                  <th className="text-left py-4 px-6 text-slate-400 font-medium">Status</th>
                  <th className="text-left py-4 px-6 text-slate-400 font-medium">Date</th>
                  <th className="text-center py-4 px-6 text-slate-400 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {state.orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"
                  >
                    <td className="py-4 px-6 text-slate-300 font-mono text-xs">
                      {order.id.slice(0, 8)}...
                    </td>
                    <td className="py-4 px-6 text-slate-300">{order.email}</td>
                    <td className="py-4 px-6 text-slate-400">{order.item_count}</td>
                    <td className="py-4 px-6 text-right text-white font-semibold">
                      ${order.total.toFixed(2)}
                    </td>
                    <td className="py-4 px-6">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="py-4 px-6 text-slate-400">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Link href={`/admin/orders/${order.id}`}>
                        <Button variant="outline" size="sm">
                          View
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
              orders
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
