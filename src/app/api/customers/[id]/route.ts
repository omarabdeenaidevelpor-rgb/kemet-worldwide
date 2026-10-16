import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/api-auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { createAuditLog, getClientInfo } from '@/lib/audit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const UpdateSchema = z.object({
  legalName: z.string().min(2).max(200).optional(),
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
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeApi('CUSTOMERS', 'VIEW');
    if (!auth.session) return auth.response;
    const canViewFinance = hasPermission(auth.session.user.permissions, auth.session.user.roles, 'FINANCE', 'VIEW');
    const canViewConfidentialDocuments = auth.session.user.roles?.some((role) => ['GENERAL_MANAGER', 'OPERATIONS_MANAGER'].includes(role)) ?? false;

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        accountManager: { select: { id: true, name: true, email: true } },
        contacts: true,
        shipments: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true, referenceNumber: true, mode: true, status: true,
            origin: true, destination: true, createdAt: true,
          },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: canViewFinance ? {
            id: true, invoiceNumber: true, totalAmount: true, paidAmount: true,
            status: true, issueDate: true, dueDate: true, currency: true,
          } : {
            id: true, invoiceNumber: true, status: true, issueDate: true, dueDate: true,
          },
        },
        documents: {
          where: canViewConfidentialDocuments ? {} : { isConfidential: false },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, name: true, type: true, fileSize: true, mimeType: true,
            isConfidential: true, createdAt: true,
          },
        },
        _count: { select: { shipments: true, invoices: true, documents: true } },
      },
    });

    if (!customer) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    // Calculate financial summary
    const invoiceSummary = canViewFinance ? await prisma.invoice.groupBy({
      by: ['currency'],
      where: { customerId: params.id, status: { not: 'CANCELLED' } },
      _sum: { totalAmount: true, paidAmount: true },
    }) : [];
    const baseCurrency = await prisma.currency.findFirst({ where: { isBase: true }, select: { code: true } });
    const byCurrency = invoiceSummary.map((summary) => {
      const totalInvoiced = Number(summary._sum.totalAmount ?? 0);
      const totalPaid = Number(summary._sum.paidAmount ?? 0);
      return { currency: summary.currency, totalInvoiced, totalPaid, outstanding: totalInvoiced - totalPaid };
    });

    return NextResponse.json({
      data: {
        ...customer,
        creditLimit: canViewFinance ? customer.creditLimit : null,
        baseCurrency: baseCurrency?.code ?? 'USD',
        canViewFinance,
        financialSummary: { byCurrency },
      },
    });
  } catch (err) {
    console.error('[CUSTOMER GET]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeApi('CUSTOMERS', 'EDIT');
    if (!auth.session) return auth.response;

    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });

    const existing = await prisma.customer.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: { ...parsed.data, email: parsed.data.email || null },
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: auth.session.user.id,
      action: 'UPDATE',
      module: 'CUSTOMERS',
      recordId: customer.id,
      oldValues: existing as any,
      newValues: parsed.data,
      ipAddress, userAgent,
    });

    return NextResponse.json({ data: customer });
  } catch (err) {
    console.error('[CUSTOMER PATCH]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeApi('CUSTOMERS', 'DELETE');
    if (!auth.session) return auth.response;

    const existing = await prisma.customer.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    // Soft-delete by deactivating rather than deleting
    await prisma.customer.update({ where: { id: params.id }, data: { status: 'INACTIVE' } });

    const { ipAddress, userAgent } = getClientInfo(req);
    await createAuditLog({
      userId: auth.session.user.id,
      action: 'DEACTIVATE',
      module: 'CUSTOMERS',
      recordId: params.id,
      oldValues: { status: existing.status },
      newValues: { status: 'INACTIVE' },
      ipAddress, userAgent,
    });

    return NextResponse.json({ message: 'Customer deactivated' });
  } catch (err) {
    console.error('[CUSTOMER DELETE]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
