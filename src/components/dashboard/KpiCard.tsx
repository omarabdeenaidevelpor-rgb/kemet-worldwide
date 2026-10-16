import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  variant?: 'default' | 'gold' | 'success' | 'danger' | 'warning';
}

const variantStyles = {
  default: { icon: 'bg-brand-navy/10 text-brand-navy dark:bg-brand-navy/30 dark:text-white/80', border: '' },
  gold: { icon: 'bg-brand-accent/15 text-brand-accent', border: 'border-brand-accent/20' },
  success: { icon: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400', border: '' },
  danger: { icon: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400', border: '' },
  warning: { icon: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400', border: '' },
};

export function KpiCard({ title, value, subtitle, icon: Icon, trend, variant = 'default' }: KpiCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card className={cn('transition-shadow hover:shadow-card-md', styles.border)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-sm text-muted-foreground font-medium truncate">{title}</p>
            <p dir="ltr" className="mt-1.5 whitespace-nowrap text-start text-base font-bold tabular-nums text-foreground 2xl:text-xl" title={String(value)}>{value}</p>
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <p className={cn(
                'mt-1.5 text-xs font-medium',
                trend.value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              )}>
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
              </p>
            )}
          </div>
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ms-2', styles.icon)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
