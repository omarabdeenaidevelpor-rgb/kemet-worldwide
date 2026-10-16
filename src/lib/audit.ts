import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

const SENSITIVE_KEYS = /pass(word)?|secret|token|hash/i;

/** Strip undefined values + redact secrets so the payload is valid JSON for Prisma. */
function toJson(v: Record<string, unknown> | null | undefined): Prisma.InputJsonValue | undefined {
  if (!v) return undefined;
  const clean = JSON.parse(
    JSON.stringify(v, (k, val) => (k && SENSITIVE_KEYS.test(k) && val !== undefined ? '[REDACTED]' : val)),
  );
  return clean as Prisma.InputJsonValue;
}

interface AuditParams {
  userId?: string | null;
  action: string;
  module: string;
  recordId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function createAuditLog(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        module: params.module,
        recordId: params.recordId ?? null,
        oldValues: toJson(params.oldValues),
        newValues: toJson(params.newValues),
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  } catch (err) {
    // Audit log failures must never break application flow
    console.error('[AUDIT] Failed to write audit log:', err);
  }
}

export function getClientInfo(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for');
  const ipAddress = forwarded ? forwarded.split(',')[0].trim() : null;
  const userAgent = req.headers.get('user-agent');
  return { ipAddress, userAgent };
}
