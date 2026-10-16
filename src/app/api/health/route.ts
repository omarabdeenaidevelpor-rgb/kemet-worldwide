import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { storageDriver } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/** Public liveness/readiness probe — exposes no business data. */
export async function GET() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', db: 'up', storage: storageDriver(), latencyMs: Date.now() - started });
  } catch {
    return NextResponse.json({ status: 'degraded', db: 'down' }, { status: 503 });
  }
}
