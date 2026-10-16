import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { hasPermission, type PermissionAction, type PermissionModule } from '@/lib/permissions';

export async function authorizeApi(
  module: PermissionModule,
  action: PermissionAction,
) {
  const session = await getSession();
  if (!session?.user) {
    return {
      session: null,
      response: NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }),
    } as const;
  }

  if (!hasPermission(session.user.permissions, session.user.roles, module, action)) {
    return {
      session: null,
      response: NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }),
    } as const;
  }

  return { session, response: null } as const;
}
