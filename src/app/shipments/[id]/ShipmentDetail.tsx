'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Loader2, Package, MapPin, Clock, AlertTriangle, FileText, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/components/shared/LanguageProvider';
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { hasPermission } from '@/lib/permissions';

const STATUS_FLOW = [
  'DRAFT','QUOTATION','BOOKED','PICKUP','IN_TRANSIT','CUSTOMS','OUT_FOR_DELIVERY','DELIVERED'
];

const ALLOWED_NEXT: Record<string, string[]> = {
  DRAFT: ['QUOTATION', 'BOOKED'],
  QUOTATION: ['BOOKED'],
  BOOKED: ['PICKUP'],
  PICKUP: ['IN_TRANSIT'],
  IN_TRANSIT: ['CUSTOMS', 'OUT_FOR_DELIVERY', 'DELAYED', 'ON_HOLD'],
  CUSTOMS: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
};

export function ShipmentDetail({ id }: { id: string }) {
  const { t, lang } = useLanguage();
  const { data: session } = useSession();
  const router = useRouter();
  const canViewFinance = hasPermission(session?.user.permissions, session?.user.roles, 'FINANCE', 'VIEW');
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'containers' | 'tracking' | 'incidents' | 'finance' | 'documents' | 'history'>('overview');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetch(`/api/shipments/${id}`)
      .then((r) => r.json())
      .then((d) => setData(d.data))
      .finally(() => setLoading(false));
  }, [id]);

  async function updateStatus(newStatus: string) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/shipments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const e = await res.json();
        toast({ title: 'Error', description: e.message ?? e.error, variant: 'destructive' });
        return;
      }
      const d = await res.json();
      setData((prev: any) => ({ ...prev, ...d.data }));
      toast({ title: 'Status updated', description: `Shipment is now ${newStatus}` });
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!data) return <div className="text-center py-20 text-muted-foreground">Shipment not found</div>;

  const nextStatuses = ALLOWED_NEXT[data.status] ?? [];
  const stepIndex = STATUS_FLOW.indexOf(data.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold font-mono">{data.referenceNumber}</h1>
            <Badge variant="outline">{data.mode}</Badge>
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
              data.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
              data.status === 'DELAYED' ? 'bg-red-100 text-red-700' :
              data.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-600'
            }`}>{data.status.replace(/_/g, ' ')}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {data.customer?.legalName} · {data.origin} → {data.destination}
          </p>
        </div>
        {/* Status actions */}
        {nextStatuses.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {nextStatuses.map((s) => (
              <Button key={s} size="sm" variant="outline" disabled={updating} onClick={() => updateStatus(s)}>
                {updating ? <Loader2 className="h-3 w-3 animate-spin me-1" /> : null}
                → {s.replace(/_/g, ' ')}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Status stepper */}
      <div className="hidden md:flex items-center gap-1 overflow-x-auto py-2">
        {STATUS_FLOW.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <div className={`flex items-center justify-center rounded-full text-xs font-medium px-3 py-1 ${
              i < stepIndex ? 'bg-green-100 text-green-700' :
              i === stepIndex ? 'bg-brand-navy text-white' :
              'bg-muted text-muted-foreground'
            }`}>
              {s.replace(/_/g, ' ')}
            </div>
            {i < STATUS_FLOW.length - 1 && <div className={`h-px w-4 ${i < stepIndex ? 'bg-green-400' : 'bg-border'}`} />}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-6 overflow-x-auto">
        {(['overview', 'containers', 'tracking', 'incidents', ...(canViewFinance ? ['finance' as const] : []), 'documents', 'history'] as const).map((tab_) => (
          <button key={tab_} onClick={() => setTab(tab_)}
            className={`pb-3 text-sm font-medium capitalize whitespace-nowrap transition-colors border-b-2 -mb-px ${
              tab === tab_ ? 'border-brand-navy text-brand-navy dark:border-brand-accent dark:text-brand-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>{tab_}</button>
        ))}
      </div>

      {(data.pendingDocuments || data.latestRemark) && (
        <div className="grid gap-3 md:grid-cols-2">
          {data.latestRemark && (
            <div className="rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue dark:text-brand-accent">
                {lang === 'ar' ? 'آخر تحديث' : 'Latest update'}
              </p>
              <p className="mt-1 text-sm">{data.latestRemark}</p>
            </div>
          )}
          {data.pendingDocuments && (
            <div className="rounded-xl border border-orange-300/60 bg-orange-50 p-4 dark:bg-orange-950/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-400">
                {lang === 'ar' ? 'مستندات معلّقة' : 'Pending documents'}
              </p>
              <p className="mt-1 text-sm">{data.pendingDocuments}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'containers' && (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  {(lang === 'ar'
                    ? ['الحاوية / الوحدة', 'النوع', 'بوليصة الشحن', 'الشاحنة', 'التفريغ', 'التحميل', 'وصول ملابا', 'وصول ليرا', 'الحالة']
                    : ['Container / Unit', 'Type', 'B/L · AWB', 'Truck', 'Discharged', 'Loaded out', 'ETA Malaba', 'ETA Lira', 'Status']
                  ).map((h) => <th key={h} className="px-4 py-3 text-start font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {(data.containers ?? []).length === 0 && (
                  <tr><td colSpan={9} className="py-10 text-center text-muted-foreground">{lang === 'ar' ? 'لا توجد حاويات' : 'No containers'}</td></tr>
                )}
                {(data.containers ?? []).map((c: any) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-medium" dir="ltr">{c.containerNumber ?? '—'}</td>
                    <td className="px-4 py-3">{c.unitType ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs" dir="ltr">{c.billOfLading ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs" dir="ltr">{c.truckNumber ?? '—'}</td>
                    <td className="px-4 py-3">{formatDate(c.dischargeDate)}</td>
                    <td className="px-4 py-3">{formatDate(c.loadedOutDate)}</td>
                    <td className="px-4 py-3">{formatDate(c.etaBorder)}</td>
                    <td className="px-4 py-3">{formatDate(c.etaDestination)}</td>
                    <td className="px-4 py-3"><Badge variant="outline">{String(c.status).replace(/_/g, ' ')}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === 'overview' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Cargo Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                ['Category', data.cargoCategory],
                ['Packages', data.packageCount],
                ['Weight', data.weight ? `${data.weight} ${data.weightUnit}` : null],
                ['Volume', data.volume ? `${data.volume} ${data.volumeUnit}` : null],
                ['Container', data.containerNumber],
                ['Bill of Lading', data.billOfLading],
                ['Airway Bill', data.airwayBill],
              ].map(([k, v]) => v ? (
                <div key={String(k)} className="flex justify-between">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium">{String(v)}</span>
                </div>
              ) : null)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Dates & Carrier</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                ['Departure', formatDate(data.departureDate)],
                ['Est. Arrival', formatDate(data.estimatedArrivalDate)],
                ['Actual Departure', formatDate(data.actualDepartureDate)],
                ['Actual Delivery', formatDate(data.actualDeliveryDate)],
                ['Carrier', data.carrier],
                ['Forwarder', data.freightForwarder],
                ['Assigned To', data.assignedEmployee?.name],
                ['Customs', data.customsStatus],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium">{v ?? '—'}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          {canViewFinance && <Card>
            <CardHeader><CardTitle className="text-base">Financials</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                ['Customer Price', data.customerPrice ? formatCurrency(data.customerPrice, data.baseCurrency, locale) : null],
                ['Est. Costs', data.estimatedCosts ? formatCurrency(data.estimatedCosts, data.baseCurrency, locale) : null],
                ['Actual Costs', data.actualCosts ? formatCurrency(data.actualCosts, data.baseCurrency, locale) : null],
                ['Margin', data.margin ? formatCurrency(data.margin, data.baseCurrency, locale) : null],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium">{v ?? '—'}</span>
                </div>
              ))}
            </CardContent>
          </Card>}
          {(data.legs ?? []).length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Shipment Legs</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(data.legs as any[]).map((leg: any, i: number) => (
                  <div key={leg.id} className="flex items-center gap-3 text-sm">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-navy text-white text-xs">{i + 1}</div>
                    <div>
                      <p className="font-medium">{leg.origin} → {leg.destination}</p>
                      <p className="text-xs text-muted-foreground">{leg.mode} · {leg.carrier ?? 'N/A'} · {formatDate(leg.departureDate)}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === 'tracking' && (
        <div className="space-y-3">
          {(data.trackingEvents ?? []).length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No tracking events recorded</p>
          ) : (data.trackingEvents as any[]).map((ev: any) => (
            <div key={ev.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="h-2.5 w-2.5 rounded-full bg-brand-navy mt-1 dark:bg-brand-accent" />
                <div className="w-px flex-1 bg-border" />
              </div>
              <Card className="flex-1 mb-2">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{ev.eventType}</p>
                    <span className="text-xs text-muted-foreground">{formatDateTime(ev.occurredAt)}</span>
                  </div>
                  {ev.location && <p className="text-xs text-muted-foreground mt-0.5"><MapPin className="inline h-3 w-3 me-1" />{ev.location}</p>}
                  {ev.description && <p className="text-xs mt-1">{ev.description}</p>}
                  <p className="text-xs mt-1 text-muted-foreground">Source: {ev.source} {ev.isVerified ? '✓' : '(unverified)'}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {(data.statusHistory ?? []).map((h: any) => (
            <div key={h.id} className="flex gap-3 text-sm">
              <div className="text-xs text-muted-foreground w-32 shrink-0">{formatDateTime(h.changedAt)}</div>
              <div>
                <span className="font-medium">{h.user?.name ?? 'System'}</span>
                {' changed status '}
                {h.fromStatus && <><Badge variant="outline" className="text-xs">{h.fromStatus}</Badge>{' → '}</>}
                <Badge className="text-xs">{h.toStatus}</Badge>
                {h.notes && <p className="text-xs text-muted-foreground mt-0.5">{h.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'incidents' && (
        <div className="space-y-2">
          {(data.incidents ?? []).length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No incidents</p>
          ) : (data.incidents as any[]).map((inc: any) => (
            <Card key={inc.id} className="hover:shadow cursor-pointer" onClick={() => router.push(`/incidents/${inc.id}`)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`h-5 w-5 ${inc.severity === 'CRITICAL' ? 'text-red-500' : inc.severity === 'HIGH' ? 'text-orange-500' : 'text-yellow-500'}`} />
                  <div>
                    <p className="font-medium text-sm">{inc.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(inc.reportedAt)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">{inc.severity}</Badge>
                  <Badge>{inc.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {canViewFinance && tab === 'finance' && (
        <div className="space-y-2">
          {(data.invoices ?? []).length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No invoices</p>
          ) : (data.invoices as any[]).map((inv: any) => (
            <Card key={inv.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{inv.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(inv.totalAmount, inv.currency)}</p>
                  </div>
                </div>
                <Badge>{inv.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === 'documents' && (
        <div className="space-y-2">
          {(data.documents ?? []).length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No documents</p>
          ) : (data.documents as any[]).map((doc: any) => (
            <Card key={doc.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.type} · {formatDate(doc.createdAt)}</p>
                  </div>
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
