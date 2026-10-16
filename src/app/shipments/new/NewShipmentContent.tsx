'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Plane, Ship, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/components/shared/LanguageProvider';
import { toast } from '@/components/ui/use-toast';

const MODES = [
  { value: 'LAND', label: 'Land', icon: Truck },
  { value: 'SEA', label: 'Sea', icon: Ship },
  { value: 'AIR', label: 'Air', icon: Plane },
];

interface CustomerOption {
  id: string;
  legalName: string;
  fileNumber: string;
}

interface EmployeeOption {
  id: string;
  name: string;
  email: string;
}

const initialForm = {
  customerId: '',
  mode: 'LAND',
  description: '',
  cargoCategory: '',
  origin: '',
  destination: '',
  pickupAddress: '',
  deliveryAddress: '',
  originCountry: '',
  destinationCountry: '',
  departureDate: '',
  estimatedArrivalDate: '',
  carrier: '',
  freightForwarder: '',
  containerNumber: '',
  billOfLading: '',
  airwayBill: '',
  consignmentNote: '',
  packageCount: '',
  weight: '',
  weightUnit: 'KG',
  volume: '',
  volumeUnit: 'CBM',
  customerPrice: '',
  estimatedCosts: '',
  assignedEmployeeId: '',
};

export function NewShipmentContent() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    async function loadOptions() {
      try {
        const customersRes = await fetch('/api/customers?status=ACTIVE&pageSize=100');
        const customersData = await customersRes.json();
        if (!customersRes.ok) throw new Error(customersData.error ?? 'Could not load customers');

        setCustomers((customersData.data ?? []).map((item: CustomerOption) => ({
          id: item.id,
          legalName: item.legalName,
          fileNumber: item.fileNumber,
        })));

        const employeesRes = await fetch('/api/employees?pageSize=100');
        if (employeesRes.ok) {
          const employeesData = await employeesRes.json();
          setEmployees((employeesData.data ?? []).map((item: EmployeeOption) => ({
          id: item.id,
          name: item.name,
          email: item.email,
          })));
        } else if (employeesRes.status !== 403) {
          const employeesData = await employeesRes.json();
          throw new Error(employeesData.error ?? 'Could not load employees');
        }
      } catch (error) {
        toast({
          title: lang === 'ar' ? 'حدثت مشكلة في التحميل' : 'Loading issue',
          description: error instanceof Error
            ? error.message
            : (lang === 'ar' ? 'تعذر تحميل العملاء.' : 'Could not load customers.'),
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    loadOptions();
  }, [lang]);

  const updateField = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.customerId) {
      toast({
        title: lang === 'ar' ? 'معلومات ناقصة' : 'Missing information',
        description: lang === 'ar' ? 'يرجى اختيار العميل.' : 'Please select a customer.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        ...form,
        assignedEmployeeId: form.assignedEmployeeId || undefined,
        departureDate: form.departureDate || undefined,
        estimatedArrivalDate: form.estimatedArrivalDate || undefined,
        packageCount: form.packageCount ? Number(form.packageCount) : undefined,
        weight: form.weight ? Number(form.weight) : undefined,
        volume: form.volume ? Number(form.volume) : undefined,
        customerPrice: form.customerPrice ? Number(form.customerPrice) : undefined,
        estimatedCosts: form.estimatedCosts ? Number(form.estimatedCosts) : undefined,
      };

      const response = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? 'Failed to create shipment');
      }

      toast({
        title: lang === 'ar' ? 'تم إنشاء الشحنة بنجاح' : 'Shipment created',
        description: lang === 'ar' ? 'تم حفظ الشحنة الجديدة.' : 'The new shipment has been saved.',
      });

      router.push('/shipments');
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      toast({
        title: lang === 'ar' ? 'فشل إنشاء الشحنة' : 'Shipment creation failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('shipments.newShipment')}</h1>
          <p className="text-sm text-muted-foreground">
            {lang === 'ar' ? 'إضافة شحنة جديدة' : 'Create a new shipment'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push('/shipments')}>
          <ArrowLeft className="me-2 h-4 w-4" />
          {lang === 'ar' ? 'العودة' : 'Back'}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{lang === 'ar' ? 'معلومات الشحنة' : 'Shipment details'}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="customerId">{lang === 'ar' ? 'العميل' : 'Customer'}</Label>
              <select
                id="customerId"
                value={form.customerId}
                onChange={(e) => updateField('customerId', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={loading}
              >
                <option value="">{lang === 'ar' ? 'اختر العميل' : 'Select customer'}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.legalName} ({customer.fileNumber})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>{lang === 'ar' ? 'طريقة النقل' : 'Transport mode'}</Label>
              <div className="flex flex-wrap gap-2">
                {MODES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateField('mode', value)}
                    className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition ${
                      form.mode === value
                        ? 'border-brand-navy bg-brand-navy text-white'
                        : 'border-input bg-background text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="origin">{lang === 'ar' ? 'المصدر' : 'Origin'}</Label>
              <Input id="origin" required value={form.origin} onChange={(e) => updateField('origin', e.target.value)} placeholder={lang === 'ar' ? 'القاهرة' : 'Cairo'} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination">{lang === 'ar' ? 'الوجهة' : 'Destination'}</Label>
              <Input id="destination" required value={form.destination} onChange={(e) => updateField('destination', e.target.value)} placeholder={lang === 'ar' ? 'دبي' : 'Dubai'} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="originCountry">{lang === 'ar' ? 'الدولة المصدر' : 'Origin country'}</Label>
              <Input id="originCountry" value={form.originCountry} onChange={(e) => updateField('originCountry', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="destinationCountry">{lang === 'ar' ? 'دولة الوجهة' : 'Destination country'}</Label>
              <Input id="destinationCountry" value={form.destinationCountry} onChange={(e) => updateField('destinationCountry', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="carrier">{lang === 'ar' ? 'الناقل' : 'Carrier'}</Label>
              <Input id="carrier" value={form.carrier} onChange={(e) => updateField('carrier', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="freightForwarder">{lang === 'ar' ? 'المتعهّد اللوجستي' : 'Freight forwarder'}</Label>
              <Input id="freightForwarder" value={form.freightForwarder} onChange={(e) => updateField('freightForwarder', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cargoCategory">{lang === 'ar' ? 'فئة البضاعة' : 'Cargo category'}</Label>
              <Input id="cargoCategory" value={form.cargoCategory} onChange={(e) => updateField('cargoCategory', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedEmployeeId">{lang === 'ar' ? 'الموظف المسؤول' : 'Assigned employee'}</Label>
              <select
                id="assignedEmployeeId"
                value={form.assignedEmployeeId}
                onChange={(e) => updateField('assignedEmployeeId', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">{lang === 'ar' ? 'اختر الموظف' : 'Select employee'}</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} ({employee.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="departureDate">{lang === 'ar' ? 'تاريخ المغادرة' : 'Departure date'}</Label>
              <Input id="departureDate" type="date" value={form.departureDate} onChange={(e) => updateField('departureDate', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedArrivalDate">{lang === 'ar' ? 'تاريخ الوصول المتوقع' : 'Estimated arrival'}</Label>
              <Input id="estimatedArrivalDate" type="date" value={form.estimatedArrivalDate} onChange={(e) => updateField('estimatedArrivalDate', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="packageCount">{lang === 'ar' ? 'عدد الطرود' : 'Packages'}</Label>
              <Input id="packageCount" type="number" min="1" value={form.packageCount} onChange={(e) => updateField('packageCount', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">{lang === 'ar' ? 'الوزن' : 'Weight'}</Label>
              <div className="flex gap-2">
                <Input id="weight" type="number" step="0.01" value={form.weight} onChange={(e) => updateField('weight', e.target.value)} className="flex-1" />
                <select value={form.weightUnit} onChange={(e) => updateField('weightUnit', e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="KG">KG</option>
                  <option value="LB">LB</option>
                  <option value="TON">TON</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="volume">{lang === 'ar' ? 'الحجم' : 'Volume'}</Label>
              <div className="flex gap-2">
                <Input id="volume" type="number" step="0.01" value={form.volume} onChange={(e) => updateField('volume', e.target.value)} className="flex-1" />
                <select value={form.volumeUnit} onChange={(e) => updateField('volumeUnit', e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="CBM">CBM</option>
                  <option value="CFT">CFT</option>
                  <option value="L">L</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerPrice">{lang === 'ar' ? 'سعر العميل' : 'Customer price'}</Label>
              <Input id="customerPrice" type="number" step="0.01" value={form.customerPrice} onChange={(e) => updateField('customerPrice', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedCosts">{lang === 'ar' ? 'التكلفة المقدرة' : 'Estimated costs'}</Label>
              <Input id="estimatedCosts" type="number" step="0.01" value={form.estimatedCosts} onChange={(e) => updateField('estimatedCosts', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="containerNumber">{lang === 'ar' ? 'رقم الحاوية' : 'Container number'}</Label>
              <Input id="containerNumber" value={form.containerNumber} onChange={(e) => updateField('containerNumber', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="billOfLading">{lang === 'ar' ? 'BL' : 'Bill of lading'}</Label>
              <Input id="billOfLading" value={form.billOfLading} onChange={(e) => updateField('billOfLading', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="airwayBill">{lang === 'ar' ? 'AWB' : 'Airway bill'}</Label>
              <Input id="airwayBill" value={form.airwayBill} onChange={(e) => updateField('airwayBill', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="consignmentNote">{lang === 'ar' ? 'مذكرة الشحنة' : 'Consignment note'}</Label>
              <Input id="consignmentNote" value={form.consignmentNote} onChange={(e) => updateField('consignmentNote', e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="pickupAddress">{lang === 'ar' ? 'عنوان الاستلام' : 'Pickup address'}</Label>
              <Input id="pickupAddress" value={form.pickupAddress} onChange={(e) => updateField('pickupAddress', e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="deliveryAddress">{lang === 'ar' ? 'عنوان التسليم' : 'Delivery address'}</Label>
              <Input id="deliveryAddress" value={form.deliveryAddress} onChange={(e) => updateField('deliveryAddress', e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">{lang === 'ar' ? 'الوصف' : 'Description'}</Label>
              <Textarea id="description" value={form.description} onChange={(e) => updateField('description', e.target.value)} rows={4} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push('/shipments')}>
            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button type="submit" disabled={submitting || loading}>
            {submitting ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {lang === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
              </>
            ) : (
              lang === 'ar' ? 'حفظ الشحنة' : 'Save shipment'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
