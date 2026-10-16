'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/components/shared/LanguageProvider';
import { formatDateTime } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

interface IncidentData {
  id: string;
  referenceNumber: string;
  title: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  description: string;
  reportedAt: string;
  resolvedAt: string | null;
  shipment: { id: string; referenceNumber: string; mode: string; status: string } | null;
  customer: { id: string; legalName: string } | null;
  assignedTo: { id: string; name: string; email: string } | null;
  reportedBy: { id: string; name: string } | null;
  updates: Array<{
    id: string;
    content: string;
    createdAt: string;
    author: { id: string; name: string } | null;
  }>;
}

const SEVERITY_COLOR: Record<string, string> = {
  LOW: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  OPEN: ['IN_PROGRESS', 'CLOSED'],
  IN_PROGRESS: ['RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
};

export function IncidentDetail({ id }: { id: string }) {
  const { lang } = useLanguage();
  const router = useRouter();
  const [data, setData] = useState<IncidentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);

  async function load() {
    try {
      const res = await fetch(`/api/incidents/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load incident');
      setData(json.data);
    } catch (err) {
      toast({
        title: lang === 'ar' ? 'خطأ في التحميل' : 'Loading error',
        description: err instanceof Error ? err.message : 'Unexpected error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function changeStatus(newStatus: string) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to update status');
      toast({
        title: lang === 'ar' ? 'تم تحديث الحالة' : 'Status updated',
        description: `→ ${newStatus}`,
      });
      await load();
    } catch (err) {
      toast({
        title: lang === 'ar' ? 'فشل تحديث الحالة' : 'Update failed',
        description: err instanceof Error ? err.message : 'Unexpected error',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/incidents/${id}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: comment }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to add update');
      setComment('');
      await load();
    } catch (err) {
      toast({
        title: lang === 'ar' ? 'فشل الإضافة' : 'Failed to add update',
        description: err instanceof Error ? err.message : 'Unexpected error',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        {lang === 'ar' ? 'الحادثة غير موجودة' : 'Incident not found'}
      </div>
    );
  }

  const nextStatuses = STATUS_TRANSITIONS[data.status] ?? [];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <AlertTriangle className={`h-5 w-5 ${data.severity === 'CRITICAL' || data.severity === 'HIGH' ? 'text-red-500' : 'text-orange-400'}`} />
            <h1 className="text-xl font-bold">{data.title}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${SEVERITY_COLOR[data.severity]}`}>
              {data.severity}
            </span>
            <Badge variant="outline">{data.status.replace('_', ' ')}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {data.referenceNumber} · {data.type} · {lang === 'ar' ? 'أبلغ' : 'Reported'} {formatDateTime(data.reportedAt)}
          </p>
        </div>
        {/* Status action buttons */}
        {nextStatuses.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {nextStatuses.map((s) => (
              <Button key={s} size="sm" variant="outline" disabled={updating} onClick={() => changeStatus(s)}>
                {updating ? <Loader2 className="h-3 w-3 animate-spin me-1" /> : null}
                {lang === 'ar' ? '← ' : '→ '}{s.replace('_', ' ')}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Details */}
        <Card>
          <CardHeader><CardTitle className="text-base">{lang === 'ar' ? 'التفاصيل' : 'Details'}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              [lang === 'ar' ? 'الشحنة' : 'Shipment', data.shipment ? (
                <a href={`/shipments/${data.shipment.id}`} className="text-brand-navy dark:text-brand-accent hover:underline">
                  {data.shipment.referenceNumber}
                </a>
              ) : '—'],
              [lang === 'ar' ? 'العميل' : 'Customer', data.customer ? (
                <a href={`/customers/${data.customer.id}`} className="text-brand-navy dark:text-brand-accent hover:underline">
                  {data.customer.legalName}
                </a>
              ) : '—'],
              [lang === 'ar' ? 'المسؤول' : 'Assigned to', data.assignedTo?.name ?? (lang === 'ar' ? 'غير محدد' : 'Unassigned')],
              [lang === 'ar' ? 'أبلغ بواسطة' : 'Reported by', data.reportedBy?.name ?? '—'],
              [lang === 'ar' ? 'تاريخ الحل' : 'Resolved at', data.resolvedAt ? formatDateTime(data.resolvedAt) : '—'],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">{label}</span>
                <span className="font-medium text-right">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader><CardTitle className="text-base">{lang === 'ar' ? 'الوصف' : 'Description'}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{data.description}</p>
          </CardContent>
        </Card>
      </div>

      {/* Updates timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {lang === 'ar' ? 'سجل التحديثات' : 'Update timeline'} ({data.updates.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.updates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {lang === 'ar' ? 'لا توجد تحديثات بعد' : 'No updates yet'}
            </p>
          ) : (
            <div className="space-y-4">
              {data.updates.map((update, i) => (
                <div key={update.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-navy/10 dark:bg-brand-accent/10 text-xs font-bold text-brand-navy dark:text-brand-accent">
                      {update.author?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    {i < data.updates.length - 1 && (
                      <div className="mt-1 w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="pb-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{update.author?.name ?? 'System'}</span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(update.createdAt)}</span>
                    </div>
                    <p className="text-sm mt-0.5 whitespace-pre-wrap">{update.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add comment form */}
          {data.status !== 'CLOSED' && (
            <form onSubmit={addComment} className="flex gap-2 pt-2 border-t">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={lang === 'ar' ? 'أضف تحديثاً...' : 'Add an update...'}
                rows={2}
                className="flex-1"
              />
              <Button type="submit" disabled={submitting || !comment.trim()} size="sm" className="self-end">
                {submitting
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Send className="h-4 w-4" />
                }
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
