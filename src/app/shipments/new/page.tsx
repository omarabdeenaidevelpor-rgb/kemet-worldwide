import { Shell } from '@/components/layout/Shell';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NewShipmentContent } from './NewShipmentContent';

export default async function NewShipmentPage() {
  const session = await getSession();
  if (!session?.user) redirect('/login');
  return <Shell><NewShipmentContent /></Shell>;
}
