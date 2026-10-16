import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { authorizeApi } from '@/lib/api-auth';
import { hasPermission } from '@/lib/permissions';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const DEMO_MODE = !process.env.DATABASE_URL;

const CreateCustomerSchema = z.object({
  type: z.enum(['INDIVIDUAL', 'COMPANY']),
  legalName: z.string().min(2).max(200),
  primaryContactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  country: z.string().optional(),
  taxNumber: z.string().optional(),
  accountManagerId: z.string().optional(),
  creditLimit: z.number().positive().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeApi('CUSTOMERS', 'VIEW');
    if (!auth.session) return auth.response;
    const canViewFinance = hasPermission(auth.session.user.permissions, auth.session.user.roles, 'FINANCE', 'VIEW');

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') ?? '').toLowerCase();
    const status = searchParams.get('status') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') ?? '20'));

    // ── DEMO MODE ────────────────────────────────────────────────────────────
    if (DEMO_MODE) {
      const { DEMO_CUSTOMERS } = await import('@/lib/demo-data');
      let filtered = DEMO_CUSTOMERS.filter(c => {
        if (search && !c.legalName.toLowerCase().includes(search) && !(c.email ?? '').toLowerCase().includes(search) && !(c.phone ?? '').includes(search)) return false;
        if (status && c.status !== status) return false;
        return true;
      });
      const total = filtered.length;
      const data = filtered.slice((page - 1) * pageSize, page * pageSize).map(c =>
        canViewFinance ? c : { ...c, creditLimit: null }
      );
      return NextResponse.json({ data, total, page, pageSize });
    }

    // ── NORMAL MODE ──────────────────────────────────────────────────────────
    const { prisma } = await import('@/lib/prisma');

    const where: any = {};
    if (search) {
      where.OR = [
        { legalName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { fileNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          accountManager: { select: { id: true, name: true } },
          _count: { select: { shipments: true, invoices: true } },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    const data = canViewFinance ? customers : customers.map((customer) => ({ ...customer, creditLimit: null }));
    return NextResponse.json({ data, total, page, pageSize });
  } catch (err) {
    console.error('[CUSTOMERS GET]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeApi('CUSTOMERS', 'CREATE');
    if (!auth.session) return auth.response;

    const body = await req.json();
    const parsed = CreateCustomerSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });

    const fileNumber = `KMT-C-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;

    // ── DEMO MODE ────────────────────────────────────────────────────────────
    if (DEMO_MODE) {
      return NextResponse.json({ data: { id: randomUUID(), fileNumber, ...parsed.data, status: 'ACTIVE', createdAt: new Date().toISOString() } }, { status: 201 });
    }

    // ── NORMAL MODE ──────────────────────────────────────────────────────────
    const { prisma } = await import('@/lib/prisma');
    const { createAuditLog, getClientInfo } = await import('@/lib/audit');

    const customer = await prisma.customer.create({
      data: {
        ...parsed.data,
        fileNumber,
        email: parsed.data.email || null,
        creditLimit: parsed.data.creditLimit ?? null,
      },
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: auth.session.user.id,
      action: 'CREATE',
      module: 'CUSTOMERS',
      recordId: customer.id,
      newValues: { fileNumber, legalName: customer.legalName },
      ipAddress, userAgent,
    });

    return NextResponse.json({ data: customer }, { status: 201 });
  } catch (err) {
    console.error('[CUSTOMERS POST]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
