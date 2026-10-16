import { Shell } from '@/components/layout/Shell';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SettingsContent } from './SettingsContent';

export default async function SettingsPage() {
  const session = await getSession();
  if (!session?.user) redirect('/login');
  return <Shell><SettingsContent /></Shell>;
}
