import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/api-auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { createAuditLog, getClientInfo } from '@/lib/audit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Valid status transitions
const TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['QUOTATION', 'BOOKED', 'CANCELLED'],
  QUOTATION: ['BOOKED', 'CANCELLED'],
  BOOKED: ['PICKUP', 'CANCELLED'],
  PICKUP: ['IN_TRANSIT', 'ON_HOLD', 'CANCELLED'],
  IN_TRANSIT: ['CUSTOMS', 'OUT_FOR_DELIVERY', 'DELAYED', 'EXCEPTION', 'ON_HOLD'],
  CUSTOMS: ['OUT_FOR_DELIVERY', 'DELAYED', 'ON_HOLD'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'EXCEPTION'],
  DELIVERED: [],
  ON_HOLD: ['IN_TRANSIT', 'CANCELLED'],
  DELAYED: ['IN_TRANSIT', 'CANCELLED'],
  EXCEPTION: ['IN_TRANSIT', 'RETURNED', 'CANCELLED'],
  CANCELLED: [],
  RETURNED: [],
};

const UpdateShipmentSchema = z.object({
  status: z.enum([
    'DRAFT', 'QUOTATION', 'BOOKED', 'PICKUP', 'IN_TRANSIT', 'CUSTOMS',
    'OUT_FOR_DELIVERY', 'DELIVERED', 'ON_HOLD', 'DELAYED', 'EXCEPTION',
    'CANCELLED', 'RETURNED',
  ]),
  statusNote: z.string().trim().max(5000).optional(),
});

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeApi('SHIPMENTS', 'VIEW');
    if (!auth.session) return auth.response;
    const canViewFinance = hasPermission(auth.session.user.permissions, auth.session.user.roles, 'FINANCE', 'VIEW');
    const canViewConfidentialDocuments = auth.session.user.roles?.some((role) => ['GENERAL_MANAGER', 'OPERATIONS_MANAGER'].includes(role)) ?? false;

    const shipment = await prisma.shipment.findUnique({
      where: { id: params.id },
      include: {
        customer: { select: { id: true, legalName: true, fileNumber: true, email: true, phone: true } },
        assignedEmployee: { select: { id: true, name: true, email: true } },
        legs: { orderBy: { legOrder: 'asc' } },
        statusHistory: {
          orderBy: { changedAt: 'desc' },
          include: { user: { select: { id: true, name: true } } },
        },
        trackingEvents: { orderBy: { occurredAt: 'desc' }, take: 200 },
        containers: { orderBy: { createdAt: 'asc' } },
        incidents: {
          select: { id: true, title: true, severity: true, status: true, reportedAt: true },
          orderBy: { reportedAt: 'desc' },
        },
        invoices: {
          select: { id: true, invoiceNumber: true, totalAmount: true, paidAmount: true, status: true, currency: true },
        },
        documents: {
          where: canViewConfidentialDocuments ? {} : { isConfidential: false },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, name: true, type: true, fileSize: true, mimeType: true,
            isConfidential: true, createdAt: true,
          },
        },
      },
    });

    if (!shipment) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    const baseCurrency = await prisma.currency.findFirst({ where: { isBase: true }, select: { code: true } });

    if (canViewFinance) return NextResponse.json({ data: { ...shipment, baseCurrency: baseCurrency?.code ?? 'USD' } });
    return NextResponse.json({
      data: {
        ...shipment,
        baseCurrency: baseCurrency?.code ?? 'USD',
        customerPrice: null,
        estimatedCosts: null,
        actualCosts: null,
        margin: null,
        invoices: [],
      },
    });
  } catch (err) {
    console.error('[SHIPMENT GET]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeApi('SHIPMENTS', 'EDIT');
    if (!auth.session) return auth.response;

    const parsed = UpdateShipmentSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.shipment.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    if (parsed.data.status !== existing.status) {
      const allowed = TRANSITIONS[existing.status] ?? [];
      if (!allowed.includes(parsed.data.status)) {
        return NextResponse.json({
          error: 'INVALID_STATUS_TRANSITION',
          message: `Cannot transition from ${existing.status} to ${parsed.data.status}`,
        }, { status: 400 });
      }
    }

    const shipment = parsed.data.status === existing.status
      ? existing
      : await prisma.$transaction(async (transaction) => {
        const changed = await transaction.shipment.updateMany({
          where: { id: params.id, status: existing.status },
          data: {
            status: parsed.data.status,
            ...(parsed.data.status === 'IN_TRANSIT' && !existing.actualDepartureDate ? { actualDepartureDate: new Date() } : {}),
            ...(parsed.data.status === 'DELIVERED' ? { actualDeliveryDate: new Date() } : {}),
          },
        });
        if (changed.count === 0) throw new Error('SHIPMENT_STATE_CHANGED');
        await transaction.shipmentStatusHistory.create({
          data: {
            shipmentId: params.id,
            fromStatus: existing.status,
            toStatus: parsed.data.status,
            changedBy: auth.session.user.id,
            notes: parsed.data.statusNote ?? null,
          },
        });
        return transaction.shipment.findUniqueOrThrow({ where: { id: params.id } });
      });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: auth.session.user.id,
      action: 'UPDATE',
      module: 'SHIPMENTS',
      recordId: params.id,
      oldValues: { status: existing.status },
      newValues: parsed.data,
      ipAddress, userAgent,
    });

    return NextResponse.json({ data: shipment });
  } catch (err) {
    if (err instanceof Error && err.message === 'SHIPMENT_STATE_CHANGED') {
      return NextResponse.json({ error: 'SHIPMENT_STATE_CHANGED' }, { status: 409 });
    }
    console.error('[SHIPMENT PATCH]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
