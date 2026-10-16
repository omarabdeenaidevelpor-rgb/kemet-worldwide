'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, Plus, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useLanguage } from '@/components/shared/LanguageProvider';
import { hasPermission } from '@/lib/permissions';

interface Expense {
  id: string;
  category: string;
  description: string | null;
  amount: string;
  currency: string;
  status: string;
  paidAt: string | null;
  shipment: { referenceNumber: string } | null;
  paidBy: { name: string } | null;
}

interface ShipmentOption { id: string; referenceNumber: string }

export function ExpensesContent() {
  const { lang } = useLanguage();
  const { data: session } = useSession();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [shipments, setShipments] = useState<ShipmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [form, setForm] = useState({ category: '', description: '', amount: '', currency: 'USD', shipmentId: '', paidAt: '' });

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/finance/expenses?pageSize=100');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not load expenses');
      setExpenses(result.data ?? []);
    } catch (error) {
      toast({ title: lang === 'ar' ? 'تعذر تحميل المصروفات' : 'Could not load expenses', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
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

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: Number(form.amount), shipmentId: form.shipmentId || undefined, paidAt: form.paidAt ? new Date(`${form.paidAt}T12:00:00`).toISOString() : undefined, description: form.description || undefined }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not create expense');
      toast({ title: lang === 'ar' ? 'تم تسجيل المصروف' : 'Expense recorded' });
      setOpen(false);
      setForm({ category: '', description: '', amount: '', currency: 'USD', shipmentId: '', paidAt: '' });
      await load();
    } catch (error) {
      toast({ title: lang === 'ar' ? 'تعذر تسجيل المصروف' : 'Could not record expense', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function review(expense: Expense, status: 'APPROVED' | 'REJECTED') {
    setReviewing(expense.id);
    try {
      const response = await fetch('/api/finance/expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: expense.id, status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not review expense');
      toast({ title: lang === 'ar' ? 'تم تحديث حالة المصروف' : 'Expense status updated' });
      await load();
    } catch (error) {
      toast({ title: lang === 'ar' ? 'تعذرت مراجعة المصروف' : 'Could not review expense', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    } finally {
      setReviewing(null);
    }
  }

  const canApprove = hasPermission(session?.user.permissions, session?.user.roles, 'FINANCE', 'APPROVE');
  const columns = [
    { key: 'category', header: lang === 'ar' ? 'الفئة' : 'Category', sortable: true },
    { key: 'description', header: lang === 'ar' ? 'الوصف' : 'Description', render: (row: Expense) => row.description ?? '—' },
    { key: 'shipment', header: lang === 'ar' ? 'الشحنة' : 'Shipment', render: (row: Expense) => row.shipment?.referenceNumber ?? '—' },
    { key: 'amount', header: lang === 'ar' ? 'المبلغ' : 'Amount', render: (row: Expense) => formatCurrency(row.amount, row.currency, lang === 'ar' ? 'ar-EG' : 'en-US') },
    { key: 'status', header: lang === 'ar' ? 'الحالة' : 'Status', render: (row: Expense) => <Badge variant={row.status === 'APPROVED' ? 'success' : row.status === 'REJECTED' ? 'destructive' : 'warning'}>{row.status}</Badge> },
    { key: 'paidAt', header: lang === 'ar' ? 'تاريخ الدفع' : 'Paid at', render: (row: Expense) => formatDate(row.paidAt, lang === 'ar' ? 'ar-EG' : 'en-GB') },
    { key: 'paidBy', header: lang === 'ar' ? 'سُجل بواسطة' : 'Recorded by', render: (row: Expense) => row.paidBy?.name ?? '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">{lang === 'ar' ? 'المصروفات' : 'Expenses'}</h1><p className="text-sm text-muted-foreground">{expenses.length} {lang === 'ar' ? 'مصروف' : 'expenses'}</p></div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="me-2 h-4 w-4" />{lang === 'ar' ? 'إضافة مصروف' : 'Add expense'}</Button>
      </div>
      <DataTable data={expenses} columns={columns} searchable loading={loading} rowKey={(row) => row.id}
        actions={canApprove ? (row) => row.status === 'PENDING' ? (
          <div className="flex gap-1">
            <Button size="sm" disabled={reviewing !== null} onClick={() => review(row, 'APPROVED')} aria-label={lang === 'ar' ? 'اعتماد' : 'Approve'}>
              {reviewing === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="destructive" disabled={reviewing !== null} onClick={() => review(row, 'REJECTED')} aria-label={lang === 'ar' ? 'رفض' : 'Reject'}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : null : undefined} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{lang === 'ar' ? 'تسجيل مصروف' : 'Record an expense'}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2"><Label htmlFor="expense-category">{lang === 'ar' ? 'الفئة' : 'Category'}</Label><Input id="expense-category" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="expense-amount">{lang === 'ar' ? 'المبلغ' : 'Amount'}</Label><Input id="expense-amount" type="number" min="0.01" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="expense-currency">{lang === 'ar' ? 'العملة (ISO 4217)' : 'Currency (ISO 4217)'}</Label><Input id="expense-currency" required minLength={3} maxLength={3} pattern="[A-Za-z]{3}" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></div>
              <div className="col-span-2 space-y-2"><Label htmlFor="expense-shipment">{lang === 'ar' ? 'الشحنة (اختياري)' : 'Shipment (optional)'}</Label><select id="expense-shipment" value={form.shipmentId} onChange={(e) => setForm({ ...form, shipmentId: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">{lang === 'ar' ? 'غير مرتبط بشحنة' : 'Not linked to a shipment'}</option>{shipments.map((shipment) => <option key={shipment.id} value={shipment.id}>{shipment.referenceNumber}</option>)}</select></div>
              <div className="col-span-2 space-y-2"><Label htmlFor="expense-paid-date">{lang === 'ar' ? 'تاريخ الدفع (اختياري)' : 'Paid at (optional)'}</Label><Input id="expense-paid-date" type="date" value={form.paidAt} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="expense-description">{lang === 'ar' ? 'الوصف' : 'Description'}</Label><Textarea id="expense-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</Button><Button type="submit" disabled={saving}>{saving ? (lang === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ المصروف' : 'Save expense')}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
