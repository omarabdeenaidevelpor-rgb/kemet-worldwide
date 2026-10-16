'use client';

import { useState, useEffect } from 'react';
import { Plus, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { useLanguage } from '@/components/shared/LanguageProvider';
import { formatDate } from '@/lib/utils';

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  userRoles: Array<{ role: { name: string } }>;
}

export function EmployeesContent() {
  const { t } = useLanguage();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/employees')
      .then(r => r.json())
      .then(d => setEmployees(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'name', header: t('common.name'), sortable: true,
      render: (r: Employee) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-navy text-white text-xs font-bold">
            {r.name?.[0]?.toUpperCase()}
          </div>
          <span className="font-medium">{r.name}</span>
        </div>
      ) },
    { key: 'email', header: t('common.email') },
    { key: 'role', header: t('employees.role'),
      render: (r: Employee) => r.userRoles?.[0]?.role?.name.replace(/_/g, ' ') ?? '—' },
    { key: 'isActive', header: t('common.status'),
      render: (r: Employee) => <Badge variant={r.isActive ? 'success' : 'secondary'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
    { key: 'lastLoginAt', header: t('employees.lastLogin'),
      render: (r: Employee) => formatDate(r.lastLoginAt) },
    { key: 'createdAt', header: t('common.createdAt'),
      render: (r: Employee) => formatDate(r.createdAt) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('employees.title')}</h1>
          <p className="text-sm text-muted-foreground">{employees.length} total</p>
        </div>
        <Button size="sm">
          <Plus className="me-2 h-4 w-4" /> {t('employees.newEmployee')}
        </Button>
      </div>
      <DataTable data={employees} columns={columns} searchable loading={loading} rowKey={r => r.id} />
    </div>
  );
}
