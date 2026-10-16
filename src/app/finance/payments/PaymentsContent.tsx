'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
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

interface Payment {
  id: string;
  paymentNumber: string;
  customer: { legalName: string };
  invoice: { invoiceNumber: string } | null;
  amount: string;
  currency: string;
  method: string;
  reference: string | null;
  paidAt: string;
}

interface CustomerOption { id: string; legalName: string }
interface InvoiceOption { id: string; invoiceNumber: string; customerId: string; currency: string; totalAmount: string; paidAmount: string }

export function PaymentsContent() {
  const { lang } = useLanguage();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customerId: '', invoiceId: '', amount: '', currency: 'USD', method: 'BANK_TRANSFER', reference: '', paidAt: new Date().toISOString().slice(0, 10), notes: '' });

  async function loadPayments() {
    setLoading(true);
    try {
      const response = await fetch('/api/finance/payments?pageSize=100');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not load payments');
      setPayments(result.data ?? []);
    } catch (error) {
      toast({ title: lang === 'ar' ? 'تعذر تحميل المدفوعات' : 'Could not load payments', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayments();
    Promise.all([
      fetch('/api/customers?status=ACTIVE&pageSize=100').then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error ?? 'Could not load customers'); return d.data ?? []; }),
      fetch('/api/finance/invoices?pageSize=100').then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error ?? 'Could not load invoices'); return d.data ?? []; }),
    ]).then(([customerData, invoiceData]) => {
      setCustomers(customerData);
      setInvoices(invoiceData.filter((invoice: InvoiceOption) => Number(invoice.totalAmount) > Number(invoice.paidAmount)));
    }).catch((error) => toast({ title: lang === 'ar' ? 'تعذر تحميل بيانات النموذج' : 'Could not load form data', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' }));
  }, [lang]);

  const applicableInvoices = invoices.filter((invoice) => invoice.customerId === form.customerId);
  const selectedInvoice = applicableInvoices.find((invoice) => invoice.id === form.invoiceId);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/finance/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          invoiceId: form.invoiceId || undefined,
          amount: Number(form.amount),
          paidAt: new Date(`${form.paidAt}T12:00:00`).toISOString(),
          reference: form.reference || undefined,
          notes: form.notes || undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not record payment');
      toast({ title: lang === 'ar' ? 'تم تسجيل الدفعة' : 'Payment recorded' });
      setOpen(false);
      setForm({ customerId: '', invoiceId: '', amount: '', currency: 'USD', method: 'BANK_TRANSFER', reference: '', paidAt: new Date().toISOString().slice(0, 10), notes: '' });
      await loadPayments();
    } catch (error) {
      toast({ title: lang === 'ar' ? 'تعذر تسجيل الدفعة' : 'Could not record payment', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    { key: 'paymentNumber', header: lang === 'ar' ? 'رقم الدفعة' : 'Payment #', sortable: true, render: (row: Payment) => <span className="font-mono text-xs">{row.paymentNumber}</span> },
    { key: 'customer', header: lang === 'ar' ? 'العميل' : 'Customer', render: (row: Payment) => row.customer.legalName },
    { key: 'invoice', header: lang === 'ar' ? 'الفاتورة' : 'Invoice', render: (row: Payment) => row.invoice?.invoiceNumber ?? '—' },
    { key: 'amount', header: lang === 'ar' ? 'المبلغ' : 'Amount', render: (row: Payment) => formatCurrency(row.amount, row.currency, lang === 'ar' ? 'ar-EG' : 'en-US') },
    { key: 'method', header: lang === 'ar' ? 'طريقة الدفع' : 'Method', render: (row: Payment) => <Badge variant="outline">{row.method.replaceAll('_', ' ')}</Badge> },
    { key: 'reference', header: lang === 'ar' ? 'المرجع' : 'Reference', render: (row: Payment) => row.reference ?? '—' },
    { key: 'paidAt', header: lang === 'ar' ? 'تاريخ الدفع' : 'Paid at', render: (row: Payment) => formatDate(row.paidAt, lang === 'ar' ? 'ar-EG' : 'en-GB') },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">{lang === 'ar' ? 'المدفوعات' : 'Payments'}</h1><p className="text-sm text-muted-foreground">{payments.length} {lang === 'ar' ? 'دفعة' : 'payments'}</p></div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="me-2 h-4 w-4" />{lang === 'ar' ? 'تسجيل دفعة' : 'Record payment'}</Button>
      </div>
      <DataTable data={payments} columns={columns} searchable loading={loading} rowKey={(row) => row.id} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{lang === 'ar' ? 'تسجيل دفعة جديدة' : 'Record a payment'}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2"><Label htmlFor="payment-customer">{lang === 'ar' ? 'العميل' : 'Customer'}</Label><select required id="payment-customer" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value, invoiceId: '' })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">{lang === 'ar' ? 'اختر العميل' : 'Select customer'}</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.legalName}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="payment-invoice">{lang === 'ar' ? 'الفاتورة (اختياري)' : 'Invoice (optional)'}</Label><select id="payment-invoice" value={form.invoiceId} onChange={(e) => { const invoice = applicableInvoices.find((item) => item.id === e.target.value); setForm({ ...form, invoiceId: e.target.value, currency: invoice?.currency ?? form.currency }); }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">{lang === 'ar' ? 'دفعة غير مرتبطة بفاتورة' : 'Unallocated payment'}</option>{applicableInvoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber} · {invoice.currency} {Number(invoice.totalAmount) - Number(invoice.paidAmount)}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="payment-amount">{lang === 'ar' ? 'المبلغ' : 'Amount'}</Label><Input required id="payment-amount" type="number" min="0.01" step="0.01" max={selectedInvoice ? Number(selectedInvoice.totalAmount) - Number(selectedInvoice.paidAmount) : undefined} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="payment-currency">{lang === 'ar' ? 'العملة (ISO 4217)' : 'Currency (ISO 4217)'}</Label><Input required id="payment-currency" minLength={3} maxLength={3} pattern="[A-Za-z]{3}" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></div>
              <div className="space-y-2"><Label htmlFor="payment-method">{lang === 'ar' ? 'طريقة الدفع' : 'Method'}</Label><select id="payment-method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{['BANK_TRANSFER', 'CASH', 'CHEQUE', 'CARD', 'ONLINE'].map((method) => <option key={method} value={method}>{method.replaceAll('_', ' ')}</option>)}</select></div>
              <div className="space-y-2"><Label htmlFor="payment-date">{lang === 'ar' ? 'تاريخ الدفع' : 'Paid at'}</Label><Input required id="payment-date" type="date" value={form.paidAt} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} /></div>
              <div className="col-span-2 space-y-2"><Label htmlFor="payment-reference">{lang === 'ar' ? 'المرجع' : 'Reference'}</Label><Input id="payment-reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="payment-notes">{lang === 'ar' ? 'ملاحظات' : 'Notes'}</Label><Textarea id="payment-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</Button><Button type="submit" disabled={saving || customers.length === 0}>{saving ? (lang === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ الدفعة' : 'Save payment')}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
