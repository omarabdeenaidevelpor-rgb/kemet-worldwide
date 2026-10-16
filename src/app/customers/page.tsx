import { Shell } from '@/components/layout/Shell';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CustomersContent } from './CustomersContent';

export default async function CustomersPage() {
  const session = await getSession();
  if (!session?.user) redirect('/login');
  return (
    <Shell>
      <CustomersContent />
    </Shell>
  );
}
