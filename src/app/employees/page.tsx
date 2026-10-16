import { Shell } from '@/components/layout/Shell';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EmployeesContent } from './EmployeesContent';

export default async function EmployeesPage() {
  const session = await getSession();
  if (!session?.user) redirect('/login');
  return <Shell><EmployeesContent /></Shell>;
}
