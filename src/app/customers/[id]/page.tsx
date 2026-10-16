import { Shell } from '@/components/layout/Shell';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CustomerDetail } from './CustomerDetail';

export default async function CustomerPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) redirect('/login');
  return (
    <Shell>
      <CustomerDetail id={params.id} />
    </Shell>
  );
}
