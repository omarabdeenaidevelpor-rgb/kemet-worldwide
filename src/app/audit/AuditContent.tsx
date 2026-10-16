'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/shared/LanguageProvider';
import { DataTable } from '@/components/shared/DataTable';
import { formatDateTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface AuditLog {
  id: string;
  action: string;
  module: string;
  recordId: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { name: string; email: string } | null;
}

const MODULE_COLORS: Record<string, string> = {
  CUSTOMERS: 'info', SHIPMENTS: 'gold', FINANCE: 'success',
  EMPLOYEES: 'warning', SETTINGS: 'secondary',
} as any;

export function AuditContent() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/audit?pageSize=50')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else { setLogs(d.data ?? []); setTotal(d.total ?? 0); }
      })
      .finally(() => setLoading(false));
  }, []);

  if (error === 'FORBIDDEN') {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">You don&apos;t have permission to view the audit log.</p>
      </div>
    );
  }

  const columns = [
    { key: 'createdAt', header: t('common.date'),
      render: (r: AuditLog) => <span className="text-xs">{formatDateTime(r.createdAt)}</span> },
    { key: 'user', header: 'User',
      render: (r: AuditLog) => r.user ? <span className="font-medium text-sm">{r.user.name}</span> : <span className="text-muted-foreground text-xs">System</span> },
    { key: 'action', header: 'Action',
      render: (r: AuditLog) => <Badge variant="outline" className="font-mono text-xs">{r.action}</Badge> },
    { key: 'module', header: 'Module',
      render: (r: AuditLog) => <Badge variant={MODULE_COLORS[r.module] as any ?? 'secondary'}>{r.module}</Badge> },
    { key: 'recordId', header: 'Record',
      render: (r: AuditLog) => r.recordId ? <span className="font-mono text-xs text-muted-foreground">{r.recordId.slice(0, 8)}…</span> : '—' },
    { key: 'ipAddress', header: 'IP',
      render: (r: AuditLog) => <span className="text-xs text-muted-foreground">{r.ipAddress ?? '—'}</span> },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t('nav.audit')}</h1>
        <p className="text-sm text-muted-foreground">{total} total entries — immutable record</p>
      </div>
      <DataTable data={logs} columns={columns} searchable loading={loading} rowKey={r => r.id} />
    </div>
  );
}
