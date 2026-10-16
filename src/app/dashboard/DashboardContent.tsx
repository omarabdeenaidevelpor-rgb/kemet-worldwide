'use client';

import { useEffect, useState } from 'react';
import {
  Users, Package, Truck, CheckCircle2, AlertTriangle,
  DollarSign, TrendingUp, Clock, Loader2
} from 'lucide-react';
import { KpiCard } from '@/components/dashboard/KpiCard';
import {
  ShipmentVolumeChart, RevenueChart, ShipmentsByModeChart,
  ShipmentStatusChart, TopCustomersChart
} from '@/components/dashboard/Charts';
import { useLanguage } from '@/components/shared/LanguageProvider';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface DashboardData {
  kpis: {
    totalCustomers: number;
    totalShipments: number;
    inTransit: number;
    delivered: number;
    delayed: number;
    openIncidents: number;
    totalInvoiced: number;
    totalCollected: number;
    outstanding: number;
    canViewFinance: boolean;
    currency: string;
    missingRateCurrencies: string[];
  };
  charts: {
    shipmentsByStatus: Array<{ status: string; count: number }>;
    shipmentsByMode: Array<{ mode: string; count: number }>;
    monthlyShipments: Array<{ month: string; count: number }>;
    monthlyRevenue: Array<{ month: string; invoiced: number; collected: number }>;
    topCustomers: Array<{ name: string; amount: number }>;
  };
}

export function DashboardContent() {
  const { t, lang } = useLanguage();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/dashboard', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setData(json?.kpis ? json : null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const kpis: Partial<DashboardData['kpis']> = data?.kpis ?? {};
  const charts: Partial<DashboardData['charts']> = data?.charts ?? {};
  const locale = lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">KemetWorldwide Operations Overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <KpiCard title={t('dashboard.totalCustomers')} value={kpis.totalCustomers ?? 0} icon={Users} variant="default" />
        <KpiCard title={t('dashboard.totalShipments')} value={kpis.totalShipments ?? 0} icon={Package} variant="default" />
        <KpiCard title={t('dashboard.inTransit')} value={kpis.inTransit ?? 0} icon={Truck} variant="gold" />
        <KpiCard title={t('dashboard.delivered')} value={kpis.delivered ?? 0} icon={CheckCircle2} variant="success" />
        <KpiCard title={t('dashboard.delayed')} value={kpis.delayed ?? 0} icon={Clock} variant="danger" />
        <KpiCard title={t('dashboard.incidents')} value={kpis.openIncidents ?? 0} icon={AlertTriangle} variant="warning" />
        {kpis.canViewFinance && <>
          <KpiCard title={`${t('dashboard.totalInvoiced')} (${kpis.currency ?? 'USD'})`} value={formatCurrency(kpis.totalInvoiced ?? 0, kpis.currency ?? 'USD', locale)} icon={DollarSign} variant="default" />
          <KpiCard title={`${t('dashboard.totalCollected')} (${kpis.currency ?? 'USD'})`} value={formatCurrency(kpis.totalCollected ?? 0, kpis.currency ?? 'USD', locale)} icon={TrendingUp} variant="success" />
          <KpiCard title={`${t('dashboard.outstanding')} (${kpis.currency ?? 'USD'})`} value={formatCurrency(kpis.outstanding ?? 0, kpis.currency ?? 'USD', locale)} icon={DollarSign} variant={(kpis.outstanding ?? 0) > 0 ? 'warning' : 'default'} />
        </>}
      </div>

      {kpis.canViewFinance && (kpis.missingRateCurrencies?.length ?? 0) > 0 && (
        <Card className="border-orange-300">
          <CardContent className="p-4 text-sm text-orange-700 dark:text-orange-400">
            {lang === 'ar'
              ? `تعذر تحويل المبالغ التالية إلى ${kpis.currency}: ${(kpis.missingRateCurrencies ?? []).join(', ')}. حدّث أسعار الصرف في الإعدادات.`
              : `Amounts in ${(kpis.missingRateCurrencies ?? []).join(', ')} could not be converted to ${kpis.currency}. Update exchange rates in Settings.`}
          </CardContent>
        </Card>
      )}

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ShipmentVolumeChart data={charts.monthlyShipments ?? []} />
        {kpis.canViewFinance && <RevenueChart data={charts.monthlyRevenue ?? []} currency={kpis.currency ?? 'USD'} />}
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4 md:grid-cols-3">
        <ShipmentsByModeChart data={charts.shipmentsByMode ?? []} />
        <ShipmentStatusChart data={charts.shipmentsByStatus ?? []} />
        {kpis.canViewFinance && <TopCustomersChart data={charts.topCustomers ?? []} currency={kpis.currency ?? 'USD'} />}
      </div>
    </div>
  );
}
