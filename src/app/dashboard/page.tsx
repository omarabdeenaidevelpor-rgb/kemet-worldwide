import { Shell } from '@/components/layout/Shell';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardContent } from './DashboardContent';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user) redirect('/login');
  return (
    <Shell>
      <DashboardContent />
    </Shell>
  );
}
