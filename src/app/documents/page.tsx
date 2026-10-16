import { Shell } from '@/components/layout/Shell';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DocumentsContent } from './DocumentsContent';

export default async function DocumentsPage() {
  const session = await getSession();
  if (!session?.user) redirect('/login');
  return <Shell><DocumentsContent /></Shell>;
}
