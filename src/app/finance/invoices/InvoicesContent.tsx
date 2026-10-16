'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { useLanguage } from '@/components/shared/LanguageProvider';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Invoice {
  id: string;
  invoiceNumber: string;
  customer: { legalName: string };
  totalAmount: string;
  paidAmount: string;
  status: string;
  issueDate: string;
  dueDate: string | null;
  currency: string;
}

const STATUS_COLORS: Record<string, 'secondary' | 'info' | 'warning' | 'success' | 'destructive'> = {
  DRAFT: 'secondary', ISSUED: 'info', PARTIALLY_PAID: 'warning',
  PAID: 'success', OVERDUE: 'destructive', CANCELLED: 'secondary',
};

export function InvoicesContent() {
  const { t, lang } = useLanguage();
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Array<{ id: string; legalName: string }>>([]);
  const [form, setForm] = useState({
    customerId: '', currency: 'USD', dueDate: '', description: '',
    quantity: '1', unitPrice: '', taxAmount: '0', discountAmount: '0', notes: '',
  });

  function load() {
    setLoading(true);
    fetch('/api/finance/invoices?pageSize=50')
      .then(r => r.json())
      .then(d => { setInvoices(d.data ?? []); setTotal(d.total ?? 0); })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    fetch('/api/customers?status=ACTIVE&pageSize=100')
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load customers');
        const result = await response.json();
        setCustomers(result.data ?? []);
      })
      .catch((error) => toast({
        title: lang === 'ar' ? 'تعذر تحميل العملاء' : 'Could not load customers',
        description: error instanceof Error ? error.message : 'Unexpected error',
        variant: 'destructive',
      }));
  }, [lang]);

  async function createInvoice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/finance/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: form.customerId,
          currency: form.currency,
          dueDate: form.dueDate || undefined,
          taxAmount: Number(form.taxAmount),
          discountAmount: Number(form.discountAmount),
          notes: form.notes || undefined,
          items: [{ description: form.description, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice) }],
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not create invoice');
      toast({ title: lang === 'ar' ? 'تم إنشاء الفاتورة' : 'Invoice created' });
      setDialogOpen(false);
      setForm({ customerId: '', currency: 'USD', dueDate: '', description: '', quantity: '1', unitPrice: '', taxAmount: '0', discountAmount: '0', notes: '' });
      load();
    } catch (error) {
      toast({
        title: lang === 'ar' ? 'تعذر إنشاء الفاتورة' : 'Could not create invoice',
        description: error instanceof Error ? error.message : 'Unexpected error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    { key: 'invoiceNumber', header: t('finance.invoiceNumber'), sortable: true,
      render: (r: Invoice) => <span className="font-mono font-medium text-xs">{r.invoiceNumber}</span> },
    { key: 'customer', header: t('shipments.customer'),
      render: (r: Invoice) => r.customer?.legalName ?? '—' },
    { key: 'issueDate', header: t('finance.issueDate'),
      render: (r: Invoice) => formatDate(r.issueDate, locale) },
    { key: 'dueDate', header: t('finance.dueDate'),
      render: (r: Invoice) => formatDate(r.dueDate, locale) },
    { key: 'totalAmount', header: t('finance.total'),
      render: (r: Invoice) => formatCurrency(r.totalAmount, r.currency, locale) },
    { key: 'paidAmount', header: t('finance.paid'),
      render: (r: Invoice) => <span className="text-green-600">{formatCurrency(r.paidAmount, r.currency, locale)}</span> },
    { key: 'balance', header: t('finance.balance'),
      render: (r: Invoice) => {
        const bal = Number(r.totalAmount) - Number(r.paidAmount);
        return <span className={bal > 0 ? 'text-orange-500 font-medium' : ''}>{formatCurrency(bal, r.currency, locale)}</span>;
      } },
    { key: 'status', header: t('common.status'),
      render: (r: Invoice) => <Badge variant={STATUS_COLORS[r.status] ?? 'secondary'}>{r.status}</Badge> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('finance.invoices')}</h1>
          <p className="text-sm text-muted-foreground">{total} total</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="me-2 h-4 w-4" /> {t('finance.newInvoice')}
        </Button>
      </div>
      <DataTable data={invoices} columns={columns} searchable loading={loading} rowKey={r => r.id} />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('finance.newInvoice')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={createInvoice} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoice-customer">{lang === 'ar' ? 'العميل' : 'Customer'}</Label>
              <select id="invoice-customer" required value={form.customerId}
                onChange={(event) => setForm({ ...form, customerId: event.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">{lang === 'ar' ? 'اختر العميل' : 'Select customer'}</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.legalName}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-description">{lang === 'ar' ? 'وصف البند' : 'Line item description'}</Label>
              <Input id="invoice-description" required minLength={1} value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoice-quantity">{lang === 'ar' ? 'الكمية' : 'Quantity'}</Label>
                <Input id="invoice-quantity" type="number" min="0.0001" step="any" required value={form.quantity}
                  onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice-unit-price">{lang === 'ar' ? 'سعر الوحدة' : 'Unit price'}</Label>
                <Input id="invoice-unit-price" type="number" min="0.0001" step="any" required value={form.unitPrice}
                  onChange={(event) => setForm({ ...form, unitPrice: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice-currency">{lang === 'ar' ? 'العملة (رمز ISO 4217)' : 'Currency (ISO 4217)'}</Label>
                <Input id="invoice-currency" required minLength={3} maxLength={3} pattern="[A-Za-z]{3}" value={form.currency}
                  onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice-due-date">{lang === 'ar' ? 'تاريخ الاستحقاق' : 'Due date'}</Label>
                <Input id="invoice-due-date" type="date" value={form.dueDate}
                  onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice-tax">{lang === 'ar' ? 'الضريبة' : 'Tax'}</Label>
                <Input id="invoice-tax" type="number" min="0" step="0.01" value={form.taxAmount}
                  onChange={(event) => setForm({ ...form, taxAmount: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice-discount">{lang === 'ar' ? 'الخصم' : 'Discount'}</Label>
                <Input id="invoice-discount" type="number" min="0" step="0.01" value={form.discountAmount}
                  onChange={(event) => setForm({ ...form, discountAmount: event.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-notes">{lang === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
              <Textarea id="invoice-notes" value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
              <Button type="submit" disabled={saving || customers.length === 0}>
                {saving ? (lang === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ كمسودة' : 'Save as draft')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
