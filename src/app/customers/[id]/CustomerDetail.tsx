'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Building2, Mail, Phone, MapPin, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/components/shared/LanguageProvider';
import { formatCurrency, formatDate } from '@/lib/utils';

export function CustomerDetail({ id }: { id: string }) {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'shipments' | 'invoices' | 'documents'>('overview');

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then((r) => r.json())
      .then((d) => setData(d.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (!data) return <div className="text-center py-20 text-muted-foreground">Customer not found</div>;

  const fin = data.financialSummary?.byCurrency ?? [];
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-navy text-white font-bold text-lg">
            {data.legalName?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold">{data.legalName}</h1>
            <p className="text-sm text-muted-foreground">{data.fileNumber} · {data.type}</p>
          </div>
          <Badge variant={data.status === 'ACTIVE' ? 'success' : 'secondary'} className="ms-2">
            {data.status}
          </Badge>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ...(data.canViewFinance ? fin.flatMap((summary: { currency: string; totalInvoiced: number; totalPaid: number; outstanding: number }) => [
            { label: `${t('customers.totalInvoiced')} (${summary.currency})`, value: formatCurrency(summary.totalInvoiced, summary.currency, locale) },
            { label: `${t('customers.totalPaid')} (${summary.currency})`, value: formatCurrency(summary.totalPaid, summary.currency, locale) },
            { label: `${t('customers.balance')} (${summary.currency})`, value: formatCurrency(summary.outstanding, summary.currency, locale), highlight: summary.outstanding > 0 },
          ]) : []),
          { label: lang === 'ar' ? 'الشحنات' : 'Shipments', value: data._count?.shipments ?? 0 },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={`mt-1 text-xl font-bold ${k.highlight ? 'text-orange-500' : ''}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-6">
        {(['overview', 'shipments', ...(data.canViewFinance ? ['invoices' as const] : []), 'documents'] as const).map((t_) => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className={`pb-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t_ ? 'border-brand-navy text-brand-navy dark:border-brand-accent dark:text-brand-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t_}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {data.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{data.email}</div>}
              {data.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{data.phone}</div>}
              {data.country && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{data.country}</div>}
              {data.billingAddress && <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{data.billingAddress}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Account Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Account Manager</span><span>{data.accountManager?.name ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax Number</span><span>{data.taxNumber ?? '—'}</span></div>
              {data.canViewFinance && <div className="flex justify-between"><span className="text-muted-foreground">Credit Limit</span><span>{data.creditLimit ? formatCurrency(data.creditLimit, data.baseCurrency, locale) : 'None'}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Member Since</span><span>{formatDate(data.createdAt)}</span></div>
            </CardContent>
          </Card>
          {data.notes && (
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.notes}</p></CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === 'shipments' && (
        <div className="space-y-2">
          {(data.shipments ?? []).length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No shipments yet</p>
          ) : (data.shipments as any[]).map((s: any) => (
            <Card key={s.id} className="hover:shadow-md cursor-pointer" onClick={() => router.push(`/shipments/${s.id}`)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{s.referenceNumber}</p>
                  <p className="text-xs text-muted-foreground">{s.origin} → {s.destination}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{s.mode}</Badge>
                  <Badge>{s.status}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(s.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === 'invoices' && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {['Invoice #', 'Issue Date', 'Due Date', 'Total', 'Paid', 'Balance', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-start font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.invoices ?? []).map((inv: any) => (
                <tr key={inv.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3">{formatDate(inv.issueDate)}</td>
                  <td className="px-4 py-3">{formatDate(inv.dueDate)}</td>
                  <td className="px-4 py-3">{formatCurrency(inv.totalAmount, inv.currency)}</td>
                  <td className="px-4 py-3 text-green-600">{formatCurrency(inv.paidAmount, inv.currency)}</td>
                  <td className="px-4 py-3 text-orange-500">{formatCurrency(Number(inv.totalAmount) - Number(inv.paidAmount), inv.currency)}</td>
                  <td className="px-4 py-3"><Badge>{inv.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'documents' && (
        <div className="space-y-2">
          {(data.documents ?? []).length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No documents yet</p>
          ) : (data.documents as any[]).map((doc: any) => (
            <Card key={doc.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">{doc.type} · {formatDate(doc.createdAt)}</p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <a href={`/api/documents/${doc.id}/download`}>Download</a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
