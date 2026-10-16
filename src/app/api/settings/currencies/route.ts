import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeApi } from '@/lib/api-auth';
import { createAuditLog, getClientInfo } from '@/lib/audit';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await authorizeApi('SETTINGS', 'VIEW');
    if (!auth.session) return auth.response;

    const currencies = await prisma.currency.findMany({
      where: { isActive: true },
      orderBy: [{ isBase: 'desc' }, { code: 'asc' }],
      select: { code: true, name: true, symbol: true, exchangeRate: true, isBase: true },
    });
    return NextResponse.json({ data: currencies });
  } catch (error) {
    console.error('[CURRENCY SETTINGS GET]', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

const UpdateSchema = z.object({
  baseCode: z.string().regex(/^[A-Z]{3}$/),
  rates: z.array(z.object({
    code: z.string().regex(/^[A-Z]{3}$/),
    exchangeRate: z.number().finite().positive().max(1_000_000_000),
  })),
});

export async function PUT(request: NextRequest) {
  try {
    const auth = await authorizeApi('SETTINGS', 'EDIT');
    if (!auth.session) return auth.response;

    const parsed = UpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
    }

    const { baseCode, rates } = parsed.data;
    const codes = rates.map((rate) => rate.code);
    if (codes.includes(baseCode) || new Set(codes).size !== codes.length) {
      return NextResponse.json({ error: 'INVALID_CURRENCY_SET' }, { status: 400 });
    }

    const activeCurrencies = await prisma.currency.findMany({
      where: { isActive: true },
      select: { code: true, exchangeRate: true, isBase: true },
    });
    const activeCodes = new Set(activeCurrencies.map((currency) => currency.code));
    const requestedCodes = new Set([baseCode, ...codes]);
    if (requestedCodes.size !== activeCodes.size || [...requestedCodes].some((code) => !activeCodes.has(code))) {
      return NextResponse.json({ error: 'ALL_ACTIVE_CURRENCIES_REQUIRED' }, { status: 400 });
    }

    const baseCurrency = activeCurrencies.find((currency) => currency.isBase);
    const previousRates = Object.fromEntries(activeCurrencies.map((currency) => [currency.code, Number(currency.exchangeRate)]));
    const newRates = Object.fromEntries(rates.map((rate) => [rate.code, rate.exchangeRate]));
    newRates[baseCode] = 1;

    await prisma.$transaction(async (transaction) => {
      await transaction.currency.updateMany({ where: { isBase: true }, data: { isBase: false } });
      for (const [code, exchangeRate] of Object.entries(newRates)) {
        await transaction.currency.update({
          where: { code },
          data: { exchangeRate, isBase: code === baseCode },
        });
      }
    });

    const { ipAddress, userAgent } = getClientInfo(request);
    await createAuditLog({
      userId: auth.session.user.id,
      action: 'UPDATE_CURRENCY_RATES',
      module: 'SETTINGS',
      oldValues: { baseCode: baseCurrency?.code, rates: previousRates },
      newValues: { baseCode, rates: newRates },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ message: 'CURRENCY_RATES_UPDATED', data: newRates, baseCode });
  } catch (error) {
    console.error('[CURRENCY SETTINGS PUT]', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
