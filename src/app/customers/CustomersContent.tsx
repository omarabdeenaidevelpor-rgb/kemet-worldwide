'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { useLanguage } from '@/components/shared/LanguageProvider';
import { formatDate } from '@/lib/utils';
import { CustomerForm } from './CustomerForm';

interface Customer {
  id: string;
  fileNumber: string;
  type: string;
  legalName: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  status: string;
  createdAt: string;
  accountManager: { name: string } | null;
  _count: { shipments: number; invoices: number };
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  SUSPENDED: 'destructive',
};

export function CustomersContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = useCallback((q = '') => {
    setLoading(true);
    fetch(`/api/customers?search=${encodeURIComponent(q)}&pageSize=50`)
      .then((r) => r.json())
      .then((d) => { setCustomers(d.data ?? []); setTotal(d.total ?? 0); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: 'fileNumber', header: t('customers.fileNumber'), sortable: true },
    { key: 'legalName', header: t('common.name'), sortable: true,
      render: (r: Customer) => <span className="font-medium">{r.legalName}</span> },
    { key: 'type', header: t('customers.customerType'),
      render: (r: Customer) => <Badge variant="outline">{r.type}</Badge> },
    { key: 'email', header: t('common.email'),
      render: (r: Customer) => r.email ?? '—' },
    { key: 'country', header: t('common.country'),
      render: (r: Customer) => r.country ?? '—' },
    { key: 'status', header: t('common.status'),
      render: (r: Customer) => <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge> },
    { key: 'shipments', header: 'Shipments',
      render: (r: Customer) => r._count.shipments },
    { key: 'createdAt', header: t('common.createdAt'),
      render: (r: Customer) => formatDate(r.createdAt) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('customers.title')}</h1>
          <p className="text-sm text-muted-foreground">{total} {t('common.total').toLowerCase()}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="me-2 h-4 w-4" />
            {t('common.export')}
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="me-2 h-4 w-4" />
            {t('customers.newCustomer')}
          </Button>
        </div>
      </div>

      <DataTable
        data={customers}
        columns={columns}
        searchable
        searchPlaceholder={`${t('common.search')} customers...`}
        onSearch={(q) => { setSearch(q); load(q); }}
        loading={loading}
        rowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/customers/${r.id}`)}
      />

      {showForm && (
        <CustomerForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(search); }}
        />
      )}
    </div>
  );
}
