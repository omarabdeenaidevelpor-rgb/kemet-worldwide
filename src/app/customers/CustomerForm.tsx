'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/components/shared/LanguageProvider';
import { toast } from '@/components/ui/use-toast';

interface CustomerFormProps {
  onClose: () => void;
  onSaved: () => void;
  initial?: Partial<{
    type: string; legalName: string; email: string; phone: string;
    country: string; billingAddress: string; notes: string;
  }>;
}

export function CustomerForm({ onClose, onSaved, initial }: CustomerFormProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: initial?.type ?? 'COMPANY',
    legalName: initial?.legalName ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    country: initial?.country ?? '',
    billingAddress: initial?.billingAddress ?? '',
    notes: initial?.notes ?? '',
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: 'Error', description: err.error ?? 'Failed to save', variant: 'destructive' });
        return;
      }
      toast({ title: 'Customer created', description: 'New customer has been added.' });
      onSaved();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">{t('customers.newCustomer')}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>{t('customers.customerType')}</Label>
              <div className="flex gap-3">
                {['COMPANY', 'INDIVIDUAL'].map((t_) => (
                  <label key={t_} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="type" value={t_} checked={form.type === t_}
                      onChange={(e) => set('type', e.target.value)} />
                    <span className="text-sm">{t_}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="legalName">{t('customers.legalName')} *</Label>
              <Input id="legalName" required value={form.legalName}
                onChange={(e) => set('legalName', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('common.email')}</Label>
              <Input id="email" type="email" value={form.email}
                onChange={(e) => set('email', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('common.phone')}</Label>
              <Input id="phone" value={form.phone}
                onChange={(e) => set('phone', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">{t('common.country')}</Label>
              <Input id="country" value={form.country}
                onChange={(e) => set('country', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="billingAddress">{t('common.address')}</Label>
              <Input id="billingAddress" value={form.billingAddress}
                onChange={(e) => set('billingAddress', e.target.value)} />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="notes">{t('common.notes')}</Label>
              <textarea
                id="notes"
                rows={3}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t('common.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
