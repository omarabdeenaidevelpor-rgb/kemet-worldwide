import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { authorizeApi } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog, getClientInfo } from '@/lib/audit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const InvoiceItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
});

const CreateInvoiceSchema = z.object({
  customerId: z.string().min(1),
  shipmentId: z.string().optional(),
  dueDate: z.string().date().optional(),
  currency: z.string().regex(/^[A-Za-z]{3}$/).transform((value) => value.toUpperCase()).default('USD'),
  taxAmount: z.number().min(0).default(0),
  discountAmount: z.number().min(0).default(0),
  notes: z.string().optional(),
  items: z.array(InvoiceItemSchema).min(1),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeApi('FINANCE', 'VIEW');
    if (!auth.session) return auth.response;

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId') ?? '';
    const status = searchParams.get('status') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') ?? '20'));

    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, legalName: true } },
          shipment: { select: { id: true, referenceNumber: true } },
          items: true,
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({ data: invoices, total, page, pageSize });
  } catch (err) {
    console.error('[INVOICES GET]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeApi('FINANCE', 'CREATE');
    if (!auth.session) return auth.response;

    const body = await req.json();
    const parsed = CreateInvoiceSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });

    const year = new Date().getFullYear();
    const invoiceNumber = `KMT-INV-${year}-${randomUUID().slice(0, 8).toUpperCase()}`;

    const subtotal = parsed.data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const totalAmount = subtotal + parsed.data.taxAmount - parsed.data.discountAmount;
    if (totalAmount <= 0) {
      return NextResponse.json({ error: 'INVOICE_TOTAL_MUST_BE_POSITIVE' }, { status: 400 });
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: parsed.data.customerId,
        shipmentId: parsed.data.shipmentId ?? null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        currency: parsed.data.currency,
        subtotal,
        taxAmount: parsed.data.taxAmount,
        discountAmount: parsed.data.discountAmount,
        totalAmount,
        notes: parsed.data.notes ?? null,
        createdById: auth.session.user.id,
        status: 'DRAFT',
        items: {
          create: parsed.data.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          })),
        },
      },
      include: { items: true, customer: { select: { legalName: true } } },
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: auth.session.user.id, action: 'CREATE', module: 'FINANCE',
      recordId: invoice.id, newValues: { invoiceNumber, totalAmount }, ipAddress, userAgent,
    });

    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (err) {
    console.error('[INVOICES POST]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
