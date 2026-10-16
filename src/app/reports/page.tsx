import { Shell } from '@/components/layout/Shell';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ReportsContent } from './ReportsContent';

export default async function ReportsPage() {
  const session = await getSession();
  if (!session?.user) redirect('/login');
  return <Shell><ReportsContent /></Shell>;
}
