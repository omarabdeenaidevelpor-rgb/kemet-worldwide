'use client';

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/components/shared/LanguageProvider';
import { formatCurrency } from '@/lib/utils';

const COLORS = {
  navy: '#0A4474',
  gold: '#4DA3E8',
  blue: '#3B82F6',
  green: '#22C55E',
  orange: '#F97316',
  red: '#EF4444',
  purple: '#8B5CF6',
};

const MODE_COLORS: Record<string, string> = {
  LAND: COLORS.green,
  SEA: COLORS.blue,
  AIR: COLORS.purple,
};

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: COLORS.green,
  IN_TRANSIT: COLORS.blue,
  DELAYED: COLORS.red,
  ON_HOLD: COLORS.orange,
  CANCELLED: '#94A3B8',
  DRAFT: '#CBD5E1',
  BOOKED: '#818CF8',
  CUSTOMS: COLORS.purple,
  OUT_FOR_DELIVERY: '#10B981',
};

interface ChartData {
  monthlyShipments: Array<{ month: string; count: number }>;
  monthlyRevenue: Array<{ month: string; invoiced: number; collected: number }>;
  shipmentsByMode: Array<{ mode: string; count: number }>;
  shipmentsByStatus: Array<{ status: string; count: number }>;
  topCustomers: Array<{ name: string; amount: number }>;
}

export function ShipmentVolumeChart({ data }: { data: ChartData['monthlyShipments'] }) {
  const { t } = useLanguage();
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('dashboard.shipmentVolume')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div dir="ltr"><ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
            <Bar dataKey="count" fill={COLORS.navy} radius={[4, 4, 0, 0]} name="Shipments" />
          </BarChart>
        </ResponsiveContainer></div>
      </CardContent>
    </Card>
  );
}

export function RevenueChart({ data, currency }: { data: ChartData['monthlyRevenue']; currency: string }) {
  const { t, lang } = useLanguage();
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('dashboard.revenueOverTime')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div dir="ltr"><ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
              formatter={(v: number) => [formatCurrency(v, currency, locale), '']} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
            <Line type="monotone" dataKey="invoiced" stroke={COLORS.navy} strokeWidth={2} dot={false} name="Invoiced" />
            <Line type="monotone" dataKey="collected" stroke={COLORS.gold} strokeWidth={2} dot={false} name="Collected" />
          </LineChart>
        </ResponsiveContainer></div>
      </CardContent>
    </Card>
  );
}

export function ShipmentsByModeChart({ data }: { data: ChartData['shipmentsByMode'] }) {
  const { t } = useLanguage();
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('dashboard.byMode')}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <div dir="ltr"><ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="mode"
              cx="50%"
              cy="50%"
              outerRadius={70}
              label={({ mode, percent }) => `${mode} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry) => (
                <Cell key={entry.mode} fill={MODE_COLORS[entry.mode] ?? COLORS.blue} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
          </PieChart>
        </ResponsiveContainer></div>
      </CardContent>
    </Card>
  );
}

export function ShipmentStatusChart({ data }: { data: ChartData['shipmentsByStatus'] }) {
  const { t } = useLanguage();
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('dashboard.byStatus')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div dir="ltr"><ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 0 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="status" tick={{ fontSize: 10 }} width={90} />
            <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Count">
              {data.map((entry) => (
                <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? COLORS.navy} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer></div>
      </CardContent>
    </Card>
  );
}

export function TopCustomersChart({ data, currency }: { data: ChartData['topCustomers']; currency: string }) {
  const { t, lang } = useLanguage();
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
  const compactCurrency = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 0,
  });
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('dashboard.topCustomers')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div dir="ltr"><ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(value: number) => compactCurrency.format(value)} />
            <Tooltip
              contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
              formatter={(value: number) => [formatCurrency(value, currency, locale), 'Revenue']}
            />
            <Bar dataKey="amount" fill={COLORS.gold} radius={[4, 4, 0, 0]} name="Revenue" />
          </BarChart>
        </ResponsiveContainer></div>
      </CardContent>
    </Card>
  );
}
