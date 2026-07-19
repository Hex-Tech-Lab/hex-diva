'use client';

import { Card } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface RevenueChartProps {
  data: Array<{ date: string; revenue: number }>;
}

export function RevenueChart({ data }: RevenueChartProps) {
  const formattedData = data.map((item) => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return (
    <Card className="p-6 border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Revenue Trend (Last 30 Days)</h2>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.3)" />
            <XAxis dataKey="date" stroke="rgb(148, 163, 184)" style={{ fontSize: '12px' }} />
            <YAxis stroke="rgb(148, 163, 184)" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgb(15, 23, 42)',
                border: '1px solid rgb(71, 85, 105)',
                borderRadius: '0.5rem',
              }}
              labelStyle={{ color: 'rgb(203, 213, 225)' }}
              formatter={(value) => `$${typeof value === 'number' ? value.toFixed(2) : value}`}
            />
            <Legend wrapperStyle={{ color: 'rgb(203, 213, 225)' }} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="rgb(34, 211, 238)"
              strokeWidth={2}
              dot={{ fill: 'rgb(34, 211, 238)', r: 4 }}
              activeDot={{ r: 6 }}
              name="Revenue"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
