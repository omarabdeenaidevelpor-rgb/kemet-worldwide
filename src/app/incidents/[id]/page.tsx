import { Shell } from '@/components/layout/Shell';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { IncidentDetail } from './IncidentDetail';

export default async function IncidentDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) redirect('/login');
  return <Shell><IncidentDetail id={params.id} /></Shell>;
}
