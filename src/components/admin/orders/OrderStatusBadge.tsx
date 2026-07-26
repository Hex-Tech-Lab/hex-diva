import { Badge } from '@astryxdesign/core/Badge';

interface OrderStatusBadgeProps {
  status: string;
}

const statusVariants: Record<string, 'warning' | 'info' | 'success' | 'error' | 'neutral'> = {
  pending: 'warning',
  processing: 'info',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'error',
};

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const variant = statusVariants[status] || 'neutral';
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return <Badge variant={variant} label={label} />;
}
