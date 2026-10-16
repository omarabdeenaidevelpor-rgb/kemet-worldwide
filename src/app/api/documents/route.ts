import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { authorizeApi } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog, getClientInfo } from '@/lib/audit';
import { deleteStoredFile, saveFile, uploadsEnabled } from '@/lib/storage';

// Node.js runtime is required for file handling
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 30 seconds for file uploads

const allowedTypes = new Map([
  ['application/pdf', '.pdf'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx'],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.xlsx'],
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['text/plain', '.txt'],
  ['text/csv', '.csv'],
]);

const MetadataSchema = z.object({
  type: z.string().trim().min(1).max(80),
  customerId: z.string().optional(),
  shipmentId: z.string().optional(),
  isConfidential: z.enum(['true', 'false']).default('false'),
});

function getFormString(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === 'string' ? value : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeApi('DOCUMENTS', 'VIEW');
    if (!auth.session) return auth.response;

    const pageValue = Number.parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10);
    const sizeValue = Number.parseInt(request.nextUrl.searchParams.get('pageSize') ?? '20', 10);
    const page = Number.isFinite(pageValue) ? Math.max(1, pageValue) : 1;
    const pageSize = Number.isFinite(sizeValue) ? Math.min(100, Math.max(1, sizeValue)) : 20;
    const canViewConfidential = auth.session.user.roles?.some((role) => ['GENERAL_MANAGER', 'OPERATIONS_MANAGER'].includes(role)) ?? false;
    const where = canViewConfidential ? {} : { isConfidential: false };
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, type: true, fileSize: true, mimeType: true,
          customerId: true, shipmentId: true, isConfidential: true, createdAt: true,
          customer: { select: { legalName: true } },
          shipment: { select: { referenceNumber: true } },
          uploadedBy: { select: { name: true } },
        },
      }),
      prisma.document.count({ where }),
    ]);

    return NextResponse.json({ data: documents, total, page, pageSize });
  } catch (error) {
    console.error('[DOCUMENTS GET]', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeApi('DOCUMENTS', 'CREATE');
    if (!auth.session) return auth.response;

    if (!uploadsEnabled()) {
      return NextResponse.json(
        { error: 'UPLOADS_NOT_CONFIGURED', message: 'Set BLOB_READ_WRITE_TOKEN to enable persistent uploads on serverless hosting.' },
        { status: 503 },
      );
    }

    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'FILE_REQUIRED' }, { status: 400 });
    }
    const extension = allowedTypes.get(file.type);
    if (!extension) return NextResponse.json({ error: 'UNSUPPORTED_FILE_TYPE' }, { status: 415 });

    const maxSizeMb = Number.parseInt(process.env.MAX_FILE_SIZE_MB ?? '10', 10);
    const maxSizeBytes = (Number.isFinite(maxSizeMb) && maxSizeMb > 0 ? maxSizeMb : 10) * 1024 * 1024;
    if (file.size === 0) return NextResponse.json({ error: 'EMPTY_FILE' }, { status: 400 });
    if (file.size > maxSizeBytes) return NextResponse.json({ error: 'FILE_TOO_LARGE', maxSizeMb }, { status: 413 });

    const parsed = MetadataSchema.safeParse({
      type: getFormString(form, 'type') || 'GENERAL',
      customerId: getFormString(form, 'customerId') || undefined,
      shipmentId: getFormString(form, 'shipmentId') || undefined,
      isConfidential: getFormString(form, 'isConfidential') || 'false',
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
    }
    const isManager = auth.session.user.roles?.some((role) => ['GENERAL_MANAGER', 'OPERATIONS_MANAGER'].includes(role)) ?? false;
    if (parsed.data.isConfidential === 'true' && !isManager) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const { customerId, shipmentId } = parsed.data;
    const [customer, shipment] = await Promise.all([
      customerId ? prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } }) : null,
      shipmentId ? prisma.shipment.findUnique({ where: { id: shipmentId }, select: { id: true } }) : null,
    ]);
    if (customerId && !customer) return NextResponse.json({ error: 'CUSTOMER_NOT_FOUND' }, { status: 404 });
    if (shipmentId && !shipment) return NextResponse.json({ error: 'SHIPMENT_NOT_FOUND' }, { status: 404 });

    const id = randomUUID();
    if (customerId && shipmentId) {
      const shipmentCustomer = await prisma.shipment.findUnique({ where: { id: shipmentId }, select: { customerId: true } });
      if (shipmentCustomer?.customerId !== customerId) {
        return NextResponse.json({ error: 'SHIPMENT_CUSTOMER_MISMATCH' }, { status: 400 });
      }
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const hasValidSignature = file.type === 'application/pdf'
      ? new TextDecoder().decode(bytes.subarray(0, 5)) === '%PDF-'
      : file.type === 'image/png'
        ? bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
        : file.type === 'image/jpeg'
          ? bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
          : file.type === 'image/webp'
            ? bytes.length >= 12 && new TextDecoder().decode(bytes.subarray(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.subarray(8, 12)) === 'WEBP'
            : file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
              || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              ? bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
              : file.type === 'text/plain' || file.type === 'text/csv'
              ? !bytes.includes(0)
              : false;
    if (!hasValidSignature) return NextResponse.json({ error: 'FILE_CONTENT_TYPE_MISMATCH' }, { status: 415 });

    const fileName = file.name.replace(/\\/g, '/').split('/').pop()?.replace(/[\u0000-\u001f\u007f]/g, '_').slice(0, 180) || `document${extension}`;
    const storedPath = await saveFile(`${id}${extension}`, bytes, file.type);

    let saved = false;
    try {
      const document = await prisma.document.create({
        data: {
          id,
          name: fileName,
          type: parsed.data.type,
          filePath: storedPath,
          fileSize: file.size,
          mimeType: file.type,
          customerId: customerId ?? null,
          shipmentId: shipmentId ?? null,
          isConfidential: parsed.data.isConfidential === 'true',
          uploadedById: auth.session.user.id,
        },
        select: { id: true, name: true, type: true, fileSize: true, mimeType: true, createdAt: true },
      });
      saved = true;

      const { ipAddress, userAgent } = getClientInfo(request);
      await createAuditLog({
        userId: auth.session.user.id,
        action: 'UPLOAD',
        module: 'DOCUMENTS',
        recordId: id,
        newValues: { name: fileName, type: parsed.data.type, fileSize: file.size },
        ipAddress,
        userAgent,
      });

      return NextResponse.json({ data: document }, { status: 201 });
    } finally {
      if (!saved) await deleteStoredFile(storedPath).catch(() => undefined);
    }
  } catch (error) {
    console.error('[DOCUMENTS POST]', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
