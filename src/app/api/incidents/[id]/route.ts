import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog, getClientInfo } from '@/lib/audit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const PatchIncidentSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  assignedToId: z.string().optional(),
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  resolvedAt: z.string().optional(),
});

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeApi('INCIDENTS', 'VIEW');
    if (!auth.session) return auth.response;
    const session = auth.session;

    const incident = await prisma.incident.findUnique({
      where: { id: params.id },
      include: {
        shipment: { select: { id: true, referenceNumber: true, mode: true, status: true } },
        customer: { select: { id: true, legalName: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        reportedBy: { select: { id: true, name: true } },
        documents: true,
        updates: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, name: true } } },
        },
      },
    });

    if (!incident) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    return NextResponse.json({ data: incident });
  } catch (err) {
    console.error('[INCIDENT GET]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeApi('INCIDENTS', 'EDIT');
    if (!auth.session) return auth.response;
    const session = auth.session;

    const body = await req.json();
    const parsed = PatchIncidentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.incident.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    if (parsed.data.status) updateData.status = parsed.data.status;
    if (parsed.data.severity) updateData.severity = parsed.data.severity;
    if (parsed.data.assignedToId !== undefined) updateData.assignedToId = parsed.data.assignedToId || null;
    if (parsed.data.title) updateData.title = parsed.data.title;
    if (parsed.data.description) updateData.description = parsed.data.description;
    if (parsed.data.resolvedAt) updateData.resolvedAt = new Date(parsed.data.resolvedAt);
    if (parsed.data.status === 'RESOLVED' && !existing.resolvedAt) {
      updateData.resolvedAt = new Date();
    }

    const incident = await prisma.incident.update({
      where: { id: params.id },
      data: updateData,
    });

    // Auto-add a status change update
    if (parsed.data.status && parsed.data.status !== existing.status) {
      await prisma.incidentUpdate.create({
        data: {
          incidentId: params.id,
          authorId: session.user.id,
          content: `Status changed from ${existing.status} to ${parsed.data.status}`,
        },
      });
    }

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: session.user.id,
      action: 'UPDATE_INCIDENT',
      module: 'INCIDENTS',
      recordId: params.id,
      oldValues: { status: existing.status, severity: existing.severity },
      newValues: parsed.data,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data: incident });
  } catch (err) {
    console.error('[INCIDENT PATCH]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
