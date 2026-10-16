'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { useLanguage } from '@/components/shared/LanguageProvider';

type ReportType = 'customers' | 'shipments' | 'invoices';
type ExportRow = Record<string, unknown>;

const reportDefinitions: Record<ReportType, { en: string; ar: string; columns: Array<[string, string]> }> = {
  customers: {
    en: 'Customers', ar: 'العملاء',
    columns: [
      ['fileNumber', 'Customer number'], ['legalName', 'Legal name'], ['type', 'Type'],
      ['email', 'Email'], ['phone', 'Phone'], ['country', 'Country'], ['status', 'Status'], ['createdAt', 'Created at'],
    ],
  },
  shipments: {
    en: 'Shipments', ar: 'الشحنات',
    columns: [
      ['referenceNumber', 'Reference'], ['customer.legalName', 'Customer'], ['mode', 'Mode'],
      ['status', 'Status'], ['origin', 'Origin'], ['destination', 'Destination'],
      ['originCountry', 'Origin country'], ['destinationCountry', 'Destination country'],
      ['departureDate', 'Departure date'], ['estimatedArrivalDate', 'Estimated arrival'],
      ['actualDeliveryDate', 'Delivered at'], ['carrier', 'Carrier'], ['weight', 'Weight'], ['weightUnit', 'Weight unit'],
    ],
  },
  invoices: {
    en: 'Invoices', ar: 'الفواتير',
    columns: [
      ['invoiceNumber', 'Invoice number'], ['customer.legalName', 'Customer'], ['issueDate', 'Issued at'],
      ['dueDate', 'Due date'], ['currency', 'Currency'], ['subtotal', 'Subtotal'],
      ['taxAmount', 'Tax'], ['discountAmount', 'Discount'], ['totalAmount', 'Total'],
      ['paidAmount', 'Paid'], ['status', 'Status'],
    ],
  },
};

function readPath(row: ExportRow, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => {
    if (!value || typeof value !== 'object') return '';
    return (value as Record<string, unknown>)[key];
  }, row);
}

function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function ReportsContent() {
  const { lang } = useLanguage();
  const [downloading, setDownloading] = useState<ReportType | null>(null);

  async function exportReport(type: ReportType) {
    setDownloading(type);
    try {
      const allRows: ExportRow[] = [];
      let page = 1;
      let total = 0;

      do {
        const response = await fetch(`/api/reports?type=${type}&page=${page}&pageSize=100`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? 'Report export failed');
        if (!Array.isArray(result.data)) throw new Error('Unexpected report response');
        total = result.total;
        allRows.push(...result.data);
        page += 1;
      } while (allRows.length < total);

      const definition = reportDefinitions[type];
      const rows = [
        definition.columns.map(([, title]) => title),
        ...allRows.map((row) => definition.columns.map(([key]) => readPath(row, key))),
      ];
      const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
      const objectUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `${type}-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
      toast({ title: lang === 'ar' ? `تم تصدير ${allRows.length} سجل` : `Exported ${allRows.length} records` });
    } catch (error) {
      toast({
        title: lang === 'ar' ? 'فشل التصدير' : 'Export failed',
        description: error instanceof Error ? error.message : 'Unexpected error',
        variant: 'destructive',
      });
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{lang === 'ar' ? 'التقارير' : 'Reports'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{lang === 'ar' ? 'تنزيل بيانات التشغيل بصيغة CSV المتوافقة مع Excel.' : 'Download operational data as Excel-compatible CSV files.'}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {(Object.entries(reportDefinitions) as Array<[ReportType, typeof reportDefinitions[ReportType]]>).map(([type, definition]) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle>{lang === 'ar' ? definition.ar : definition.en}</CardTitle>
              <CardDescription>{lang === 'ar' ? `تصدير بيانات ${definition.ar}` : `Export ${definition.en.toLowerCase()} records`}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" disabled={downloading !== null} onClick={() => exportReport(type)}>
                {downloading === type ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Download className="me-2 h-4 w-4" />}
                {lang === 'ar' ? 'تصدير CSV' : 'Export CSV'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
