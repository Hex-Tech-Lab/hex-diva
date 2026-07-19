'use client';

import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

interface ProductPerformanceChartProps {
  data: Array<{ id: string; name: string; revenue: number; quantity: number }>;
}

const COLORS = [
  'rgb(34, 211, 238)',
  'rgb(59, 130, 246)',
  'rgb(99, 102, 241)',
  'rgb(139, 92, 246)',
  'rgb(168, 85, 247)',
  'rgb(236, 72, 153)',
  'rgb(244, 63, 94)',
  'rgb(249, 115, 22)',
  'rgb(251, 146, 60)',
  'rgb(251, 191, 36)',
];

export function ProductPerformanceChart({ data }: ProductPerformanceChartProps) {
  const chartData = data.slice(0, 10).map((item) => ({
    name: item.name,
    value: item.revenue,
  }));

  return (
    <Card className="p-6 border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Top 10 Products by Revenue</h2>

        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }: { name?: string; value?: number }) => `${(name || '').slice(0, 15)}: $${(value || 0).toFixed(0)}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
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
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
