'use client';

import { useEffect, useState } from 'react';
import { Download, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/shared/DataTable';
import { toast } from '@/components/ui/use-toast';
import { formatDate, formatFileSize } from '@/lib/utils';
import { useLanguage } from '@/components/shared/LanguageProvider';

interface DocumentRecord {
  id: string;
  name: string;
  type: string;
  fileSize: number | null;
  mimeType: string | null;
  customer: { legalName: string } | null;
  shipment: { referenceNumber: string } | null;
  uploadedBy: { name: string } | null;
  isConfidential: boolean;
  createdAt: string;
}

interface Option { id: string; label: string }

export function DocumentsContent() {
  const { lang } = useLanguage();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [customers, setCustomers] = useState<Option[]>([]);
  const [shipments, setShipments] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState('GENERAL');
  const [customerId, setCustomerId] = useState('');
  const [shipmentId, setShipmentId] = useState('');
  const [confidential, setConfidential] = useState(false);

  async function loadDocuments() {
    setLoading(true);
    try {
      const response = await fetch('/api/documents?pageSize=100');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not load documents');
      setDocuments(result.data ?? []);
    } catch (error) {
      toast({ title: lang === 'ar' ? 'تعذر تحميل المستندات' : 'Could not load documents', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
    Promise.all([
      fetch('/api/customers?pageSize=100').then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error ?? 'Could not load customers'); return result.data ?? []; }),
      fetch('/api/shipments?pageSize=100').then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error ?? 'Could not load shipments'); return result.data ?? []; }),
    ]).then(([customerData, shipmentData]) => {
      setCustomers(customerData.map((item: { id: string; legalName: string }) => ({ id: item.id, label: item.legalName })));
      setShipments(shipmentData.map((item: { id: string; referenceNumber: string }) => ({ id: item.id, label: item.referenceNumber })));
    }).catch((error) => toast({ title: lang === 'ar' ? 'تعذر تحميل خيارات الربط' : 'Could not load link options', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' }));
  }, [lang]);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      toast({ title: lang === 'ar' ? 'اختر ملفًا' : 'Choose a file', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.set('file', file);
      body.set('type', type);
      if (customerId) body.set('customerId', customerId);
      if (shipmentId) body.set('shipmentId', shipmentId);
      body.set('isConfidential', String(confidential));
      const response = await fetch('/api/documents', { method: 'POST', body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not upload document');
      toast({ title: lang === 'ar' ? 'تم رفع المستند' : 'Document uploaded' });
      setFile(null);
      setType('GENERAL');
      setCustomerId('');
      setShipmentId('');
      setConfidential(false);
      const input = document.getElementById('document-file') as HTMLInputElement | null;
      if (input) input.value = '';
      await loadDocuments();
    } catch (error) {
      toast({ title: lang === 'ar' ? 'تعذر رفع المستند' : 'Could not upload document', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }

  async function deleteDocument(record: DocumentRecord) {
    if (!window.confirm(lang === 'ar' ? `حذف المستند "${record.name}"؟` : `Delete "${record.name}"?`)) return;
    try {
      const response = await fetch(`/api/documents/${record.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not delete document');
      toast({ title: lang === 'ar' ? 'تم حذف المستند' : 'Document deleted' });
      await loadDocuments();
    } catch (error) {
      toast({ title: lang === 'ar' ? 'تعذر حذف المستند' : 'Could not delete document', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    }
  }

  const columns = [
    { key: 'name', header: lang === 'ar' ? 'اسم المستند' : 'Document', sortable: true, render: (row: DocumentRecord) => <span className="inline-flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />{row.name}</span> },
    { key: 'type', header: lang === 'ar' ? 'النوع' : 'Type', render: (row: DocumentRecord) => <Badge variant="outline">{row.type}</Badge> },
    { key: 'customer', header: lang === 'ar' ? 'العميل' : 'Customer', render: (row: DocumentRecord) => row.customer?.legalName ?? '—' },
    { key: 'shipment', header: lang === 'ar' ? 'الشحنة' : 'Shipment', render: (row: DocumentRecord) => row.shipment?.referenceNumber ?? '—' },
    { key: 'fileSize', header: lang === 'ar' ? 'الحجم' : 'Size', render: (row: DocumentRecord) => row.fileSize == null ? '—' : formatFileSize(row.fileSize) },
    { key: 'isConfidential', header: lang === 'ar' ? 'السرية' : 'Confidential', render: (row: DocumentRecord) => row.isConfidential ? <Badge variant="warning">{lang === 'ar' ? 'سري' : 'Restricted'}</Badge> : '—' },
    { key: 'createdAt', header: lang === 'ar' ? 'تاريخ الرفع' : 'Uploaded', render: (row: DocumentRecord) => formatDate(row.createdAt, lang === 'ar' ? 'ar-EG' : 'en-GB') },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">{lang === 'ar' ? 'المستندات' : 'Documents'}</h1><p className="mt-1 text-sm text-muted-foreground">{lang === 'ar' ? 'إدارة ملفات العملاء والشحنات.' : 'Manage customer and shipment files.'}</p></div>
      <form onSubmit={upload} className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center gap-2 font-semibold"><Upload className="h-4 w-4" />{lang === 'ar' ? 'رفع مستند' : 'Upload document'}</div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="document-file">{lang === 'ar' ? 'الملف (PDF، DOCX، XLSX، JPEG، PNG، WebP، TXT، CSV)' : 'File (PDF, DOCX, XLSX, JPEG, PNG, WebP, TXT, CSV)'}</Label><Input id="document-file" type="file" required accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png,.webp,.txt,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png,image/webp,text/plain,text/csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></div>
          <div className="space-y-2"><Label htmlFor="document-type">{lang === 'ar' ? 'تصنيف المستند' : 'Document category'}</Label><Input id="document-type" required maxLength={80} value={type} onChange={(event) => setType(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="document-customer">{lang === 'ar' ? 'العميل (اختياري)' : 'Customer (optional)'}</Label><select id="document-customer" value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">{lang === 'ar' ? 'بدون ربط' : 'No customer'}</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="document-shipment">{lang === 'ar' ? 'الشحنة (اختياري)' : 'Shipment (optional)'}</Label><select id="document-shipment" value={shipmentId} onChange={(event) => setShipmentId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">{lang === 'ar' ? 'بدون ربط' : 'No shipment'}</option>{shipments.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={confidential} onChange={(event) => setConfidential(event.target.checked)} />{lang === 'ar' ? 'مستند سري (متاح للمدير العام ومدير العمليات فقط)' : 'Confidential (visible to General and Operations Managers only)'}</label>
        <Button type="submit" disabled={uploading}>{uploading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Upload className="me-2 h-4 w-4" />}{lang === 'ar' ? 'رفع الملف' : 'Upload file'}</Button>
      </form>
      <DataTable data={documents} columns={columns} searchable loading={loading} rowKey={(row) => row.id} actions={(row) => <div className="flex gap-2"><Button variant="outline" size="sm" asChild><a href={`/api/documents/${row.id}`}><Download className="h-4 w-4" /></a></Button><Button variant="outline" size="sm" onClick={() => deleteDocument(row)} aria-label={lang === 'ar' ? 'حذف المستند' : 'Delete document'}><Trash2 className="h-4 w-4" /></Button></div>} />
    </div>
  );
}
