import { NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/api-auth';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

const DEMO_MODE = !process.env.DATABASE_URL;

export async function GET() {
  try {
    const auth = await authorizeApi('DASHBOARD', 'VIEW');
    if (!auth.session) return auth.response;

    // ── DEMO MODE ────────────────────────────────────────────────────────────
    if (DEMO_MODE) {
      const { DEMO_DASHBOARD } = await import('@/lib/demo-data');
      return NextResponse.json(DEMO_DASHBOARD);
    }

    // ── NORMAL MODE ──────────────────────────────────────────────────────────
    const { prisma } = await import('@/lib/prisma');
    if (!auth.session) return auth.response;
    const canViewFinance = hasPermission(auth.session.user.permissions, auth.session.user.roles, 'FINANCE', 'VIEW');

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const currencies = await prisma.currency.findMany({
      where: { isActive: true },
      select: { code: true, exchangeRate: true, isBase: true },
    });
    const baseCurrency = currencies.find((currency) => currency.isBase);
    const baseCurrencyCode = baseCurrency?.code ?? 'USD';
    const rates = new Map(currencies.map((currency) => [currency.code, Number(currency.exchangeRate)]));
    if (!rates.has(baseCurrencyCode)) rates.set(baseCurrencyCode, 1);
    const missingRateCurrencies = new Set<string>();
    const toBaseCurrency = (amount: number, currency: string) => {
      const rate = rates.get(currency);
      if (!rate || !Number.isFinite(rate)) {
        missingRateCurrencies.add(currency);
        return 0;
      }
      return amount / rate;
    };

    const [
      totalCustomers,
      totalShipments,
      shipmentsByStatus,
      shipmentsByMode,
      invoiceStats,
      openIncidents,
      monthlyShipments,
      monthlyRevenue,
      topCustomers,
    ] = await Promise.all([
      prisma.customer.count({ where: { status: 'ACTIVE' } }),
      prisma.shipment.count(),
      prisma.shipment.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.shipment.groupBy({ by: ['mode'], _count: { _all: true } }),
      prisma.invoice.groupBy({
        by: ['currency'],
        _sum: { totalAmount: true, paidAmount: true },
        where: { status: { not: 'CANCELLED' } },
      }),
      prisma.incident.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.$queryRaw<{ month: string; count: bigint }[]>`
        SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon YYYY') as month,
               COUNT(*)::bigint as count
        FROM "Shipment"
        WHERE "createdAt" >= ${startOfYear}
        GROUP BY DATE_TRUNC('month', "createdAt"), TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon YYYY')
        ORDER BY DATE_TRUNC('month', "createdAt")
      `,
      prisma.$queryRaw<{ month: string; currency: string; invoiced: number; collected: number }[]>`
        SELECT TO_CHAR(DATE_TRUNC('month', "issueDate"), 'Mon YYYY') as month,
               "currency",
               COALESCE(SUM("totalAmount"), 0)::float as invoiced,
               COALESCE(SUM("paidAmount"), 0)::float as collected
        FROM "Invoice"
        WHERE "issueDate" >= ${startOfYear} AND status != 'CANCELLED'
        GROUP BY DATE_TRUNC('month', "issueDate"), TO_CHAR(DATE_TRUNC('month', "issueDate"), 'Mon YYYY'), "currency"
        ORDER BY DATE_TRUNC('month', "issueDate")
      `,
      prisma.invoice.groupBy({
        by: ['customerId', 'currency'],
        _sum: { totalAmount: true },
        where: { status: { not: 'CANCELLED' } },
      }),
    ]);

    const customerAmounts = new Map<string, number>();
    topCustomers.forEach((record) => {
      const converted = toBaseCurrency(Number(record._sum.totalAmount ?? 0), record.currency);
      customerAmounts.set(record.customerId, (customerAmounts.get(record.customerId) ?? 0) + converted);
    });
    const customerIds = [...customerAmounts.keys()];
    const customerNames = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, legalName: true },
    });
    const nameMap = Object.fromEntries(customerNames.map((c) => [c.id, c.legalName]));

    const inTransit = shipmentsByStatus.find((s) => s.status === 'IN_TRANSIT')?._count._all ?? 0;
    const delivered = shipmentsByStatus.find((s) => s.status === 'DELIVERED')?._count._all ?? 0;
    const delayed = shipmentsByStatus.find((s) => s.status === 'DELAYED')?._count._all ?? 0;
    const totalInvoiced = invoiceStats.reduce(
      (sum, record) => sum + toBaseCurrency(Number(record._sum.totalAmount ?? 0), record.currency),
      0,
    );
    const totalPaid = invoiceStats.reduce(
      (sum, record) => sum + toBaseCurrency(Number(record._sum.paidAmount ?? 0), record.currency),
      0,
    );
    const outstanding = totalInvoiced - totalPaid;
    const monthlyTotals = new Map<string, { invoiced: number; collected: number }>();
    monthlyRevenue.forEach((record) => {
      const totals = monthlyTotals.get(record.month) ?? { invoiced: 0, collected: 0 };
      totals.invoiced += toBaseCurrency(record.invoiced, record.currency);
      totals.collected += toBaseCurrency(record.collected, record.currency);
      monthlyTotals.set(record.month, totals);
    });
    const topCustomersByBaseCurrency = [...customerAmounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5);

    return NextResponse.json({
      kpis: {
        totalCustomers,
        totalShipments,
        inTransit,
        delivered,
        delayed,
        openIncidents,
        totalInvoiced: canViewFinance ? totalInvoiced : null,
        totalCollected: canViewFinance ? totalPaid : null,
        outstanding: canViewFinance ? outstanding : null,
        currency: baseCurrencyCode,
        missingRateCurrencies: canViewFinance ? [...missingRateCurrencies] : [],
        canViewFinance,
      },
      charts: {
        shipmentsByStatus: shipmentsByStatus.map((s) => ({
          status: s.status,
          count: s._count._all,
        })),
        shipmentsByMode: shipmentsByMode.map((s) => ({
          mode: s.mode,
          count: s._count._all,
        })),
        monthlyShipments: monthlyShipments.map((r) => ({
          month: r.month,
          count: Number(r.count),
        })),
        monthlyRevenue: canViewFinance ? [...monthlyTotals.entries()].map(([month, totals]) => ({
          month,
          ...totals,
        })) : [],
        topCustomers: canViewFinance ? topCustomersByBaseCurrency.map(([customerId, amount]) => ({
          name: nameMap[customerId] ?? customerId,
          amount,
        })) : [],
      },
    });
  } catch (err) {
    console.error('[DASHBOARD]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
