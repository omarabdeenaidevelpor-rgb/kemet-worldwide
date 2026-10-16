import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog, getClientInfo } from '@/lib/audit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CreateExpenseSchema = z.object({
  category: z.string().trim().min(1).max(100),
  description: z.string().trim().max(5000).optional(),
  amount: z.number().positive(),
  currency: z.string().regex(/^[A-Za-z]{3}$/).transform((value) => value.toUpperCase()).default('USD'),
  shipmentId: z.string().optional(),
  paidAt: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeApi('FINANCE', 'VIEW');
    if (!auth.session) return auth.response;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') ?? '';
    const pageValue = Number.parseInt(searchParams.get('page') ?? '1', 10);
    const sizeValue = Number.parseInt(searchParams.get('pageSize') ?? '20', 10);
    const page = Number.isFinite(pageValue) ? Math.max(1, pageValue) : 1;
    const pageSize = Number.isFinite(sizeValue) ? Math.min(100, Math.max(1, sizeValue)) : 20;

    const where: any = {};
    if (status) where.status = status;

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' },
        include: {
          shipment: { select: { id: true, referenceNumber: true } },
          paidBy: { select: { id: true, name: true } },
        },
      }),
      prisma.expense.count({ where }),
    ]);

    return NextResponse.json({ data: expenses, total, page, pageSize });
  } catch (err) {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeApi('FINANCE', 'CREATE');
    if (!auth.session) return auth.response;

    const body = await req.json();
    const parsed = CreateExpenseSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });

    const expense = await prisma.expense.create({
      data: {
        ...parsed.data,
        shipmentId: parsed.data.shipmentId ?? null,
        paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : null,
        paidById: auth.session.user.id,
      },
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: auth.session.user.id,
      action: 'CREATE',
      module: 'FINANCE',
      recordId: expense.id,
      newValues: { category: expense.category, amount: expense.amount.toString(), currency: expense.currency },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data: expense }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authorizeApi('FINANCE', 'APPROVE');
    if (!auth.session) return auth.response;

    const parsed = z.object({
      id: z.string().min(1),
      status: z.enum(['APPROVED', 'REJECTED']),
    }).safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.expense.findUnique({ where: { id: parsed.data.id } });
    if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    if (existing.status !== 'PENDING') {
      return NextResponse.json({ error: 'EXPENSE_ALREADY_REVIEWED' }, { status: 409 });
    }

    const updated = await prisma.expense.updateMany({
      where: { id: existing.id, status: 'PENDING' },
      data: { status: parsed.data.status, approvedById: auth.session.user.id },
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: 'EXPENSE_ALREADY_REVIEWED' }, { status: 409 });
    }
    const expense = await prisma.expense.findUniqueOrThrow({ where: { id: existing.id } });
    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: auth.session.user.id,
      action: parsed.data.status,
      module: 'FINANCE',
      recordId: expense.id,
      oldValues: { status: existing.status },
      newValues: { status: expense.status },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data: expense });
  } catch (error) {
    console.error('[EXPENSES PATCH]', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
