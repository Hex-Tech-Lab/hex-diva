import { Card } from '@/components/ui/card';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  trendUp?: boolean;
}

export function KPICard({ title, value, subtitle, trend, trendUp }: KPICardProps) {
  return (
    <Card className="p-6 border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          {trend && (
            <span className={`text-xs font-semibold ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
              {trend}
            </span>
          )}
        </div>

        <div>
          <p className="text-3xl font-bold text-white mb-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
    </Card>
  );
}
