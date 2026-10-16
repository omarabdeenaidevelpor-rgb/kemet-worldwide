import { Shell } from '@/components/layout/Shell';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TrackingContent } from './TrackingContent';

export default async function TrackingPage() {
  const session = await getSession();
  if (!session?.user) redirect('/login');
  return <Shell><TrackingContent /></Shell>;
}
