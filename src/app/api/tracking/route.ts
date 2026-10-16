import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog, getClientInfo } from '@/lib/audit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const AddEventSchema = z.object({
  shipmentId: z.string().min(1),
  eventType: z.string().min(1),
  location: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  description: z.string().optional(),
  source: z.enum(['MANUAL', 'API', 'GPS', 'WEBHOOK']).default('MANUAL'),
  isVerified: z.boolean().default(false),
  occurredAt: z.string(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeApi('TRACKING', 'VIEW');
    if (!auth.session) return auth.response;
    const session = auth.session;

    const { searchParams } = new URL(req.url);
    const shipmentId = searchParams.get('shipmentId') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') ?? '20'));

    // Return active (IN_TRANSIT) shipments with their latest tracking event
    if (!shipmentId) {
      const shipments = await prisma.shipment.findMany({
        where: { status: { in: ['IN_TRANSIT', 'PICKUP', 'CUSTOMS', 'OUT_FOR_DELIVERY'] } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          customer: { select: { id: true, legalName: true } },
          trackingEvents: {
            orderBy: { occurredAt: 'desc' },
            take: 1,
          },
        },
      });
      const total = await prisma.shipment.count({
        where: { status: { in: ['IN_TRANSIT', 'PICKUP', 'CUSTOMS', 'OUT_FOR_DELIVERY'] } },
      });
      return NextResponse.json({ data: shipments, total, page, pageSize });
    }

    // Return all tracking events for a specific shipment
    const events = await prisma.trackingEvent.findMany({
      where: { shipmentId },
      orderBy: { occurredAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    const total = await prisma.trackingEvent.count({ where: { shipmentId } });
    return NextResponse.json({ data: events, total, page, pageSize });
  } catch (err) {
    console.error('[TRACKING GET]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeApi('TRACKING', 'CREATE');
    if (!auth.session) return auth.response;
    const session = auth.session;

    const body = await req.json();
    const parsed = AddEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
    }

    const shipment = await prisma.shipment.findUnique({ where: { id: parsed.data.shipmentId } });
    if (!shipment) return NextResponse.json({ error: 'SHIPMENT_NOT_FOUND' }, { status: 404 });

    const event = await prisma.trackingEvent.create({
      data: {
        shipmentId: parsed.data.shipmentId,
        eventType: parsed.data.eventType,
        location: parsed.data.location ?? null,
        latitude: parsed.data.latitude ?? null,
        longitude: parsed.data.longitude ?? null,
        description: parsed.data.description ?? null,
        source: parsed.data.source,
        isVerified: parsed.data.isVerified,
        occurredAt: new Date(parsed.data.occurredAt),
      },
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: session.user.id,
      action: 'ADD_TRACKING_EVENT',
      module: 'TRACKING',
      recordId: shipment.id,
      newValues: { eventType: parsed.data.eventType, location: parsed.data.location },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data: event }, { status: 201 });
  } catch (err) {
    console.error('[TRACKING POST]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
