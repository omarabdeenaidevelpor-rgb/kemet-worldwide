import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { authorizeApi } from '@/lib/api-auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { createAuditLog, getClientInfo } from '@/lib/audit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CreateShipmentSchema = z.object({
  customerId: z.string().min(1),
  mode: z.enum(['LAND', 'SEA', 'AIR']),
  description: z.string().optional(),
  cargoCategory: z.string().optional(),
  origin: z.string().min(1),
  destination: z.string().min(1),
  pickupAddress: z.string().optional(),
  deliveryAddress: z.string().optional(),
  originCountry: z.string().optional(),
  destinationCountry: z.string().optional(),
  departureDate: z.string().optional(),
  estimatedArrivalDate: z.string().optional(),
  carrier: z.string().optional(),
  freightForwarder: z.string().optional(),
  containerNumber: z.string().optional(),
  billOfLading: z.string().optional(),
  airwayBill: z.string().optional(),
  consignmentNote: z.string().optional(),
  packageCount: z.number().int().positive().optional(),
  weight: z.number().positive().optional(),
  weightUnit: z.enum(['KG', 'LB', 'TON']).optional(),
  volume: z.number().positive().optional(),
  volumeUnit: z.enum(['CBM', 'CFT', 'L']).optional(),
  customerPrice: z.number().positive().optional(),
  estimatedCosts: z.number().positive().optional(),
  assignedEmployeeId: z.string().optional().transform((value) => value || undefined),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeApi('SHIPMENTS', 'VIEW');
    if (!auth.session) return auth.response;
    const canViewFinance = hasPermission(auth.session.user.permissions, auth.session.user.roles, 'FINANCE', 'VIEW');

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? '';
    const status = searchParams.get('status') ?? '';
    const mode = searchParams.get('mode') ?? '';
    const customerId = searchParams.get('customerId') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') ?? '20'));

    const where: any = {};
    if (search) {
      where.OR = [
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { origin: { contains: search, mode: 'insensitive' } },
        { destination: { contains: search, mode: 'insensitive' } },
        { carrier: { contains: search, mode: 'insensitive' } },
        { containerNumber: { contains: search, mode: 'insensitive' } },
        { billOfLading: { contains: search, mode: 'insensitive' } },
        { airwayBill: { contains: search, mode: 'insensitive' } },
        { customer: { legalName: { contains: search, mode: 'insensitive' } } },
        {
          containers: {
            some: {
              OR: [
                { containerNumber: { contains: search, mode: 'insensitive' } },
                { truckNumber: { contains: search, mode: 'insensitive' } },
                { billOfLading: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }
    if (status) where.status = status;
    if (mode) where.mode = mode;
    if (customerId) where.customerId = customerId;

    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ isOffloaded: 'asc' }, { docsReceivedDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          customer: { select: { id: true, legalName: true, fileNumber: true } },
          assignedEmployee: { select: { id: true, name: true } },
          _count: { select: { trackingEvents: true, incidents: true, documents: true, containers: true } },
        },
      }),
      prisma.shipment.count({ where }),
    ]);

    const data = canViewFinance ? shipments : shipments.map((shipment) => ({
      ...shipment,
      customerPrice: null,
      estimatedCosts: null,
      actualCosts: null,
      margin: null,
    }));
    return NextResponse.json({ data, total, page, pageSize });
  } catch (err) {
    console.error('[SHIPMENTS GET]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeApi('SHIPMENTS', 'CREATE');
    if (!auth.session) return auth.response;

    const body = await req.json();
    const parsed = CreateShipmentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });

    const year = new Date().getFullYear();
    const referenceNumber = `KMT-${parsed.data.mode[0]}${year}-${randomUUID().slice(0, 8).toUpperCase()}`;

    const shipment = await prisma.$transaction(async (transaction) => {
      const createdShipment = await transaction.shipment.create({
        data: {
          ...parsed.data,
          referenceNumber,
          departureDate: parsed.data.departureDate ? new Date(parsed.data.departureDate) : null,
          estimatedArrivalDate: parsed.data.estimatedArrivalDate ? new Date(parsed.data.estimatedArrivalDate) : null,
          status: 'DRAFT',
        },
        include: { customer: { select: { id: true, legalName: true } } },
      });
      await transaction.shipmentStatusHistory.create({
        data: {
          shipmentId: createdShipment.id,
          toStatus: 'DRAFT',
          changedBy: auth.session.user.id,
          notes: 'Shipment created',
        },
      });
      return createdShipment;
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: auth.session.user.id,
      action: 'CREATE',
      module: 'SHIPMENTS',
      recordId: shipment.id,
      newValues: { referenceNumber, customerId: shipment.customerId },
      ipAddress, userAgent,
    });

    return NextResponse.json({ data: shipment }, { status: 201 });
  } catch (err) {
    console.error('[SHIPMENTS POST]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
