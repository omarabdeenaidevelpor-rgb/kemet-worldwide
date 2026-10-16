import { Shell } from '@/components/layout/Shell';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ExpensesContent } from './ExpensesContent';

export default async function ExpensesPage() {
  const session = await getSession();
  if (!session?.user) redirect('/login');
  return <Shell><ExpensesContent /></Shell>;
}
