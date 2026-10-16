import { Shell } from '@/components/layout/Shell';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ShipmentDetail } from './ShipmentDetail';

export default async function ShipmentPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) redirect('/login');
  return <Shell><ShipmentDetail id={params.id} /></Shell>;
}
