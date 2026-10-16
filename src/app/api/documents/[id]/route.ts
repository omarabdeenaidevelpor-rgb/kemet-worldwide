import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog, getClientInfo } from '@/lib/audit';
import { deleteStoredFile, readStoredFile } from '@/lib/storage';

// Node.js runtime is required for file handling
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function findAccessibleDocument(id: string, roles: string[]) {
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) return { document: null, status: 404 };
  if (document.isConfidential && !roles.some((role) => ['GENERAL_MANAGER', 'OPERATIONS_MANAGER'].includes(role))) {
    return { document: null, status: 403 };
  }
  return { document, status: 200 };
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeApi('DOCUMENTS', 'VIEW');
    if (!auth.session) return auth.response;

    const { document, status } = await findAccessibleDocument(params.id, auth.session.user.roles ?? []);
    if (!document) return NextResponse.json({ error: status === 403 ? 'FORBIDDEN' : 'NOT_FOUND' }, { status });
    const contents = await readStoredFile(document.filePath);
    if (!contents) return NextResponse.json({ error: 'FILE_MISSING' }, { status: 404 });
    const encodedName = encodeURIComponent(document.name).replace(/['()]/g, escape);
    return new NextResponse(Buffer.from(contents), {
      headers: {
        'Content-Type': document.mimeType ?? 'application/octet-stream',
        'Content-Length': String(contents.byteLength),
        'Content-Disposition': `attachment; filename="document"; filename*=UTF-8''${encodedName}`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('[DOCUMENT DOWNLOAD]', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeApi('DOCUMENTS', 'DELETE');
    if (!auth.session) return auth.response;

    const { document, status } = await findAccessibleDocument(params.id, auth.session.user.roles ?? []);
    if (!document) return NextResponse.json({ error: status === 403 ? 'FORBIDDEN' : 'NOT_FOUND' }, { status });
    // Delete the DB row first so a storage failure never leaves a dangling record.
    await prisma.document.delete({ where: { id: document.id } });
    await deleteStoredFile(document.filePath).catch((err) => console.error('[DOCUMENT DELETE] storage cleanup failed', err));

    const { ipAddress, userAgent } = getClientInfo(request);
    await createAuditLog({
      userId: auth.session.user.id,
      action: 'DELETE',
      module: 'DOCUMENTS',
      recordId: document.id,
      oldValues: { name: document.name, type: document.type },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ message: 'DOCUMENT_DELETED' });
  } catch (error) {
    console.error('[DOCUMENT DELETE]', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
