import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const AddUpdateSchema = z.object({
  content: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeApi('INCIDENTS', 'EDIT');
    if (!auth.session) return auth.response;
    const session = auth.session;

    const body = await req.json();
    const parsed = AddUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
    }

    const incident = await prisma.incident.findUnique({ where: { id: params.id } });
    if (!incident) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    const update = await prisma.incidentUpdate.create({
      data: {
        incidentId: params.id,
        authorId: session.user.id,
        content: parsed.data.content,
      },
      include: { author: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ data: update }, { status: 201 });
  } catch (err) {
    console.error('[INCIDENT UPDATE POST]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
