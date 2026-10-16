import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  type: z.enum(['customers', 'shipments', 'invoices']),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(100),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeApi('REPORTS', 'EXPORT');
    if (!auth.session) return auth.response;

    const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
    }

    const { type, page, pageSize } = parsed.data;
    const skip = (page - 1) * pageSize;

    if (type === 'customers') {
      const [data, total] = await Promise.all([
        prisma.customer.findMany({
          skip, take: pageSize, orderBy: { createdAt: 'asc' },
          select: { fileNumber: true, legalName: true, type: true, email: true, phone: true, country: true, status: true, createdAt: true },
        }),
        prisma.customer.count(),
      ]);
      return NextResponse.json({ data, total, page, pageSize });
    }

    if (type === 'shipments') {
      const [data, total] = await Promise.all([
        prisma.shipment.findMany({
          skip, take: pageSize, orderBy: { createdAt: 'asc' },
          select: {
            referenceNumber: true, customer: { select: { legalName: true } }, mode: true,
            status: true, origin: true, destination: true, originCountry: true,
            destinationCountry: true, departureDate: true, estimatedArrivalDate: true,
            actualDeliveryDate: true, carrier: true, weight: true, weightUnit: true,
          },
        }),
        prisma.shipment.count(),
      ]);
      return NextResponse.json({ data, total, page, pageSize });
    }

    const [data, total] = await Promise.all([
      prisma.invoice.findMany({
        skip, take: pageSize, orderBy: { createdAt: 'asc' },
        select: {
          invoiceNumber: true, customer: { select: { legalName: true } }, issueDate: true,
          dueDate: true, currency: true, subtotal: true, taxAmount: true,
          discountAmount: true, totalAmount: true, paidAmount: true, status: true,
        },
      }),
      prisma.invoice.count(),
    ]);
    return NextResponse.json({ data, total, page, pageSize });
  } catch (error) {
    console.error('[REPORTS GET]', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
