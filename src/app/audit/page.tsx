import { Shell } from '@/components/layout/Shell';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AuditContent } from './AuditContent';

export default async function AuditPage() {
  const session = await getSession();
  if (!session?.user) redirect('/login');
  return <Shell><AuditContent /></Shell>;
}
