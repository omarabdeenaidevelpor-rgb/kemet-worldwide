import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { authorizeApi } from '@/lib/api-auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const DEMO_MODE = !process.env.DATABASE_URL;

type IncidentStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

const CreateIncidentSchema = z.object({
  shipmentId: z.string().optional(),
  customerId: z.string().optional(),
  type: z.string().trim().min(1).max(100),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(10000),
  assignedToId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeApi('INCIDENTS', 'VIEW');
    if (!auth.session) return auth.response;

    const { searchParams } = new URL(req.url);
    const rawStatus = searchParams.get('status') ?? '';
    const rawSeverity = searchParams.get('severity') ?? '';
    const status = rawStatus ? z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).safeParse(rawStatus) : null;
    const severity = rawSeverity ? z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).safeParse(rawSeverity) : null;
    if (rawStatus && !status?.success) return NextResponse.json({ error: 'INVALID_STATUS' }, { status: 400 });
    if (rawSeverity && !severity?.success) return NextResponse.json({ error: 'INVALID_SEVERITY' }, { status: 400 });
    const pageValue = Number.parseInt(searchParams.get('page') ?? '1', 10);
    const sizeValue = Number.parseInt(searchParams.get('pageSize') ?? '20', 10);
    const page = Number.isFinite(pageValue) ? Math.max(1, pageValue) : 1;
    const pageSize = Number.isFinite(sizeValue) ? Math.min(100, Math.max(1, sizeValue)) : 20;

    // ── DEMO MODE ────────────────────────────────────────────────────────────
    if (DEMO_MODE) {
      const { DEMO_INCIDENTS } = await import('@/lib/demo-data');
      let filtered = DEMO_INCIDENTS.filter(i => {
        if (status?.success && i.status !== status.data) return false;
        if (severity?.success && i.severity !== severity.data) return false;
        return true;
      });
      const total = filtered.length;
      const data = filtered.slice((page - 1) * pageSize, page * pageSize);
      return NextResponse.json({ data, total, page, pageSize });
    }

    // ── NORMAL MODE ──────────────────────────────────────────────────────────
    const { prisma } = await import('@/lib/prisma');
    const where: any = {};
    if (status?.success) where.status = status.data;
    if (severity?.success) where.severity = severity.data;

    const [incidents, total] = await Promise.all([
      prisma.incident.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { reportedAt: 'desc' },
        include: {
          shipment: { select: { id: true, referenceNumber: true } },
          customer: { select: { id: true, legalName: true } },
          assignedTo: { select: { id: true, name: true } },
          reportedBy: { select: { id: true, name: true } },
          _count: { select: { updates: true } },
        },
      }),
      prisma.incident.count({ where }),
    ]);

    return NextResponse.json({ data: incidents, total, page, pageSize });
  } catch (error) {
    console.error('[INCIDENTS GET]', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeApi('INCIDENTS', 'CREATE');
    if (!auth.session) return auth.response;

    const parsed = CreateIncidentSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
    }

    const referenceNumber = `INC-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;

    // ── DEMO MODE ────────────────────────────────────────────────────────────
    if (DEMO_MODE) {
      return NextResponse.json({ data: { id: randomUUID(), referenceNumber, ...parsed.data, status: 'OPEN', reportedById: 'demo', createdAt: new Date().toISOString() } }, { status: 201 });
    }

    // ── NORMAL MODE ──────────────────────────────────────────────────────────
    const { prisma } = await import('@/lib/prisma');
    const { createAuditLog, getClientInfo } = await import('@/lib/audit');

    let shipmentCustomerId: string | null = null;
    if (parsed.data.shipmentId) {
      const shipment = await prisma.shipment.findUnique({ where: { id: parsed.data.shipmentId }, select: { id: true, customerId: true } });
      if (!shipment) return NextResponse.json({ error: 'SHIPMENT_NOT_FOUND' }, { status: 404 });
      if (parsed.data.customerId && parsed.data.customerId !== shipment.customerId) {
        return NextResponse.json({ error: 'SHIPMENT_CUSTOMER_MISMATCH' }, { status: 400 });
      }
      shipmentCustomerId = shipment.customerId;
    }
    if (parsed.data.customerId && !shipmentCustomerId) {
      const customer = await prisma.customer.findUnique({ where: { id: parsed.data.customerId }, select: { id: true } });
      if (!customer) return NextResponse.json({ error: 'CUSTOMER_NOT_FOUND' }, { status: 404 });
    }
    if (parsed.data.assignedToId) {
      const assignee = await prisma.user.findUnique({ where: { id: parsed.data.assignedToId }, select: { id: true, isActive: true } });
      if (!assignee?.isActive) return NextResponse.json({ error: 'ASSIGNEE_NOT_FOUND' }, { status: 404 });
    }
    const referenceNumber = `INC-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const incident = await prisma.incident.create({
      data: {
        ...parsed.data,
        referenceNumber,
        reportedById: auth.session.user.id,
        shipmentId: parsed.data.shipmentId ?? null,
        customerId: parsed.data.customerId ?? shipmentCustomerId,
        assignedToId: parsed.data.assignedToId ?? null,
      },
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: auth.session.user.id,
      action: 'CREATE',
      module: 'INCIDENTS',
      recordId: incident.id,
      newValues: { referenceNumber, severity: incident.severity, title: incident.title },
      ipAddress,
      userAgent,
    });
    return NextResponse.json({ data: incident }, { status: 201 });
  } catch (error) {
    console.error('[INCIDENTS POST]', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authorizeApi('INCIDENTS', 'EDIT');
    if (!auth.session) return auth.response;

    const parsed2 = z.object({
      id: z.string().min(1),
      status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
      assignedToId: z.string().nullable().optional(),
      update: z.string().trim().min(1).max(5000).optional(),
    }).refine((value) => value.status !== undefined || value.assignedToId !== undefined || value.update !== undefined)
      .safeParse(await req.json());
    if (!parsed2.success) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed2.error.flatten() }, { status: 400 });
    }

    // ── DEMO MODE ────────────────────────────────────────────────────────────
    if (DEMO_MODE) {
      return NextResponse.json({ data: { id: parsed2.data.id, ...parsed2.data } });
    }

    // ── NORMAL MODE ──────────────────────────────────────────────────────────
    const { prisma: prisma2 } = await import('@/lib/prisma');
    const { createAuditLog: createAuditLog2, getClientInfo: getClientInfo2 } = await import('@/lib/audit');

    const existing = await prisma2.incident.findUnique({ where: { id: parsed2.data.id } });
    if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    const transitions: Record<IncidentStatus, IncidentStatus[]> = {
      OPEN: ['IN_PROGRESS', 'RESOLVED'],
      IN_PROGRESS: ['OPEN', 'RESOLVED'],
      RESOLVED: ['OPEN', 'CLOSED'],
      CLOSED: [],
    };
    if (parsed2.data.status && parsed2.data.status !== existing.status && !transitions[existing.status].includes(parsed2.data.status)) {
      return NextResponse.json({ error: 'INVALID_STATUS_TRANSITION' }, { status: 409 });
    }
    if (parsed2.data.assignedToId) {
      const assignee = await prisma2.user.findUnique({ where: { id: parsed2.data.assignedToId }, select: { id: true, isActive: true } });
      if (!assignee?.isActive) return NextResponse.json({ error: 'ASSIGNEE_NOT_FOUND' }, { status: 404 });
    }

    const incident = await prisma2.$transaction(async (transaction) => {
      if (parsed2.data.status && parsed2.data.status !== existing.status) {
        const changed = await transaction.incident.updateMany({
          where: { id: existing.id, status: existing.status },
          data: {
            status: parsed2.data.status,
            resolvedAt: parsed2.data.status === 'RESOLVED' || parsed2.data.status === 'CLOSED' ? new Date() : null,
            ...(parsed2.data.assignedToId !== undefined ? { assignedToId: parsed2.data.assignedToId } : {}),
          },
        });
        if (changed.count === 0) throw new Error('INCIDENT_STATE_CHANGED');
      } else if (parsed2.data.assignedToId !== undefined) {
        await transaction.incident.update({
          where: { id: existing.id },
          data: { assignedToId: parsed2.data.assignedToId },
        });
      }

      if (parsed2.data.update) {
        await transaction.incidentUpdate.create({
          data: { incidentId: existing.id, authorId: auth.session.user.id, content: parsed2.data.update },
        });
      }

      return transaction.incident.findUniqueOrThrow({
        where: { id: existing.id },
        include: {
          assignedTo: { select: { id: true, name: true } },
          _count: { select: { updates: true } },
        },
      });
    });

    const { ipAddress, userAgent } = getClientInfo2(req);
    await createAuditLog2({
      userId: auth.session.user.id,
      action: 'UPDATE',
      module: 'INCIDENTS',
      recordId: incident.id,
      oldValues: { status: existing.status, assignedToId: existing.assignedToId },
      newValues: { status: incident.status, assignedToId: incident.assignedToId },
      ipAddress,
      userAgent,
    });
    return NextResponse.json({ data: incident });
  } catch (error) {
    if (error instanceof Error && error.message === 'INCIDENT_STATE_CHANGED') {
      return NextResponse.json({ error: 'INCIDENT_STATE_CHANGED' }, { status: 409 });
    }
    console.error('[INCIDENTS PATCH]', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
