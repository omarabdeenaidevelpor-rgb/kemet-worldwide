import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog, getClientInfo } from '@/lib/audit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const UpdateEmployeeSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  newPassword: z
    .string()
    .min(10)
    .regex(/[A-Z]/, 'UPPERCASE_REQUIRED')
    .regex(/[a-z]/, 'LOWERCASE_REQUIRED')
    .regex(/[0-9]/, 'DIGIT_REQUIRED')
    .optional(),
  currentPassword: z.string().optional(),
  roleName: z.enum([
    'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SHIPMENT_COORDINATOR',
    'CUSTOMER_SERVICE_AGENT', 'ACCOUNTANT', 'SALES_REPRESENTATIVE', 'AUDITOR',
  ]).optional(),
});

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const isAdmin = session.user.roles?.includes('GENERAL_MANAGER');
    const isOwnProfile = session.user.id === params.id;

    if (!isAdmin && !isOwnProfile) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true, name: true, email: true, phone: true, isActive: true,
        lastLoginAt: true, createdAt: true, failedLoginAttempts: true, lockedUntil: true,
        userRoles: {
          include: { role: { select: { id: true, name: true, description: true } } },
        },
      },
    });

    if (!user) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    return NextResponse.json({ data: user });
  } catch (err) {
    console.error('[EMPLOYEE GET]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const isAdmin = session.user.roles?.includes('GENERAL_MANAGER');
    const isOwnProfile = session.user.id === params.id;

    if (!isAdmin && !isOwnProfile) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = UpdateEmployeeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
    }

    // Non-admins cannot change isActive or role
    if (!isAdmin && (parsed.data.isActive !== undefined || parsed.data.roleName)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const existing = await prisma.user.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    // Changing your OWN password requires the current password (prevents session-hijack takeover).
    if (parsed.data.newPassword && isOwnProfile) {
      const ok = parsed.data.currentPassword
        ? await bcrypt.compare(parsed.data.currentPassword, existing.passwordHash)
        : false;
      if (!ok) return NextResponse.json({ error: 'INVALID_CURRENT_PASSWORD' }, { status: 400 });
    }

    // A GM cannot deactivate or demote themselves (avoids locking everyone out).
    if (isOwnProfile && (parsed.data.isActive === false || (parsed.data.roleName && parsed.data.roleName !== 'GENERAL_MANAGER' && isAdmin))) {
      return NextResponse.json({ error: 'CANNOT_MODIFY_OWN_ACCESS' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.name) updateData.name = parsed.data.name;
    if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone || null;
    if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;
    if (parsed.data.newPassword) {
      updateData.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
      updateData.failedLoginAttempts = 0;
      updateData.lockedUntil = null;
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: { id: true, name: true, email: true, phone: true, isActive: true },
    });

    // Update role if requested (admin only)
    if (isAdmin && parsed.data.roleName) {
      const role = await prisma.role.findUnique({ where: { name: parsed.data.roleName } });
      if (!role) return NextResponse.json({ error: 'ROLE_NOT_FOUND' }, { status: 400 });

      // Remove existing roles and assign new one atomically
      await prisma.$transaction([
        prisma.userRole.deleteMany({ where: { userId: params.id } }),
        prisma.userRole.create({
          data: { userId: params.id, roleId: role.id, grantedBy: session.user.id },
        }),
      ]);
    }

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: session.user.id,
      action: 'UPDATE_EMPLOYEE',
      module: 'EMPLOYEES',
      recordId: params.id,
      oldValues: { name: existing.name, isActive: existing.isActive },
      newValues: { ...parsed.data, currentPassword: undefined, newPassword: parsed.data.newPassword ? '[REDACTED]' : undefined },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data: user });
  } catch (err) {
    console.error('[EMPLOYEE PATCH]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    if (!session.user.roles?.includes('GENERAL_MANAGER')) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    if (params.id === session.user.id) {
      return NextResponse.json({ error: 'CANNOT_DELETE_SELF' }, { status: 400 });
    }

    // Soft delete — deactivate instead of delete
    await prisma.user.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    // Invalidate sessions
    await prisma.session.deleteMany({ where: { userId: params.id } });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: session.user.id,
      action: 'DEACTIVATE_EMPLOYEE',
      module: 'EMPLOYEES',
      recordId: params.id,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ message: 'Employee deactivated' });
  } catch (err) {
    console.error('[EMPLOYEE DELETE]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
