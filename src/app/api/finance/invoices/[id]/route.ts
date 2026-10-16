import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog, getClientInfo } from '@/lib/audit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const PatchInvoiceSchema = z.object({
  status: z.enum(['DRAFT', 'ISSUED', 'CANCELLED']).optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeApi('FINANCE', 'VIEW');
    if (!auth.session) return auth.response;
    const session = auth.session;

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        customer: { select: { id: true, legalName: true, email: true } },
        shipment: { select: { id: true, referenceNumber: true, mode: true } },
        items: true,
        payments: {
          orderBy: { paidAt: 'desc' },
          include: { recordedBy: { select: { id: true, name: true } } },
        },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!invoice) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    const outstanding = Number(invoice.totalAmount) - Number(invoice.paidAmount);
    return NextResponse.json({ data: { ...invoice, outstanding } });
  } catch (err) {
    console.error('[INVOICE GET]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeApi('FINANCE', 'EDIT');
    if (!auth.session) return auth.response;
    const session = auth.session;

    const body = await req.json();
    const parsed = PatchInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.invoice.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    // Validate status transitions
    if (parsed.data.status) {
      const allowed: Record<string, string[]> = {
        DRAFT: ['ISSUED', 'CANCELLED'],
        ISSUED: ['CANCELLED'],
        PARTIALLY_PAID: [],
        PAID: [],
        OVERDUE: ['CANCELLED'],
        CANCELLED: [],
      };
      const transitions = allowed[existing.status] ?? [];
      if (!transitions.includes(parsed.data.status)) {
        return NextResponse.json({
          error: 'INVALID_STATUS_TRANSITION',
          message: `Cannot change invoice from ${existing.status} to ${parsed.data.status}`,
        }, { status: 400 });
      }
    }

    const invoice = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        ...(parsed.data.status && { status: parsed.data.status }),
        ...(parsed.data.dueDate && { dueDate: new Date(parsed.data.dueDate) }),
        ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
      },
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: session.user.id,
      action: 'UPDATE_INVOICE',
      module: 'FINANCE',
      recordId: params.id,
      oldValues: { status: existing.status },
      newValues: parsed.data,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data: invoice });
  } catch (err) {
    console.error('[INVOICE PATCH]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
