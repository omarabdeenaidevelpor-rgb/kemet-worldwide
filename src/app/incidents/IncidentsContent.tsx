'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2, Plus, RotateCcw, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/components/shared/LanguageProvider';
import { formatDate } from '@/lib/utils';
import { hasPermission } from '@/lib/permissions';
import { toast } from '@/components/ui/use-toast';

interface Incident {
  id: string;
  referenceNumber: string;
  title: string;
  type: string;
  severity: string;
  status: string;
  shipment: { referenceNumber: string } | null;
  customer: { legalName: string } | null;
  assignedTo: { name: string } | null;
  reportedAt: string;
}

interface ShipmentOption {
  id: string;
  referenceNumber: string;
  customer: { id: string; legalName: string };
}

const SEV_COLORS: Record<string, 'success' | 'warning' | 'destructive'> = {
  LOW: 'success', MEDIUM: 'warning', HIGH: 'destructive', CRITICAL: 'destructive',
};

export function IncidentsContent() {
  const { t, lang } = useLanguage();
  const { data: session } = useSession();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [shipments, setShipments] = useState<ShipmentOption[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: '', severity: 'MEDIUM', title: '', description: '', shipmentId: '' });
  const canCreate = hasPermission(session?.user.permissions, session?.user.roles, 'INCIDENTS', 'CREATE');
  const canEdit = hasPermission(session?.user.permissions, session?.user.roles, 'INCIDENTS', 'EDIT');

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/incidents?pageSize=100');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not load incidents');
      setIncidents(result.data ?? []);
      setTotal(result.total ?? 0);
    } catch (error) {
      toast({ title: lang === 'ar' ? 'تعذر تحميل الحوادث' : 'Could not load incidents', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    fetch('/api/shipments?pageSize=100')
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error ?? 'Could not load shipments'); return result.data ?? []; })
      .then(setShipments)
      .catch((error) => toast({ title: lang === 'ar' ? 'تعذر تحميل الشحنات' : 'Could not load shipments', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' }));
  }, [lang]);

  async function createIncident(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, shipmentId: form.shipmentId || undefined }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not create incident');
      toast({ title: lang === 'ar' ? 'تم تسجيل الحادث' : 'Incident recorded' });
      setOpen(false);
      setForm({ type: '', severity: 'MEDIUM', title: '', description: '', shipmentId: '' });
      await load();
    } catch (error) {
      toast({ title: lang === 'ar' ? 'تعذر تسجيل الحادث' : 'Could not create incident', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(incident: Incident, status: 'IN_PROGRESS' | 'RESOLVED' | 'OPEN' | 'CLOSED') {
    setActingOn(incident.id);
    try {
      const response = await fetch('/api/incidents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: incident.id, status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not update incident');
      toast({ title: lang === 'ar' ? 'تم تحديث حالة الحادث' : 'Incident status updated' });
      await load();
    } catch (error) {
      toast({ title: lang === 'ar' ? 'تعذر تحديث الحالة' : 'Could not update status', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    } finally {
      setActingOn(null);
    }
  }

  const columns = [
    { key: 'referenceNumber', header: lang === 'ar' ? 'المرجع' : 'Reference', render: (row: Incident) => <span className="font-mono text-xs">{row.referenceNumber}</span> },
    { key: 'title', header: lang === 'ar' ? 'العنوان' : 'Title', sortable: true, render: (row: Incident) => <span className="font-medium">{row.title}</span> },
    { key: 'type', header: lang === 'ar' ? 'النوع' : 'Type' },
    { key: 'severity', header: t('incidents.severity'), render: (row: Incident) => <Badge variant={SEV_COLORS[row.severity] ?? 'outline'}>{row.severity === 'CRITICAL' && <AlertTriangle className="me-1 h-3 w-3" />}{row.severity}</Badge> },
    { key: 'status', header: t('common.status'), render: (row: Incident) => <Badge variant="outline">{row.status.replace(/_/g, ' ')}</Badge> },
    { key: 'shipment', header: lang === 'ar' ? 'الشحنة' : 'Shipment', render: (row: Incident) => row.shipment?.referenceNumber ?? '—' },
    { key: 'assignedTo', header: t('incidents.assignedTo'), render: (row: Incident) => row.assignedTo?.name ?? (lang === 'ar' ? 'غير معيّن' : 'Unassigned') },
    { key: 'reportedAt', header: lang === 'ar' ? 'تاريخ البلاغ' : 'Reported', render: (row: Incident) => formatDate(row.reportedAt, lang === 'ar' ? 'ar-EG' : 'en-GB') },
  ];

  function rowActions(incident: Incident) {
    if (!canEdit || incident.status === 'CLOSED') return null;
    const nextStatus = incident.status === 'OPEN' ? 'IN_PROGRESS' : incident.status === 'IN_PROGRESS' ? 'RESOLVED' : 'CLOSED';
    return (
      <div className="flex gap-1">
        {incident.status === 'RESOLVED' && <Button size="sm" variant="outline" disabled={actingOn !== null} onClick={() => updateStatus(incident, 'OPEN')} aria-label={lang === 'ar' ? 'إعادة فتح' : 'Reopen'}><RotateCcw className="h-4 w-4" /></Button>}
        <Button size="sm" variant="outline" disabled={actingOn !== null} onClick={() => updateStatus(incident, nextStatus)} aria-label={nextStatus}>
          {actingOn === incident.id ? <Loader2 className="h-4 w-4 animate-spin" /> : nextStatus === 'CLOSED' ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">{t('incidents.title')}</h1><p className="text-sm text-muted-foreground">{total} {lang === 'ar' ? 'حادث' : 'incidents'}</p></div>
        {canCreate && <Button size="sm" onClick={() => setOpen(true)}><Plus className="me-2 h-4 w-4" />{t('incidents.newIncident')}</Button>}
      </div>
      <DataTable data={incidents} columns={columns} searchable loading={loading} rowKey={(row) => row.id} actions={canEdit ? rowActions : undefined} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('incidents.newIncident')}</DialogTitle></DialogHeader>
          <form onSubmit={createIncident} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="incident-type">{lang === 'ar' ? 'نوع الحادث' : 'Incident type'}</Label><Input id="incident-type" required maxLength={100} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="incident-title">{lang === 'ar' ? 'العنوان' : 'Title'}</Label><Input id="incident-title" required maxLength={200} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="incident-severity">{t('incidents.severity')}</Label><select id="incident-severity" value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((severity) => <option key={severity}>{severity}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="incident-shipment">{lang === 'ar' ? 'الشحنة (اختياري)' : 'Shipment (optional)'}</Label><select id="incident-shipment" value={form.shipmentId} onChange={(event) => setForm({ ...form, shipmentId: event.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">{lang === 'ar' ? 'بدون ربط' : 'No shipment'}</option>{shipments.map((shipment) => <option key={shipment.id} value={shipment.id}>{shipment.referenceNumber} — {shipment.customer?.legalName}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="incident-description">{lang === 'ar' ? 'الوصف' : 'Description'}</Label><Textarea id="incident-description" required maxLength={10000} rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</Button><Button type="submit" disabled={saving}>{saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}{lang === 'ar' ? 'حفظ البلاغ' : 'Create incident'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
