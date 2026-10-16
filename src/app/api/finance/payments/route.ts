import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { authorizeApi } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog, getClientInfo } from '@/lib/audit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CreatePaymentSchema = z.object({
  customerId: z.string().min(1),
  invoiceId: z.string().optional(),
  amount: z.number().positive(),
  currency: z.string().regex(/^[A-Za-z]{3}$/).transform((value) => value.toUpperCase()).default('USD'),
  method: z.enum(['BANK_TRANSFER', 'CASH', 'CHEQUE', 'CARD', 'ONLINE']),
  reference: z.string().optional(),
  paidAt: z.string().datetime(),
  notes: z.string().optional(),
});

class PaymentValidationError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeApi('FINANCE', 'VIEW');
    if (!auth.session) return auth.response;

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') ?? '20'));

    const where: any = {};
    if (customerId) where.customerId = customerId;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { paidAt: 'desc' },
        include: {
          customer: { select: { id: true, legalName: true } },
          invoice: { select: { id: true, invoiceNumber: true } },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({ data: payments, total, page, pageSize });
  } catch (err) {
    console.error('[PAYMENTS GET]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeApi('FINANCE', 'CREATE');
    if (!auth.session) return auth.response;

    const body = await req.json();
    const parsed = CreatePaymentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });

    const year = new Date().getFullYear();
    const paymentNumber = `KMT-PAY-${year}-${randomUUID().slice(0, 8).toUpperCase()}`;

    const payment = await prisma.$transaction(async (tx) => {
      if (parsed.data.invoiceId) {
        const invoice = await tx.invoice.findUnique({ where: { id: parsed.data.invoiceId } });
        if (!invoice) throw new PaymentValidationError('INVOICE_NOT_FOUND');
        if (invoice.customerId !== parsed.data.customerId) throw new PaymentValidationError('INVOICE_CUSTOMER_MISMATCH');
        if (invoice.currency !== parsed.data.currency) throw new PaymentValidationError('CURRENCY_MISMATCH');
        if (invoice.status === 'CANCELLED') throw new PaymentValidationError('INVOICE_CANCELLED');
        if (parsed.data.amount > Number(invoice.totalAmount) - Number(invoice.paidAmount)) {
          throw new PaymentValidationError('PAYMENT_EXCEEDS_BALANCE');
        }
      }

      const pay = await tx.payment.create({
        data: {
          paymentNumber,
          customerId: parsed.data.customerId,
          invoiceId: parsed.data.invoiceId ?? null,
          amount: parsed.data.amount,
          currency: parsed.data.currency,
          method: parsed.data.method,
          reference: parsed.data.reference ?? null,
          paidAt: new Date(parsed.data.paidAt),
          notes: parsed.data.notes ?? null,
          recordedById: auth.session.user.id,
        },
      });

      // Update invoice paidAmount if linked
      if (parsed.data.invoiceId) {
        const inv = await tx.invoice.findUnique({ where: { id: parsed.data.invoiceId } });
        if (!inv) throw new PaymentValidationError('INVOICE_NOT_FOUND');
        const newPaid = Number(inv.paidAmount) + parsed.data.amount;
        const newStatus = newPaid >= Number(inv.totalAmount) ? 'PAID' : 'PARTIALLY_PAID';
        await tx.invoice.update({
          where: { id: parsed.data.invoiceId },
          data: { paidAmount: newPaid, status: newStatus },
        });
      }

      return pay;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: auth.session.user.id, action: 'CREATE', module: 'FINANCE',
      recordId: payment.id, newValues: { paymentNumber, amount: parsed.data.amount }, ipAddress, userAgent,
    });

    return NextResponse.json({ data: payment }, { status: 201 });
  } catch (err) {
    if (err instanceof PaymentValidationError) {
      const status = err.code === 'INVOICE_NOT_FOUND' ? 404 : 400;
      return NextResponse.json({ error: err.code }, { status });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
      return NextResponse.json({ error: 'PAYMENT_CONFLICT_RETRY' }, { status: 409 });
    }
    console.error('[PAYMENTS POST]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
