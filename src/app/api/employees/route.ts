import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const DEMO_MODE = !process.env.DATABASE_URL;

const CreateEmployeeSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  roleName: z.enum(['GENERAL_MANAGER','OPERATIONS_MANAGER','SHIPMENT_COORDINATOR','CUSTOMER_SERVICE_AGENT','ACCOUNTANT','SALES_REPRESENTATIVE','AUDITOR']),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const roles = session.user.roles ?? [];
    if (!roles.includes('GENERAL_MANAGER') && !roles.includes('OPERATIONS_MANAGER')) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    // ── DEMO MODE ────────────────────────────────────────────────────────────
    if (DEMO_MODE) {
      const { DEMO_EMPLOYEES } = await import('@/lib/demo-data');
      return NextResponse.json({ data: DEMO_EMPLOYEES });
    }

    // ── NORMAL MODE ──────────────────────────────────────────────────────────
    const { prisma } = await import('@/lib/prisma');
    const employees = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, phone: true, isActive: true,
        lastLoginAt: true, createdAt: true,
        userRoles: { include: { role: { select: { name: true } } } },
      },
    });

    return NextResponse.json({ data: employees });
  } catch (err) {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const roles = session.user.roles ?? [];
    if (!roles.includes('GENERAL_MANAGER')) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = CreateEmployeeSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });

    // ── DEMO MODE ────────────────────────────────────────────────────────────
    if (DEMO_MODE) {
      return NextResponse.json({ data: { id: randomUUID(), name: parsed.data.name, email: parsed.data.email, isActive: true, createdAt: new Date().toISOString() } }, { status: 201 });
    }

    // ── NORMAL MODE ──────────────────────────────────────────────────────────
    const { prisma } = await import('@/lib/prisma');
    const { createAuditLog, getClientInfo } = await import('@/lib/audit');

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) return NextResponse.json({ error: 'EMAIL_EXISTS' }, { status: 409 });

    const role = await prisma.role.findUnique({ where: { name: parsed.data.roleName } });
    if (!role) return NextResponse.json({ error: 'ROLE_NOT_FOUND' }, { status: 400 });

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash,
        phone: parsed.data.phone ?? null,
        userRoles: { create: { roleId: role.id, grantedBy: session.user.id } },
      },
      select: { id: true, name: true, email: true, isActive: true, createdAt: true },
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: session.user.id, action: 'CREATE_EMPLOYEE', module: 'EMPLOYEES',
      recordId: user.id, newValues: { name: user.name, email: user.email, role: parsed.data.roleName },
      ipAddress, userAgent,
    });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (err) {
    console.error('[EMPLOYEES POST]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
