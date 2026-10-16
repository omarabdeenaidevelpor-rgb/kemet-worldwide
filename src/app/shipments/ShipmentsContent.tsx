'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Truck, Ship, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { useLanguage } from '@/components/shared/LanguageProvider';
import { formatDate } from '@/lib/utils';

interface Shipment {
  id: string;
  referenceNumber: string;
  mode: string;
  status: string;
  origin: string;
  destination: string;
  departureDate: string | null;
  estimatedArrivalDate: string | null;
  customer: { legalName: string };
  assignedEmployee: { name: string } | null;
}

const MODE_ICON: Record<string, React.ReactNode> = {
  LAND: <Truck className="h-3.5 w-3.5" />,
  SEA: <Ship className="h-3.5 w-3.5" />,
  AIR: <Plane className="h-3.5 w-3.5" />,
};

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: 'bg-green-100 text-green-700',
  IN_TRANSIT: 'bg-blue-100 text-blue-700',
  DELAYED: 'bg-red-100 text-red-700',
  ON_HOLD: 'bg-orange-100 text-orange-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  DRAFT: 'bg-slate-100 text-slate-600',
  BOOKED: 'bg-indigo-100 text-indigo-700',
  CUSTOMS: 'bg-purple-100 text-purple-700',
  OUT_FOR_DELIVERY: 'bg-emerald-100 text-emerald-700',
};

export function ShipmentsContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modeFilter, setModeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback((search = '', mode = '', status = '') => {
    setLoading(true);
    const params = new URLSearchParams({ pageSize: '50' });
    if (search) params.set('search', search);
    if (mode) params.set('mode', mode);
    if (status) params.set('status', status);
    fetch(`/api/shipments?${params}`)
      .then((r) => r.json())
      .then((d) => { setShipments(d.data ?? []); setTotal(d.total ?? 0); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load('', modeFilter, statusFilter); }, [load, modeFilter, statusFilter]);

  const columns = [
    { key: 'referenceNumber', header: t('shipments.reference'), sortable: true,
      render: (r: Shipment) => <span className="font-mono font-medium text-xs">{r.referenceNumber}</span> },
    { key: 'customer', header: t('shipments.customer'),
      render: (r: Shipment) => r.customer?.legalName ?? '—' },
    { key: 'mode', header: t('shipments.mode'),
      render: (r: Shipment) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
          {MODE_ICON[r.mode]} {r.mode}
        </span>
      ) },
    { key: 'origin', header: t('shipments.origin'), sortable: true },
    { key: 'destination', header: t('shipments.destination'), sortable: true },
    { key: 'status', header: t('shipments.status'),
      render: (r: Shipment) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {r.status.replace(/_/g, ' ')}
        </span>
      ) },
    { key: 'departureDate', header: t('shipments.departure'),
      render: (r: Shipment) => formatDate(r.departureDate) },
    { key: 'estimatedArrivalDate', header: t('shipments.arrival'),
      render: (r: Shipment) => formatDate(r.estimatedArrivalDate) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('shipments.title')}</h1>
          <p className="text-sm text-muted-foreground">{total} {t('common.total').toLowerCase()}</p>
        </div>
        <Button size="sm" onClick={() => router.push('/shipments/new')}>
          <Plus className="me-2 h-4 w-4" />
          {t('shipments.newShipment')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex gap-1">
          {['', 'LAND', 'SEA', 'AIR'].map((m) => (
            <button key={m} onClick={() => setModeFilter(m)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${modeFilter === m ? 'bg-brand-navy text-white' : 'bg-muted hover:bg-muted/80'}`}>
              {m || 'All Modes'}
            </button>
          ))}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-xs"
        >
          <option value="">All Statuses</option>
          {['DRAFT','QUOTATION','BOOKED','PICKUP','IN_TRANSIT','CUSTOMS','OUT_FOR_DELIVERY','DELIVERED','DELAYED','ON_HOLD','EXCEPTION','CANCELLED'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <DataTable
        data={shipments}
        columns={columns}
        searchable
        onSearch={(q) => load(q, modeFilter, statusFilter)}
        loading={loading}
        rowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/shipments/${r.id}`)}
      />
    </div>
  );
}
