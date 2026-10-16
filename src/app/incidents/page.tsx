import { Shell } from '@/components/layout/Shell';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { IncidentsContent } from './IncidentsContent';

export default async function IncidentsPage() {
  const session = await getSession();
  if (!session?.user) redirect('/login');
  return <Shell><IncidentsContent /></Shell>;
}
