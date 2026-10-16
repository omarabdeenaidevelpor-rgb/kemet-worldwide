import { Shell } from '@/components/layout/Shell';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PaymentsContent } from './PaymentsContent';

export default async function PaymentsPage() {
  const session = await getSession();
  if (!session?.user) redirect('/login');
  return <Shell><PaymentsContent /></Shell>;
}
