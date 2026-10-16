import { cn } from '@/lib/utils';

const SHIPMENT_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  QUOTATION: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  BOOKED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  PICKUP: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  IN_TRANSIT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CUSTOMS: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  OUT_FOR_DELIVERY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  DELIVERED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  ON_HOLD: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  DELAYED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  EXCEPTION: 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  RETURNED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const SEVERITY_COLORS: Record<string, string> = {
  LOW: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const INVOICE_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  ISSUED: 'bg-blue-100 text-blue-700',
  PARTIALLY_PAID: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

interface StatusBadgeProps {
  status: string;
  type?: 'shipment' | 'incident' | 'invoice';
  className?: string;
}

export function StatusBadge({ status, type = 'shipment', className }: StatusBadgeProps) {
  const map = type === 'incident' ? SEVERITY_COLORS : type === 'invoice' ? INVOICE_COLORS : SHIPMENT_COLORS;
  const color = map[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', color, className)}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
