interface OrderStatusBadgeProps {
  status: string;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-900/30', text: 'text-yellow-400' },
  processing: { bg: 'bg-blue-900/30', text: 'text-blue-400' },
  shipped: { bg: 'bg-cyan-900/30', text: 'text-cyan-400' },
  delivered: { bg: 'bg-green-900/30', text: 'text-green-400' },
  cancelled: { bg: 'bg-red-900/30', text: 'text-red-400' },
};

const defaultColors = { bg: 'bg-yellow-900/30', text: 'text-yellow-400' };

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const colors = statusColors[status] || defaultColors;

  return (
    <span className={`inline-block px-3 py-1 rounded text-xs font-semibold ${colors.bg} ${colors.text}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
