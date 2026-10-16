import { Shell } from '@/components/layout/Shell';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ShipmentsContent } from './ShipmentsContent';

export default async function ShipmentsPage() {
  const session = await getSession();
  if (!session?.user) redirect('/login');
  return <Shell><ShipmentsContent /></Shell>;
}
