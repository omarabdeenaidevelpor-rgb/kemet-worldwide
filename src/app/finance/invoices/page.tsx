import { Shell } from '@/components/layout/Shell';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { InvoicesContent } from './InvoicesContent';

export default async function InvoicesPage() {
  const session = await getSession();
  if (!session?.user) redirect('/login');
  return <Shell><InvoicesContent /></Shell>;
}
